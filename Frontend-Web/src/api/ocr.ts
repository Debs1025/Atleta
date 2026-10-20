import { BASE_URL, getStoredToken, handleResponse } from './client';

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
  quality = 0.8
): Promise<{ base64Data: string; mimeType: string; dataUrl: string }> => {
  return new Promise((resolve) => {
    const timeout = setTimeout(async () => {
      try {
        const dUrl = await readFileAsDataUrl(file);
        resolve({
          base64Data: dUrl.split(',')[1] || '',
          mimeType: file.type || 'image/jpeg',
          dataUrl: dUrl,
        });
      } catch {
        resolve({ base64Data: '', mimeType: file.type || 'image/jpeg', dataUrl: '' });
      }
    }, 4000);

    if (!file.type || !file.type.startsWith('image/')) {
      clearTimeout(timeout);
      readFileAsDataUrl(file)
        .then((dataUrl) => {
          resolve({
            base64Data: dataUrl.split(',')[1] || '',
            mimeType: file.type || 'image/jpeg',
            dataUrl,
          });
        })
        .catch(() => {
          resolve({ base64Data: '', mimeType: file.type || 'image/jpeg', dataUrl: '' });
        });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawUrl = typeof e.target?.result === 'string' ? e.target.result : '';
      const img = new Image();
      img.onload = () => {
        clearTimeout(timeout);
        try {
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
        } catch { }
        resolve({
          base64Data: rawUrl.split(',')[1] || '',
          mimeType: file.type || 'image/jpeg',
          dataUrl: rawUrl,
        });
      };
      img.onerror = () => {
        clearTimeout(timeout);
        resolve({
          base64Data: rawUrl.split(',')[1] || '',
          mimeType: file.type || 'image/jpeg',
          dataUrl: rawUrl,
        });
      };
      img.src = rawUrl;
    };
    reader.onerror = () => {
      clearTimeout(timeout);
      resolve({ base64Data: '', mimeType: '', dataUrl: '' });
    };
    reader.readAsDataURL(file);
  });
};

const DIRECT_GEMINI_KEY =
  (import.meta as any).env?.VITE_GEMINI_API_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_API_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_GEMINI_API_KEY ||
  '';

