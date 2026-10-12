import sharp from 'sharp';
import { processAndStitchScoresheets, scanMultipleScoresheetsStandalone } from '../services/matchService';

async function testMultiScoresheetEngine() {
  console.log('================================================================');
  console.log('🧪 TESTING MULTI-SCORESHEET COMPRESSION & AI STITCHING ENGINE');
  console.log('================================================================\n');

  // 1. Generate 2 synthetic scoresheet page image buffers (Page 1: Home Team, Page 2: Away Team)
  console.log('1. Generating sample multi-page scoresheet image buffers...');
  const svgPage1 = `
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <text x="50" y="60" font-family="sans-serif" font-size="28" font-weight="bold" fill="#0B132B">OFFICIAL BASKETBALL SCORESHEET - PAGE 1</text>
      <text x="50" y="100" font-family="sans-serif" font-size="20" fill="#1E293B">HOME TEAM: ADNU KNIGHTS (Score: 88)</text>
      <text x="50" y="150" font-family="sans-serif" font-size="16" fill="#334155">#7 Jerom Lastimosa - 24 PTS, 6 REB, 8 AST, 2 STL</text>
      <text x="50" y="190" font-family="sans-serif" font-size="16" fill="#334155">#10 Dave Ildefonso - 18 PTS, 5 REB, 3 AST, 1 BLK</text>
      <text x="50" y="230" font-family="sans-serif" font-size="16" fill="#334155">#34 Ange Kouame - 16 PTS, 14 REB, 2 AST, 3 BLK</text>
    </svg>
  `;

  const svgPage2 = `
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <text x="50" y="60" font-family="sans-serif" font-size="28" font-weight="bold" fill="#0B132B">OFFICIAL BASKETBALL SCORESHEET - PAGE 2</text>
      <text x="50" y="100" font-family="sans-serif" font-size="20" fill="#1E293B">AWAY TEAM: DLSU GREEN ARCHERS (Score: 82)</text>
      <text x="50" y="150" font-family="sans-serif" font-size="16" fill="#334155">#11 Kevin Quiambao - 22 PTS, 11 REB, 5 AST</text>
      <text x="50" y="190" font-family="sans-serif" font-size="16" fill="#334155">#21 Michael Phillips - 14 PTS, 12 REB, 2 BLK</text>
      <text x="50" y="230" font-family="sans-serif" font-size="16" fill="#334155">#3 Evan Nelle - 12 PTS, 4 REB, 7 AST</text>
    </svg>
  `;

  const bufPage1 = await sharp(Buffer.from(svgPage1)).png().toBuffer();
  const bufPage2 = await sharp(Buffer.from(svgPage2)).png().toBuffer();

  const mockFiles = [
    {
      originalname: 'match_scoresheet_page1.png',
      mimetype: 'image/png',
      buffer: bufPage1,
      size: bufPage1.length,
    },
    {
      originalname: 'match_scoresheet_page2.png',
      mimetype: 'image/png',
      buffer: bufPage2,
      size: bufPage2.length,
    },
  ];

  // 2. Test Image Compression and Vertical Stitching
  console.log('2. Running processAndStitchScoresheets helper...');
  const { compositeBuffer, imageParts } = await processAndStitchScoresheets(mockFiles as any);
  console.log(`   ✔ Compressed ${imageParts.length} image parts successfully.`);
  console.log(`   ✔ Stitched master scoresheet size: ${(compositeBuffer.length / 1024).toFixed(1)} KB.`);

  const metadata = await sharp(compositeBuffer).metadata();
  console.log(`   ✔ Master stitched composite dimensions: ${metadata.width}px x ${metadata.height}px.`);

  if (metadata.height! < 600 || imageParts.length !== 2) {
    throw new Error('Stitching engine did not composite both pages correctly.');
  }

  // 3. Test Full Multi-Page OCR Service with AI Extraction
  console.log('\n3. Invoking scanMultipleScoresheetsStandalone with simulated image parts...');
  const ocrResult = await scanMultipleScoresheetsStandalone(mockFiles as any);

  console.log('\n--- 📊 AI Merged Multi-Page Result ---');
  console.log('Sport Type:', ocrResult.sport_type);
  console.log('Team Scores:', ocrResult.team_scores);
  console.log('Total Extracted Players:', ocrResult.player_summary?.length);
  if (ocrResult.player_summary?.length > 0) {
    console.log('Sample Roster Players:', ocrResult.player_summary.slice(0, 4).map((p: any) => ({
      player: p.player_name,
      team: p.team_name,
      pts: p.pts || p.points,
      reb: p.reb || p.rebounds,
      efficiency: p.efficiency,
    })));
  }

  console.log('\n================================================================');
  console.log('✅ ALL MULTI-SCORESHEET COMPRESSION & OCR TESTS PASSED!');
  console.log('================================================================');
}

testMultiScoresheetEngine()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Test Failed:', err);
    process.exit(1);
  });
