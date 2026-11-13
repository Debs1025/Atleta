// Utility functions for Coach Performance Tab analytics and rating calculation

export function calculatePlayerRating(athlete: any): number {
  if (!athlete) return 0;

  const averages = athlete.averages || athlete.stats || {};
  const stats = athlete.stats || athlete.averages || {};

  // 1. Basketball / Ball-game stats
  const ppg = Number(averages.ppg ?? stats.ppg ?? athlete.ppg ?? athlete.pts ?? 0);
  const rpg = Number(averages.rpg ?? stats.rpg ?? athlete.rpg ?? athlete.reb ?? 0);
  const apg = Number(averages.apg ?? stats.apg ?? athlete.apg ?? athlete.ast ?? 0);
  const spg = Number(averages.spg ?? stats.spg ?? athlete.spg ?? athlete.stl ?? 0);
  const bpg = Number(averages.bpg ?? stats.bpg ?? athlete.bpg ?? athlete.blk ?? 0);
  const tpg = Number(averages.tpg ?? stats.tpg ?? athlete.tpg ?? athlete.to ?? 0);
  const fgPct = Number(averages.fg_percentage ?? stats.fg_percentage ?? stats.fg_pct ?? 0);
  const gamesPlayed = Number(averages.games_played ?? stats.games_played ?? athlete.games_played ?? 0);
  const storedPer = Number(averages.per_score ?? stats.per_score ?? stats.per ?? athlete.per ?? 0);

  const sportCategory = String(athlete.sport_category || athlete.sport_type || "BASKETBALL").toUpperCase();
  const isBasketball = sportCategory.includes("BASKET");

  // If player has games or scoring recorded
  if (isBasketball && (ppg > 0 || rpg > 0 || apg > 0 || gamesPlayed > 0 || storedPer > 0)) {
    let per = storedPer;
    if (per <= 0) {
      // Calculate dynamic PER
      const rawEff = (ppg * 1.0) + (rpg * 1.1) + (apg * 1.3) + (spg * 1.5) + (bpg * 1.5) - (tpg * 1.2);
      const fgBonus = fgPct > 0 ? (fgPct - 45) * 0.15 : 0;
      per = Math.max(5, rawEff + fgBonus);
    }

    // Standard sports rating benchmark (scale 50 - 99):
    // League average PER ~15 -> ~76 rating
    // All-star PER ~20 -> ~84 rating
    // Superstar PER ~25 -> ~92 rating
    // Historic PER ~30+ -> ~98-99 rating
    const ratingFromPer = 54 + (per * 1.45);

    // Direct stat contribution
    const statEfficiency = (ppg * 0.85) + (rpg * 0.7) + (apg * 0.9) + (spg * 1.3) + (bpg * 1.3);
    const ratingFromStats = 58 + (statEfficiency * 0.8);

    const calculated = Math.round(ratingFromPer * 0.6 + ratingFromStats * 0.4);
    return Math.min(99, Math.max(50, calculated));
  }

  // 2. Volleyball stats
  const kills = Number(averages.kills_per_set ?? stats.kills_per_set ?? stats.kills ?? 0);
  const blocks = Number(averages.blocks_per_set ?? stats.blocks_per_set ?? stats.blocks ?? 0);
  const aces = Number(averages.aces_per_set ?? stats.aces_per_set ?? stats.aces ?? 0);
  const digs = Number(averages.digs_per_set ?? stats.digs_per_set ?? stats.digs ?? 0);
  const vGames = Number(averages.games_played ?? stats.games_played ?? 0);
  if (vGames > 0 && (kills > 0 || blocks > 0 || aces > 0 || digs > 0)) {
    const vEff = (kills * 1.5) + (blocks * 2.0) + (aces * 1.8) + (digs * 0.9);
    return Math.min(99, Math.max(50, Math.round(60 + vEff * 1.8)));
  }

  // 3. Explicit verified rating score if evaluated by coach / official
  const explicitRating = Number(athlete.rating_score || athlete.rating || 0);
  if (explicitRating > 0 && explicitRating !== 85 && explicitRating !== 75 && explicitRating !== 99 && explicitRating !== 60) {
    return Math.min(99, Math.max(50, Math.round(explicitRating)));
  }

  // Unrated (0 represents unrated; UI displays '-' cleanly)
  return 0;
}

export interface RadarCompetencies {
  speed: number;
  power: number;
  agility: number;
  iq: number;
  tech: number;
}

