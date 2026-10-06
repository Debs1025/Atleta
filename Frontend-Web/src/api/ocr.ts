import { BASE_URL, getStoredToken, handleResponse } from './client';

const getClientGeminiKey = (): string => {
  return (
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    (import.meta as any).env?.VITE_GOOGLE_API_KEY ||
    (import.meta as any).env?.VITE_GEMINI_KEY ||
    (import.meta as any).env?.GEMINI_API_KEY ||
    localStorage.getItem('gemini_api_key') ||
    ''
  ).trim().replace(/^["']|["']$/g, '');
};

const getGeminiEndpoint = (modelName: string): string => {
  const base = String((import.meta as any).env?.VITE_GEMINI_ENDPOINT || '').trim().replace(/\/+$/, '');
  if (!base) return '';
  return `${base}/${modelName}:generateContent`;
};

export const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

export const compressImageForOcr = (
  file: File,
  maxDimension = 1600,
  quality = 0.85
): Promise<{ base64Data: string; mimeType: string; dataUrl: string }> => {
  return new Promise((resolve) => {
    if (!file.type || !file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : '';
        resolve({
          base64Data: dataUrl.split(',')[1] || '',
          mimeType: file.type || 'image/jpeg',
          dataUrl,
        });
      };
      reader.onerror = () => resolve({ base64Data: '', mimeType: '', dataUrl: '' });
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve({
            base64Data: compressedDataUrl.split(',')[1] || '',
            mimeType: 'image/jpeg',
            dataUrl: compressedDataUrl,
          });
          return;
        }
        const rawUrl = typeof e.target?.result === 'string' ? e.target.result : '';
        resolve({
          base64Data: rawUrl.split(',')[1] || '',
          mimeType: file.type || 'image/jpeg',
          dataUrl: rawUrl,
        });
      };
      img.onerror = () => {
        const rawUrl = typeof e.target?.result === 'string' ? e.target.result : '';
        resolve({
          base64Data: rawUrl.split(',')[1] || '',
          mimeType: file.type || 'image/jpeg',
          dataUrl: rawUrl,
        });
      };
      img.src = typeof e.target?.result === 'string' ? e.target.result : '';
    };
    reader.onerror = () => resolve({ base64Data: '', mimeType: '', dataUrl: '' });
    reader.readAsDataURL(file);
  });
};

