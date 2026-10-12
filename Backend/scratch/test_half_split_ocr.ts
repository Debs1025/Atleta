import sharp from 'sharp';
import { processAndStitchScoresheets, scanMultipleScoresheetsStandalone } from '../services/matchService';

async function testFirstHalfSecondHalfSplit() {
  console.log('================================================================');
  console.log('🧪 TESTING MULTI-SCORESHEET: 1ST HALF & 2ND HALF SPLIT');
  console.log('================================================================\n');

  // Scoresheet 1: 1st Half (AdNU Knights vs DLSU)
  const svgHalf1 = `
    <svg width="800" height="700" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <text x="50" y="60" font-family="sans-serif" font-size="26" font-weight="bold" fill="#0B132B">OFFICIAL BASKETBALL SCORESHEET - FIRST HALF (Q1 &amp; Q2)</text>
      <text x="50" y="100" font-family="sans-serif" font-size="18" fill="#1E293B">TEAMS: ADNU Knights (42) vs DLSU Green Archers (38)</text>
      
      <text x="50" y="150" font-family="sans-serif" font-size="16" font-weight="bold" fill="#0284C7">ADNU KNIGHTS (1ST HALF STATS):</text>
      <text x="50" y="190" font-family="sans-serif" font-size="15" fill="#334155">#7 Jerom Lastimosa - 12 PTS, 3 REB, 4 AST, 1 STL, 2/4 3PM</text>
      <text x="50" y="230" font-family="sans-serif" font-size="15" fill="#334155">#34 Ange Kouame - 8 PTS, 7 REB, 1 AST, 2 BLK</text>
      
      <text x="50" y="290" font-family="sans-serif" font-size="16" font-weight="bold" fill="#16A34A">DLSU GREEN ARCHERS (1ST HALF STATS):</text>
      <text x="50" y="330" font-family="sans-serif" font-size="15" fill="#334155">#11 Kevin Quiambao - 10 PTS, 6 REB, 2 AST, 1/2 3PM</text>
      <text x="50" y="370" font-family="sans-serif" font-size="15" fill="#334155">#21 Michael Phillips - 6 PTS, 8 REB, 1 BLK</text>
    </svg>
  `;

  // Scoresheet 2: 2nd Half (AdNU Knights vs DLSU)
  const svgHalf2 = `
    <svg width="800" height="700" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <text x="50" y="60" font-family="sans-serif" font-size="26" font-weight="bold" fill="#0B132B">OFFICIAL BASKETBALL SCORESHEET - SECOND HALF (Q3 &amp; Q4 + FINAL)</text>
      <text x="50" y="100" font-family="sans-serif" font-size="18" fill="#1E293B">FINAL SCORE: ADNU Knights (86) vs DLSU Green Archers (80)</text>
      
      <text x="50" y="150" font-family="sans-serif" font-size="16" font-weight="bold" fill="#0284C7">ADNU KNIGHTS (2ND HALF ACCUMULATED / FINAL TOTALS):</text>
      <text x="50" y="190" font-family="sans-serif" font-size="15" fill="#334155">#7 Jerom Lastimosa - 26 PTS, 6 REB, 8 AST, 3 STL (14 pts in 2nd half)</text>
      <text x="50" y="230" font-family="sans-serif" font-size="15" fill="#334155">#34 Ange Kouame - 18 PTS, 15 REB, 3 AST, 4 BLK (10 pts, 8 reb in 2nd half)</text>
      
      <text x="50" y="290" font-family="sans-serif" font-size="16" font-weight="bold" fill="#16A34A">DLSU GREEN ARCHERS (2ND HALF ACCUMULATED / FINAL TOTALS):</text>
      <text x="50" y="330" font-family="sans-serif" font-size="15" fill="#334155">#11 Kevin Quiambao - 24 PTS, 12 REB, 5 AST (14 pts, 6 reb in 2nd half)</text>
      <text x="50" y="370" font-family="sans-serif" font-size="15" fill="#334155">#21 Michael Phillips - 14 PTS, 14 REB, 3 BLK (8 pts, 6 reb in 2nd half)</text>
    </svg>
  `;

  console.log('1. Rendering 1st Half and 2nd Half SVG buffers into PNG...');
  const bufHalf1 = await sharp(Buffer.from(svgHalf1)).png().toBuffer();
  const bufHalf2 = await sharp(Buffer.from(svgHalf2)).png().toBuffer();

  const mockFiles = [
    {
      originalname: 'match_scoresheet_1st_half.png',
      mimetype: 'image/png',
      buffer: bufHalf1,
      size: bufHalf1.length,
    },
    {
      originalname: 'match_scoresheet_2nd_half.png',
      mimetype: 'image/png',
      buffer: bufHalf2,
      size: bufHalf2.length,
    },
  ];

  console.log('2. Testing stitching and multi-part upload pipeline...');
  const { compositeBuffer, imageParts } = await processAndStitchScoresheets(mockFiles as any);
  console.log(`   ✔ Processed ${imageParts.length} files into stitched composite buffer (${(compositeBuffer.length / 1024).toFixed(1)} KB).`);

  console.log('\n3. Invoking AI Vision OCR Engine (Gemini 2.5 Flash) on both half sheets...');
  const ocrResult = await scanMultipleScoresheetsStandalone(mockFiles as any);

  console.log('\n================================================================');
  console.log('📊 AI MERGED RESULT FOR 1ST HALF + 2ND HALF SCORESHEETS');
  console.log('================================================================');
  console.log('Sport Type:', ocrResult.sport_type);
  console.log('Final Team Scores:', ocrResult.team_scores);
  console.log('Total Extracted Players:', ocrResult.player_summary?.length);
  console.log('\nPlayer Stats (Final Unified Box Score):');
  console.table(
    ocrResult.player_summary?.map((p: any) => ({
      Player: p.player_name,
      Team: p.team_name,
      PTS: p.pts || p.points,
      REB: p.reb || p.rebounds,
      AST: p.ast || p.assists,
      STL: p.stl || p.steals || 0,
      BLK: p.blk || p.blocks || 0,
    }))
  );

  console.log('\n✅ TEST COMPLETED SUCCESSFULLY!');
}

testFirstHalfSecondHalfSplit()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Test Error:', err);
    process.exit(1);
  });
