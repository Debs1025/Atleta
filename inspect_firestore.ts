import { db } from './utils/firebaseAdmin';

async function checkMatchOwner() {
  const matchId = 'match_1786170768654_efh1';
  console.log(`🔍 [OWNERSHIP INSPECTOR] Checking owner for match: "${matchId}"...\n`);

  try {
    const matchDoc = await db.collection('Match_Logs').doc(matchId).get();
    if (!matchDoc.exists) {
      console.log('❌ Match Log not found!');
      return;
    }

    const matchData = matchDoc.data()!;
    const teamId = matchData.team_id;
    console.log(`📄 Match belongs to Team ID: "${teamId}"`);

    if (!teamId) {
      console.log('❌ No team_id linked on this match!');
      return;
    }

    const teamDoc = await db.collection('Teams').doc(teamId).get();
    if (!teamDoc.exists) {
      console.log('❌ Team document not found!');
      return;
    }

    const teamData = teamDoc.data()!;
    console.log(`🏀 Team Coach ID: "${teamData.coach_id}"`);

    // Let's also list all other teams in the DB and their coaches to help the user test!
    console.log('\n📌 All Teams in Database:');
    const teamsSnapshot = await db.collection('Teams').get();
    teamsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      console.log(`  - Team ID: "${doc.id}" | Team Name: "${data.team_name}" | Coach ID: "${data.coach_id}"`);
    });

  } catch (err: any) {
    console.error('Error:', err);
  }
}

checkMatchOwner();