export const scanScoresheetClientDirect = async (
  rawFile: File,
  _homeTeam = 'Home Team',
  _awayTeam = 'Away Team',
  sport = 'Basketball'
): Promise<any> => {
  const { base64Data, mimeType, dataUrl } = await compressImageForOcr(rawFile);
  const geminiKey = getClientGeminiKey();

  let ocrResult: any = null;

  // 1. Try dedicated Web OCR endpoint first
  try {
    const blob = dataUrl ? await fetch(dataUrl).then((r) => r.blob()).catch(() => rawFile) : rawFile;
    const cleanName = rawFile.name.replace(/\.[^/.]+$/, '') + '.jpg';
    const optimizedFile = new File([blob], cleanName, { type: mimeType || 'image/jpeg' });

    const formData = new FormData();
    formData.append('file', optimizedFile);
    formData.append('scoresheet', optimizedFile);
    const token = getStoredToken();
    let backendRes = await fetch(`${BASE_URL}/matches/web/scan-scoresheet`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!backendRes.ok) {
      backendRes = await fetch(`${BASE_URL}/matches/scan-scoresheet`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
    }
    if (backendRes.ok) {
      const data = await backendRes.json();
      if (data && (Array.isArray(data.player_summary) || Array.isArray(data.team_scores))) {
        return {
          scoresheet_url: data.scoresheet_url || dataUrl,
          ...data,
        };
      }
    }
  } catch (backendErr) {
    console.warn('Backend web scan-scoresheet unreachable, trying direct client AI call:', backendErr);
  }

  // 2. Direct client-side Gemini Vision OCR call
  if (base64Data && geminiKey) {
    const modelsToTry = [
      {
        name: 'gemini-3.5-flash-lite',
        config: { temperature: 0.1, maxOutputTokens: 8192 },
      },
      {
        name: 'gemini-3.5-flash',
        config: {
          temperature: 0.1,
          maxOutputTokens: 8192,
          thinkingConfig: { thinkingBudget: 0 },
        },
      },
    ];

    const promptText = `You are an expert sports scoresheet OCR and data extraction system.
Carefully examine the provided document image/PDF/CSV.
Extract the match overview, exact team names from the header/team blocks, final scores, and ALL individual athlete statistics into this strict JSON structure:
{
  "match_info": {
    "sport_type": "${sport}",
    "event_name": "League / Event Name",
    "home_team_name": "Home Team Name",
    "opponent_team_name": "Opponent Team Name",
    "game_result": "WIN",
    "final_score": "0 - 0"
  },
  "team_scores": [
    {"team": "HomeTeamName", "score": 0, "is_home": true},
    {"team": "AwayTeamName", "score": 0, "is_home": false}
  ],
  "player_summary": [
    {
      "player_name": "Full Name",
      "jersey_number": 0,
      "team_name": "TeamName",
      "position": "G",
      "points": 0,
      "rebounds": 0,
      "assists": 0,
      "steals": 0,
      "blocks": 0,
      "turnovers": 0,
      "fouls": 0,
      "fg_made": 0,
      "fg_attempted": 0,
      "ft_made": 0,
      "ft_attempted": 0
    }
  ]
}

CRITICAL RULES:
1. You MUST transcribe EVERY player row from BOTH teams shown on the scoresheet into the "player_summary" array.
2. For each player, include their exact jersey number, actual name, team name, and exact points and stats recorded on the sheet.
3. Return ONLY valid JSON, nothing else.`;

    for (const mObj of modelsToTry) {
      try {
        const geminiUrl = getGeminiEndpoint(mObj.name);
        if (!geminiUrl) break;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);

        const res = await fetch(geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': geminiKey,
          },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: promptText },
                { inline_data: { mime_type: mimeType, data: base64Data } }
              ]
            }],
            generationConfig: mObj.config,
          })
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const json = await res.json();
          const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (text) {
            let clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
            const firstBrace = clean.indexOf('{');
            const lastBrace = clean.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
              clean = clean.substring(firstBrace, lastBrace + 1);
            }
            try {
              const parsed = JSON.parse(clean);
              if (parsed && (Array.isArray(parsed.player_summary) || Array.isArray(parsed.team_scores))) {
                ocrResult = parsed;
                break;
              }
            } catch (pErr) {
              clean = clean.replace(/,\s*([\}\]])/g, '$1');
              try {
                const parsed = JSON.parse(clean);
                if (parsed && (Array.isArray(parsed.player_summary) || Array.isArray(parsed.team_scores))) {
                  ocrResult = parsed;
                  break;
                }
              } catch (_) {}
            }
          }
        }
      } catch (err) {
        console.warn(`Direct client-side Gemini model ${mObj.name} failed/timed out, trying next:`, err);
      }
    }
  }

  return {
    scoresheet_url: dataUrl,
    ...(ocrResult || {
      match_info: {},
      team_scores: [],
      player_summary: [],
      parsed_tables: {
        team_scores: [],
        player_summary: [],
      },
    }),
  };
};

export const uploadScoresheetFile = async (matchId: string, rawFile: File): Promise<any> => {
  const cleanId = matchId.replace(/^#/, '');
  const token = getStoredToken();
  const formData = new FormData();
  formData.append('file', rawFile);
  formData.append('scoresheet', rawFile);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let responseData: any = null;

  try {
    const res = await fetch(`${BASE_URL}/matches/${cleanId}/scoresheet`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (res.ok) {
      responseData = await res.json();
    }
  } catch (err) {
    console.warn('Match scoresheet upload failed:', err);
  }

  if (!responseData) {
    responseData = await scanScoresheetClientDirect(rawFile);
  }

  return responseData;
};

export const scanScoresheetStandalone = async (rawFile: File): Promise<any> => {
  return await scanScoresheetClientDirect(rawFile);
};

export const scanScoresheetOCR = async (file: File): Promise<any> => {
  const token = getStoredToken();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('scoresheet', file);
  formData.append('document', file);

  const res = await fetch(`${BASE_URL}/matches/ocr/scan`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  return handleResponse<any>(res);
};

export const submitVerifiedMatch = async (payload: any): Promise<any> => {
  const token = getStoredToken();
  const res = await fetch(`${BASE_URL}/matches/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<any>(res);
};
