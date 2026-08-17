import { db } from '../utils/firebaseAdmin';
import {
  MatchLog,
  PerformanceMetric,
  BasketballStats,
  IndividualSportStats,
  MatchSubmissionPayload,
  ParsedScoresheetResult,
  BoxscoreResponse,
  BoxscorePlayerMetric,
  SportType,
} from '../models/matchModel';
import { ServiceError, validateScoresheetUpload } from '../validators/matchValidator';

// ─── Multi-Sport Efficiency Calculation Formulas ─────────────────────────────

/**
 * Calculates Basketball Player Efficiency Rating (EFF) & True Shooting Percentage (TS%).
 * Basketball EFF = (PTS + REB + AST + STL + BLK) - ((FGA - FGM) + (FTA - FTM) + TO)
 * Basketball TS% = PTS / (2 * (FGA + (0.44 * FTA)))
 */
export function calculateBasketballMetrics(stats: Record<string, any>): {
  efficiency: number;
  trueShootingPct: number;
  enrichedStats: BasketballStats;
} {
  const points = Number(stats.points || 0);
  const assists = Number(stats.assists || 0);
  const oReb = Number(stats.offensive_rebounds || 0);
  const dReb = Number(stats.defensive_rebounds || 0);
  const totalRebounds = oReb + dReb;
  const fouls = Number(stats.fouls || 0);
  const turnovers = Number(stats.turnovers || 0);
  const steals = Number(stats.steals || 0);
  const blocks = Number(stats.blocks || 0);
  const fgMade = Number(stats.fg_made || 0);
  const fgAttempted = Number(stats.fg_attempted || 0);
  const ftMade = Number(stats.ft_made || 0);
  const ftAttempted = Number(stats.ft_attempted || 0);

  // Calculate Basketball EFF
  const missesFG = Math.max(0, fgAttempted - fgMade);
  const missesFT = Math.max(0, ftAttempted - ftMade);
  const positiveContrib = points + totalRebounds + assists + steals + blocks;
  const negativeContrib = missesFG + missesFT + turnovers;
  const efficiency = Number((positiveContrib - negativeContrib).toFixed(2));

  // Calculate True Shooting Percentage (TS%)
  const tsDenominator = 2 * (fgAttempted + 0.44 * ftAttempted);
  const tsFraction = tsDenominator > 0 ? points / tsDenominator : 0;
  const trueShootingPct = Number((tsFraction * 100).toFixed(2)); // percentage string

  const enrichedStats: BasketballStats = {
    points,
    assists,
    offensive_rebounds: oReb,
    defensive_rebounds: dReb,
    fouls,
    turnovers,
    steals,
    fg_made: fgMade,
    fg_attempted: fgAttempted,
    ft_made: ftMade,
    ft_attempted: ftAttempted,
    true_shooting_pct: trueShootingPct,
  };

  return { efficiency, trueShootingPct, enrichedStats };
}

/**
 * Calculates Individual Sports (Swimming / Track & Field) Efficiency Score.
 * If is_disqualified === true -> efficiency = 0.
 * Otherwise computed speed score based on distance, finish time, and split consistency.
 */
export function calculateIndividualSportMetrics(stats: Record<string, any>): {
  efficiency: number;
  enrichedStats: IndividualSportStats;
} {
  const eventName = String(stats.event_name || '100m Freestyle').trim();
  const distanceMeters = Number(stats.distance_meters || 100);
  const finishTimeMs = Number(stats.finish_time_ms || 60000);
  const splitTimesMs = Array.isArray(stats.split_times_ms) ? stats.split_times_ms.map(Number) : [];
  const isDisqualified = !!stats.is_disqualified;

  let efficiency = 0;

  if (!isDisqualified && finishTimeMs > 0) {
    // Speed in meters per second
    const speedMps = distanceMeters / (finishTimeMs / 1000);
    // Base efficiency scaled to 100 max
    const baseScore = speedMps * 12.5;

    // Split consistency factor
    let splitFactor = 1.0;
    if (splitTimesMs.length > 1) {
      const avgSplit = splitTimesMs.reduce((a, b) => a + b, 0) / splitTimesMs.length;
      const variance = splitTimesMs.reduce((sum, val) => sum + Math.abs(val - avgSplit), 0) / splitTimesMs.length;
      splitFactor = Math.max(0.85, 1 - variance / avgSplit);
    }

    efficiency = Number((baseScore * splitFactor).toFixed(2));
  }

  const enrichedStats: IndividualSportStats = {
    event_name: eventName,
    distance_meters: distanceMeters,
    finish_time_ms: finishTimeMs,
    split_times_ms: splitTimesMs,
    is_disqualified: isDisqualified,
  };

  return { efficiency, enrichedStats };
}

