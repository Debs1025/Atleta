import crypto from 'crypto';
import { db } from '../utils/firebaseAdmin';
import {
  MatchLog,
  OfficialAudit,
  SportType,
  CreateOfficialMatchPayload,
  MatchCoachParticipant,
  MatchAthleteParticipant,
  MatchTeamParticipant,
} from '../models/matchModel';
import { ServiceError } from '../validators/matchValidator';
import {
  generateCustomMatchId,
  generateCustomScheduleId,
  generateCustomAuditId,
} from '../utils/idGenerator';
import {
  calculateBasketballMetrics,
  calculateIndividualSportMetrics,
  calculateDynamicSportMetrics,
} from './matchService';
import { eventBus, EVENTS } from '../utils/eventBus';

export interface CertifyValidationDto {
  context_notes?: string;
  scoresheet_url?: string;
  scoresheet_data?: Record<string, any>;
}

/**
 * Creates an official match record with physical scoresheet reference, deep multi-sport participant metadata,
 * linked Official_Schedules document, and segregation into Match_Logs_Official.
 */
export async function createOfficialMatchService(
  uid: string,
  data: CreateOfficialMatchPayload,
  idempotencyKey: string,
) {
  // 1. Idempotency Check
  const idempRef = db.collection('Idempotency_Keys').doc(idempotencyKey);
  const idempDoc = await idempRef.get();
  if (idempDoc.exists) {
    return idempDoc.data()?.response;
  }

  // 2. Fetch official profile to resolve canonical official_id
  let resolvedOfficialId: string = data.official_id || '';
  if (!resolvedOfficialId) {
    const rawUid = uid.replace(/^off_/, '');
    const canonicalOffId = `off_${rawUid}`;
    let profileDoc = await db.collection('Official_Profiles').doc(canonicalOffId).get();
    if (!profileDoc.exists) {
      profileDoc = await db.collection('Official_Profiles').doc(rawUid).get();
    }
    if (profileDoc.exists) {
      resolvedOfficialId = profileDoc.data()?.official_id || canonicalOffId;
    } else {
      resolvedOfficialId = canonicalOffId;
    }
  }
  const officialId = resolvedOfficialId;

  // 3. Generate Human-Readable Custom IDs
  const matchId = await generateCustomMatchId(true); // e.g. MATCH-OFF-0001
  const scheduleId = await generateCustomScheduleId(); // e.g. SCHED-0001
  const validationId = await generateCustomAuditId(); // e.g. AUDIT-0001
  const now = new Date().toISOString();

  // 4. Resolve Dates, Times, and Schedules
  const matchDateObj = data.match_date ? new Date(data.match_date) : new Date();
  const validDate = isNaN(matchDateObj.getTime()) ? new Date() : matchDateObj;
  const month = validDate.getMonth() + 1; // 1-12
  const year = validDate.getFullYear();
  const scheduledTime = data.scheduled_time || validDate.toISOString();

  const venue = (data.venue || data.location || 'Official Tournament Arena').trim();
  const location = (data.location || venue).trim();
  const courtNumber = data.court_number || 'Court 1';

  // 5. Resolve Teams and Deep Participants
  const homeTeamId = data.home_team_id || data.team_id || 'team_home_default';
  const homeTeamName = (data.home_team_name || data.team_id || 'Home Team').trim();
  const awayTeamId = data.away_team_id || data.opponent_team_name || 'team_away_default';
  const awayTeamName = (data.away_team_name || data.opponent_team_name || 'Away Team').trim();

  // 6. Resolve Coaches Details
  let enrichedCoaches: MatchCoachParticipant[] = [];
  const assignedCoachIds: string[] = Array.isArray(data.assigned_coaches) ? [...data.assigned_coaches] : [];

  if (Array.isArray(data.coaches) && data.coaches.length > 0) {
    enrichedCoaches = data.coaches.map((c) => {
      if (c.coach_id && !assignedCoachIds.includes(c.coach_id)) {
        assignedCoachIds.push(c.coach_id);
      }
      return {
        coach_id: c.coach_id,
        user_id: c.user_id || c.coach_id.replace(/^coach_/, ''),
        full_name: c.full_name || 'Coach',
        email: c.email || '',
        contact_number: c.contact_number || '',
        team_id: c.team_id || (c.team_name === awayTeamName ? awayTeamId : homeTeamId),
        team_name: c.team_name || homeTeamName,
        role: c.role || 'Head Coach',
      };
    });
  } else if (assignedCoachIds.length > 0) {
    // Fetch details for assigned coach IDs in parallel
    const coachDocs = await Promise.all(
      assignedCoachIds.map(async (cid) => {
        const rawUid = cid.replace(/^coach_/, '');
        const uDoc = await db.collection('Users').doc(rawUid).get();
        const pDoc = await db.collection('Coach_Profiles').doc(cid).get();
        const uData = uDoc.exists ? uDoc.data() : null;
        const pData = pDoc.exists ? pDoc.data() : null;
        return {
          coach_id: cid,
          user_id: rawUid,
          full_name: uData?.full_legal_name || uData?.full_name || `${uData?.first_name || ''} ${uData?.last_name || ''}`.trim() || 'Coach',
          email: uData?.email || '',
          contact_number: uData?.contact_number || '',
          team_id: pData?.team_id || homeTeamId,
          team_name: homeTeamName,
          role: 'Head Coach',
        };
      })
    );
    enrichedCoaches = coachDocs;
  }

  // 7. Resolve Athlete Rosters and Multi-Sport Stats
  const athleteRosters: MatchAthleteParticipant[] = [];
  const rosterAthletes: string[] = Array.isArray(data.roster_athletes) ? [...data.roster_athletes] : [];
  const performanceMetrics: any[] = [];
  const enrichedPlayerStats: any[] = [];

  if (Array.isArray(data.athlete_rosters) && data.athlete_rosters.length > 0) {
    for (const ath of data.athlete_rosters) {
      if (ath.athlete_id && !rosterAthletes.includes(ath.athlete_id)) {
        rosterAthletes.push(ath.athlete_id);
      }
      athleteRosters.push(ath);
    }
  }

  // Process player_stats if submitted
  if (Array.isArray(data.player_stats) && data.player_stats.length > 0) {
    for (const item of data.player_stats) {
      const athId = item.athlete_id || `ath_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      if (!rosterAthletes.includes(athId)) {
        rosterAthletes.push(athId);
      }

      const pName = item.player_name || 'Athlete';
      const pTeam = item.team_name || homeTeamName;
      const rawStats = item.stats || {};
      const metricId = `metric_${matchId}_${athId}`;

      let efficiency = 0;
      let enrichedStats: any = rawStats;

      if (data.sport_type === 'Basketball') {
        const computed = calculateBasketballMetrics(rawStats);
        efficiency = computed.efficiency;
        enrichedStats = computed.enrichedStats;
      } else if (data.sport_type === 'Swimming' || data.sport_type === 'Track & Field') {
        const computed = calculateIndividualSportMetrics(rawStats);
        efficiency = computed.efficiency;
        enrichedStats = computed.enrichedStats;
      } else {
        const computed = calculateDynamicSportMetrics(rawStats);
        efficiency = computed.efficiency;
        enrichedStats = computed.enrichedStats;
      }

      const metric = {
        metric_id: metricId,
        athlete_id: athId,
        player_name: pName,
        team_name: pTeam,
        jersey_number: item.jersey_number ?? null,
        match_id: matchId,
        sport_category: data.sport_type,
        sport_stats: enrichedStats,
        calculated_player_efficiency: efficiency,
        timestamp: now,
      };

      performanceMetrics.push(metric);
      enrichedPlayerStats.push({
        athlete_id: athId,
        player_name: pName,
        team_name: pTeam,
        jersey_number: item.jersey_number ?? null,
        position: item.position || 'Player',
        stats: enrichedStats,
      });

      athleteRosters.push({
        athlete_id: athId,
        user_id: athId.replace(/^ath_/, ''),
        player_name: pName,
        jersey_number: item.jersey_number ?? null,
        team_id: item.team_id || (pTeam === awayTeamName ? awayTeamId : homeTeamId),
        team_name: pTeam,
        position: item.position || 'Player',
        stats: enrichedStats,
      });
    }
  }

  // 8. Build Participating Teams Object
  const participatingTeams: MatchTeamParticipant[] = data.participating_teams || [
    {
      team_id: homeTeamId,
      team_name: homeTeamName,
      coach_id: enrichedCoaches.find(c => c.team_name === homeTeamName || c.team_id === homeTeamId)?.coach_id,
      coach_name: enrichedCoaches.find(c => c.team_name === homeTeamName || c.team_id === homeTeamId)?.full_name,
      score: data.home_score !== undefined ? data.home_score : 0,
      roster: athleteRosters.filter(a => a.team_name === homeTeamName || a.team_id === homeTeamId),
    },
    {
      team_id: awayTeamId,
      team_name: awayTeamName,
      coach_id: enrichedCoaches.find(c => c.team_name === awayTeamName || c.team_id === awayTeamId)?.coach_id,
      coach_name: enrichedCoaches.find(c => c.team_name === awayTeamName || c.team_id === awayTeamId)?.full_name,
      score: data.away_score !== undefined ? data.away_score : 0,
      roster: athleteRosters.filter(a => a.team_name === awayTeamName || a.team_id === awayTeamId),
    },
  ];

  // 9. Construct Official Match Log Document
  const matchLog: MatchLog = {
    match_id: matchId,
    team_id: homeTeamId,
    home_team_id: homeTeamId,
    away_team_id: awayTeamId,
    home_team_name: homeTeamName,
    away_team_name: awayTeamName,
    opponent_team_name: awayTeamName,
    official_id: officialId,
    created_by_role: 'OFFICIAL',
    is_official: true,
    sport_type: data.sport_type,
    event_name: data.event_name || (data.sport_type === 'Basketball' ? 'Varsity Match' : 'Championship Event'),
    match_type: data.match_type || 'Official Tournament Match',
    match_date: validDate.toISOString(),
    location,
    venue,
    court_number: courtNumber,
    game_result: data.game_result || 'COMPLETED',
    home_score: data.home_score,
    away_score: data.away_score,
    participating_teams: participatingTeams,
    coaches: enrichedCoaches,
    assigned_coaches: assignedCoachIds,
    assigned_officials: [officialId],
    roster_athletes: rosterAthletes,
    athlete_rosters: athleteRosters,
    player_stats: enrichedPlayerStats.length > 0 ? enrichedPlayerStats : data.player_stats,
    scoresheet_data: data.scoresheet_data || undefined,
    scoresheet_url: data.scoresheet_url || '',
    notes: data.notes || `Official Match: ${homeTeamName} vs ${awayTeamName} at ${venue}`,
    idempotency_key: idempotencyKey,
    reference_id: data.reference_id || `REF-${matchId}`,
    is_certified: false,
    is_locked: false,
    audit_status: 'Pending',
    verification_status: 'Pending',
    timestamp: now,
    created_at: now,
    updated_at: now,
  };

  // 10. Construct Official Audit (Validation) Document
  const auditDoc: OfficialAudit = {
    validation_id: validationId,
    audit_id: validationId,
    match_id: matchId,
    official_id: officialId,
    status: 'Pending',
    verification_status: 'Pending',
    scoresheet_url: data.scoresheet_url || '',
    scoresheet_data: data.scoresheet_data || undefined,
    context_notes: data.notes || '',
    requested_by: officialId,
    requested_at: now,
    created_at: now,
  };

  // 11. Construct Official Schedule Document (Fix for Schedule Sync)
  const scheduleDoc: any = {
    schedule_id: scheduleId,
    match_id: matchId,
    official_id: officialId,
    venue,
    location,
    court_number: courtNumber,
    scheduled_time: scheduledTime,
    month,
    year,
    assigned_officials: [officialId],
    assigned_coaches: assignedCoachIds,
    sport_type: data.sport_type,
    event_name: data.event_name || 'Official Match',
    home_team: {
      team_id: homeTeamId,
      team_name: homeTeamName,
      coach_name: enrichedCoaches.find(c => c.team_name === homeTeamName || c.team_id === homeTeamId)?.full_name || 'Head Coach',
    },
    away_team: {
      team_id: awayTeamId,
      team_name: awayTeamName,
      coach_name: enrichedCoaches.find(c => c.team_name === awayTeamName || c.team_id === awayTeamId)?.full_name || 'Head Coach',
    },
    coaches: enrichedCoaches,
    status: 'Scheduled',
    venue_logistics: `Venue: ${venue} | Court: ${courtNumber} | Scheduled: ${scheduledTime}`,
    created_at: now,
    updated_at: now,
  };

  // Helper to remove undefined properties
  const sanitizeForFirestore = (obj: any) => JSON.parse(JSON.stringify(obj));

  // 12. Execute Atomic Multi-Collection Batch Write
  const batch = db.batch();

  // (a) Segregated Official collection
  batch.set(db.collection('Match_Logs_Official').doc(matchId), sanitizeForFirestore(matchLog));
  // (b) Mirrored Match_Logs collection with created_by_role: 'OFFICIAL'
  batch.set(db.collection('Match_Logs').doc(matchId), sanitizeForFirestore(matchLog));
  // (c) Linked Official_Schedules collection
  batch.set(db.collection('Official_Schedules').doc(scheduleId), sanitizeForFirestore(scheduleDoc));
  // (d) Linked Official_Audits & Official_Validations collections
  batch.set(db.collection('Official_Audits').doc(validationId), sanitizeForFirestore(auditDoc));
  batch.set(db.collection('Official_Validations').doc(validationId), sanitizeForFirestore(auditDoc));

  // (e) Performance metrics
  for (const metric of performanceMetrics) {
    batch.set(db.collection('Performance_Metrics').doc(metric.metric_id), sanitizeForFirestore(metric));
  }

  await batch.commit();

  const response = {
    message: 'Official match and schedule created successfully.',
    match_id: matchId,
    schedule_id: scheduleId,
    validation_id: validationId,
    match: matchLog,
    schedule: scheduleDoc,
    validation: auditDoc,
    coaches: enrichedCoaches,
    athletes: athleteRosters,
  };

  // Cache response for idempotency replay
  await idempRef.set({
    key: idempotencyKey,
    response,
    created_at: now,
  });

  return response;
}

/**
 * Retrieves all pending match verification / audit requests referencing Match_Logs_Official and Match_Logs.
 */
export async function getPendingValidationsService() {
  const snapshot = await db
    .collection('Official_Audits')
    .where('status', '==', 'Pending')
    .get();

  const validations: (OfficialAudit & { match_details?: MatchLog; coach_details?: any })[] = [];

  for (const doc of snapshot.docs) {
    const auditData = doc.data() as OfficialAudit;
    let matchDetails: MatchLog | undefined = undefined;

    if (auditData.match_id) {
      let matchDoc = await db.collection('Match_Logs_Official').doc(auditData.match_id).get();
      if (!matchDoc.exists) {
        matchDoc = await db.collection('Match_Logs').doc(auditData.match_id).get();
      }
      if (matchDoc.exists) {
        matchDetails = matchDoc.data() as MatchLog;
      }
    }

    // Resolve requesting coach details if available
    let coachDetails: any = null;
    const reqCoachId = auditData.requested_by_coach_id || auditData.requested_by;
    if (reqCoachId) {
      const rawUid = reqCoachId.replace(/^coach_/, '');
      const coachDoc = await db.collection('Users').doc(rawUid).get();
      if (coachDoc.exists) {
        coachDetails = coachDoc.data();
      }
    }

    validations.push({
      ...auditData,
      match_details: matchDetails,
      coach_details: coachDetails,
    });
  }

  // Sort by created_at descending
  validations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return validations;
}

/**
 * Certifies a pending validation and locks target match record to read-only status across both collections.
 * ACCEPTANCE CRITERIA: Re-auditing an already-certified match returns HTTP 409 Conflict.
 */
export async function certifyValidationService(
  validationId: string,
  officialUid: string,
  dto: CertifyValidationDto,
) {
  // 1. Fetch Official Audit document
  const validationRef = db.collection('Official_Audits').doc(validationId);
  const validationDoc = await validationRef.get();

  if (!validationDoc.exists) {
    throw new ServiceError(`Validation request '${validationId}' not found.`, 404);
  }

  const auditData = validationDoc.data() as OfficialAudit;
  const matchId = auditData.match_id;

  // 2. Fetch Match_Logs / Match_Logs_Official document
  const matchOffRef = db.collection('Match_Logs_Official').doc(matchId);
  const matchRef = db.collection('Match_Logs').doc(matchId);

  let matchDoc = await matchOffRef.get();
  if (!matchDoc.exists) {
    matchDoc = await matchRef.get();
  }

  if (!matchDoc.exists) {
    throw new ServiceError(`Target match record '${matchId}' not found.`, 404);
  }

  const matchData = matchDoc.data() as MatchLog;

  // 3. Conflict Check: Re-auditing an already-certified match returns HTTP 409 Conflict
  if (matchData.is_certified === true || matchData.is_locked === true || auditData.status === 'Approved') {
    throw new ServiceError('Match record is already certified and locked. Conflict: Cannot re-audit certified records.', 409);
  }

  // Resolve official_id
  let officialId = auditData.official_id;
  const rawOfficialUid = officialUid.replace(/^off_/, '');
  const canonicalOffUid = `off_${rawOfficialUid}`;
  let profileDoc = await db.collection('Official_Profiles').doc(canonicalOffUid).get();
  if (!profileDoc.exists) {
    profileDoc = await db.collection('Official_Profiles').doc(rawOfficialUid).get();
  }
  if (profileDoc.exists) {
    officialId = profileDoc.data()?.official_id || canonicalOffUid;
  } else {
    officialId = canonicalOffUid;
  }

  const now = new Date().toISOString();

  // 4. Update Official_Audits record
  const updatedAudit: Partial<OfficialAudit> = {
    status: 'Approved',
    verification_status: 'Certify',
    official_id: officialId,
    context_notes: dto.context_notes || auditData.context_notes || '',
    scoresheet_url: dto.scoresheet_url || auditData.scoresheet_url || '',
    scoresheet_data: dto.scoresheet_data || auditData.scoresheet_data || undefined,
    certified_at: now,
  };

  // 5. Update Match_Logs & Match_Logs_Official record to lock to read-only
  const updatedMatch: Partial<MatchLog> = {
    is_certified: true,
    is_locked: true,
    audit_status: 'Approved',
    verification_status: 'Certify',
    scoresheet_url: dto.scoresheet_url || matchData.scoresheet_url || '',
    scoresheet_data: dto.scoresheet_data || matchData.scoresheet_data || undefined,
    updated_at: now,
  };

  const batch = db.batch();
  batch.update(validationRef, updatedAudit);
  batch.set(db.collection('Official_Validations').doc(validationId), updatedAudit, { merge: true });
  batch.set(matchOffRef, updatedMatch, { merge: true });
  batch.set(matchRef, updatedMatch, { merge: true });
  await batch.commit();

  // Invalidate athlete caches and notify listeners of certified match stats
  const roster = Array.from(new Set([
    ...(matchData.roster_athletes || []),
    ...((auditData as any).roster_athletes || []),
    ...(dto.scoresheet_data?.player_stats ? dto.scoresheet_data.player_stats.map((p: any) => p.athlete_id) : []),
  ])).filter(Boolean);

  for (const athId of roster) {
    eventBus.emit(EVENTS.MATCH_CERTIFIED, { athlete_id: athId });
  }

  return {
    message: 'Match validation successfully certified and record locked to read-only.',
    validation: {
      ...auditData,
      ...updatedAudit,
    },
    match: {
      ...matchData,
      ...updatedMatch,
    },
  };
}

/**
 * Removes or invalidates a disputed match record across collections.
 */
export async function deleteMatchService(matchId: string) {
  const matchRef = db.collection('Match_Logs').doc(matchId);
  const matchOffRef = db.collection('Match_Logs_Official').doc(matchId);

  const [matchDoc, matchOffDoc] = await Promise.all([matchRef.get(), matchOffRef.get()]);

  if (!matchDoc.exists && !matchOffDoc.exists) {
    throw new ServiceError(`Match record '${matchId}' not found.`, 404);
  }

  const batch = db.batch();
  if (matchDoc.exists) batch.delete(matchRef);
  if (matchOffDoc.exists) batch.delete(matchOffRef);

  // Clean up linked Official_Audits
  const auditsSnapshot = await db
    .collection('Official_Audits')
    .where('match_id', '==', matchId)
    .get();

  auditsSnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  // Clean up linked Official_Schedules
  const schedulesSnapshot = await db
    .collection('Official_Schedules')
    .where('match_id', '==', matchId)
    .get();

  schedulesSnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();

  return {
    message: `Match record '${matchId}' and associated schedules/audits removed successfully.`,
    match_id: matchId,
  };
}
