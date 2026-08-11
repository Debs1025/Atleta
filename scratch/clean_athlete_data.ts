import { db } from '../utils/firebaseAdmin';
import dotenv from 'dotenv';
dotenv.config();

async function cleanAthleteData() {
  console.log('🧹 [DATABASE CLEANUP] Starting Athlete-side cleanup...');

  // Collections to wipe completely
  const collectionsToWipe = ['Athlete_Profiles', 'Scouting_Registry', 'Inquiries', 'Notifications'];

  for (const collName of collectionsToWipe) {
    console.log(`Clearing collection "${collName}"...`);
    const snapshot = await db.collection(collName).get();
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    if (snapshot.size > 0) {
      await batch.commit();
      console.log(`  Deleted ${snapshot.size} documents from "${collName}".`);
    } else {
      console.log(`  Collection "${collName}" is already empty.`);
    }
  }

  // Delete Athlete users from Users collection
  console.log('Clearing Athlete users from "Users" collection...');
  const usersSnapshot = await db.collection('Users').where('role', '==', 'Athlete').get();
  const userBatch = db.batch();
  usersSnapshot.docs.forEach((doc) => {
    userBatch.delete(doc.ref);
  });
  if (usersSnapshot.size > 0) {
    await userBatch.commit();
    console.log(`  Deleted ${usersSnapshot.size} Athlete users.`);
  } else {
    console.log('  No Athlete users found in "Users" collection.');
  }

  console.log('✅ [DATABASE CLEANUP] Athlete-side cleanup finished successfully!\n');
  process.exit(0);
}

cleanAthleteData().catch((err) => {
  console.error('❌ Cleanup failed:', err);
  process.exit(1);
});
