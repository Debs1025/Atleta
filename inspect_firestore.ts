import { db } from './utils/firebaseAdmin';

async function seedUser() {
  const targetId = 'ath_test_player_1786170767350';
  console.log(`Writing missing Users document for ID: "${targetId}"...\n`);

  try {
    await db.collection('Users').doc(targetId).set({
      first_name: 'Jerom',
      last_name: 'Lastimosa',
      email: 'jerom.lastimosa@test.com',
      role: 'Athlete',
      created_at: new Date(),
      updated_at: new Date(),
    });

    console.log('✅ Successfully created Users document!');
  } catch (err: any) {
    console.error('Error:', err);
  }
}

seedUser();
