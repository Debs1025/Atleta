import { db, auth } from '../utils/firebaseAdmin';

/**
 * Cleanup all temporary test documents from Firestore to prevent storage bloat.
 */
export async function cleanAllTestData() {
  console.log('🧹 [FIRESTORE CLEANUP] Cleaning test documents from Firestore...');

  let deletedCount = 0;

  // 1. Delete test users from Users collection & Firebase Auth
  const usersSnapshot = await db.collection('Users').get();
  for (const doc of usersSnapshot.docs) {
    const data = doc.data();
    const email = data.email || '';
    if (email.includes('coach_test_') || email.includes('test_') || doc.id.includes('test_')) {
      await db.collection('Users').doc(doc.id).delete();
      await auth.deleteUser(doc.id).catch(() => {});
      deletedCount++;
    }
  }

  // 2. Delete test coach profiles from Coach_Profiles
  const coachProfilesSnapshot = await db.collection('Coach_Profiles').get();
  for (const doc of coachProfilesSnapshot.docs) {
    if (doc.id.startsWith('coach_') && doc.id.length > 25) {
      // Delete duplicate partial test doc
      await db.collection('Coach_Profiles').doc(doc.id).delete();
      deletedCount++;
    }
  }

  // 3. Delete test coach settings from Coach_Settings
  const settingsSnapshot = await db.collection('Coach_Settings').get();
  for (const doc of settingsSnapshot.docs) {
    if (doc.id.includes('test_')) {
      await db.collection('Coach_Settings').doc(doc.id).delete();
      deletedCount++;
    }
  }

  // 4. Delete test inquiries from Scouting_Registry
  const inquiriesSnapshot = await db.collection('Scouting_Registry').get();
  for (const doc of inquiriesSnapshot.docs) {
    const data = doc.data();
    if (
      (data.athlete_id && data.athlete_id.includes('test_')) ||
      (data.coach_id && data.coach_id.includes('test_'))
    ) {
      await db.collection('Scouting_Registry').doc(doc.id).delete();
      deletedCount++;
    }
  }

  // 5. Delete test workload logs from Workload_Analysis
  const workloadSnapshot = await db.collection('Workload_Analysis').get();
  for (const doc of workloadSnapshot.docs) {
    const data = doc.data();
    if (data.athlete_id && data.athlete_id.includes('test_')) {
      await db.collection('Workload_Analysis').doc(doc.id).delete();
      deletedCount++;
    }
  }

  console.log(`✅ [FIRESTORE CLEANUP] Done! Removed ${deletedCount} test documents from Firestore.\n`);
}

if (require.main === module) {
  cleanAllTestData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
