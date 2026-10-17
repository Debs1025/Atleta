import { db } from '../utils/firebaseAdmin';
import { TournamentBracket, BracketStage, BracketMatch } from '../models/tournamentModel';
import crypto from 'crypto';

const COLLECTION_NAME = 'Tournament_Brackets';

export function createDefaultSingleEliminationBracket(
  tournamentName: string,
  sportType: string,
  teams: string[]
): TournamentBracket {
  const bracketId = `BRACKET_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const now = new Date().toISOString();

  // Standardize 8 or 4 teams
  const defaultTeams = [
    'DLSU GREEN ARCHERS',
    'ATENEO BLUE EAGLES',
    'UP FIGHTING MAROONS',
    'UST GROWLING TIGERS',
    'FEU TAMARAWS',
    'NU BULLDOGS',
    'ADAMSON SOARING FALCONS',
    'UE RED WARRIORS',
  ];

  const seedList = teams.length >= 4 ? teams : defaultTeams;
  const numTeams = seedList.length >= 8 ? 8 : 4;
  const activeTeams = seedList.slice(0, numTeams);

  const stages: BracketStage[] = [];

  if (numTeams === 8) {
    // 1. Quarterfinals (4 matches)
    const qfMatches: BracketMatch[] = [
      {
        match_id: `M_QF_1`,
        round_number: 1,
        stage_name: 'Quarterfinals',
        home_team: { team_name: activeTeams[0] || 'Team 1', seed: 1, score: 0 },
        away_team: { team_name: activeTeams[7] || 'Team 8', seed: 8, score: 0 },
        status: 'SCHEDULED',
        next_match_id: 'M_SF_1',
        slot_for_next: 'home',
      },
      {
        match_id: `M_QF_2`,
        round_number: 1,
        stage_name: 'Quarterfinals',
        home_team: { team_name: activeTeams[3] || 'Team 4', seed: 4, score: 0 },
        away_team: { team_name: activeTeams[4] || 'Team 5', seed: 5, score: 0 },
        status: 'SCHEDULED',
        next_match_id: 'M_SF_1',
        slot_for_next: 'away',
      },
      {
        match_id: `M_QF_3`,
        round_number: 1,
        stage_name: 'Quarterfinals',
        home_team: { team_name: activeTeams[1] || 'Team 2', seed: 2, score: 0 },
        away_team: { team_name: activeTeams[6] || 'Team 7', seed: 7, score: 0 },
        status: 'SCHEDULED',
        next_match_id: 'M_SF_2',
        slot_for_next: 'home',
      },
      {
        match_id: `M_QF_4`,
        round_number: 1,
        stage_name: 'Quarterfinals',
        home_team: { team_name: activeTeams[2] || 'Team 3', seed: 3, score: 0 },
        away_team: { team_name: activeTeams[5] || 'Team 6', seed: 6, score: 0 },
        status: 'SCHEDULED',
        next_match_id: 'M_SF_2',
        slot_for_next: 'away',
      },
    ];
    stages.push({ stage_name: 'Quarterfinals', round_number: 1, matches: qfMatches });

    // 2. Semifinals (2 matches)
    const sfMatches: BracketMatch[] = [
      {
        match_id: `M_SF_1`,
        round_number: 2,
        stage_name: 'Semifinals',
        home_team: { team_name: 'TBD (Winner QF 1)', score: 0 },
        away_team: { team_name: 'TBD (Winner QF 2)', score: 0 },
        status: 'PENDING',
        next_match_id: 'M_FINALS',
        slot_for_next: 'home',
      },
      {
        match_id: `M_SF_2`,
        round_number: 2,
        stage_name: 'Semifinals',
        home_team: { team_name: 'TBD (Winner QF 3)', score: 0 },
        away_team: { team_name: 'TBD (Winner QF 4)', score: 0 },
        status: 'PENDING',
        next_match_id: 'M_FINALS',
        slot_for_next: 'away',
      },
    ];
    stages.push({ stage_name: 'Semifinals', round_number: 2, matches: sfMatches });

    // 3. Finals (1 match)
    const finalsMatches: BracketMatch[] = [
      {
        match_id: `M_FINALS`,
        round_number: 3,
        stage_name: 'Finals',
        home_team: { team_name: 'TBD (Winner SF 1)', score: 0 },
        away_team: { team_name: 'TBD (Winner SF 2)', score: 0 },
        status: 'PENDING',
      },
    ];
    stages.push({ stage_name: 'Finals', round_number: 3, matches: finalsMatches });
  } else {
    // 4 Teams: Semifinals and Finals
    const sfMatches: BracketMatch[] = [
      {
        match_id: `M_SF_1`,
        round_number: 1,
        stage_name: 'Semifinals',
        home_team: { team_name: activeTeams[0] || 'Team 1', seed: 1, score: 0 },
        away_team: { team_name: activeTeams[3] || 'Team 4', seed: 4, score: 0 },
        status: 'SCHEDULED',
        next_match_id: 'M_FINALS',
        slot_for_next: 'home',
      },
      {
        match_id: `M_SF_2`,
        round_number: 1,
        stage_name: 'Semifinals',
        home_team: { team_name: activeTeams[1] || 'Team 2', seed: 2, score: 0 },
        away_team: { team_name: activeTeams[2] || 'Team 3', seed: 3, score: 0 },
        status: 'SCHEDULED',
        next_match_id: 'M_FINALS',
        slot_for_next: 'away',
      },
    ];
    stages.push({ stage_name: 'Semifinals', round_number: 1, matches: sfMatches });

    const finalsMatches: BracketMatch[] = [
      {
        match_id: `M_FINALS`,
        round_number: 2,
        stage_name: 'Finals',
        home_team: { team_name: 'TBD (Winner SF 1)', score: 0 },
        away_team: { team_name: 'TBD (Winner SF 2)', score: 0 },
        status: 'PENDING',
      },
    ];
    stages.push({ stage_name: 'Finals', round_number: 2, matches: finalsMatches });
  }

  return {
    bracket_id: bracketId,
    tournament_name: tournamentName || 'National Championship Tournament',
    sport_type: sportType || 'Basketball',
    format: 'single_elimination',
    status: 'Active',
    stages,
    created_at: now,
    updated_at: now,
  };
}

export async function getTournamentBrackets(sport?: string): Promise<TournamentBracket[]> {
  try {
    let query: any = db.collection(COLLECTION_NAME);
    if (sport && sport.trim() && sport.toUpperCase() !== 'ALL') {
      query = query.where('sport_type', '==', sport.trim());
    }

    const snap = await query.get().catch(() => null);
    const brackets: TournamentBracket[] = [];

    if (snap && !snap.empty) {
      snap.forEach((doc: any) => {
        brackets.push({ ...doc.data(), bracket_id: doc.id });
      });
    }

    // If no bracket exists, initialize default bracket
    if (brackets.length === 0) {
      const defaultBracket = createDefaultSingleEliminationBracket(
        'National Inter-Collegiate Championship',
        sport || 'Basketball',
        []
      );
      await db.collection(COLLECTION_NAME).doc(defaultBracket.bracket_id).set(defaultBracket).catch(() => null);
      brackets.push(defaultBracket);
    }

    return brackets;
  } catch (err) {
    console.warn('getTournamentBrackets error, returning default:', err);
    return [
      createDefaultSingleEliminationBracket(
        'National Inter-Collegiate Championship',
        sport || 'Basketball',
        []
      ),
    ];
  }
}

export async function getTournamentBracketById(bracketId: string): Promise<TournamentBracket | null> {
  const doc = await db.collection(COLLECTION_NAME).doc(bracketId).get().catch(() => null);
  if (doc && doc.exists) {
    return { ...doc.data(), bracket_id: doc.id } as TournamentBracket;
  }
  return null;
}

export async function saveTournamentBracket(
  userId: string,
  bracketData: Partial<TournamentBracket>
): Promise<TournamentBracket> {
  const bracketId = bracketData.bracket_id || `BRACKET_${Date.now()}`;
  const now = new Date().toISOString();

  const payload: TournamentBracket = {
    bracket_id: bracketId,
    tournament_name: bracketData.tournament_name || 'Tournament Championship',
    sport_type: bracketData.sport_type || 'Basketball',
    division: bracketData.division || 'Collegiate Division',
    format: bracketData.format || 'single_elimination',
    status: bracketData.status || 'Active',
    stages: bracketData.stages || [],
    champion_team: bracketData.champion_team || '',
    created_by: userId,
    created_at: bracketData.created_at || now,
    updated_at: now,
  };

  await db.collection(COLLECTION_NAME).doc(bracketId).set(payload, { merge: true });
  return payload;
}

export async function advanceBracketMatch(
  bracketId: string,
  matchId: string,
  winnerTeamName: string,
  homeScore?: number,
  awayScore?: number
): Promise<TournamentBracket> {
  let bracket = await getTournamentBracketById(bracketId);
  if (!bracket) {
    bracket = createDefaultSingleEliminationBracket('Tournament Championship', 'Basketball', []);
    bracket.bracket_id = bracketId;
  }

  let nextMatchId: string | undefined;
  let slotForNext: 'home' | 'away' | undefined;
  let isFinalsMatch = false;

  // 1. Find and update target match
  for (const stage of bracket.stages) {
    for (const match of stage.matches) {
      if (match.match_id === matchId) {
        if (homeScore !== undefined) match.home_team.score = homeScore;
        if (awayScore !== undefined) match.away_team.score = awayScore;

        const isHomeWinner = match.home_team.team_name === winnerTeamName;
        match.home_team.is_winner = isHomeWinner;
        match.away_team.is_winner = !isHomeWinner;
        match.winner_team_name = winnerTeamName;
        match.status = 'COMPLETED';

        nextMatchId = match.next_match_id;
        slotForNext = match.slot_for_next;

        if (stage.stage_name === 'Finals' || match.stage_name === 'Finals') {
          isFinalsMatch = true;
          bracket.champion_team = winnerTeamName;
          bracket.status = 'Completed';
        }
      }
    }
  }

  // 2. Advance winner to next match if applicable
  if (nextMatchId && slotForNext) {
    for (const stage of bracket.stages) {
      for (const match of stage.matches) {
        if (match.match_id === nextMatchId) {
          if (slotForNext === 'home') {
            match.home_team.team_name = winnerTeamName;
          } else {
            match.away_team.team_name = winnerTeamName;
          }

          // If both slots are now filled with actual teams, mark as SCHEDULED
          const homeReady = match.home_team.team_name && !match.home_team.team_name.startsWith('TBD');
          const awayReady = match.away_team.team_name && !match.away_team.team_name.startsWith('TBD');
          if (homeReady && awayReady) {
            match.status = 'SCHEDULED';
          }
        }
      }
    }
  }

  bracket.updated_at = new Date().toISOString();
  await db.collection(COLLECTION_NAME).doc(bracketId).set(bracket, { merge: true });
  return bracket;
}