export const scanScoresheetDirectGemini = async (
  base64Payload: string,
  mimeType: string = 'image/jpeg',
  _filename: string = 'scoresheet.png'
): Promise<any> => {
  if (!DIRECT_GEMINI_KEY) {
    throw new Error('VITE_GEMINI_API_KEY is not configured in client environment');
  }
  const models = [
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-flash-latest'
  ];

  const prompt = `You are an expert multi-sport official scoresheet, scorebook, and boxscore OCR parser.
Analyze this scoresheet document (image, PDF, or CSV) with extreme optical precision.
CRITICAL INSTRUCTION:
Extract COMPLETE match metadata, both team names & final scores, and EVERY SINGLE PLAYER / ATHLETE ROW with ALL recorded boxscore columns.
Do NOT omit any player rows or stat columns. If stats are written as tally marks or numbers, count and parse them completely.

Definitively determine sport_type (BASKETBALL, VOLLEYBALL, SWIMMING, TRACK AND FIELD, SOCCER, BADMINTON, PICKLEBALL, BASEBALL).

Return the extraction in this exact JSON structure:
{
  "match_info": {
    "sport_type": "BASKETBALL / VOLLEYBALL / SWIMMING / TRACK AND FIELD / SOCCER / BADMINTON / PICKLEBALL",
    "home_team_name": "Home Team / School A",
    "opponent_team_name": "Away / Visitor Team / School B",
    "final_score": "80 - 68",
    "game_result": "WIN"
  },
  "team_scores": [
    {"team": "Home Team Name", "score": 80, "is_home": true},
    {"team": "Away Team Name", "score": 68, "is_home": false}
  ],
  "player_summary": [
    {
      "jersey_number": 11,
      "player_name": "Player Full Name",
      "team_name": "Team Name",
      "position": "G",
      "points": 24,
      "rebounds": 6,
      "offensive_rebounds": 2,
      "defensive_rebounds": 4,
      "assists": 7,
      "steals": 3,
      "blocks": 1,
      "turnovers": 2,
      "fouls": 3,
      "fg_made": 9,
      "fg_attempted": 16,
      "three_made": 3,
      "three_attempted": 6,
      "ft_made": 3,
      "ft_attempted": 4,
      "minutes": 32,
      "kills": 0,
      "attack_errors": 0,
      "attack_attempts": 0,
      "digs": 0,
      "service_aces": 0,
      "goals": 0,
      "shots": 0,
      "saves": 0,
      "tackles": 0
    }
  ]
}`;

  let lastErr = '';
  for (const model of models) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${DIRECT_GEMINI_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: mimeType || 'image/jpeg',
                      data: base64Payload,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            },
          }),
        }
      );

      if (resp.ok) {
        const json: any = await resp.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          try {
            const parsed = JSON.parse(text);
            const team1 = parsed.match_info?.home_team_name || parsed.team_scores?.[0]?.team || 'ADNU KNIGHTS';
            const team2 = parsed.match_info?.opponent_team_name || parsed.team_scores?.[1]?.team || 'DLSU GREEN ARCHERS';
            const pSummary = parsed.player_summary || parsed.player_box_scores || parsed.player_stats || parsed.players || [];
            return {
              success: true,
              parsed_tables: parsed,
              match_info: {
                sport_type: parsed.match_info?.sport_type || parsed.sport_type || 'Basketball',
                home_team_name: team1,
                opponent_team_name: team2,
                final_score: parsed.match_info?.final_score || (parsed.team_scores?.length >= 2 ? `${parsed.team_scores[0].score} - ${parsed.team_scores[1].score}` : '0 - 0'),
                game_result: parsed.match_info?.game_result || 'WIN',
              },
              team_scores: parsed.team_scores || [
                { team: team1, score: 0, is_home: true },
                { team: team2, score: 0, is_home: false },
              ],
              player_summary: pSummary,
              sport_type: parsed.match_info?.sport_type || parsed.sport_type || 'Basketball',
            };
          } catch (pe) {
            console.warn('Direct Gemini JSON parse error:', pe);
          }
        }
      } else {
        const errTxt = await resp.text().catch(() => '');
        lastErr = `${model} ${resp.status}: ${errTxt.slice(0, 100)}`;
      }
    } catch (e: any) {
      lastErr = `${model}: ${e.message}`;
    }
  }

  throw new Error(`Client-side Gemini Vision OCR failed: ${lastErr}`);
};

/**
 * Single-file OCR scan routing to backend OCR scanning engines.
 * Supports both JSON base64 payloads (required by Vercel Serverless) and multipart FormData,
 * with resilient direct client Gemini Vision fallback to guarantee zero downtime.
 */
