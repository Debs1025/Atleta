import { db } from '../utils/firebaseAdmin';
import { ServiceError } from '../validators/matchValidator';
import { eventBus, EVENTS } from '../utils/eventBus';
import { createNotification } from './notificationService';
import crypto from 'crypto';

export interface RegionalAthleteSearchResult {
  athlete_id: string;
  first_name: string;
  last_name: string;
  email: string;
  province: string;
  sport_type: string;
  recruitment_status: string | null;
  calculated_player_efficiency: number; // Average PER
}

export interface LeaderboardRankingResult {
  rank: number;
  athlete_id: string;
  first_name: string;
  last_name: string;
  province: string;
  calculated_player_efficiency: number; // Average PER
}

export interface ScoutingProposalResult {
  scout_id: string;
  coach_id: string;
  athlete_id: string;
  offer_status: 'Sent' | 'Accepted' | 'Declined';
  offer_details?: string;
  created_at: string;
  updated_at: string;
  athlete_details?: {
    first_name: string;
    last_name: string;
    email: string;
    province: string;
    sport_type: string;
  };
}

/**
 * Search and filter regional athlete directory.
 */
export async function searchRegionalAthletes(
  sport?: string,
  minPER?: number,
  search?: string,
): Promise<RegionalAthleteSearchResult[]> {
  // Fetch Athlete Profiles, Users, and Performance Metrics in parallel to minimize network latency
  const [profilesSnapshot, usersSnapshot, metricsSnapshot] = await Promise.all([
    db.collection('Athlete_Profiles').get(),
    db.collection('Users').where('role', '==', 'Athlete').get(),
    db.collection('Performance_Metrics').get()
  ]);

  const profiles: any[] = [];
  profilesSnapshot.docs.forEach((doc: any) => {
    const data = doc.data();
    profiles.push({
      athlete_id: doc.id,
      province: data.province || '',
      sport_type: data.sport_type || '',
      recruitment_status: data.recruitment_status || null,
    });
  });

  const usersMap = new Map<string, any>();
  usersSnapshot.docs.forEach((doc: any) => {
    const data = doc.data();
    usersMap.set(doc.id, {
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      email: data.email || '',
    });
  });

  const athleteEfficiencies = new Map<string, number[]>();
  metricsSnapshot.docs.forEach((doc: any) => {
    const data = doc.data();
    const athleteId = data.athlete_id;
    const efficiency = data.calculated_player_efficiency || 0;
    const metricSport = data.sport_category || '';

    // If sport is requested, filter metrics by sport category
    if (sport && metricSport.toLowerCase() !== sport.toLowerCase()) {
      return;
    }

    if (!athleteEfficiencies.has(athleteId)) {
      athleteEfficiencies.set(athleteId, []);
    }
    athleteEfficiencies.get(athleteId)!.push(efficiency);
  });

  // 4. Join and filter results
  const results: RegionalAthleteSearchResult[] = [];

  for (const profile of profiles) {
    const user = usersMap.get(profile.athlete_id) || usersMap.get(profile.athlete_id.replace(/^ath_/, ''));
    if (!user) continue; // Skip if no user account linked

    // Filter by sport (case-insensitive)
    if (sport && profile.sport_type.toLowerCase() !== sport.toLowerCase()) {
      continue;
    }

    // Calculate average PER
    const efficiencies = athleteEfficiencies.get(profile.athlete_id) || [];
    const averagePER =
      efficiencies.length > 0
        ? parseFloat((efficiencies.reduce((sum, val) => sum + val, 0) / efficiencies.length).toFixed(2))
        : 0;

    // Filter by minPER
    if (minPER !== undefined && averagePER < minPER) {
      continue;
    }

    // Search filter: matching first_name, last_name, email, or province
    if (search !== undefined && search !== null) {
      const searchLower = String(search).trim().toLowerCase();
      if (searchLower.length > 0) {
        const matchName =
          user.first_name.toLowerCase().includes(searchLower) ||
          user.last_name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          profile.province.toLowerCase().includes(searchLower);

        if (!matchName) {
          continue;
        }
      }
    }

    results.push({
      athlete_id: profile.athlete_id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      province: profile.province,
      sport_type: profile.sport_type,
      recruitment_status: profile.recruitment_status,
      calculated_player_efficiency: averagePER,
    });
  }

  // Sort by name or efficiency (default descending by efficiency)
  return results.sort((a, b) => b.calculated_player_efficiency - a.calculated_player_efficiency);
}

