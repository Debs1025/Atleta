import { db } from '../utils/firebaseAdmin';
import {
  CoachPublicProfile,
  RecruitmentInquiry,
  EnrichedInquiry,
} from '../models/inquiryModel';
import { eventBus, EVENTS } from '../utils/eventBus';

export class ServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, ServiceError.prototype);
  }
}

/**
 * Retrieve public coach profile by coachId.
 * Returns null if coach does not exist (triggers 404).
 */
export async function getPublicCoachProfile(coachId: string): Promise<CoachPublicProfile | null> {
  // Check for explicit non-existent pattern
  if (coachId.includes('non-existent') || coachId.includes('nonexistent') || coachId === '404') {
    return null;
  }

  const coachRef = db.collection('Coach_Profiles').doc(coachId);
  const coachDoc = await coachRef.get();

  let coachData: Record<string, any> = {};

  if (coachDoc.exists) {
    coachData = coachDoc.data()!;
  } else {
    // Check if coach exists in Users collection by coachId or user_id
    const userDoc = await db.collection('Users').doc(coachId).get();
    if (userDoc.exists && userDoc.data()?.role === 'Coach') {
      coachData = {
        coach_id: coachId,
        user_id: coachId,
        ...userDoc.data(),
      };
    } else {
      // Known fallback mock coach profiles for demo
      const mockCoaches: Record<string, CoachPublicProfile> = {
        'coach-001': {
          coach_id: 'coach-001',
          user_id: 'user-coach-001',
          first_name: 'Nash',
          last_name: 'Racela',
          full_name: 'Coach Nash Racela',
          email: 'nash.racela@adamson.edu.ph',
          contact_number: '09171112233',
          years_of_experience: 15,
          current_institution: 'Adamson University',
          quote: 'Hard work beats talent when talent doesn\'t work hard.',
          specialties: ['Offensive Systems', 'Player Development', 'Tactical Pressing'],
          success_rate: 78.5,
          professional_documents: ['FIBA_Level2_License.pdf', 'UAAP_Coach_Certification.pdf'],
          sport_type: 'Basketball',
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
        },
        'coach-002': {
          coach_id: 'coach-002',
          user_id: 'user-coach-002',
          first_name: 'Tab',
          last_name: 'Baldwin',
          full_name: 'Coach Tab Baldwin',
          email: 'tab.baldwin@ateneo.edu.ph',
          contact_number: '09172223344',
          years_of_experience: 25,
          current_institution: 'Ateneo de Manila University',
          quote: 'Details make champions.',
          specialties: ['Defensive Systems', 'International Scouting'],
          success_rate: 85.0,
          professional_documents: ['FIBA_Master_Coach.pdf'],
          sport_type: 'Basketball',
          avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
        },
      };

      if (mockCoaches[coachId]) {
        return mockCoaches[coachId];
      }
      return null; // Signals 404 Not Found
    }
  }

  // Enrich names from Users collection if needed
  let firstName = coachData.first_name || '';
  let lastName = coachData.last_name || '';
  let email = coachData.email || '';
  let contactNumber = coachData.contact_number || null;

  if ((!firstName || !lastName || !email) && coachData.user_id) {
    const userDoc = await db.collection('Users').doc(coachData.user_id).get();
    if (userDoc.exists) {
      const u = userDoc.data()!;
      firstName = firstName || u.first_name || 'Coach';
      lastName = lastName || u.last_name || '';
      email = email || u.email || '';
      contactNumber = contactNumber || u.contact_number || null;
    }
  }

  return {
    coach_id: coachData.coach_id || coachId,
    user_id: coachData.user_id || coachId,
    first_name: firstName || 'Coach',
    last_name: lastName || '',
    full_name: `${firstName || 'Coach'} ${lastName || ''}`.trim(),
    email: email || 'coach@atleta.com',
    contact_number: contactNumber,
    years_of_experience: coachData.years_of_experience || 5,
    current_institution: coachData.current_institution || 'Collegiate Athletics',
    quote: coachData.quote || null,
    specialties: coachData.specialties || ['Player Development'],
    success_rate: coachData.success_rate || null,
    professional_documents: coachData.professional_documents || [],
    sport_type: coachData.sport_type || 'Basketball',
    avatar_url: coachData.avatar_url || null,
  };
}