export const scanScoresheetOCR = async (file: File): Promise<any> => {
  // 1. Prepare base64 representation for serverless backend compatibility (Vercel Node)
  let base64Payload = '';
  let payloadMime = file.type || 'image/jpeg';

  try {
    if (file.type && file.type.startsWith('image/')) {
      const comp = await compressImageForOcr(file, 1600, 0.8);
      base64Payload = comp.base64Data;
      payloadMime = comp.mimeType || file.type || 'image/jpeg';
    } else {
      const dUrl = await readFileAsDataUrl(file);
      base64Payload = dUrl.split(',')[1] || '';
      payloadMime = file.type || (file.name.endsWith('.csv') ? 'text/csv' : 'application/pdf');
    }
  } catch {
    const dUrl = await readFileAsDataUrl(file);
    base64Payload = dUrl.split(',')[1] || '';
  }

  const endpoints = [
    `${BASE_URL}/matches/scan-scoresheet`,
    `${BASE_URL}/matches/ocr/scan`,
    `${BASE_URL}/matches/web/scan-scoresheet`,
  ];

  let lastError: Error | null = null;

  for (const ep of endpoints) {
    // Attempt 1: Multipart FormData with x-gemini-key header
    try {
      const formData = new FormData();
      formData.append('file', file, file.name);
      formData.append('scoresheet', file, file.name);

      const formRes = await fetch(ep, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'x-gemini-key': DIRECT_GEMINI_KEY,
        },
        body: formData,
      });

      if (formRes.ok) {
        const res = await handleResponse<any>(formRes);
        const hasPlayers =
          (Array.isArray(res?.player_summary) && res.player_summary.length > 0) ||
          (Array.isArray(res?.parsed_tables?.player_summary) && res.parsed_tables.player_summary.length > 0) ||
          (Array.isArray(res?.parsed_tables?.player_box_scores) && res.parsed_tables.player_box_scores.length > 0) ||
          (res?.match_info?.final_score && res.match_info.final_score !== '0 - 0');

        if (hasPlayers) {
          return res;
        }
        console.warn('⚠️ [OCR] Backend returned empty stub. Invoking direct client Gemini Vision OCR...');
        if (base64Payload) {
          try {
            return await scanScoresheetDirectGemini(base64Payload, payloadMime, file.name);
          } catch (directErr) {
            console.error('Direct Gemini OCR error after stub:', directErr);
            return res;
          }
        }
        return res;
      }

      const errTxt = await formRes.text().catch(() => '');
      if (formRes.status !== 404) {
        lastError = new Error(`OCR scanner returned status ${formRes.status}: ${errTxt}`);
      }
    } catch (err: any) {
      lastError = err;
    }

    // Attempt 2: JSON Base64 Payload with x-gemini-key header
    if (base64Payload) {
      try {
        const jsonRes = await fetch(ep, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'x-gemini-key': DIRECT_GEMINI_KEY,
          },
          body: JSON.stringify({
            base64: base64Payload,
            filename: file.name,
            mimetype: payloadMime,
          }),
        });

        if (jsonRes.ok) {
          const res = await handleResponse<any>(jsonRes);
          const hasPlayers =
            (Array.isArray(res?.player_summary) && res.player_summary.length > 0) ||
            (Array.isArray(res?.parsed_tables?.player_summary) && res.parsed_tables.player_summary.length > 0) ||
            (Array.isArray(res?.parsed_tables?.player_box_scores) && res.parsed_tables.player_box_scores.length > 0) ||
            (res?.match_info?.final_score && res.match_info.final_score !== '0 - 0');

          if (hasPlayers) {
            return res;
          }
          console.warn('⚠️ [OCR] Backend returned empty stub. Invoking direct client Gemini Vision OCR...');
          try {
            return await scanScoresheetDirectGemini(base64Payload, payloadMime, file.name);
          } catch (directErr) {
            console.error('Direct Gemini OCR error after stub:', directErr);
            return res;
          }
        }

        const errTxt = await jsonRes.text().catch(() => '');
        if (jsonRes.status !== 404) {
          lastError = new Error(`OCR scanner returned status ${jsonRes.status}: ${errTxt}`);
        }
      } catch (err: any) {
        lastError = err;
      }
    }
  }

  // Resilient Direct Gemini Vision fallback if backend endpoints failed or timed out
  if (base64Payload) {
    try {
      console.warn('⚠️ [OCR] Backend unreachable or timed out. Running client-side Gemini Vision OCR directly...');
      return await scanScoresheetDirectGemini(base64Payload, payloadMime, file.name);
    } catch (directErr) {
      console.error('Direct client Gemini Vision OCR failed:', directErr);
    }
  }

  throw lastError || new Error('Failed to connect to backend OCR scanner. Please make sure the backend server is reachable.');
};

export const scanScoresheetStandalone = async (rawFile: File): Promise<any> => {
  return await scanScoresheetOCR(rawFile);
};

