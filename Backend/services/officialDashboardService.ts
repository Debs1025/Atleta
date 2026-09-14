import { db } from '../utils/firebaseAdmin';
import { OfficialNotification, OfficialSchedule } from '../models/userModel';
import { MatchLog } from '../models/matchModel';

export interface EnrichedOfficialSchedule extends OfficialSchedule {
  sport_type?: string;
  event_name?: string;
  home_team?: {
    team_id?: string;
    team_name?: string;
    coach_name?: string;
  };
  away_team?: {
    team_id?: string;
    team_name?: string;
    coach_name?: string;
  };
  coach_details?: any[];
  match_details?: MatchLog | null;
  status?: string;
}

/**
 * Retrieve aggregated metrics (total matches, pending count, audited count) and new match audit queues.
 * Unified across Match_Logs_Official, Official_Audits, and Official_Schedules with strict ownership indexing.
 */
export async function getOfficialDashboardMetrics(officialId: string) {
  const rawUid = officialId.replace(/^off_/, '');
  const canonicalOffUid = `off_${rawUid}`;

  try {
    // 1. Parallel fetch of all matches, audits, and schedules for this official
    const [officialMatchesSnap1, officialMatchesSnap2, auditsSnap1, auditsSnap2, schedulesSnap1, schedulesSnap2] = await Promise.all([
      db.collection('Match_Logs_Official').where('official_id', '==', canonicalOffUid).get().catch(() => null),
      db.collection('Match_Logs_Official').where('official_id', '==', rawUid).get().catch(() => null),
      db.collection('Official_Audits').where('official_id', '==', canonicalOffUid).get().catch(() => null),
      db.collection('Official_Audits').where('official_id', '==', rawUid).get().catch(() => null),
      db.collection('Official_Schedules').where('official_id', '==', canonicalOffUid).get().catch(() => null),
      db.collection('Official_Schedules').where('official_id', '==', rawUid).get().catch(() => null),
    ]);

    const matchesMap = new Map<string, any>();

    // Index all Match_Logs_Official
    [...(officialMatchesSnap1?.docs || []), ...(officialMatchesSnap2?.docs || [])].forEach((doc) => {
      const data = doc.data();
      matchesMap.set(doc.id, {
        ...data,
        match_id: data.match_id || doc.id,
        official_id: data.official_id || canonicalOffUid,
      });
    });

    // If official specific queries returned 0 (e.g. global view), fallback to all official match records
    if (matchesMap.size === 0) {
      const allOfficialMatchesSnap = await db.collection('Match_Logs_Official').limit(50).get().catch(() => null);
      (allOfficialMatchesSnap?.docs || []).forEach((doc) => {
        const data = doc.data();
        matchesMap.set(doc.id, {
          ...data,
          match_id: data.match_id || doc.id,
          official_id: data.official_id || canonicalOffUid,
        });
      });
    }

    // Index Audits
    const auditsMap = new Map<string, any>();
    [...(auditsSnap1?.docs || []), ...(auditsSnap2?.docs || [])].forEach((doc) => {
      const data = doc.data();
      auditsMap.set(data.match_id || doc.id, {
        audit_id: data.audit_id || data.validation_id || doc.id,
        validation_id: data.validation_id || data.audit_id || doc.id,
        match_id: data.match_id,
        status: data.status || 'Pending',
        requested_at: data.requested_at || data.created_at || new Date().toISOString(),
        official_id: data.official_id || canonicalOffUid,
      });
    });

    // Index Schedules
    const schedulesMap = new Map<string, any>();
    [...(schedulesSnap1?.docs || []), ...(schedulesSnap2?.docs || [])].forEach((doc) => {
      const data = doc.data();
      if (data.match_id) {
        schedulesMap.set(data.match_id, data);
      }
    });

    // Build unified list of all unique match records
    let totalMatches = matchesMap.size;
    let pendingCount = 0;
    let auditedCount = 0;
    const auditQueue: any[] = [];

    matchesMap.forEach((matchData, mId) => {
      const audit = auditsMap.get(mId);
      const schedule = schedulesMap.get(mId);

      const rawStatus = (audit?.status || matchData.audit_status || matchData.verification_status || matchData.status || (matchData.is_certified ? 'Approved' : 'Pending')).toLowerCase();
      const isAudited = rawStatus === 'approved' || rawStatus === 'audited' || rawStatus === 'certified' || matchData.is_certified === true;
      const displayStatus = isAudited ? 'AUDITED' : 'PENDING';

      if (isAudited) {
        auditedCount++;
      } else {
        pendingCount++;
      }

      // Resolve coach name for display
      let coachDisplay = 'Official Assigned';
      if (Array.isArray(matchData.coaches) && matchData.coaches.length > 0) {
        coachDisplay = matchData.coaches[0]?.full_name || coachDisplay;
      } else if (schedule && Array.isArray(schedule.coaches) && schedule.coaches.length > 0) {
        coachDisplay = schedule.coaches[0]?.full_name || coachDisplay;
      } else if (matchData.home_team?.coach_name) {
        coachDisplay = matchData.home_team.coach_name;
      }

      const matchClass = matchData.event_name
        ? `${matchData.home_team_name || 'Home'} vs. ${matchData.away_team_name || 'Away'} (${matchData.event_name})`
        : `${matchData.home_team_name || 'HOME TEAM'} vs. ${matchData.away_team_name || matchData.opponent_team_name || 'OPPONENT'}`;

      auditQueue.push({
        audit_id: audit?.audit_id || `AUDIT-${mId}`,
        validation_id: audit?.validation_id || `AUDIT-${mId}`,
        match_id: mId,
        match_class: matchClass,
        sport: matchData.sport_type || 'Basketball',
        coach: coachDisplay,
        status: displayStatus,
        requested_by: audit?.requested_by || matchData.official_id || canonicalOffUid,
        requested_at: audit?.requested_at || matchData.created_at || matchData.timestamp || new Date().toISOString(),
        match_details: matchData,
      });
    });

    // Sort audit queue: most recent first
    auditQueue.sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());

    return {
      total_matches: totalMatches,
      pending_count: pendingCount,
      audited_count: auditedCount,
      audit_queue: auditQueue,
      matches: Array.from(matchesMap.values()),
    };
  } catch (err: any) {
    console.error('getOfficialDashboardMetrics error:', err);
    return {
      total_matches: 0,
      pending_count: 0,
      audited_count: 0,
      audit_queue: [],
      matches: [],
    };
  }
}

