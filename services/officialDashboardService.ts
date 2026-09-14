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
 * Optimised to respond under 200ms by running queries in parallel.
 */
export async function getOfficialDashboardMetrics(officialId: string) {
  let totalMatches = 0;
  let pendingCount = 0;
  let auditedCount = 0;
  let pendingAuditsDocs: any[] = [];

  try {
    // Run count queries in parallel across Official_Audits and Match_Logs_Official
    const [matchesCount, pendingCountRes, auditedCountRes, pendingAudits] = await Promise.all([
      db.collection('Match_Logs_Official').count().get(),
      db.collection('Official_Audits').where('status', '==', 'Pending').count().get(),
      db.collection('Official_Audits').where('status', 'in', ['Approved', 'Rejected']).count().get(),
      db.collection('Official_Audits').where('status', '==', 'Pending').get()
    ]);

    totalMatches = matchesCount.data().count;
    pendingCount = pendingCountRes.data().count;
    auditedCount = auditedCountRes.data().count;
    pendingAuditsDocs = pendingAudits.docs;
  } catch (err) {
    // Fallback using document snapshot size
    const [matchesSnap, pendingAuditsSnap, auditedSnap] = await Promise.all([
      db.collection('Match_Logs_Official').get(),
      db.collection('Official_Audits').where('status', '==', 'Pending').get(),
      db.collection('Official_Audits').where('status', 'in', ['Approved', 'Rejected']).get()
    ]);

    totalMatches = matchesSnap.size;
    pendingCount = pendingAuditsSnap.size;
    auditedCount = auditedSnap.size;
    pendingAuditsDocs = pendingAuditsSnap.docs;
  }

  // Populate match details for each audit request in the pending queue in parallel
  const matchIds = Array.from(new Set(pendingAuditsDocs.map(d => d.data().match_id).filter(Boolean)));
  const matchDocs = await Promise.all(
    matchIds.map(async (id) => {
      let mDoc = await db.collection('Match_Logs_Official').doc(id).get();
      if (!mDoc.exists) {
        mDoc = await db.collection('Match_Logs').doc(id).get();
      }
      return mDoc;
    })
  );

  const matchesMap = new Map<string, any>();
  matchDocs.forEach(mDoc => {
    if (mDoc.exists) {
      matchesMap.set(mDoc.id, mDoc.data());
    }
  });

  const auditQueue = pendingAuditsDocs.map(d => {
    const auditData = d.data();
    return {
      audit_id: auditData.audit_id || auditData.validation_id,
      validation_id: auditData.validation_id || auditData.audit_id,
      match_id: auditData.match_id,
      requested_by: auditData.requested_by,
      status: auditData.status,
      requested_at: auditData.requested_at || auditData.created_at,
      match_details: matchesMap.get(auditData.match_id) || null
    };
  });

  return {
    total_matches: totalMatches,
    pending_count: pendingCount,
    audited_count: auditedCount,
    audit_queue: auditQueue
  };
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
    let coachDetails: any[] = Array.isArray(data.coaches) ? [...data.coaches] : [];
    if (coachDetails.length === 0 && matchData && Array.isArray(matchData.coaches)) {
      coachDetails = [...matchData.coaches];
    }

    const assignedCoaches: string[] = Array.isArray(data.assigned_coaches)
      ? data.assigned_coaches
      : (matchData?.assigned_coaches || []);

    if (coachDetails.length === 0 && assignedCoaches.length > 0) {
      const coachFetched = await Promise.all(
        assignedCoaches.map(async (cid) => {
          const cUid = cid.replace(/^coach_/, '');
          const uDoc = await db.collection('Users').doc(cUid).get();
          const pDoc = await db.collection('Coach_Profiles').doc(cid).get();
          const uData = uDoc.exists ? uDoc.data() : null;
          const pData = pDoc.exists ? pDoc.data() : null;
          return {
            coach_id: cid,
            full_name: uData?.full_legal_name || uData?.full_name || `${uData?.first_name || ''} ${uData?.last_name || ''}`.trim() || 'Head Coach',
            email: uData?.email || '',
            contact_number: uData?.contact_number || '',
            organization: pData?.current_institution || uData?.organization_name || 'Athletics Department',
            team_id: pData?.team_id || '',
          };
        })
      );
      coachDetails = coachFetched;
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
