import { getAthleteHomeSummary, getAthleteExpandedCareerStats, getAthleteDateGroupedMatches, getAthleteProfile, invalidateAthleteHomeCache } from '../services/athleteService';
import { db } from '../utils/firebaseAdmin';

console.log('=== TEST: LIVE FIRESTORE ATHLETE STATS FETCHING & DYNAMIC AGGREGATION ===\n');

let passed = 0;
let total = 0;

function assert(condition: boolean, testName: string) {
  total++;
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
  }
}

async function run() {
  const ts = Date.now();
  const testAthUid = `test_ath_live_${ts}`;
  const canonicalAthId = `ath_${testAthUid}`;
  const testMatchId = `match_live_${ts}`;

  try {
    // 1. Create a brand new athlete with ZERO matches
    await db.collection('Users').doc(testAthUid).set({
      user_id: testAthUid,
      first_name: 'LiveAthlete',
      last_name: 'TestZero',
      role: 'Athlete',
      sport_type: 'Basketball',
      province: 'Camarines Sur',
    });

    await db.collection('Athlete_Profiles').doc(canonicalAthId).set({
      athlete_id: canonicalAthId,
      user_id: testAthUid,
      first_name: 'LiveAthlete',
      last_name: 'TestZero',
      sport_type: 'Basketball',
    });

    // 2. Query stats for fresh zero-state athlete
    const homeZero = await getAthleteHomeSummary(canonicalAthId);
    assert(homeZero !== null, 'Home summary returns non-null for real registered athlete');
    assert(homeZero?.personal_analytics.ppg === 0, 'Zero-state athlete has 0 PPG');
    assert(homeZero?.personal_analytics.rpg === 0, 'Zero-state athlete has 0 RPG');
    assert(homeZero?.personal_analytics.apg === 0, 'Zero-state athlete has 0 APG');
    assert(homeZero?.five_game_trend.length === 0, 'Zero-state athlete has empty five_game_trend');
    assert(homeZero?.current_team_summary === null, 'Athlete with no team has null current_team_summary');

    const careerZero = await getAthleteExpandedCareerStats(canonicalAthId);
    assert(careerZero.games_played === 0, 'Career stats reports 0 games played');
    assert(careerZero.career_averages.ppg === 0, 'Career averages reports 0.0 PPG');
    assert(careerZero.game_highs.points === 0, 'Game highs reports 0 points');

    const matchesZero = await getAthleteDateGroupedMatches(canonicalAthId);
    assert(matchesZero.total_matches_logged === 0, 'Reports 0 total matches logged');
    assert(matchesZero.grouped_matches.length === 0, 'Grouped matches is empty array');

    // 3. Now log a live Match and Performance_Metrics for this athlete
    await db.collection('Match_Logs_Official').doc(testMatchId).set({
      match_id: testMatchId,
      sport_type: 'Basketball',
      match_date: '2026-09-13T10:00:00.000Z',
      opponent_team_name: 'Bicol Warriors',
      home_team_name: 'Naga Titans',
      away_team_name: 'Bicol Warriors',
      game_result: 'WIN',
      score: '95 - 88',
      venue: 'Naga Coliseum',
      roster_athletes: [canonicalAthId],
      is_official: true,
    });

    await db.collection('Performance_Metrics').doc(`pm_${testMatchId}_${canonicalAthId}`).set({
      metric_id: `pm_${testMatchId}_${canonicalAthId}`,
      athlete_id: canonicalAthId,
      match_id: testMatchId,
      sport_category: 'Basketball',
      calculated_player_efficiency: 32.5,
      timestamp: '2026-09-13T10:00:00.000Z',
      radar_scores: {
        speed: 90,
        agility: 88,
        power: 85,
        iq: 94,
        tech: 91,
      },
      sport_stats: {
        points: 35,
        offensive_rebounds: 3,
        defensive_rebounds: 8,
        rebounds: 11,
        assists: 7,
        steals: 4,
        blocks: 2,
        turnovers: 1,
        fouls: 2,
        fg_made: 13,
        fg_attempted: 22,
        three_made: 4,
        three_attempted: 8,
        ft_made: 5,
        ft_attempted: 6,
      },
    });

    // 4. Query live Firestore after recording metric
    invalidateAthleteHomeCache(canonicalAthId);
    const homeWithMetric = await getAthleteHomeSummary(canonicalAthId);
    assert(homeWithMetric?.personal_analytics.ppg === 35, `PPG correctly aggregates live from Firestore (Expected: 35, Actual: ${homeWithMetric?.personal_analytics.ppg})`);
    assert(homeWithMetric?.personal_analytics.rpg === 11, `RPG correctly aggregates live from Firestore (Expected: 11, Actual: ${homeWithMetric?.personal_analytics.rpg})`);
    assert(homeWithMetric?.personal_analytics.apg === 7, `APG correctly aggregates live from Firestore (Expected: 7, Actual: ${homeWithMetric?.personal_analytics.apg})`);
    assert(homeWithMetric?.personal_analytics.bpg === 2, `BPG correctly aggregates live from Firestore (Expected: 2, Actual: ${homeWithMetric?.personal_analytics.bpg})`);
    assert(homeWithMetric?.personal_analytics.efficiency_rating === 32.5, `Efficiency rating aggregated (Actual: ${homeWithMetric?.personal_analytics.efficiency_rating})`);
    assert(homeWithMetric?.five_game_trend.length === 1, `five_game_trend contains 1 game (Actual: ${homeWithMetric?.five_game_trend.length})`);
    assert(homeWithMetric?.five_game_trend[0].points === 35, 'five_game_trend game points match 35');
    assert(homeWithMetric?.five_game_trend[0].opponent === 'Bicol Warriors', 'five_game_trend opponent matches Bicol Warriors');

    const careerWithMetric = await getAthleteExpandedCareerStats(canonicalAthId);
    assert(careerWithMetric.games_played === 1, 'Career stats reports 1 game played');
    assert(careerWithMetric.career_averages.ppg === 35, 'Career PPG is 35');
    assert(careerWithMetric.game_highs.points === 35, 'Game high points is 35');
    assert(careerWithMetric.game_highs.rebounds === 11, 'Game high rebounds is 11');
    assert(careerWithMetric.game_highs.assists === 7, 'Game high assists is 7');
    assert(careerWithMetric.game_highs.steals === 4, 'Game high steals is 4');
    assert(careerWithMetric.game_highs.blocks === 2, 'Game high blocks is 2');
    assert(careerWithMetric.game_highs.efficiency === 32.5, 'Game high efficiency is 32.5');

    const matchesWithMetric = await getAthleteDateGroupedMatches(canonicalAthId);
    assert(matchesWithMetric.total_matches_logged === 1, 'Total matches logged is 1');
    assert(matchesWithMetric.grouped_matches[0].month_year === 'SEPTEMBER 2026', 'Grouped under SEPTEMBER 2026');

    // 5. Cleanup test documents
    await db.collection('Users').doc(testAthUid).delete();
    await db.collection('Athlete_Profiles').doc(canonicalAthId).delete();
    await db.collection('Match_Logs_Official').doc(testMatchId).delete();
    await db.collection('Performance_Metrics').doc(`pm_${testMatchId}_${canonicalAthId}`).delete();

    console.log(`\n=== RESULTS: ${passed}/${total} TESTS PASSED ===\n`);
    if (passed === total) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test execution error:', error);
    process.exit(1);
  }
}

run();