/**
 * Calculates dynamic player efficiency for custom registered sports configurations.
 */
export function calculateDynamicSportMetrics(stats: Record<string, any>): {
  efficiency: number;
  enrichedStats: Record<string, any>;
} {
  let positiveScore = 0;
  let negativeScore = 0;

  for (const [key, value] of Object.entries(stats)) {
    const num = Number(value);
    if (!isNaN(num)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('error') ||
        lowerKey.includes('turnover') ||
        lowerKey.includes('foul') ||
        lowerKey.includes('miss') ||
        lowerKey.includes('fault')
      ) {
        negativeScore += Math.abs(num);
      } else {
        positiveScore += num;
      }
    }
  }

  const efficiency = Number(Math.max(0, positiveScore - negativeScore).toFixed(2));
  return { efficiency, enrichedStats: { ...stats } };
}

// ─── Service Core Functions ──────────────────────────────────────────────────

/**
 * Submit live game log session and stats payload.
 * POST /api/v1/matches
 *
 * ACCEPTANCE CRITERIA:
 * 1. Require Idempotency-Key header on POST submissions.
 * 2. Duplicate match submissions with identical idempotency keys return the original recorded result.
 */
export async function submitMatchSession(
  coachId: string,
  payload: MatchSubmissionPayload,
  idempotencyKey: string,
) {
  const key = idempotencyKey.trim();

  // Check idempotency cache in Firestore
  const idempotencyDoc = await db.collection('Idempotency_Keys').doc(key).get();
  if (idempotencyDoc.exists) {
    console.log(`ℹ️ [IDEMPOTENCY REPLAY] Returning cached result for key '${key}'`);
    return idempotencyDoc.data()!.response;
  }

  const matchId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const matchLog: MatchLog = {
    match_id: matchId,
    team_id: payload.team_id,
    logged_by_coach_id: coachId,
    sport_type: payload.sport_type,
    match_type: payload.match_type.trim(),
    match_date: payload.match_date,
    location: payload.location.trim(),
    opponent_team_name: payload.opponent_team_name.trim(),
    game_result: payload.game_result,
    roster_athletes: (payload.player_stats || []).map((p) => p.athlete_id),
    notes: payload.notes ? payload.notes.trim() : null,
    idempotency_key: key,
    timestamp: now,
  };

  const performanceMetrics: PerformanceMetric[] = [];

  for (const item of payload.player_stats || []) {
    const athleteId = item.athlete_id;
    const rawStats = item.stats || {};
    const metricId = `metric_${matchId}_${athleteId}`;

    let efficiency = 0;
    let enrichedStats: any = rawStats;

    if (payload.sport_type === 'Basketball') {
      const computed = calculateBasketballMetrics(rawStats);
      efficiency = computed.efficiency;
      enrichedStats = computed.enrichedStats;
    } else if (payload.sport_type === 'Swimming' || payload.sport_type === 'Track & Field') {
      const computed = calculateIndividualSportMetrics(rawStats);
      efficiency = computed.efficiency;
      enrichedStats = computed.enrichedStats;
    } else {
      const computed = calculateDynamicSportMetrics(rawStats);
      efficiency = computed.efficiency;
      enrichedStats = computed.enrichedStats;
    }

    const metric: PerformanceMetric = {
      metric_id: metricId,
      athlete_id: athleteId,
      match_id: matchId,
      sport_category: payload.sport_type,
      sport_stats: enrichedStats,
      calculated_player_efficiency: efficiency,
      timestamp: now,
    };

    performanceMetrics.push(metric);
  }

  // Execute atomic batch write: Match Log + Performance Metrics + Idempotency Record
  const batch = db.batch();
  const matchRef = db.collection('Match_Logs').doc(matchId);
  batch.set(matchRef, matchLog);

  for (const metric of performanceMetrics) {
    const metricRef = db.collection('Performance_Metrics').doc(metric.metric_id);
    batch.set(metricRef, metric);
  }

  const responsePayload = {
    message: 'Live match log session recorded successfully.',
    match: matchLog,
    total_players_logged: performanceMetrics.length,
    performance_metrics: performanceMetrics,
  };

  // Cache idempotency response
  const idempotencyRef = db.collection('Idempotency_Keys').doc(key);
  batch.set(idempotencyRef, {
    key,
    response: responsePayload,
    created_at: now,
  });

  await batch.commit();

  return responsePayload;
}

/**
 * Process scoresheet image/PDF upload via OCR.
 * POST /api/v1/matches/:matchId/scoresheet
 *
 * Strategy:
 *   1. PRIMARY: Google Gemini Vision API (gemini-3.5-flash) — reads handwritten paper scoresheets accurately.
 *   2. FALLBACK: sharp image preprocessing + Tesseract.js — for printed/typed scoresheets.
 *
 * ACCEPTANCE CRITERIA: File uploads over 25MB return HTTP 413 Payload Too Large.
 */
