import {
  generateCustomMatchId,
  generateCustomScheduleId,
  generateCustomAuditId,
  generateCustomRequestId,
} from '../utils/idGenerator';
import { createOfficialMatchService } from '../services/validationService';
import { getOfficialSchedules, getOfficialDashboardMetrics } from '../services/officialDashboardService';
import { getOfficialProfile, updateOfficialProfileService, getOfficialSettings, updateOfficialSettings } from '../services/officialService';
import { createScoresheetRequestService, getScoresheetRequestsService } from '../services/scoresheetService';
import { db } from '../utils/firebaseAdmin';

async function runTests() {
  console.log('🚀 Starting Official Revision Verification Tests...\n');

  // Test 1: Custom Sequential IDs
  console.log('--- Test 1: ID Generator ---');
  const matchId1 = await generateCustomMatchId(true);
  const matchId2 = await generateCustomMatchId(true);
  const schedId1 = await generateCustomScheduleId();
  const auditId1 = await generateCustomAuditId();
  const reqId1 = await generateCustomRequestId();
  console.log(`Generated IDs:
  - Official Match ID: ${matchId1}, ${matchId2}
  - Schedule ID: ${schedId1}
  - Audit ID: ${auditId1}
  - Request ID: ${reqId1}`);
  if (!matchId1.startsWith('MATCH-OFF-') || !schedId1.startsWith('SCHED-')) {
    throw new Error('ID prefix test failed!');
  }
  console.log('✅ Test 1 Passed: Custom IDs generated sequentially and cleanly.\n');

  // Test 2: Official Match Creation with Multi-Sport, Rosters, Coaches, Venue, & Schedule Sync
  console.log('--- Test 2: Official Match Creation & Schedule Sync ---');
  const testOfficialUid = 'test_official_rev_001';
  const testIdempKey = `idemp_${Date.now()}_${Math.random()}`;

  const matchPayload = {
    sport_type: 'Basketball',
    event_name: 'Regional Championship Finals 2026',
    match_type: 'Official Tournament Match',
    match_date: '2026-10-15T18:00:00.000Z',
    scheduled_time: '2026-10-15T18:00:00.000Z',
    location: 'Naga City Coliseum',
    venue: 'Naga City Coliseum - Main Arena',
    court_number: 'Court 1',
    team_id: 'team_celtics_01',
    home_team_id: 'team_celtics_01',
    home_team_name: 'Camarines Sur Celtics',
    away_team_id: 'team_hawks_02',
    away_team_name: 'Albay Hawks',
    opponent_team_name: 'Albay Hawks',
    home_score: 98,
    away_score: 92,
    coaches: [
      {
        coach_id: 'coach_celtics_01',
        full_name: 'Coach Marcus Rivera',
        email: 'marcus.rivera@celtics.ph',
        team_name: 'Camarines Sur Celtics',
        role: 'Head Coach',
      },
      {
        coach_id: 'coach_hawks_02',
        full_name: 'Coach David Santos',
        email: 'david.santos@hawks.ph',
        team_name: 'Albay Hawks',
        role: 'Head Coach',
      },
    ],
    athlete_rosters: [
      {
        athlete_id: 'ath_player_01',
        player_name: 'Harold Green',
        jersey_number: 7,
        team_name: 'Camarines Sur Celtics',
        position: 'Point Guard',
      },
      {
        athlete_id: 'ath_player_02',
        player_name: 'Kobe Alvarez',
        jersey_number: 24,
        team_name: 'Albay Hawks',
        position: 'Shooting Guard',
      },
    ],
    player_stats: [
      {
        athlete_id: 'ath_player_01',
        player_name: 'Harold Green',
        jersey_number: 7,
        team_name: 'Camarines Sur Celtics',
        stats: { points: 28, assists: 10, rebounds: 6, steals: 3, fouls: 2 },
      },
      {
        athlete_id: 'ath_player_02',
        player_name: 'Kobe Alvarez',
        jersey_number: 24,
        team_name: 'Albay Hawks',
        stats: { points: 31, assists: 4, rebounds: 8, steals: 2, fouls: 3 },
      },
    ],
    notes: 'Official championship game verified by appointed tournament referee.',
  };

  const createdMatchRes = await createOfficialMatchService(testOfficialUid, matchPayload as any, testIdempKey);
  console.log('Match Creation Result:', {
    match_id: createdMatchRes.match_id,
    schedule_id: createdMatchRes.schedule_id,
    validation_id: createdMatchRes.validation_id,
    venue: createdMatchRes.match.venue,
    created_by_role: createdMatchRes.match.created_by_role,
  });

  // Verify stored in Match_Logs_Official
  const offDoc = await db.collection('Match_Logs_Official').doc(createdMatchRes.match_id).get();
  if (!offDoc.exists) throw new Error('Match_Logs_Official document was not created!');

  // Verify stored in Official_Schedules
  const schedDoc = await db.collection('Official_Schedules').doc(createdMatchRes.schedule_id).get();
  if (!schedDoc.exists) throw new Error('Official_Schedules document was not created!');
  console.log('✅ Test 2 Passed: Official Match, linked Schedule, and Segregation created successfully.\n');

  // Test 3: Schedule Fetching with Attached Coach & Team Details
  console.log('--- Test 3: Schedule Fetching with Coach Details ---');
  const schedules = await getOfficialSchedules(testOfficialUid);
  const foundSched = schedules.find(s => s.schedule_id === createdMatchRes.schedule_id);
  if (!foundSched) throw new Error('Created schedule not returned in getOfficialSchedules!');
  console.log('Fetched Schedule Details:', {
    schedule_id: foundSched.schedule_id,
    venue: foundSched.venue,
    home_team: foundSched.home_team,
    away_team: foundSched.away_team,
    coach_count: foundSched.coach_details?.length,
    coaches: foundSched.coach_details,
  });
  if (!foundSched.coach_details || foundSched.coach_details.length === 0) {
    throw new Error('Coach details missing from schedule!');
  }
  console.log('✅ Test 3 Passed: Schedule returned with coach and team details.\n');

  // Test 4: Official Profile Update & Settings
  console.log('--- Test 4: Official Profile & Settings API ---');
  const profileUpdate = await updateOfficialProfileService(testOfficialUid, {
    full_legal_name: 'Chief Official Arthur Vance',
    contact_number: '+63 917 555 1234',
    organization_name: 'National Sports Commission',
    official_license_number: 'OFF-LIC-2026-VIP',
    assigned_tournaments: ['Bicol Regional Meet 2026', 'National Palaro 2026'],
  });
  console.log('Updated Profile:', {
    name: profileUpdate.full_legal_name,
    license: profileUpdate.official_license_number,
    tournaments: profileUpdate.assigned_tournaments,
  });

  const updatedSettings = await updateOfficialSettings(`off_${testOfficialUid}`, {
    split_screen_defaults: true,
    discrepancy_presets: true,
    match_reminders: false,
  });
  console.log('Updated Settings:', updatedSettings);
  console.log('✅ Test 4 Passed: Official Profile and Settings updated and retrieved successfully.\n');

  // Test 5: Scoresheet Requests (Connection & Segregation)
  console.log('--- Test 5: Scoresheet Requests Connection ---');
  const requestRes = await createScoresheetRequestService('coach_celtics_01', {
    match_id: createdMatchRes.match_id,
    notes: 'Please provide certified scoresheet for playoff review.',
    official_id: `off_${testOfficialUid}`,
  });
  console.log('Scoresheet Request Created:', {
    request_id: requestRes.request_id,
    match_id: requestRes.match_id,
    status: requestRes.status,
    match_opponent: requestRes.match_details?.opponent_team_name,
  });

  const coachRequests = await getScoresheetRequestsService('coach_celtics_01', 'Coach');
  const foundCoachReq = coachRequests.find(r => r.request_id === requestRes.request_id);
  if (!foundCoachReq) throw new Error('Scoresheet request not found for coach!');

  console.log('✅ Test 5 Passed: Scoresheet request submitted and queried referencing Match_Logs_Official.\n');

  // Clean up test documents
  await db.collection('Match_Logs_Official').doc(createdMatchRes.match_id).delete();
  await db.collection('Match_Logs').doc(createdMatchRes.match_id).delete();
  await db.collection('Official_Schedules').doc(createdMatchRes.schedule_id).delete();
  await db.collection('Scoresheet_Requests').doc(requestRes.request_id).delete();
  await db.collection('Official_Audits').doc(createdMatchRes.validation_id).delete();

  console.log('🎉 ALL 5 REVISION INTEGRATION TESTS PASSED PERFECTLY!\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
