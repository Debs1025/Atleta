import crypto from 'crypto';
import { db, sanitizeForFirestore } from '../utils/firebaseAdmin';
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
import { normalizeSportType } from '../validators/validationValidator';
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

  // Normalize sport_type
  if (data.sport_type) {
    data.sport_type = normalizeSportType(String(data.sport_type)) as any;
  } else {
    data.sport_type = 'Basketball' as any;
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
  const isIndividualSport = data.sport_type === 'Swimming' || data.sport_type === 'Track & Field';
  const defaultAway = isIndividualSport ? 'Individual Competitors' : 'Away Team';
  const homeTeamId = data.home_team_id || data.team_id || 'team_home_default';
  const homeTeamName = (data.home_team_name || data.team_id || 'Home Team').trim();
  const awayTeamId = data.away_team_id || data.opponent_team_name || (isIndividualSport ? 'team_individual' : 'team_away_default');
  const awayTeamName = (data.away_team_name || data.opponent_team_name || defaultAway).trim();

  // 6. Resolve Coaches Details (Task 2 Fix: Handle any coach format safely without crashing)
  let enrichedCoaches: MatchCoachParticipant[] = [];
  const assignedCoachIds: string[] = [];

  const rawCoachList: any[] = [];
  const payloadAny = data as any;
  if (Array.isArray(payloadAny.coaches)) {
    rawCoachList.push(...payloadAny.coaches);
  }
  if (Array.isArray(payloadAny.assigned_coaches)) {
    rawCoachList.push(...payloadAny.assigned_coaches);
  } else if (typeof payloadAny.assigned_coaches === 'string' && payloadAny.assigned_coaches.trim()) {
    rawCoachList.push(payloadAny.assigned_coaches.trim());
  }
  if (payloadAny.assigned_coach) {
    if (Array.isArray(payloadAny.assigned_coach)) {
      rawCoachList.push(...payloadAny.assigned_coach);
    } else {
      rawCoachList.push(payloadAny.assigned_coach);
    }
  }
  if (payloadAny.coach_id) {
    rawCoachList.push(payloadAny.coach_id);
  }

  for (const item of rawCoachList) {
    if (!item) continue;
    if (typeof item === 'string') {
      const cid = item.trim();
      if (cid && !assignedCoachIds.includes(cid)) {
        assignedCoachIds.push(cid);
      }
    } else if (typeof item === 'object') {
      const cid = (item.coach_id || item.id || item.user_id || '').trim();
      if (cid && !assignedCoachIds.includes(cid)) {
        assignedCoachIds.push(cid);
      }
      enrichedCoaches.push({
        coach_id: cid || `coach_${Date.now()}`,
        user_id: item.user_id || (cid ? cid.replace(/^coach_/, '') : ''),
        full_name: item.full_name || item.name || item.coach_name || 'Coach',
        email: item.email || '',
        contact_number: item.contact_number || item.phone || '',
        team_id: item.team_id || (item.team_name === awayTeamName ? awayTeamId : homeTeamId),
        team_name: item.team_name || (item.team_id === awayTeamId ? awayTeamName : homeTeamName),
        role: item.role || 'Head Coach',
      });
    }
  }

  // If coach IDs are present but not yet in enrichedCoaches, fetch details with safe error catch
  for (const cid of assignedCoachIds) {
    if (!enrichedCoaches.some((c) => c.coach_id === cid)) {
      try {
        const rawUid = cid.replace(/^coach_/, '');
        const [uDoc, pDoc] = await Promise.all([
          db.collection('Users').doc(rawUid).get().catch(() => null),
          db.collection('Coach_Profiles').doc(cid).get().catch(() => null),
        ]);
        const uData = uDoc && uDoc.exists ? uDoc.data() : null;
        const pData = pDoc && pDoc.exists ? pDoc.data() : null;
        enrichedCoaches.push({
          coach_id: cid,
          user_id: rawUid,
          full_name:
            uData?.full_legal_name ||
            uData?.full_name ||
            `${uData?.first_name || ''} ${uData?.last_name || ''}`.trim() ||
            'Head Coach',
          email: uData?.email || '',
          contact_number: uData?.contact_number || '',
          team_id: pData?.team_id || homeTeamId,
          team_name: homeTeamName,
          role: 'Head Coach',
        });
      } catch (err: any) {
        console.warn(`⚠️ [COACH RESOLVE] Fallback for coach ${cid}:`, err?.message || err);
        enrichedCoaches.push({
          coach_id: cid,
          user_id: cid.replace(/^coach_/, ''),
          full_name: 'Assigned Coach',
          email: '',
          contact_number: '',
          team_id: homeTeamId,
          team_name: homeTeamName,
          role: 'Head Coach',
        });
      }
    }
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
      coach_id: enrichedCoaches.find(c => c.team_name === homeTeamName || c.team_id === homeTeamId)?.coach_id || (assignedCoachIds[0] || undefined),
      coach_name: enrichedCoaches.find(c => c.team_name === homeTeamName || c.team_id === homeTeamId)?.full_name || 'Head Coach',
      score: data.home_score !== undefined ? data.home_score : 0,
      roster: athleteRosters.filter(a => a.team_name === homeTeamName || a.team_id === homeTeamId),
    },
    {
      team_id: awayTeamId,
      team_name: awayTeamName,
      coach_id: enrichedCoaches.find(c => c.team_name === awayTeamName || c.team_id === awayTeamId)?.coach_id || (assignedCoachIds[1] || undefined),
      coach_name: enrichedCoaches.find(c => c.team_name === awayTeamName || c.team_id === awayTeamId)?.full_name || (isIndividualSport ? 'Individual Coach' : 'Away Coach'),
      score: data.away_score !== undefined ? data.away_score : 0,
      roster: athleteRosters.filter(a => a.team_name === awayTeamName || a.team_id === awayTeamId),
    },
  ];

  // 9. Construct Official Match Log Document (Task 4: Root-level official_id strictly injected)
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

  // 11. Construct Official Schedule Document
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

  // 12. Execute Atomic Multi-Collection Batch Write (Task 3 Fix: Exclusively target Match_Logs_Official)
  const batch = db.batch();

  // (a) Exclusively target Match_Logs_Official (NO LEAKAGE to Match_Logs)
  batch.set(db.collection('Match_Logs_Official').doc(matchId), sanitizeForFirestore(matchLog));
  // (b) Linked Official_Schedules collection
  batch.set(db.collection('Official_Schedules').doc(scheduleId), sanitizeForFirestore(scheduleDoc));
  // (c) Linked Official_Audits & Official_Validations collections
  batch.set(db.collection('Official_Audits').doc(validationId), sanitizeForFirestore(auditDoc));
  batch.set(db.collection('Official_Validations').doc(validationId), sanitizeForFirestore(auditDoc));

  // (d) Performance metrics
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
 * Retrieve official matches directly from Match_Logs_Official (Task 4).
 * Root-level official_id is strictly indexed and returned for Home & All Matches pages.
 */
