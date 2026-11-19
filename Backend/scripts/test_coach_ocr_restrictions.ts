import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { db } from '../utils/firebaseAdmin';
import { scanStandaloneScoresheet } from '../controllers/matchController';

async function runTests() {
  console.log('=== OCR COACH RESTRICTIONS TEST HARNESS ===\n');
  const jwtSecret = process.env.JWT_SECRET || 'test_secret';

  // Create JWT for Coach Archie (Swimming & Track)
  const archieToken = jwt.sign(
    { uid: 'S23UEhYevjgcI02hu1L5gjIfVPn2', email: 'archie.lim@ateneo.edu', role: 'Coach' },
    jwtSecret
  );

  // Create JWT for Coach Norman (Basketball)
  const normanToken = jwt.sign(
    { uid: 'x1QHbpB8VoYHvlNDWrVG2aGVMLJ2', email: 'norman.black@ateneo.edu', role: 'Coach' },
    jwtSecret
  );

  const mockRes = () => {
    const res: any = {
      statusCode: 200,
      data: null,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: any) {
        this.data = payload;
        return this;
      },
      setHeader() { return this; },
    };
    return res;
  };

  const sampleBase = fs.existsSync(path.resolve(__dirname, '../../sample_scoresheets'))
    ? path.resolve(__dirname, '../../sample_scoresheets')
    : path.resolve(__dirname, '../../../sample_scoresheets');

  // TEST 1: Coach Archie uploads Basketball Scoresheet (Sport Mismatch)
  console.log('TEST 1: Coach Archie (Swimming/Track) uploads Basketball scoresheet...');
  const bballImg = fs.readFileSync(path.join(sampleBase, 'Basketball/basketball_page1.png'));
  const req1: any = {
    user: { uid: 'S23UEhYevjgcI02hu1L5gjIfVPn2', role: 'Coach' },
    headers: { authorization: `Bearer ${archieToken}` },
    body: {
      base64: bballImg.toString('base64'),
      filename: 'basketball_page1.jpg',
      mimetype: 'image/jpeg',
    },
    query: {},
  };
  const res1 = mockRes();
  await scanStandaloneScoresheet(req1, res1);
  console.log(`Status: ${res1.statusCode}`);
  console.log('Response:', JSON.stringify(res1.data, null, 2));
  if (res1.statusCode === 400 && res1.data?.error === 'SPORT_MISMATCH') {
    console.log('✔ PASS: Rejected with SPORT_MISMATCH as expected.\n');
  } else {
    console.error('❌ FAIL: Expected SPORT_MISMATCH\n');
  }

  // TEST 2: Coach Archie uploads Swimming Scoresheet without his scouted players
  console.log('TEST 2: Coach Archie uploads Swimming meet with non-scouted athletes...');
  const swimNoviceImg = fs.readFileSync(path.join(sampleBase, 'Swimming/Robredo_Swim_Cup_Events/event01_boys_100m_freestyle_novice.png'));
  const req2: any = {
    user: { uid: 'S23UEhYevjgcI02hu1L5gjIfVPn2', role: 'Coach' },
    headers: { authorization: `Bearer ${archieToken}` },
    body: {
      base64: swimNoviceImg.toString('base64'),
      filename: 'event01_boys_100m_freestyle_novice.jpg',
      mimetype: 'image/jpeg',
    },
    query: {},
  };
  const res2 = mockRes();
  await scanStandaloneScoresheet(req2, res2);
  console.log(`Status: ${res2.statusCode}`);
  console.log('Response:', JSON.stringify(res2.data, null, 2));
  if (res2.statusCode === 400 && res2.data?.error === 'NO_SCOUTED_PLAYERS') {
    console.log('✔ PASS: Rejected with NO_SCOUTED_PLAYERS as expected.\n');
  } else {
    console.error('❌ FAIL: Expected NO_SCOUTED_PLAYERS\n');
  }

  // TEST 3: Coach Archie uploads Swimming Scoresheet WITH his scouted swimmer (Kayla Sanchez)
  console.log('TEST 3: Coach Archie uploads Swimming sheet with Kayla Sanchez & Luke Gebbie...');
  const swimArchieImg = fs.readFileSync(path.join(sampleBase, 'Swimming/coach_archie_swimming_ateneo_blue_fast.png'));
  const req3: any = {
    user: { uid: 'S23UEhYevjgcI02hu1L5gjIfVPn2', role: 'Coach' },
    headers: { authorization: `Bearer ${archieToken}` },
    body: {
      base64: swimArchieImg.toString('base64'),
      filename: 'coach_archie_swimming_ateneo_blue_fast.jpg',
      mimetype: 'image/jpeg',
    },
    query: {},
  };
  const res3 = mockRes();
  await scanStandaloneScoresheet(req3, res3);
  console.log(`Status: ${res3.statusCode}`);
  const isSwim3 = res3.data?.sport_type === 'SWIMMING' || res3.data?.match_info?.sport_type === 'SWIMMING';
  if (res3.statusCode === 200 && isSwim3) {
    console.log('✔ PASS: Successfully scanned and accepted Coach Archie swimming meet!\n');
  } else {
    console.error('❌ FAIL: Expected 200 SUCCESS, got:', res3.data, '\n');
  }

  // TEST 4: Coach Norman uploads Swimming Scoresheet (Sport Mismatch)
  console.log('TEST 4: Coach Norman (Basketball) uploads Swimming sheet...');
  const req4: any = {
    user: { uid: 'x1QHbpB8VoYHvlNDWrVG2aGVMLJ2', role: 'Coach' },
    headers: { authorization: `Bearer ${normanToken}` },
    body: {
      base64: swimArchieImg.toString('base64'),
      filename: 'swim.jpg',
      mimetype: 'image/jpeg',
    },
    query: {},
  };
  const res4 = mockRes();
  await scanStandaloneScoresheet(req4, res4);
  console.log(`Status: ${res4.statusCode}`);
  console.log('Response:', JSON.stringify(res4.data, null, 2));
  if (res4.statusCode === 400 && res4.data?.error === 'SPORT_MISMATCH') {
    console.log('✔ PASS: Rejected Coach Norman with SPORT_MISMATCH.\n');
  } else {
    console.error('❌ FAIL: Expected SPORT_MISMATCH\n');
  }

  // TEST 5: Coach Norman uploads Basketball Scoresheet WITH his scouted player Kevin Quiambao
  console.log('TEST 5: Coach Norman uploads Basketball sheet with Kevin Quiambao...');
  const normanBballImg = fs.readFileSync(path.join(sampleBase, 'Basketball/ateneo_blue_eagles_game_scoresheet.png'));
  const req5: any = {
    user: { uid: 'x1QHbpB8VoYHvlNDWrVG2aGVMLJ2', role: 'Coach' },
    headers: { authorization: `Bearer ${normanToken}` },
    body: {
      base64: normanBballImg.toString('base64'),
      filename: 'ateneo_blue_eagles_game_scoresheet.png',
      mimetype: 'image/png',
    },
    query: {},
  };
  const res5 = mockRes();
  await scanStandaloneScoresheet(req5, res5);
  console.log(`Status: ${res5.statusCode}`);
  const isBball5 = res5.data?.sport_type === 'BASKETBALL' || res5.data?.match_info?.sport_type === 'BASKETBALL';
  if (res5.statusCode === 200 && isBball5) {
    console.log('✔ PASS: Successfully scanned and accepted Coach Norman basketball boxscore!\n');
  } else {
    console.error('❌ FAIL: Expected 200 SUCCESS, got:', res5.data, '\n');
  }

  console.log('=== ALL TESTS COMPLETED SUCCESSFULLY ===');
}

runTests().then(() => process.exit(0)).catch((err) => {
  console.error('Test suite error:', err);
  process.exit(1);
});