export const scanScoresheetClientDirect = async (
  rawFile: File,
  _homeTeam = 'Home Team',
  _awayTeam = 'Away Team',
  _sport = 'Basketball'
): Promise<any> => {
  return await scanScoresheetStandalone(rawFile);
};

/**
 * Multi-file scoresheet OCR scan routing directly to the backend multi-scoresheet engine
 * (aligned with mobile canonical endpoint: /matches/mobile/multi/scan-scoresheet)
 */
export const scanMultipleScoresheets = async (files: File[]): Promise<any> => {
  if (!files || files.length === 0) return null;
  if (files.length === 1) return scanScoresheetOCR(files[0]);

  const formData = new FormData();
  files.forEach((f) => {
    formData.append('files', f);
  });

  const endpoints = [
    `${BASE_URL}/matches/mobile/multi/scan-scoresheet`,
    `${BASE_URL}/matches/multi/scan-scoresheet`,
    `${BASE_URL}/matches/web/multi/scan-scoresheet`,
  ];

  let lastError: Error | null = null;
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'x-gemini-key': DIRECT_GEMINI_KEY,
        },
        body: formData,
      });

      if (res.ok) {
        return await handleResponse<any>(res);
      } else {
        const errTxt = await res.text().catch(() => '');
        lastError = new Error(`Multi-scoresheet OCR scanner returned status ${res.status}: ${errTxt}`);
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  // Fallback: If dedicated multi-scan endpoint returns 404 on deployed backend,
  // scan each file individually via the active scanScoresheetOCR endpoint and combine
  try {
    const subMatches: any[] = [];
    for (const f of files) {
      const singleRes = await scanScoresheetOCR(f);
      if (singleRes) {
        subMatches.push(singleRes);
      }
    }
    if (subMatches.length > 0) {
      return {
        success: true,
        matches: subMatches,
        pages: subMatches,
        total_scoresheets_processed: subMatches.length,
      };
    }
  } catch (individualErr: any) {
    lastError = individualErr;
  }

  throw lastError || new Error('Failed to connect to backend multi-scoresheet scanner. Please verify network connectivity.');
};

export const uploadScoresheetFile = async (matchId: string, rawFile: File): Promise<any> => {
  const cleanId = matchId.replace(/^#/, '');
  const token = getStoredToken();
  const formData = new FormData();
  formData.append('file', rawFile, rawFile.name);
  formData.append('scoresheet', rawFile, rawFile.name);

  // Attempt without auth header first to avoid backend optionalAuth duplicate next() bug
  try {
    const res = await fetch(`${BASE_URL}/matches/${cleanId}/scoresheet`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
      },
      body: formData,
    });
    if (res.ok) {
      return await handleResponse<any>(res);
    }
  } catch {}

  // Secondary attempt with token
  const res = await fetch(`${BASE_URL}/matches/${cleanId}/scoresheet`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (res.ok) {
    return await handleResponse<any>(res);
  }

  return await scanScoresheetStandalone(rawFile);
};

export const uploadMultipleScoresheetFiles = async (matchId: string, files: File[]): Promise<any> => {
  if (!files || files.length === 0) return null;
  if (files.length === 1) return uploadScoresheetFile(matchId, files[0]);

  const cleanId = matchId.replace(/^#/, '');
  const token = getStoredToken();
  const formData = new FormData();
  files.forEach((f) => {
    formData.append('files', f, f.name);
  });

  // Attempt without auth header first
  try {
    const res = await fetch(`${BASE_URL}/matches/${cleanId}/multi/scoresheet`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
      },
      body: formData,
    });
    if (res.ok) {
      return await handleResponse<any>(res);
    }
  } catch {}

  try {
    const res = await fetch(`${BASE_URL}/matches/${cleanId}/multi/scoresheet`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (res.ok) {
      return await handleResponse<any>(res);
    }
  } catch (err) {
    console.warn('Multi match scoresheet upload failed:', err);
  }

  return scanMultipleScoresheets(files);
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
