import { db } from '../utils/firebaseAdmin';
import { registerUserService } from '../services/userService';
import { submitRecruitmentInquiry } from '../services/coachInquiryService';
import dotenv from 'dotenv';
dotenv.config();

async function seedAthleteData() {
  console.log('🌱 [SEEDING ATHLETE DATA] Starting...');

  const timestamp = Date.now();
  const athleteEmail = `jerom.lastimosa_${timestamp}@atleta.com`;
  const coachEmail = `nash.racela_${timestamp}@atleta.com`;

  // 1. Register Athlete with nested physical_profile, eligibility_documents and achievements
  console.log(`Registering athlete: ${athleteEmail}...`);
  const athleteResult = await registerUserService({
    first_name: 'Jerom',
    last_name: 'Lastimosa',
    email: athleteEmail,
    password: 'Password123!',
    contact_number: '09171112233',
    role: 'Athlete',
    birthdate: '2001-08-14',
    gender: 'Male',
    province: 'Camarines Sur',
    sport_type: 'Basketball',
    rank: 1,
    physical_profile: {
      height_cm: 188,
      weight_kg: 85,
      wingspan_cm: 195,
    },
    eligibility_documents: {
      psa_verified: true,
      academic_check: true,
      proof_of_residency: true,
      document_urls: ['PSA_BirthCertificate_Verified.pdf', 'HighSchool_Transcript.pdf'],
    },
    achievements: [
      {
        title: 'Season MVP',
        year: '2025',
        content: 'Awarded Most Valuable Player in National Collegiate League.',
      },
    ],
  });

  const athleteId = athleteResult.profile.athlete_id;
  console.log(`Athlete registered successfully with ID: ${athleteId}`);

  // 2. Register Coach (needed for recruitment inquiry)
  console.log(`Registering coach: ${coachEmail}...`);
  const coachResult = await registerUserService({
    first_name: 'Nash',
    last_name: 'Racela',
    email: coachEmail,
    password: 'Password123!',
    contact_number: '09174445566',
    role: 'Coach',
    years_of_experience: 15,
    current_institution: 'Adamson University',
    professional_documents: ['FIBA_Coach_License.pdf'],
  });

  const coachId = coachResult.profile.coach_id;
  console.log(`Coach registered successfully with ID: ${coachId}`);

  // 3. Submit an Inquiry from Athlete to Coach
  console.log('Sending recruitment inquiry from Athlete to Coach...');
  const inquiry = await submitRecruitmentInquiry(
    athleteId,
    coachId,
    'Hi Coach, I am Jerom Lastimosa. I would love to join your team for UAAP Season 88!',
  );
  console.log(`Recruitment inquiry sent successfully with scout ID: ${inquiry.scout_id}`);

  console.log('\n✅ [SEEDING ATHLETE DATA] Seeding completed successfully!');
  console.log(`Email: ${athleteEmail}`);
  console.log(`Password: Password123!\n`);
  process.exit(0);
}

seedAthleteData().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