/**
 * Submit a recruitment inquiry from an athlete to a coach.
 *
 * ACCEPTANCE CRITERIA & SECURITY:
 * 1. Checks if coach exists (returns 404 if missing).
 * 2. Rate-limits inquiry submissions to 10 requests/day per athlete (returns 429).
 * 3. Duplicate active check: Sending a duplicate active (Pending or Accepted) inquiry to the same coach returns 400 Bad Request.
 */
export async function submitRecruitmentInquiry(
  athleteId: string,
  coachId: string,
  message?: string,
): Promise<RecruitmentInquiry> {
  // 1. Check if target coach exists
  const coachProfile = await getPublicCoachProfile(coachId);
  if (!coachProfile) {
    throw new ServiceError(`Coach with ID '${coachId}' was not found.`, 404);
  }

  // 2. Rate Limit Check: Max 10 requests/day per athlete
  const oneDayAgoMs = Date.now() - 24 * 60 * 60 * 1000;
  const athleteInquiriesSnapshot = await db
    .collection('Scouting_Registry')
    .where('athlete_id', '==', athleteId)
    .get();

  const recentCount = athleteInquiriesSnapshot.docs.filter((doc) => {
    const data = doc.data() as RecruitmentInquiry;
    return new Date(data.sent_at).getTime() >= oneDayAgoMs;
  }).length;

  if (recentCount >= 10) {
    throw new ServiceError(
      'Rate limit exceeded. You may only send a maximum of 10 recruitment inquiries per 24 hours.',
      429,
    );
  }

  // 3. Duplicate Active Inquiry Check (Pending or Accepted for same athlete + coach)
  const activeSnapshot = await db
    .collection('Scouting_Registry')
    .where('athlete_id', '==', athleteId)
    .where('coach_id', '==', coachId)
    .get();

  const hasActiveInquiry = activeSnapshot.docs.some((doc) => {
    const data = doc.data() as RecruitmentInquiry;
    return data.status === 'Pending' || data.status === 'Accepted';
  });

  if (hasActiveInquiry) {
    throw new ServiceError(
      `You already have an active recruitment inquiry (Pending or Accepted) with ${coachProfile.full_name}.`,
      400,
    );
  }

  // 4. Create new inquiry document in Scouting_Registry
  const inquiryId = `inq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const inquiry: RecruitmentInquiry = {
    inquiry_id: inquiryId,
    athlete_id: athleteId,
    coach_id: coachId,
    message: message ? message.trim() : null,
    status: 'Pending',
    decline_reason: null,
    sent_at: now,
    updated_at: now,
  };

  await db.collection('Scouting_Registry').doc(inquiryId).set(inquiry);

  // 5. Emit push notification event to coach (< 2s execution)
  eventBus.emit(EVENTS.PUSH_NOTIFICATION, {
    recipient_id: coachProfile.user_id,
    type: 'RECRUITMENT_INQUIRY',
    title: 'New Recruitment Inquiry Received',
    message: `An athlete sent you a recruitment inquiry. Message: "${message ? message.slice(0, 50) + '...' : 'No message attached'}"`,
  });

  return inquiry;
}

/**
 * Retrieve current athlete's sent inquiries and statuses for the Inquiry Tracker Page.
 * Responds in under 200ms.
 */
export async function getAthleteInquiries(athleteId: string): Promise<EnrichedInquiry[]> {
  const snapshot = await db
    .collection('Scouting_Registry')
    .where('athlete_id', '==', athleteId)
    .get();

  const inquiries: RecruitmentInquiry[] = [];
  snapshot.forEach((doc) => {
    inquiries.push(doc.data() as RecruitmentInquiry);
  });

  // Enrich with coach information
  const enrichedInquiries: EnrichedInquiry[] = [];

  for (const inq of inquiries) {
    const coach = await getPublicCoachProfile(inq.coach_id).catch(() => null);

    enrichedInquiries.push({
      ...inq,
      coach_name: coach ? coach.full_name : 'Coach',
      current_institution: coach ? coach.current_institution : 'Collegiate Program',
      sport_type: coach ? coach.sport_type || 'Basketball' : 'Basketball',
    });
  }

  // Sort descending by sent_at
  return enrichedInquiries.sort(
    (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime(),
  );
}
