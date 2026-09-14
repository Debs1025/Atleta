import { db } from '../utils/firebaseAdmin';
import { ServiceError } from '../validators/matchValidator';
import { generateCustomRequestId, generateCustomAuditId } from '../utils/idGenerator';
import { MatchLog } from '../models/matchModel';

export interface CreateScoresheetRequestDto {
  match_id: string;
  official_id?: string;
  notes?: string;
  context_notes?: string;
  target_team_id?: string;
}

export interface ScoresheetRequest {
  request_id: string;
  audit_id?: string;
  validation_id?: string;
  match_id: string;
  coach_id: string;
  requested_by: string;
  official_id: string | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  notes?: string;
  scoresheet_url?: string;
  scoresheet_data?: Record<string, any>;
  match_details?: MatchLog | null;
  coach_details?: any;
  requested_at: string;
  updated_at: string;
}

/**
 * Submit a formal scoresheet request from a Coach to an Official referencing Match_Logs_Official.
 */
export async function createScoresheetRequestService(
  coachId: string,
  dto: CreateScoresheetRequestDto,
): Promise<ScoresheetRequest> {
  const matchId = dto.match_id;
  if (!matchId) {
    throw new ServiceError('match_id is required to request a scoresheet.', 400);
  }

  // 1. Fetch from segregated Match_Logs_Official first, then fallback to Match_Logs
  let matchDoc = await db.collection('Match_Logs_Official').doc(matchId).get();
  if (!matchDoc.exists) {
    matchDoc = await db.collection('Match_Logs').doc(matchId).get();
  }

  if (!matchDoc.exists) {
    throw new ServiceError(`Official match record with ID '${matchId}' was not found.`, 404);
  }

  const matchData = matchDoc.data() as MatchLog;

  // 2. Generate Human-Readable IDs
  const requestId = await generateCustomRequestId(); // e.g. REQ-0001
  const auditId = await generateCustomAuditId(); // e.g. AUDIT-0001
  const now = new Date().toISOString();

  const assignedOfficialId = dto.official_id || matchData.official_id || null;

  // 3. Resolve Coach Info
  const rawCoachUid = coachId.replace(/^coach_/, '');
  const coachUserDoc = await db.collection('Users').doc(rawCoachUid).get();
  const coachData = coachUserDoc.exists ? coachUserDoc.data() : null;

  const requestRecord: ScoresheetRequest = {
    request_id: requestId,
    audit_id: auditId,
    validation_id: auditId,
    match_id: matchId,
    coach_id: coachId,
    requested_by: coachId,
    official_id: assignedOfficialId,
    status: 'Pending',
    notes: dto.notes || dto.context_notes || '',
    scoresheet_url: matchData.scoresheet_url || '',
    scoresheet_data: matchData.scoresheet_data || undefined,
    requested_at: now,
    updated_at: now,
  };

  const auditDoc = {
    validation_id: auditId,
    audit_id: auditId,
    request_id: requestId,
    match_id: matchId,
    requested_by_coach_id: coachId,
    requested_by: coachId,
    official_id: assignedOfficialId,
    status: 'Pending',
    verification_status: 'Pending',
    scoresheet_url: matchData.scoresheet_url || '',
    scoresheet_data: matchData.scoresheet_data || undefined,
    context_notes: dto.notes || dto.context_notes || '',
    requested_at: now,
    created_at: now,
  };

  // Helper to remove undefined properties
  const sanitizeForFirestore = (obj: any) => JSON.parse(JSON.stringify(obj));

  // 4. Batch Write
  const batch = db.batch();
  batch.set(db.collection('Scoresheet_Requests').doc(requestId), sanitizeForFirestore(requestRecord));
  batch.set(db.collection('Official_Audits').doc(auditId), sanitizeForFirestore(auditDoc));
  batch.set(db.collection('Official_Validations').doc(auditId), sanitizeForFirestore(auditDoc));

  // 5. Notify assigned official if present
  if (assignedOfficialId) {
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    batch.set(db.collection('Official_Notifications').doc(notifId), sanitizeForFirestore({
      notification_id: notifId,
      official_id: assignedOfficialId,
      type: 'AUDIT_REQUEST',
      title: 'New Scoresheet Request',
      message: `Coach ${coachData?.full_legal_name || 'Coach'} requested a verified scoresheet for match ${matchId}.`,
      reference_id: requestId,
      is_read: false,
      created_at: now,
    }));
  }

  await batch.commit();

  return {
    ...requestRecord,
    match_details: matchData,
    coach_details: coachData,
  };
}

