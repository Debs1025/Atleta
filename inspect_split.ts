import fs from 'fs';
import path from 'path';

const rawOcrText = `EVENT: REGIONAL SEMANAS — ATE: DEC12.2023 ME: GO0PM_ LOCKTION CITY ARENA =
VISITORS: PANTHERS (reed Jerseys) HOME: EAGLES —— (White Jerseys) ——
i EEE Tacit pA -
layer 012%) [TKR —
SE mama Te _
SC vATATS J PAPTEET al outer 5S Se ARvacas)
izle Jackson alzle3lZ 5 [23115 ao]. Rodriguez mae) -
ail enn.” al/151312 2210 lp. Gasol_I*0 elzl/] 23 121
[440] B. Davis Ic AVA CITAY [01000] 6 2] 7. Gibson_1C AVAL! Tajo 2)
30 B. Dave —— AVAL ZTE en i 42) T. GIbSOR = | AAT z
{ J = gn 8 He TE ge = Po
aE em T | f= Toy a
Se LEC mes De AT = —
lle mE hes ERE wa z
der ISI ioe 201 ame a
TE GSO
FIRALSCOR gi nr a rt
A ARRIORS S19 } ( wi Wt WH JE Et
@ een a HLA it i \ =
a —— ht Co i) !
ng score HL SCORER: Ewily C25`;

const NOISE_WORDS = new Set([
  'event', 'date', 'time', 'location', 'game', 'score', 'final', 'running', 'period',
  'quarter', 'official', 'scorer', 'team', 'timeouts', 'technical', 'fouls', 'used',
  'left', 'regional', 'semanas', 'court', 'arena', 'city', 'jerseys', 'white', 'reed',
  'gold', 'red', 'player', 'total', 'points', 'rebounds', 'assists', 'fgm', 'fga', 'ftm', 'fta'
]);

const POSITIONS = new Set(['pg', 'sg', 'sf', 'pf', 'c']);

function cleanName(name: string): string {
  return name
    .replace(/[^A-Za-z\s\.\-]/g, '')
    .replace(/\b(PG|SG|SF|PF|C)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseDynamicOCR(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5);
  const playerSummary: any[] = [];
  const teamScores: any[] = [];

  // 1. Extract Teams dynamically
  let visitorTeam = 'Visitors';
  let homeTeam = 'Home';

  const visitorMatch = text.match(/VISITORS:\s*([A-Z]{3,15})/i);
  if (visitorMatch) visitorTeam = visitorMatch[1].toUpperCase();

  const homeMatch = text.match(/HOME:\s*([A-Z]{3,15})/i);
  if (homeMatch) homeTeam = homeMatch[1].toUpperCase();

  // 2. Extract Team Scores dynamically
  let visitorScore = 0;
  let homeScore = 0;

  const scoreRegex = new RegExp(`(?:FINAL\\s*SCORE|FNAL\\s*SCORE|SCORE).*?${visitorTeam}\\s*#?\\s*(\\d+).*?${homeTeam}\\s*#?\\s*(\\d+)`, 'i');
  const scoreMatch = text.match(scoreRegex);
  if (scoreMatch) {
    visitorScore = Number(scoreMatch[1]);
    homeScore = Number(scoreMatch[2]);
  } else {
    // Check general score pattern
    const generalScoreMatch = text.match(/(?:FINAL\s*SCORE|FNAL\s*SCORE|SCORE).*?(\d+).*?(\d+)/i);
    if (generalScoreMatch) {
      visitorScore = Number(generalScoreMatch[1]);
      homeScore = Number(generalScoreMatch[2]);
    }
  }

  teamScores.push(
    { team: visitorTeam, score: visitorScore },
    { team: homeTeam, score: homeScore }
  );

  // 3. Extract Player rows dynamically
  for (const line of lines) {
    // Skip headers and metadata lines
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('event:') || lowerLine.includes('date:') || lowerLine.includes('scorer:') || lowerLine.includes('official:')) {
      continue;
    }

    // Split line in half horizontally
    const mid = Math.floor(line.length / 2);
    const leftHalf = line.substring(0, mid).trim();
    const rightHalf = line.substring(mid).trim();

    for (const half of [leftHalf, rightHalf]) {
      // Find name candidates in this half
      // Look for capitalized words or sequences of letters
      const words = half.replace(/[^A-Za-z\s]/g, ' ').split(/\s+/).filter(w => {
        const lw = w.toLowerCase();
        return w.length >= 3 && !NOISE_WORDS.has(lw) && !POSITIONS.has(lw);
      });

      if (words.length >= 1) {
        // Build the player name
        const rawName = words.join(' ');
        const name = cleanName(rawName);

        if (name.length >= 3 && !/^[A-Z\s]+$/.test(name)) { // Avoid all caps noise
          // Extract numbers in this half
          const numbers = half.match(/\d+/g) || [];
          let jersey: number | undefined = undefined;
          let points = 0;

          if (numbers.length >= 1) {
            // Find a valid jersey number (usually the first one, or the one that is <= 99)
            const firstNum = Number(numbers[0]);
            if (firstNum <= 99) {
              jersey = firstNum;
            } else {
              // Try to find any two-digit number in the string
              const twoDigitMatch = half.match(/\b\d{2}\b/);
              if (twoDigitMatch) {
                jersey = Number(twoDigitMatch[0]);
              }
            }

            // Points is usually the last number in the half
            const lastNum = Number(numbers[numbers.length - 1]);
            if (lastNum <= 100) {
              points = lastNum;
            }
          }

          // Avoid duplicates
          if (!playerSummary.some(p => p.player_name.toLowerCase() === name.toLowerCase())) {
            playerSummary.push({
              player_name: name,
              jersey_number: jersey,
              points: points,
              rebounds: 0,
              assists: 0,
              fouls: 0
            });
          }
        }
      }
    }
  }

  console.log('Parsed Team Scores:', JSON.stringify(teamScores, null, 2));
  console.log('Parsed Player Summary:', JSON.stringify(playerSummary, null, 2));
}

parseDynamicOCR(rawOcrText);
