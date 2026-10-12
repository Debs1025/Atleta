import { db } from '../utils/firebaseAdmin';
import { submitMatchSession } from '../services/matchService';

async function runQATest() {
  console.log('🧪 Starting QA Execution Test: OCR Parsing & Dynamic Sport-Specific Stat Mapping...');

  // =========================================================================
  // TEST SCENARIO 1: Same Name, Multiple Events (Disambiguation Test)
  // =========================================================================
  console.log('\n--- [Scenario 1] Running Multi-Event Disambiguation Test ---');

  const athleteName = 'Juan Dela Cruz';
  const sharedAthleteId = 'ath_juan_dela_cruz_qa';

  // Two events: 50m Dash and 100m Dash with distinct performance times and ranks
  const multiEventScoresheetPlayers = [
    {
      player_name: athleteName,
      team_name: 'Ateneo Track Club',
      jersey_number: 7,
      event: '50m Dash',
      event_id: 'EVT-50M_DASH',
      heat: 1,
      lane: 4,
      finish_time: '06.25s',
      split: '03.10s',
      placement_rank: 1,
      stats: {
        event: '50m Dash',
        finish_time: '06.25s',
        split: '03.10s',
        heat: 1,
        lane: 4,
        rank: 1,
      },
    },
    {
      player_name: athleteName,
      team_name: 'Ateneo Track Club',
      jersey_number: 7,
      event: '100m Dash',
      event_id: 'EVT-100M_DASH',
      heat: 2,
      lane: 3,
      finish_time: '11.45s',
      split: '05.60s',
      placement_rank: 2,
      stats: {
        event: '100m Dash',
        finish_time: '11.45s',
        split: '05.60s',
        heat: 2,
        lane: 3,
        rank: 2,
      },
    },
  ];

  const matchId1 = `match_qa_track_${Date.now()}`;
  const payloadScenario1 = {
    team_id: 'ateneo_track_club',
    sport_type: 'Track & Field',
    match_name: 'National Intercollegiate Athletics Championship',
    match_type: 'Official Match',
    match_date: new Date().toISOString(),
    location: 'Philsports Arena',
    opponent_team_name: 'DLSU Green Track',
    game_result: 'WIN',
    final_score: '85 - 72',
    home_score: 85,
    away_score: 72,
    player_stats: multiEventScoresheetPlayers.map((p, idx) => ({
      athlete_id: sharedAthleteId,
      row_uid: `${sharedAthleteId}_${p.event.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${idx + 1}`,
      player_name: p.player_name,
      team_name: p.team_name,
      jersey_number: p.jersey_number,
      event: p.event,
      event_id: p.event_id,
      heat: p.heat,
      lane: p.lane,
      placement_rank: p.placement_rank,
      finish_time: p.finish_time,
      split: p.split,
      stats: p.stats,
    })),
  };

  const result1 = await submitMatchSession('coach_test', { ...(payloadScenario1 as any), match_id: matchId1 }, `idemp_${Date.now()}_1`);
  console.log(`✅ [Scenario 1] Match submitted successfully: ${result1.total_players_logged} player events logged.`);

  // Verify database integrity for distinct performance metrics
  const metricsSnap = await db
    .collection('Performance_Metrics')
    .where('athlete_id', '==', sharedAthleteId)
    .where('match_id', '==', matchId1)
    .get();

  console.log(`📊 [Scenario 1] Performance_Metrics docs created for ${athleteName}: ${metricsSnap.size}`);
  if (metricsSnap.size !== 2) {
    throw new Error(`FAILED Scenario 1: Expected 2 distinct Performance_Metrics documents for ${athleteName}, but found ${metricsSnap.size}`);
  }

  const eventsRecorded = metricsSnap.docs.map((d) => {
    const data = d.data();
    return {
      metric_id: d.id,
      event: data.event,
      finish_time: data.finish_time,
      heat: data.heat,
      rank: data.rank,
    };
  });
  console.log('📋 [Scenario 1] Distinct event performance entries verified in DB:', eventsRecorded);

  const event50 = eventsRecorded.find((e) => e.event === '50m Dash');
  const event100 = eventsRecorded.find((e) => e.event === '100m Dash');

  if (!event50 || !event100) {
    throw new Error('FAILED Scenario 1: Missing either 50m Dash or 100m Dash distinct entry!');
  }
  if (event50.finish_time !== '06.25s' || event100.finish_time !== '11.45s') {
    throw new Error('FAILED Scenario 1: Metrics corrupted or merged across events!');
  }
  console.log('🎉 [Scenario 1 PASSED] Same Name, Multiple Events properly disambiguated into non-overlapping metrics!');

  // =========================================================================
  // TEST SCENARIO 2: Dynamic Stat-Schema & Non-Hardcoded Mapping
  // =========================================================================
  console.log('\n--- [Scenario 2] Running Dynamic Stat-Schema Test (Swimming) ---');

  const matchId2 = `match_qa_swim_${Date.now()}`;
  const customSwimmingStats = {
    lap_count: 4,
    stroke_rate: 34,
    split_times_ms: '27.40s, 29.10s',
    finish_time_ms: '00:56.50',
    distance_meters: 100,
    stroke_cadence: '42 spm',
    lap_splits: '27.40s / 29.10s',
  };

  const payloadScenario2 = {
    team_id: 'aquatics_club_qa',
    sport_type: 'Swimming',
    match_name: 'UAAP Season Swimming Finals',
    match_type: 'Official Match',
    match_date: new Date().toISOString(),
    location: 'Rizal Memorial Swimming Stadium',
    opponent_team_name: 'UST Aqua Tigers',
    game_result: 'WIN',
    final_score: '110 - 95',
    home_score: 110,
    away_score: 95,
    player_stats: [
      {
        athlete_id: 'ath_swimmer_qa_1',
        row_uid: 'ath_swimmer_qa_1_100m_free_1',
        player_name: 'Maria Santos',
        team_name: 'Ateneo Blue Aquatics',
        jersey_number: 12,
        event: '100m Freestyle',
        event_id: 'EVT-100M_FREE',
        finish_time: '00:56.50',
        split: '27.40s, 29.10s',
        placement_rank: 1,
        stats: customSwimmingStats,
        ...customSwimmingStats,
      },
    ],
  };

  const result2 = await submitMatchSession('coach_test', { ...(payloadScenario2 as any), match_id: matchId2 }, `idemp_${Date.now()}_2`);
  console.log(`✅ [Scenario 2] Swimming match submitted successfully with dynamic schema.`);

  const swimMetricDoc = await db
    .collection('Performance_Metrics')
    .doc(`metric_${matchId2}_ath_swimmer_qa_1_100m_freestyle`)
    .get();

  if (!swimMetricDoc.exists) {
    throw new Error('FAILED Scenario 2: Swimming performance metric was not found in Firestore!');
  }

  const savedSwimData = swimMetricDoc.data();
  console.log('📋 [Scenario 2] Saved sport_stats from DB:', savedSwimData?.sport_stats);

  if (
    savedSwimData?.sport_stats?.stroke_rate !== 34 ||
    savedSwimData?.sport_stats?.lap_count !== 4 ||
    savedSwimData?.sport_stats?.finish_time_ms !== '00:56.50'
  ) {
    throw new Error('FAILED Scenario 2: Dynamic schema statistics truncated or mismatch in DB!');
  }

  console.log('🎉 [Scenario 2 PASSED] Dynamic non-hardcoded sport metrics preserved with 100% database integrity!');

  // Cleanup test docs from Firestore
  console.log('\n🧹 Cleaning up QA test records...');
  const batch = db.batch();
  metricsSnap.docs.forEach((doc) => batch.delete(doc.ref));
  batch.delete(swimMetricDoc.ref);
  batch.delete(db.collection('Match_Logs').doc(matchId1));
  batch.delete(db.collection('Match_Logs').doc(matchId2));
  await batch.commit();
  console.log('✨ Cleanup complete.');

  console.log('\n🏁 ALL QA EXECUTION SCENARIOS PASSED SUCCESSFULLY!');
}

runQATest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ QA Execution Test Failed:', err);
    process.exit(1);
  });