/**
 * Retrieve scheduled match assignments, venue logistics, assigned officials, court numbers,
 * and deeply enriched coach details.
 */
export async function getOfficialSchedules(
  officialId: string,
  month?: number,
  year?: number
): Promise<EnrichedOfficialSchedule[]> {
  let query: any = db.collection('Official_Schedules');

  if (month !== undefined && !isNaN(month)) {
    query = query.where('month', '==', month);
  }
  if (year !== undefined && !isNaN(year)) {
    query = query.where('year', '==', year);
  }

  const snapshot = await query.get();
  const rawUid = officialId.replace(/^off_/, '');
  const canonicalOfficialId = `off_${rawUid}`;

  const schedulePromises = snapshot.docs.map(async (doc: any) => {
    const data = doc.data();
    const isAssigned =
      !officialId ||
      officialId === 'all' ||
      data.official_id === officialId ||
      data.official_id === canonicalOfficialId ||
      data.official_id === rawUid ||
      (Array.isArray(data.assigned_officials) &&
        (data.assigned_officials.includes(officialId) ||
          data.assigned_officials.includes(canonicalOfficialId) ||
          data.assigned_officials.includes(rawUid)));

    if (!isAssigned) {
      return null;
    }

    // 1. Fetch linked Match details if available
    let matchData: MatchLog | null = null;
    if (data.match_id) {
      let mDoc = await db.collection('Match_Logs_Official').doc(data.match_id).get();
      if (!mDoc.exists) {
        mDoc = await db.collection('Match_Logs').doc(data.match_id).get();
      }
      if (mDoc.exists) {
        matchData = mDoc.data() as MatchLog;
      }
    }

    // 2. Fetch and resolve deep Coach Details
    let coachDetails: any[] = [];
    if (Array.isArray(data.coaches) && data.coaches.length > 0) {
      coachDetails = [...data.coaches];
    } else if (matchData && Array.isArray(matchData.coaches) && matchData.coaches.length > 0) {
      coachDetails = [...matchData.coaches];
    }

    const assignedCoaches: string[] = Array.isArray(data.assigned_coaches)
      ? data.assigned_coaches
      : (matchData?.assigned_coaches || []);

    if (coachDetails.length === 0 && assignedCoaches.length > 0) {
      const coachFetched = await Promise.all(
        assignedCoaches.map(async (cid) => {
          const isIdFormat = cid.startsWith('coach_') || (!cid.includes(' ') && cid.length >= 20);
          if (isIdFormat) {
            const cUid = cid.replace(/^coach_/, '');
            const [uDoc, pDoc] = await Promise.all([
              db.collection('Users').doc(cUid).get().catch(() => null),
              db.collection('Coach_Profiles').doc(cid).get().catch(() => null),
            ]);
            const uData = uDoc && uDoc.exists ? uDoc.data() : null;
            const pData = pDoc && pDoc.exists ? pDoc.data() : null;
            return {
              coach_id: cid,
              full_name: uData?.full_legal_name || uData?.full_name || `${uData?.first_name || ''} ${uData?.last_name || ''}`.trim() || 'Head Coach',
              email: uData?.email || '',
              contact_number: uData?.contact_number || '',
              organization: pData?.current_institution || uData?.organization_name || 'Athletics Department',
              team_id: pData?.team_id || '',
            };
          } else {
            // Plain display name
            return {
              coach_id: `coach_${cid.toLowerCase().replace(/\s+/g, '_')}`,
              full_name: cid,
              email: '',
              contact_number: '',
              organization: 'Athletics Department',
              team_id: '',
            };
          }
        })
      );
      coachDetails = coachFetched;
    }

    // Fallback if home_team / away_team has coach_name
    if (coachDetails.length === 0) {
      if (data.home_team?.coach_name && data.home_team.coach_name !== 'Head Coach') {
        coachDetails.push({
          coach_id: `coach_home_${doc.id}`,
          full_name: data.home_team.coach_name,
          role: 'Head Coach',
          team_name: data.home_team.team_name || 'Home Team',
        });
      }
      if (data.away_team?.coach_name && data.away_team.coach_name !== 'Away Coach') {
        coachDetails.push({
          coach_id: `coach_away_${doc.id}`,
          full_name: data.away_team.coach_name,
          role: 'Head Coach',
          team_name: data.away_team.team_name || 'Away Team',
        });
      }
    }

    const enriched: EnrichedOfficialSchedule = {
      schedule_id: data.schedule_id || doc.id,
      match_id: data.match_id || '',
      official_id: data.official_id || officialId,
      venue: data.venue || matchData?.venue || matchData?.location || 'Official Tournament Arena',
      court_number: data.court_number || matchData?.court_number || 'Court 1',
      scheduled_time: data.scheduled_time || matchData?.match_date || new Date().toISOString(),
      month: data.month || (matchData?.match_date ? new Date(matchData.match_date).getMonth() + 1 : 1),
      year: data.year || (matchData?.match_date ? new Date(matchData.match_date).getFullYear() : 2026),
      assigned_officials: data.assigned_officials || [officialId],
      venue_logistics: data.venue_logistics || `Venue: ${data.venue || 'Arena'} | Court: ${data.court_number || '1'}`,
      sport_type: data.sport_type || matchData?.sport_type || 'Basketball',
      event_name: data.event_name || matchData?.event_name || 'Official Match',
      home_team: data.home_team || {
        team_id: matchData?.home_team_id || matchData?.team_id || '',
        team_name: matchData?.home_team_name || 'Home Team',
        coach_name: coachDetails[0]?.full_name || 'Head Coach',
      },
      away_team: data.away_team || {
        team_id: matchData?.away_team_id || '',
        team_name: matchData?.away_team_name || matchData?.opponent_team_name || 'Away Team',
        coach_name: coachDetails[1]?.full_name || 'Opponent Coach',
      },
      coach_details: coachDetails,
      match_details: matchData,
      status: data.status || 'Scheduled',
    };

    return enriched;
  });

  const results = await Promise.all(schedulePromises);
  const nonNullSchedules = results.filter((s): s is EnrichedOfficialSchedule => s !== null);

  // Sort by scheduled_time ascending
  return nonNullSchedules.sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());
}

