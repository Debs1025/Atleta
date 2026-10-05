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
  const base = String(
    (import.meta as any).env?.VITE_GEMINI_ENDPOINT ||
    'https://generativelanguage.googleapis.com/v1beta/models'
  ).trim().replace(/\/+$/, '');
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
  maxDimension = 2000,
  quality = 0.90
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

  // 1. Try dedicated Backend OCR endpoints first
  try {
    const blob = dataUrl ? await fetch(dataUrl).then((r) => r.blob()).catch(() => rawFile) : rawFile;
    const cleanName = rawFile.name.replace(/\.[^/.]+$/, '') + '.jpg';
    const optimizedFile = new File([blob], cleanName, { type: mimeType || 'image/jpeg' });

    const formData = new FormData();
    formData.append('file', optimizedFile);
    formData.append('scoresheet', optimizedFile);
    formData.append('document', optimizedFile);
    const token = getStoredToken();

    const endpoints = [
      `${BASE_URL}/matches/web/scan-scoresheet`,
      `${BASE_URL}/matches/ocr/scan`,
      `${BASE_URL}/matches/scan-scoresheet`,
    ];

    for (const endpoint of endpoints) {
      try {
        const backendRes = await fetch(endpoint, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
        if (backendRes.ok) {
          const data = await backendRes.json();
          if (data && (Array.isArray(data.player_summary) || Array.isArray(data.team_scores) || Array.isArray(data.race_results))) {
            return {
              scoresheet_url: data.scoresheet_url || dataUrl,
              ...data,
            };
          }
        }
      } catch {}
    }
  } catch (backendErr) {
    console.warn('Backend web scan-scoresheet unreachable, trying direct client AI call:', backendErr);
  }

  // 2. Direct client-side Gemini Vision OCR call with resilient model waterfall
  if (base64Data && geminiKey) {
    const modelsToTry = [
      { name: 'gemini-flash-lite-latest', config: { temperature: 0.1, maxOutputTokens: 8192 } },
      { name: 'gemini-3.5-flash-lite', config: { temperature: 0.1, maxOutputTokens: 8192 } },
      { name: 'gemini-3.5-flash', config: { temperature: 0.1, maxOutputTokens: 8192 } },
      { name: 'gemini-flash-latest', config: { temperature: 0.1, maxOutputTokens: 8192 } },
      { name: 'gemini-pro-latest', config: { temperature: 0.1, maxOutputTokens: 8192 } },
    ];

    const promptText = `You are an expert multi-sport official scoresheet, scorebook, and boxscore OCR parser.
Analyze this scoresheet document (image, PDF, or table) with extreme optical precision.
Extract ALL athlete statistics across ANY sport (${sport}, Basketball, Volleyball, Swimming, Track & Field, Soccer, Badminton, Pickleball, Tennis, Baseball/Softball, or custom sport).

SPORT IDENTIFICATION & VERIFICATION (MANDATORY):
Examine the scoresheet column headers, terminology, and structure to definitively determine sport_type:
- "VOLLEYBALL": When document contains Kills (K), Attacks (TA/E), Digs (D), Sets (SP), Blocks (BS/BA), Aces (SA/SE), Rotation numbers, or Libero (L).
- "SOCCER": When document contains Goals (G), Shots (SH), SOG, Saves (SV), Fouls (FC), Offsides, Cards (YC/RC).
- "SWIMMING": When document contains Stroke (Free, Fly, Breast, Back, IM), Heat, Lane, Splits, Finish Time, Seed Time.
- "TRACK AND FIELD": When document contains Distance, 100m/200m/400m/Hurdles, Heat, Lane, Mark, Time.
- "BADMINTON" / "PICKLEBALL" / "TENNIS": When document contains Smashes, Net Kills, Faults, Aces, Rallies.
- "BASEBALL": When document contains AB, R, H, RBI, HR, BB, SO/K, IP, ER.
- "BASKETBALL": When document contains FGM/FGA, 3PM/3PA, FTM/FTA, PTS, REB, AST, STL, BLK, TO, PF.

SPORT-SPECIFIC PARSING GUIDELINES:
1. BASKETBALL:
   - Extract: jersey_number, player_name, team_name, points, rebounds (offensive & defensive), assists, steals, blocks, turnovers, personal fouls, field goals (fg_made, fg_attempted), 3-pointers (three_made, three_attempted), free throws (ft_made, ft_attempted), minutes.
   - Derivation: points = (fg_made * 2) + (three_made * 3) + ft_made. rebounds = offensive_rebounds + defensive_rebounds.
2. VOLLEYBALL:
   - Extract: jersey_number, player_name, team_name, sets_played (SP), kills (K), attack_errors (E), attack_attempts (TA), assists (A/Sets), service_aces (SA), service_errors (SE), reception_errors (RE), digs (D), block_solos (BS), block_assists (BA), block_points (TB), points (PTS).
   - Derivation: points = kills + service_aces + block_points. Count set-by-set tally marks across Set 1..5.
   - VOLLEYBALL MATCH SCORE RULE: In volleyball, match scores are measured in SETS WON (e.g. "3 - 1", "3 - 0", or "3 - 2").
   - For volleyball team_scores: "score" is the number of sets won (0 to 3), NOT total match points (do not say 96 sets!).
3. SOCCER / FOOTBALL:
   - Extract: jersey_number, player_name, team_name, goals (G), assists (A), shots (SH), shots_on_target (SOG), fouls_committed (FC), yellow_cards (YC), red_cards (RC), saves (SV), tackles (TKL), offsides (OFF), minutes (MIN).
   - Derivation: points = goals.
4. SWIMMING & TRACK / FIELD:
   - Extract: rank (Place), player_name, team_name (School/Club), event (e.g. 50m Free, 100m Dash, 4x100m Relay, Long Jump), heat, lane, finish_time (e.g. 00:24.35, 1:02.14, 10.42s), split_time, seed_time, distance_m, stroke_count, points (team points scored).
5. BADMINTON, PICKLEBALL, TENNIS:
   - Extract: player_name, team_name, points (total rally points), smash_winners, net_kills, unforced_errors, service_faults, service_aces, games_won.
6. BASEBALL / SOFTBALL:
   - Extract: jersey_number, player_name, at_bats (AB), runs (R), hits (H), rbi (RBI), home_runs (HR), walks (BB), strikeouts (SO/K), innings_pitched (IP), earned_runs (ER).

Return the extraction in this exact JSON structure:

{
  "match_info": {
    "sport_type": "${sport}",
    "event_name": "Tournament / League / Meet / Game Name",
    "home_team_name": "Home Team / School A",
    "opponent_team_name": "Away / Visitor Team / School B",
    "game_result": "WIN",
    "final_score": "88 - 76 (or 3 - 1 for volleyball sets)",
    "quarter_scores": [
      {"quarter": "Q1 / Set 1", "home": 25, "away": 20},
      {"quarter": "Q2 / Set 2", "home": 25, "away": 22}
    ]
  },
  "team_scores": [
    {"team": "Home Team Name", "score": 88, "is_home": true},
    {"team": "Away Team Name", "score": 76, "is_home": false}
  ],
  "player_summary": [
    {
      "jersey_number": 7,
      "player_name": "Player Full Name",
      "team_name": "Team Name",
      "position": "G / OH / MB / S / L / Forward",
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
      "kills": 14,
      "attack_errors": 3,
      "attack_attempts": 28,
      "digs": 8,
      "service_aces": 2,
      "service_errors": 1,
      "reception_errors": 0,
      "block_solos": 1,
      "block_assists": 2,
      "block_points": 3,
      "sets_played": 4,
      "goals": 0,
      "shots": 0,
      "shots_on_target": 0,
      "saves": 0,
      "yellow_cards": 0,
      "red_cards": 0,
      "smash_winners": 0,
      "net_kills": 0,
      "unforced_errors": 0,
      "service_faults": 0,
      "event": "100m Freestyle",
      "heat": 1,
      "lane": 4,
      "finish_time": "00:54.20",
      "split_time": "26.10, 28.10",
      "seed_time": "00:55.00",
      "stroke_count": 34,
      "distance_m": 100,
      "rank": 1
    }
  ],
  "race_results": [
    {
      "rank": 1,
      "athlete_name": "Athlete Full Name",
      "team_name": "Team Name / School",
      "distance": "100m Freestyle",
      "finish_time": "00:54.20",
      "split_times": "26.10, 28.10",
      "efficiency": "95%",
      "status": "OFFICIAL"
    }
  ]
}

CRITICAL RULES:
1. EXTRACT EVERY ATHLETE ROW: You MUST transcribe EVERY player row from BOTH teams shown on the scoresheet into the "player_summary" array.
2. STATS ACCURACY: For each player, include their exact jersey number, actual name, team name, and exact points/stats/times recorded on the sheet.
3. COUNT TALLY MARKS: Count all tick marks (/ , X , | , •) across columns.
4. DERIVE MISSING TOTALS: If total points is smudged or blank, calculate it from the component statistics.
5. FOR SWIMMING / TRACK & FIELD: Populate "race_results" array with ranks, athlete names, team/school affiliation, event distances, finish times, and splits.
6. RETURN ONLY VALID JSON. No markdown backticks, no explanatory commentary.`;

    for (const mObj of modelsToTry) {
      try {
        const geminiUrl = getGeminiEndpoint(mObj.name);
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
              if (parsed && (Array.isArray(parsed.player_summary) || Array.isArray(parsed.team_scores) || Array.isArray(parsed.race_results))) {
                ocrResult = parsed;
                break;
              }
            } catch (pErr) {
              clean = clean.replace(/,\s*([\}\]])/g, '$1');
              try {
                const parsed = JSON.parse(clean);
                if (parsed && (Array.isArray(parsed.player_summary) || Array.isArray(parsed.team_scores) || Array.isArray(parsed.race_results))) {
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
      race_results: [],
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

  try {
    const res = await fetch(`${BASE_URL}/matches/ocr/scan`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (backendErr) {
    console.warn('Backend scanScoresheetOCR unreachable, using client scanner fallback:', backendErr);
  }

  return await scanScoresheetClientDirect(file);
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