/**
 * Retrieve top 10 player PER rankings.
 */
export async function getLeaderboardRankings(
  sport?: string,
  season?: string,
  region?: string,
): Promise<LeaderboardRankingResult[]> {
  // Fetch Match Logs, Performance Metrics, Athlete Profiles, and Users in parallel to minimize network latency
  const [matchSnapshot, metricsSnapshot, profilesSnapshot, usersSnapshot] = await Promise.all([
    db.collection('Match_Logs').get(),
    db.collection('Performance_Metrics').get(),
    db.collection('Athlete_Profiles').get(),
    db.collection('Users').where('role', '==', 'Athlete').get()
  ]);

  let validMatchIds = new Set<string>();
  matchSnapshot.docs.forEach((doc: any) => {
    const data = doc.data();
    const matchId = doc.id;
    const matchSport = data.sport_type || '';
    const matchType = data.match_type || ''; // e.g. "UAAP Season 88"

    if (sport && matchSport.toLowerCase() !== sport.toLowerCase()) {
      return;
    }

    if (season && !matchType.toLowerCase().includes(season.toLowerCase())) {
      return;
    }

    validMatchIds.add(matchId);
  });

  const athleteEfficiencies = new Map<string, number[]>();
  metricsSnapshot.docs.forEach((doc: any) => {
    const data = doc.data();
    const athleteId = data.athlete_id;
    const matchId = data.match_id;
    const efficiency = data.calculated_player_efficiency || 0;

    // Filter by match ID list if season or sport filters are active
    if ((sport || season) && !validMatchIds.has(matchId)) {
      return;
    }

    // Double-check sport category on metrics if sport filter is active
    if (sport && data.sport_category && data.sport_category.toLowerCase() !== sport.toLowerCase()) {
      return;
    }

    if (!athleteEfficiencies.has(athleteId)) {
      athleteEfficiencies.set(athleteId, []);
    }
    athleteEfficiencies.get(athleteId)!.push(efficiency);
  });

  const profilesMap = new Map<string, string>();
  profilesSnapshot.docs.forEach((doc: any) => {
    const data = doc.data();
    profilesMap.set(doc.id, data.province || '');
  });

  const usersMap = new Map<string, any>();
  usersSnapshot.docs.forEach((doc: any) => {
    const data = doc.data();
    usersMap.set(doc.id, {
      first_name: data.first_name || '',
      last_name: data.last_name || '',
    });
  });

  // 5. Compute average PER and build leaderboard rankings
  const rankings: Omit<LeaderboardRankingResult, 'rank'>[] = [];

  for (const [athleteId, efficiencies] of athleteEfficiencies.entries()) {
    const user = usersMap.get(athleteId) || usersMap.get(athleteId.replace(/^ath_/, ''));
    if (!user) continue;

    const province = profilesMap.get(athleteId) || '';

    // Filter by region/province (case-insensitive)
    if (region && province.toLowerCase() !== region.toLowerCase()) {
      continue;
    }

    const averagePER =
      efficiencies.length > 0
        ? parseFloat((efficiencies.reduce((sum, val) => sum + val, 0) / efficiencies.length).toFixed(2))
        : 0;

    rankings.push({
      athlete_id: athleteId,
      first_name: user.first_name,
      last_name: user.last_name,
      province: province,
      calculated_player_efficiency: averagePER,
    });
  }

  // Sort descending by calculated_player_efficiency and limit to top 10
  const sortedRankings = rankings
    .sort((a, b) => b.calculated_player_efficiency - a.calculated_player_efficiency)
    .slice(0, 10);

  return sortedRankings.map((item, index) => ({
    rank: index + 1,
    ...item,
  }));
}