/**
 * Fetch chronological notification logs for an official.
 */
export async function getOfficialNotifications(officialId: string): Promise<OfficialNotification[]> {
  const rawUid = officialId.replace(/^off_/, '');
  const canonicalOffUid = `off_${rawUid}`;

  const [snap1, snap2] = await Promise.all([
    db.collection('Official_Notifications').where('official_id', '==', canonicalOffUid).get(),
    db.collection('Official_Notifications').where('official_id', '==', rawUid).get(),
  ]);

  const seenIds = new Set<string>();
  const notifications: OfficialNotification[] = [];

  [...snap1.docs, ...snap2.docs].forEach((doc) => {
    if (!seenIds.has(doc.id)) {
      seenIds.add(doc.id);
      const data = doc.data();
      notifications.push({
        notification_id: data.notification_id || doc.id,
        official_id: data.official_id,
        type: data.type,
        title: data.title,
        message: data.message,
        reference_id: data.reference_id || null,
        is_read: data.is_read || false,
        created_at: data.created_at,
      });
    }
  });

  // Sort chronologically descending
  return notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * Mark all notifications as read for a specific official.
 */
export async function markAllOfficialNotificationsAsRead(officialId: string): Promise<number> {
  const rawUid = officialId.replace(/^off_/, '');
  const canonicalOffUid = `off_${rawUid}`;

  const [snap1, snap2] = await Promise.all([
    db.collection('Official_Notifications').where('official_id', '==', canonicalOffUid).where('is_read', '==', false).get(),
    db.collection('Official_Notifications').where('official_id', '==', rawUid).where('is_read', '==', false).get(),
  ]);

  const allDocs = [...snap1.docs, ...snap2.docs];
  if (allDocs.length === 0) {
    return 0;
  }

  const batch = db.batch();
  allDocs.forEach((doc) => {
    batch.update(doc.ref, { is_read: true });
  });

  await batch.commit();
  return allDocs.length;
}