/**
 * Fetch scoresheet requests filtered by role, status, or match ID, referencing Match_Logs_Official.
 */
export async function getScoresheetRequestsService(
  userId: string,
  userRole: string,
  filters: { status?: string; match_id?: string; official_id?: string } = {},
): Promise<ScoresheetRequest[]> {
  let query: any = db.collection('Scoresheet_Requests');

  if (filters.status) {
    query = query.where('status', '==', filters.status);
  }
  if (filters.match_id) {
    query = query.where('match_id', '==', filters.match_id);
  }

  const rawUid = userId.replace(/^(coach_|off_)/, '');
  const canonicalCoachId = `coach_${rawUid}`;
  const canonicalOffId = `off_${rawUid}`;

  const snapshot = await query.get();
  const requests: ScoresheetRequest[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data() as ScoresheetRequest;

    // Role-based authorization filter
    if (userRole === 'Coach') {
      const isCoachOwner =
        data.coach_id === userId ||
        data.coach_id === canonicalCoachId ||
        data.coach_id === rawUid ||
        data.requested_by === userId ||
        data.requested_by === canonicalCoachId ||
        data.requested_by === rawUid;

      if (!isCoachOwner) continue;
    } else if (userRole === 'Official') {
      const isAssigned =
        !filters.official_id ||
        filters.official_id === 'all' ||
        data.official_id === null ||
        data.official_id === userId ||
        data.official_id === canonicalOffId ||
        data.official_id === rawUid;

      if (!isAssigned) continue;
    }

    // Attach Official Match details from segregated collection
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

    requests.push({
      ...data,
      match_details: matchData,
    });
  }

  // Sort descending by requested_at
  return requests.sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());
}

/**
 * Fulfill or update scoresheet request status (e.g. Official attaching certified scoresheet).
 */
export async function updateScoresheetRequestService(
  requestId: string,
  officialUid: string,
  updates: { status: 'Approved' | 'Rejected'; scoresheet_url?: string; scoresheet_data?: any; notes?: string },
) {
  const reqRef = db.collection('Scoresheet_Requests').doc(requestId);
  const reqDoc = await reqRef.get();

  if (!reqDoc.exists) {
    throw new ServiceError(`Scoresheet request '${requestId}' not found.`, 404);
  }

  const reqData = reqDoc.data() as ScoresheetRequest;
  const now = new Date().toISOString();

  const batch = db.batch();
  batch.update(reqRef, {
    status: updates.status,
    scoresheet_url: updates.scoresheet_url || reqData.scoresheet_url || '',
    scoresheet_data: updates.scoresheet_data || reqData.scoresheet_data || undefined,
    notes: updates.notes || reqData.notes || '',
    official_id: officialUid,
    updated_at: now,
  });

  if (reqData.audit_id) {
    const auditRef = db.collection('Official_Audits').doc(reqData.audit_id);
    batch.update(auditRef, {
      status: updates.status,
      official_id: officialUid,
      certified_at: updates.status === 'Approved' ? now : undefined,
    });
  }

  if (reqData.match_id && updates.status === 'Approved') {
    const matchOffRef = db.collection('Match_Logs_Official').doc(reqData.match_id);
    const matchRef = db.collection('Match_Logs').doc(reqData.match_id);
    const matchUpdates: Partial<MatchLog> = {
      is_certified: true,
      is_locked: true,
      scoresheet_url: updates.scoresheet_url || reqData.scoresheet_url || '',
      scoresheet_data: updates.scoresheet_data || reqData.scoresheet_data || undefined,
      updated_at: now,
    };
    batch.set(matchOffRef, matchUpdates, { merge: true });
    batch.set(matchRef, matchUpdates, { merge: true });
  }

  await batch.commit();

  return {
    message: `Scoresheet request '${requestId}' updated to ${updates.status}.`,
    request_id: requestId,
    status: updates.status,
  };
}