/**
 * Calculates dynamic athletic competencies strictly derived from verified match stats:
 * - Assists & Steals -> Agility & Speed
 * - Rebounds & Blocks -> Power
 * - Assist-to-Turnover ratio & PER -> Sport IQ
 * - Field Goal % & Shooting accuracy -> Technique
 * If the athlete has no match stats recorded yet, returns null (or 0).
 */
export function calculateDynamicRadarCompetencies(athlete: any): RadarCompetencies | null {
  if (!athlete) return null;

  const averages = athlete.averages || athlete.stats || {};
  const stats = athlete.stats || athlete.averages || {};

  const ppg = Number(averages.ppg ?? stats.ppg ?? athlete.ppg ?? athlete.pts ?? 0);
  const rpg = Number(averages.rpg ?? stats.rpg ?? athlete.rpg ?? athlete.reb ?? 0);
  const apg = Number(averages.apg ?? stats.apg ?? athlete.apg ?? athlete.ast ?? 0);
  const spg = Number(averages.spg ?? stats.spg ?? athlete.spg ?? athlete.stl ?? 0);
  const bpg = Number(averages.bpg ?? stats.bpg ?? athlete.bpg ?? athlete.blk ?? 0);
  const tpg = Number(averages.tpg ?? stats.tpg ?? athlete.tpg ?? athlete.to ?? 0);
  const fgPct = Number(averages.fg_percentage ?? stats.fg_percentage ?? stats.fg_pct ?? athlete.fg_pct ?? 0);
  const gamesPlayed = Number(averages.games_played ?? stats.games_played ?? athlete.games_played ?? 0);
  const storedPer = Number(averages.per_score ?? stats.per_score ?? stats.per ?? athlete.per ?? 0);

  const sportCategory = String(athlete.sport_category || athlete.sport_type || athlete.sport || "BASKETBALL").toUpperCase();

  // If athlete already has explicit physical testing competencies recorded in DB
  const existingRadar = athlete.radar_competencies;
  const hasExistingVerified = existingRadar && Object.values(existingRadar).some((v) => typeof v === "number" && v > 0);

  // Check sport-specific logged match or test data
  const kills = Number(averages.kills ?? averages.spike_kills ?? stats.kills ?? stats.spike_kills ?? 0);
  const blocks = Number(averages.blocks ?? averages.block_points ?? stats.blocks ?? stats.block_points ?? 0);
  const aces = Number(averages.aces ?? averages.service_aces ?? stats.aces ?? stats.service_aces ?? 0);
  const digs = Number(averages.digs ?? stats.digs ?? 0);
  const assists = Number(averages.assists ?? stats.assists ?? 0);
  const loggedFinishTime = Number(averages.finish_time_ms ?? stats.finish_time_ms ?? athlete.finish_time_ms ?? 0);
  const hasTimes = Boolean(averages.pb_100m || stats.pb_100m || averages.pb_50m_free || stats.pb_50m_free);

  const hasMatchData =
    ppg > 0 || rpg > 0 || apg > 0 || spg > 0 || bpg > 0 ||
    gamesPlayed > 0 || storedPer > 0 || fgPct > 0 ||
    kills > 0 || blocks > 0 || aces > 0 || digs > 0 || assists > 0 ||
    loggedFinishTime > 0 || hasTimes;

  if (!hasMatchData) {
    if (hasExistingVerified) {
      return {
        speed: Math.max(0, Math.min(100, Number(existingRadar.speed || 0))),
        power: Math.max(0, Math.min(100, Number(existingRadar.power || 0))),
        agility: Math.max(0, Math.min(100, Number(existingRadar.agility || 0))),
        iq: Math.max(0, Math.min(100, Number(existingRadar.iq || 0))),
        tech: Math.max(0, Math.min(100, Number(existingRadar.tech || existingRadar.endurance || 0))),
      };
    }
    return null;
  }

  // 1. Basketball / Ball-games
  if (sportCategory.includes("BASKET") || (!sportCategory.includes("VOLLEY") && !sportCategory.includes("SWIM") && !sportCategory.includes("TRACK") && !sportCategory.includes("FIELD") && !sportCategory.includes("PICKLE"))) {
    // Dynamic PER
    let per = storedPer;
    if (per <= 0) {
      const rawEff = (ppg * 1.0) + (rpg * 1.1) + (apg * 1.3) + (spg * 1.5) + (bpg * 1.5) - (tpg * 1.2);
      const fgBonus = fgPct > 0 ? (fgPct - 45) * 0.15 : 0;
      per = Math.max(5, rawEff + fgBonus);
    }

    // Assist-to-Turnover ratio
    const effectiveTpg = Math.max(0.8, tpg);
    const astToRatio = apg > 0 ? (apg / effectiveTpg) : 0.8;

    // A. Assists & Steals -> Agility & Speed
    const speedCalc = Math.round(50 + Math.min(49, (spg * 13.0) + (apg * 3.6) + (ppg * 0.4)));
    const agilityCalc = Math.round(50 + Math.min(49, (spg * 15.0) + (apg * 3.2)));

    // B. Rebounds -> Power (plus interior shot-blocking)
    const powerCalc = Math.round(50 + Math.min(49, (rpg * 4.2) + (bpg * 6.0)));

    // C. Assist-to-Turnover ratio & PER -> Sport IQ
    const perFactor = Math.max(0, (per - 8) * 1.55);
    const ratioFactor = Math.min(18, astToRatio * 5.2);
    const iqCalc = Math.round(50 + Math.min(49, perFactor + ratioFactor));

    // D. Field Goal % -> Technique
    const threePct = Number(averages.three_pt_percentage ?? stats.three_pt_percentage ?? stats.three_pct ?? 0);
    const ftPct = Number(averages.ft_percentage ?? stats.ft_percentage ?? stats.ft_pct ?? 0);

    let techBonus = 0;
    if (fgPct > 0) {
      techBonus = (fgPct - 30) * 1.35;
      if (threePct > 35) techBonus += (threePct - 35) * 0.35;
      if (ftPct > 75) techBonus += (ftPct - 75) * 0.25;
    } else {
      techBonus = Math.min(25, ppg * 1.4);
    }
    const techCalc = Math.round(50 + Math.min(49, Math.max(5, techBonus)));

    return {
      speed: Math.max(50, Math.min(99, speedCalc)),
      power: Math.max(50, Math.min(99, powerCalc)),
      agility: Math.max(50, Math.min(99, agilityCalc)),
      iq: Math.max(50, Math.min(99, iqCalc)),
      tech: Math.max(50, Math.min(99, techCalc)),
    };
  }

  // 2. Volleyball
  if (sportCategory.includes("VOLLEY")) {
    const vKills = Number(averages.kills_per_set ?? stats.kills_per_set ?? averages.kills ?? averages.spike_kills ?? stats.kills ?? 0);
    const vBlocks = Number(averages.blocks_per_set ?? stats.blocks_per_set ?? averages.blocks ?? averages.block_points ?? stats.blocks ?? 0);
    const vAces = Number(averages.aces_per_set ?? stats.aces_per_set ?? averages.aces ?? averages.service_aces ?? stats.aces ?? 0);
    const vDigs = Number(averages.digs_per_set ?? stats.digs_per_set ?? averages.digs ?? stats.digs ?? 0);
    const vAssists = Number(averages.assists_per_set ?? stats.assists_per_set ?? averages.assists ?? stats.assists ?? 0);

    return {
      power: Math.max(50, Math.min(99, Math.round(50 + (vKills * 6.5) + (vBlocks * 8.0)))),
      agility: Math.max(50, Math.min(99, Math.round(50 + (vDigs * 7.0) + (vAces * 4.0)))),
      speed: Math.max(50, Math.min(99, Math.round(50 + (vDigs * 6.0) + (vAssists * 3.0)))),
      iq: Math.max(50, Math.min(99, Math.round(50 + (vAssists * 5.0) + (vDigs * 3.5) + (vBlocks * 4.0)))),
      tech: Math.max(50, Math.min(99, Math.round(50 + (vAces * 8.0) + (vKills * 4.0)))),
    };
  }

  // 3. Swimming / Track & Field
  const finishTime = Number(averages.finish_time_ms ?? stats.finish_time_ms ?? athlete.finish_time_ms ?? 0);
  const reaction = Number(averages.reaction_time_s ?? stats.reaction_time_s ?? 0);
  const swimIndex = Number(averages.swim_index_score ?? stats.swim_index_score ?? 0);

  const baseSpeed = finishTime > 0 ? Math.round(98 - Math.max(0, (finishTime / 1000 - 10.5) * 6)) : (swimIndex > 0 ? Math.min(99, Math.round(swimIndex / 10)) : 0);
  return {
    speed: Math.max(0, Math.min(99, baseSpeed)),
    power: Math.max(0, Math.min(99, Math.round(baseSpeed * 0.95))),
    agility: Math.max(0, Math.min(99, reaction > 0 ? Math.round(99 - (reaction - 0.12) * 100) : baseSpeed)),
    iq: Math.max(0, Math.min(99, Math.round(baseSpeed * 0.92))),
    tech: Math.max(0, Math.min(99, swimIndex > 0 ? Math.min(99, Math.round(swimIndex / 10)) : Math.round(baseSpeed * 0.94))),
  };
}