/**
 * Dispatch a formal recruitment proposal to an athlete.
 */
export async function dispatchRecruitmentProposal(
  coachId: string,
  athleteId: string,
  offerDetails?: string,
): Promise<any> {
  // 1. Verify athlete exists
  const athleteDoc = await db.collection('Athlete_Profiles').doc(athleteId).get();
  if (!athleteDoc.exists) {
    throw new ServiceError(`Athlete with ID '${athleteId}' was not found.`, 404);
  }

  // 2. Check for duplicate active proposal ('Sent')
  const activeProposalsSnapshot = await db
    .collection('Scouting_Registry')
    .where('coach_scout_id', '==', coachId)
    .where('athlete_id', '==', athleteId)
    .where('initiated_by', '==', coachId)
    .where('offer_status', '==', 'Sent')
    .get();

  if (!activeProposalsSnapshot.empty) {
    throw new ServiceError('An active recruitment proposal has already been sent to this athlete.', 400);
  }

  // 3. Create Scouting Proposal
  const scoutId = crypto.randomUUID();
  const now = new Date().toISOString();

  const proposalData: Record<string, any> = {
    scout_id: scoutId,
    coach_scout_id: coachId,
    athlete_id: athleteId,
    initiated_by: coachId, // Coach initiated
    offer_status: 'Sent',
    offer_message: offerDetails || undefined,
    date_initiated: now,
    updated_at: now,
  };

  await db.collection('Scouting_Registry').doc(scoutId).set(proposalData);

  // Get athlete user details for response enrichment
  let userDoc = await db.collection('Users').doc(athleteId).get();
  if (!userDoc.exists) {
    const strippedId = athleteId.replace(/^ath_/, '');
    userDoc = await db.collection('Users').doc(strippedId).get();
  }
  const userData = userDoc.exists ? userDoc.data() : {};
  const athleteProfileData = athleteDoc.data() || {};

  // Notify the athlete directly — write to Firestore immediately
  const athleteUserId = athleteId.replace(/^ath_/, '');
  await createNotification({
    recipient_id: athleteUserId,
    type: 'RECRUITMENT_INQUIRY',
    title: 'New Recruitment Offer Received',
    message: `A coach has sent you a formal recruitment proposal. Check your inquiry tracker for details.`,
  });

  return {
    ...proposalData,
    athlete_details: {
      first_name: userData?.first_name || 'Athlete',
      last_name: userData?.last_name || '',
      email: userData?.email || '',
      province: athleteProfileData?.province || '',
      sport_type: athleteProfileData?.sport_type || '',
    },
  };
}

/**
 * Retrieve sent recruitment proposals.
 */
export async function getRecruitmentProposals(coachId: string): Promise<any[]> {
  const proposalsSnapshot = await db
    .collection('Scouting_Registry')
    .where('coach_scout_id', '==', coachId)
    .where('initiated_by', '==', coachId)
    .get();

  const proposals: any[] = [];

  for (const doc of proposalsSnapshot.docs) {
    const data = doc.data() as any;

    // Fetch details for enrichment
    let userDoc = await db.collection('Users').doc(data.athlete_id).get();
    if (!userDoc.exists) {
      const strippedId = data.athlete_id.replace(/^ath_/, '');
      userDoc = await db.collection('Users').doc(strippedId).get();
    }
    const athleteDoc = await db.collection('Athlete_Profiles').doc(data.athlete_id).get();

    const userData = userDoc.exists ? userDoc.data() : {};
    const athleteProfileData = athleteDoc.exists ? athleteDoc.data() : {};

    proposals.push({
      ...data,
      athlete_details: {
        first_name: userData?.first_name || 'Athlete',
        last_name: userData?.last_name || '',
        email: userData?.email || '',
        province: athleteProfileData?.province || '',
        sport_type: athleteProfileData?.sport_type || '',
      },
    });
  }

  // Sort descending by date_initiated date
  return proposals.sort((a, b) => new Date(b.date_initiated).getTime() - new Date(a.date_initiated).getTime());
}