export async function getOfficialMatchesService(officialId?: string, statusFilter?: string) {
  let query: any = db.collection('Match_Logs_Official');

  if (officialId && officialId !== 'all') {
    const rawUid = officialId.replace(/^off_/, '');
    const canonicalOffId = `off_${rawUid}`;

    const [snap1, snap2, snap3] = await Promise.all([
      db.collection('Match_Logs_Official').where('official_id', '==', canonicalOffId).get(),
      db.collection('Match_Logs_Official').where('official_id', '==', rawUid).get(),
      db.collection('Match_Logs_Official').where('assigned_officials', 'array-contains', canonicalOffId).get(),
    ]);

    const seenIds = new Set<string>();
    const matches: any[] = [];
    [...snap1.docs, ...snap2.docs, ...snap3.docs].forEach((doc) => {
      if (!seenIds.has(doc.id)) {
        seenIds.add(doc.id);
        const data = doc.data();
        matches.push({
          ...data,
          match_id: data.match_id || doc.id,
          official_id: data.official_id || canonicalOffId,
        });
      }
    });

    if (matches.length > 0) {
      let filtered = matches;
      if (statusFilter) {
        filtered = matches.filter(m => (m.audit_status || m.verification_status || m.status || '').toLowerCase() === statusFilter.toLowerCase());
      }
      return filtered.sort((a, b) => new Date(b.created_at || b.timestamp || 0).getTime() - new Date(a.created_at || a.timestamp || 0).getTime());
    }
  }

  // Fallback: Retrieve all official matches
  const snapshot = await query.get();
  let matches = snapshot.docs.map((doc: any) => {
    const data = doc.data();
    return {
      ...data,
      match_id: data.match_id || doc.id,
      official_id: data.official_id || (Array.isArray(data.assigned_officials) ? data.assigned_officials[0] : null),
    };
  });

  if (statusFilter) {
    matches = matches.filter((m: any) => (m.audit_status || m.verification_status || m.status || '').toLowerCase() === statusFilter.toLowerCase());
  }

  return matches.sort((a: any, b: any) => new Date(b.created_at || b.timestamp || 0).getTime() - new Date(a.created_at || a.timestamp || 0).getTime());
}

/**
 * Retrieves all pending match verification / audit requests referencing Match_Logs_Official.
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
  const rawOfficialUid = officialUid.replace(/^off_/, '');
  const canonicalOffUid = `off_${rawOfficialUid}`;
  let officialId: string = auditData.official_id || canonicalOffUid;
  let profileDoc = await db.collection('Official_Profiles').doc(canonicalOffUid).get();
  if (!profileDoc.exists) {
    profileDoc = await db.collection('Official_Profiles').doc(rawOfficialUid).get();
  }
  if (profileDoc.exists && profileDoc.data()?.official_id) {
    officialId = profileDoc.data()!.official_id;
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

  // 5. Update Match_Logs_Official record to lock to read-only (Task 4: Root-level official_id strictly injected)
  const updatedMatch: Partial<MatchLog> = {
    official_id: officialId,
    is_certified: true,
    is_locked: true,
    audit_status: 'Approved',
    verification_status: 'Certify',
    scoresheet_url: dto.scoresheet_url || matchData.scoresheet_url || '',
    scoresheet_data: dto.scoresheet_data || matchData.scoresheet_data || undefined,
    updated_at: now,
  };

  const batch = db.batch();
  batch.update(validationRef, sanitizeForFirestore(updatedAudit));
  batch.set(db.collection('Official_Validations').doc(validationId), sanitizeForFirestore(updatedAudit), { merge: true });
  batch.set(matchOffRef, sanitizeForFirestore(updatedMatch), { merge: true });
  batch.set(matchRef, sanitizeForFirestore(updatedMatch), { merge: true });
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