export async function processScoresheetOCR(matchId: string, file?: Express.Multer.File): Promise<ParsedScoresheetResult> {
  validateScoresheetUpload(file);

  // Save the uploaded file to the scratch folder for analysis
  if (file && file.buffer) {
    try {
      const fs = require('fs');
      const path = require('path');
      const scratchDir = path.resolve(__dirname, '..', 'scratch');
      if (!fs.existsSync(scratchDir)) {
        fs.mkdirSync(scratchDir, { recursive: true });
      }
      fs.writeFileSync(path.join(scratchDir, 'last_uploaded.jpg'), file.buffer);
    } catch (saveErr: any) {
      console.warn('⚠️ [DEBUG] Could not save uploaded file to scratch:', saveErr.message);
    }
  }

  const matchDoc = await db.collection('Match_Logs').doc(matchId).get();
  if (!matchDoc.exists) {
    throw new ServiceError(`Match with ID '${matchId}' was not found.`, 404);
  }

  const filename = file ? file.originalname : `scoresheet_${matchId}.png`;
  const scoresheetUrl = `https://atleta.ph/uploads/scoresheets/${filename}`;
  const now = new Date().toISOString();

  // Ensure dotenv is loaded so GEMINI_API_KEY is available
  require('dotenv').config();
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!geminiKey) {
    throw new ServiceError('GEMINI_API_KEY is not configured in .env', 500);
  }

  if (!file || !file.buffer) {
    throw new ServiceError('No scoresheet file uploaded.', 400);
  }

  try {
    const mimeType = file.mimetype || 'image/jpeg';
    let requestBody: any;

    if (mimeType === 'text/csv' || mimeType === 'application/vnd.ms-excel' || filename.endsWith('.csv')) {
      const csvText = file.buffer.toString('utf-8');
      const promptText = `Analyze the following basketball scoresheet CSV data:
${csvText}

Extract the data into this exact JSON format:
{"team_scores":[{"team":"TeamName","score":0}],"player_summary":[{"player_name":"Full Name","jersey_number":0,"points":0,"rebounds":0,"assists":0,"fouls":0}]}

Important:
- Return ONLY the JSON object, nothing else.`;

      requestBody = {
        contents: [
          {
            parts: [
              { text: promptText }
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      };
    } else {
      const base64Image = file.buffer.toString('base64');
      const promptText = `Look at this basketball scoresheet carefully. It has two teams with player rows containing jersey numbers (#), player names, quarter scores (Q1-Q4), field goals, free throws, and total points (PTS).

Extract the data into this exact JSON format:
{"team_scores":[{"team":"TeamName","score":0}],"player_summary":[{"player_name":"Full Name","jersey_number":0,"points":0,"rebounds":0,"assists":0,"fouls":0}]}

Important:
- The FINAL SCORE line at the bottom shows each team's total score.
- Each player row has: jersey # | Name | Position | Q1 | Q2 | Q3 | Q4 | FT | FGM/FGA | FTM/FTA | PTS
- The PTS column is the LAST number column on each player row.
- Include ALL players from BOTH teams (VISITORS and HOME).
- Use 0 for any stat you cannot read clearly.
- Return ONLY the JSON object, nothing else.`;

      requestBody = {
        contents: [
          {
            parts: [
              { text: promptText },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      };
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errBody = await response.text();
      console.error('❌ [OCR] Google Gemini API error:', response.status, response.statusText);
      console.error('❌ [OCR] Error body:', errBody);
      throw new ServiceError(`Google Gemini API error: ${response.statusText}`, 502);
    }

    const jsonRes: any = await response.json();
    const content = jsonRes.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new ServiceError('Google Gemini API returned an empty response.', 502);
    }

    // Strip markdown code fences if present (```json ... ```)
    const cleanContent = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const aiParsed = JSON.parse(cleanContent);
    const playerSummary: any[] = aiParsed.player_summary || [];

    // Save scoresheet_url to Match_Logs
    await db.collection('Match_Logs').doc(matchId).set({ scoresheet_url: scoresheetUrl }, { merge: true });

    // Populate Performance_Metrics for matched roster athletes from OCR
    const matchData = matchDoc.data()!;
    const teamId = matchData.team_id;

    if (teamId && playerSummary.length > 0) {
      const teamDoc = await db.collection('Teams').doc(teamId).get();
      if (teamDoc.exists) {
        const roster = teamDoc.data()?.roster_list || [];
        const batch = db.batch();
        let metricCount = 0;

        for (const item of playerSummary) {
          const jerseyNum = Number(item.jersey_number);
          const pName = String(item.player_name || '').toLowerCase();

          // Find athlete in team roster matching jersey number or name
          const matchedAthlete = roster.find((r: any) => {
            if (jerseyNum > 0 && Number(r.jersey_number) === jerseyNum) return true;
            const rName = `${r.first_name || ''} ${r.last_name || ''}`.toLowerCase();
            return pName.length > 0 && (rName.includes(pName) || pName.includes(rName));
          });

          if (matchedAthlete && matchedAthlete.athlete_id) {
            const athleteId = matchedAthlete.athlete_id;
            const metricId = `metric_${matchId}_${athleteId}`;

            const rawStats = {
              points: Number(item.points || 0),
              assists: Number(item.assists || 0),
              rebounds: Number(item.rebounds || 0),
              fouls: Number(item.fouls || 0),
            };

            const computed = calculateBasketballMetrics(rawStats);
            const metric: PerformanceMetric = {
              metric_id: metricId,
              athlete_id: athleteId,
              match_id: matchId,
              sport_category: matchData.sport_type || 'Basketball',
              sport_stats: computed.enrichedStats,
              calculated_player_efficiency: computed.efficiency,
              timestamp: now,
            };

            const metricRef = db.collection('Performance_Metrics').doc(metricId);
            batch.set(metricRef, metric);
            metricCount++;
          }
        }

        if (metricCount > 0) {
          await batch.commit();
          console.log(`✅ [OCR METRICS] Populated ${metricCount} player Performance_Metrics records from OCR.`);
        }
      }
    }

    return {
      match_id: matchId,
      scoresheet_url: scoresheetUrl,
      parsed_tables: {
        team_scores: aiParsed.team_scores || [],
        player_summary: playerSummary,
      },
      raw_ocr_text: 'Processed via Google Gemini API (gemini-3.5-flash)',
      processed_at: now,
    };
  } catch (aiErr: any) {
    console.error('❌ [OCR] Google Gemini failed:', aiErr.message);
    if (aiErr instanceof ServiceError) {
      throw aiErr;
    }
    throw new ServiceError(`OCR Processing failed: ${aiErr.message}`, 500);
  }
}


/**
 * Fetch compiled match stats and computed efficiency metrics.
 * GET /api/v1/matches/:matchId/boxscore
 */
export async function getMatchBoxscore(matchId: string): Promise<BoxscoreResponse> {
  const matchDoc = await db.collection('Match_Logs').doc(matchId).get();

  if (!matchDoc.exists) {
    throw new ServiceError(`Match with ID '${matchId}' was not found.`, 404);
  }

  const matchData = matchDoc.data() as MatchLog;

  // Fetch team summary
  let teamName = 'Home Team';
  const teamDoc = await db.collection('Teams').doc(matchData.team_id).get();
  if (teamDoc.exists) {
    teamName = teamDoc.data()!.team_name || teamName;
  }

  // Fetch performance metrics for this match
  const metricsSnapshot = await db
    .collection('Performance_Metrics')
    .where('match_id', '==', matchId)
    .get();

  const playerMetrics: BoxscorePlayerMetric[] = [];

  for (const doc of metricsSnapshot.docs) {
    const data = doc.data() as PerformanceMetric;
    const athleteId = data.athlete_id;

    const profileDoc = await db.collection('Athlete_Profiles').doc(athleteId).get();
    const profileData = profileDoc.exists ? profileDoc.data()! : {};

    let firstName = profileData.first_name || '';
    let lastName = profileData.last_name || '';

    if (!firstName || !lastName) {
      const userDoc = await db.collection('Users').doc(profileData.user_id || athleteId).get();
      if (userDoc.exists) {
        const u = userDoc.data()!;
        firstName = firstName || u.first_name || 'Athlete';
        lastName = lastName || u.last_name || '';
      }
    }

    playerMetrics.push({
      metric_id: data.metric_id,
      athlete_id: athleteId,
      user_id: profileData.user_id || athleteId,
      first_name: firstName || 'Athlete',
      last_name: lastName || '',
      position: profileData.position || 'Unassigned',
      jersey_number: profileData.jersey_number ?? null,
      sport_stats: data.sport_stats,
      calculated_player_efficiency: data.calculated_player_efficiency,
    });
  }

  return {
    match: matchData,
    team_summary: {
      team_id: matchData.team_id,
      team_name: teamName,
      opponent_team_name: matchData.opponent_team_name,
      game_result: matchData.game_result,
      match_date: matchData.match_date,
      location: matchData.location,
    },
    player_metrics: playerMetrics,
  };
}
