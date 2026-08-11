import { db } from '../utils/firebaseAdmin';
import dotenv from 'dotenv';
dotenv.config();

async function inspect() {
  console.log('\n=== USERS ===');
  const users = await db.collection('Users').get();
  users.forEach(doc => {
    const d = doc.data();
    console.log(`  uid: ${doc.id} | role: ${d.role} | email: ${d.email}`);
  });

  console.log('\n=== ATHLETE_PROFILES ===');
  const profiles = await db.collection('Athlete_Profiles').get();
  profiles.forEach(doc => {
    const d = doc.data();
    console.log(`  doc_id: ${doc.id} | athlete_id: ${d.athlete_id} | user_id: ${d.user_id}`);
  });

  console.log('\n=== NOTIFICATIONS ===');
  const notifs = await db.collection('Notifications').get();
  if (notifs.empty) {
    console.log('  (empty)');
  }
  notifs.forEach(doc => {
    const d = doc.data();
    console.log(`  id: ${doc.id}`);
    console.log(`    recipient_id: ${d.recipient_id}`);
    console.log(`    type:         ${d.type}`);
    console.log(`    title:        ${d.title}`);
    console.log(`    is_read:      ${d.is_read}`);
  });

  console.log('\n=== SCOUTING_REGISTRY ===');
  const scouting = await db.collection('Scouting_Registry').get();
  scouting.forEach(doc => {
    const d = doc.data();
    console.log(`  scout_id: ${d.scout_id} | athlete_id: ${d.athlete_id} | coach_scout_id: ${d.coach_scout_id} | initiated_by: ${d.initiated_by} | offer_status: ${d.offer_status}`);
  });

  process.exit(0);
}

inspect().catch(err => { console.error(err); process.exit(1); });
