import { db } from '../utils/firebaseAdmin';
import {
  Team,
  RosterAthlete,
  TeamSummary,
  TeamDetailResponse,
  AthleteTeamResponse,
} from '../models/teamModel';

// ─── Helper: Enrich coach from Coach_Profiles + Users ───────────────────────

async function enrichCoach(coachId: string): Promise<{
  coach_id: string;
  full_name: string;
  years_of_experience: number;
  current_institution: string;
  quote: string | null;
}> {
  const coachDoc = await db.collection('Coach_Profiles').doc(coachId).get();
  const coachData = coachDoc.exists ? coachDoc.data()! : {};

  let firstName = coachData.first_name || '';
  let lastName = coachData.last_name || '';

  // If names not on coach profile, fetch from Users collection via user_id
  if ((!firstName || !lastName) && coachData.user_id) {
    const userDoc = await db.collection('Users').doc(coachData.user_id).get();
    if (userDoc.exists) {
      const userData = userDoc.data()!;
      firstName = firstName || userData.first_name || '';
      lastName = lastName || userData.last_name || '';
    }
  }

  return {
    coach_id: coachId,
    full_name: `${firstName || 'Coach'} ${lastName || ''}`.trim(),
    years_of_experience: coachData.years_of_experience || 0,
    current_institution: coachData.current_institution || '',
    quote: coachData.quote || null,
  };
}

// ─── Helper: Enrich roster athletes ─────────────────────────────────────────

async function enrichRoster(athleteIds: string[]): Promise<RosterAthlete[]> {
  if (!athleteIds || athleteIds.length === 0) return [];

  const roster: RosterAthlete[] = [];

  for (const athleteId of athleteIds) {
    const profileDoc = await db.collection('Athlete_Profiles').doc(athleteId).get();
    const profileData = profileDoc.exists ? profileDoc.data()! : {};

    let firstName = profileData.first_name || '';
    let lastName = profileData.last_name || '';

    // Fallback to Users collection
    if (!firstName || !lastName) {
      const userDoc = await db.collection('Users').doc(profileData.user_id || athleteId).get();
      if (userDoc.exists) {
        const userData = userDoc.data()!;
        firstName = firstName || userData.first_name || 'Athlete';
        lastName = lastName || userData.last_name || '';
      }
    }

    roster.push({
      athlete_id: athleteId,
      user_id: profileData.user_id || athleteId,
      first_name: firstName || 'Athlete',
      last_name: lastName || '',
      position: profileData.position || 'Unassigned',
      sport_type: profileData.sport_type || '',
      avatar_url: profileData.avatar_url || undefined,
    });
  }

  return roster;
}

// ─── Service Functions ──────────────────────────────────────────────────────

/**
 * Browse team directory directly from Firestore Teams collection.
 * GET /api/v1/teams?sport=&search=
 */
export async function browseTeamDirectory(
  sport?: string,
  search?: string,
): Promise<TeamSummary[]> {
  let query: FirebaseFirestore.Query = db.collection('Teams');

  // Filter by sport_type if provided
  if (sport && sport.trim().length > 0) {
    query = query.where('sport_type', '==', sport.trim());
  }

  const snapshot = await query.get();
  const teams: TeamSummary[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data() as Team;

    // Apply case-insensitive search filter on team_name
    if (search && search.trim().length > 0) {
      const searchLower = search.trim().toLowerCase();
      if (!data.team_name.toLowerCase().includes(searchLower)) {
        continue;
      }
    }

    // Enrich coach name
    const coach = await enrichCoach(data.coach_id);

    teams.push({
      team_id: data.team_id,
      team_name: data.team_name,
      sport_type: data.sport_type,
      region: data.region,
      athlete_count: data.roster_list ? data.roster_list.length : 0,
      coach_name: coach.full_name,
      established_year: data.established_year,
    });
  }

  return teams;
}

/**
 * Get full team details directly from Firestore Teams collection.
 * GET /api/v1/teams/:teamId
 * Returns null if team not found (→ 404).
 */
export async function getTeamDetails(teamId: string): Promise<TeamDetailResponse | null> {
  const teamDoc = await db.collection('Teams').doc(teamId).get();

  if (!teamDoc.exists) {
    return null;
  }

  const data = teamDoc.data() as Team;
  const coach = await enrichCoach(data.coach_id);
  const roster = await enrichRoster(data.roster_list || []);

  return {
    team_id: data.team_id,
    team_name: data.team_name,
    sport_type: data.sport_type,
    region: data.region,
    description: data.description || null,
    mission_statement: data.mission_statement || null,
    established_year: data.established_year || null,
    athlete_count: data.roster_list ? data.roster_list.length : 0,
    coach,
    roster,
    timestamp: data.timestamp,
  };
}

/**
 * Get athlete's current team directly from Firestore Teams collection.
 * GET /api/v1/athletes/:athleteId/team
 * Returns null if athlete has no team assignment (→ 404).
 */
export async function getAthleteTeam(athleteId: string): Promise<AthleteTeamResponse | null> {
  // Search Teams collection for any team with this athlete in roster_list
  const snapshot = await db
    .collection('Teams')
    .where('roster_list', 'array-contains', athleteId)
    .get();

  if (snapshot.empty) {
    return null; // No team assignment found for this athlete
  }

  // Use the first matched team
  const teamDoc = snapshot.docs[0];
  const teamData = teamDoc.data() as Team;

  const coach = await enrichCoach(teamData.coach_id).catch(() => ({
    coach_id: teamData.coach_id,
    full_name: 'Coach',
    current_institution: '',
  }));

  const roster = await enrichRoster(teamData.roster_list || []).catch(() => []);

  return {
    athlete_id: athleteId,
    team: {
      team_id: teamData.team_id,
      team_name: teamData.team_name,
      sport_type: teamData.sport_type,
      region: teamData.region,
      description: teamData.description || null,
    },
    coach: {
      coach_id: coach.coach_id,
      full_name: coach.full_name,
      current_institution: coach.current_institution,
    },
    roster,
  };
}
