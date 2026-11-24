// Utility functions for Coach Performance Tab analytics and rating calculation

export function parseTimeToSeconds(val: any): number {
  if (typeof val === "number") return val;
  if (!val || typeof val !== "string") return 0;
  const clean = val.replace(/[^\d:.]/g, "").trim();
  if (!clean) return 0;
  if (clean.includes(":")) {
    const parts = clean.split(":");
    if (parts.length === 2) {
      return Number(parts[0]) * 60 + Number(parts[1]);
    } else if (parts.length === 3) {
      return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
    }
  }
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

export function detectSport(athlete: any): "BASKETBALL" | "VOLLEYBALL" | "SWIMMING" | "TRACK AND FIELD" {
  // 1. High-confidence position inference (guarantees volleyball/swimming/track athletes are never misidentified)
  const pos = String(athlete?.position || athlete?.position_or_event || "").toUpperCase().trim();
  if (pos.includes("OUTSIDE HITTER") || pos.includes("MIDDLE BLOCKER") || pos.includes("OPPOSITE HITTER") || pos.includes("SETTER") || pos.includes("LIBERO") || pos.includes("SPIKER")) {
    return "VOLLEYBALL";
  }
  if (pos.includes("VAULT") || pos.includes("SPRINT") || pos.includes("HURDLE") || pos.includes("JUMP") || pos.includes("THROW") || pos.includes("SHOT PUT") || pos.includes("DISCUS") || pos.includes("JAVELIN")) {
    return "TRACK AND FIELD";
  }
  if (pos.includes("FREE") || pos.includes("FLY") || pos.includes("BACK") || pos.includes("BREAST") || pos.includes("STROKE") || pos.includes("SWIM")) {
    return "SWIMMING";
  }

  // 2. Direct sport fields
  const rawSport = String(
    athlete?.sport_category ||
    athlete?.sport_type ||
    athlete?.sport ||
    athlete?.primary_sport ||
    athlete?.sport_focus ||
    ""
  ).toUpperCase().trim();

  if (rawSport.includes("VOLLEY")) return "VOLLEYBALL";
  if (rawSport.includes("SWIM")) return "SWIMMING";
  if (rawSport.includes("TRACK") || rawSport.includes("FIELD") || rawSport.includes("RUN")) return "TRACK AND FIELD";
  if (rawSport.includes("BASKET")) return "BASKETBALL";

  // 3. Position basketball
  if (pos.includes("GUARD") || pos.includes("FORWARD") || pos.includes("CENTER")) {
    return "BASKETBALL";
  }

  // 4. Stats fallback inference
  const stats = athlete?.stats || athlete?.averages || {};
  if (stats.spike_kills !== undefined || stats.block_points !== undefined || stats.hitting_pct !== undefined || stats.service_aces !== undefined) {
    return "VOLLEYBALL";
  }
  if (stats.pb_50m_free !== undefined || stats.times_50m_free !== undefined || stats.swim_index_score !== undefined) {
    return "SWIMMING";
  }
  if (stats.pole_vault !== undefined || stats.pole_vault_pb !== undefined || stats.pb_shot_put !== undefined) {
    return "TRACK AND FIELD";
  }

  return "BASKETBALL";
}

export function calculatePlayerRating(athlete: any): number {
  if (!athlete) return 0;

  const averages = athlete.averages || athlete.stats || {};
  const stats = athlete.stats || athlete.averages || {};
  const sport = detectSport(athlete);
  const explicitRating = Number(athlete.rating_score || athlete.rating || athlete.overall_rating || 0);

  const gp = Number(
    averages.games_played ??
    stats.games_played ??
    athlete.games_played ??
    averages.matches_played ??
    stats.matches_played ??
    athlete.matches_count ??
    averages.meets_count ??
    stats.meets_count ??
    0
  );

  let dynamicRating = 0;

  if (sport === "BASKETBALL") {
    const ppg = Number(averages.ppg ?? stats.ppg ?? athlete.ppg ?? athlete.pts ?? 0);
    const rpg = Number(averages.rpg ?? stats.rpg ?? athlete.rpg ?? athlete.reb ?? 0);
    const apg = Number(averages.apg ?? stats.apg ?? athlete.apg ?? athlete.ast ?? 0);
    const spg = Number(averages.spg ?? stats.spg ?? athlete.spg ?? athlete.stl ?? 0);
    const bpg = Number(averages.bpg ?? stats.bpg ?? athlete.bpg ?? athlete.blk ?? 0);
    const tpg = Number(averages.tpg ?? stats.tpg ?? athlete.tpg ?? athlete.to ?? 0);
    const fgPct = Number(averages.fg_percentage ?? stats.fg_percentage ?? stats.fg_pct ?? 0);
    const storedPer = Number(averages.per_score ?? stats.per_score ?? stats.per ?? athlete.per ?? 0);

    const hasStats = ppg > 0 || rpg > 0 || apg > 0 || storedPer > 0 || gp > 0;

    if (hasStats) {
      // Production formula calibrated to strict collegiate/pro benchmarks:
      // High MVP (28 PPG, 10 RPG, 8 APG) -> ~38-40 prod -> ~97-99 raw rating
      // All-Star (20 PPG, 7 RPG, 5 APG) -> ~25-27 prod -> ~83-85 raw rating
      // Solid Starter (14 PPG, 5 RPG, 3 APG) -> ~17-19 prod -> ~74-76 raw rating
      // Role Player (8 PPG, 3.5 RPG, 2 APG) -> ~10-12 prod -> ~66-68 raw rating
      // Bench (3 PPG, 1.5 RPG, 1 APG) -> ~4-6 prod -> ~58-61 raw rating
      const fgBonus = fgPct > 0 ? Math.min(3, Math.max(-3, (fgPct - 45) * 0.25)) : 0;
      const production = (ppg * 0.85) + (rpg * 0.55) + (apg * 0.75) + (spg * 1.1) + (bpg * 1.1) - (tpg * 0.8) + fgBonus;
      const rawRating = Math.round(54 + production * 1.15);

      // Sample size confidence scaling & caps:
      // Prevents 1-2 game hot streaks from claiming 90+ or 99 MVP ratings
      if (gp > 0) {
        let cap = 99;
        let conf = 1.0;
        if (gp <= 1) {
          cap = 76;
          conf = 0.72;
        } else if (gp === 2) {
          cap = 80;
          conf = 0.78;
        } else if (gp === 3) {
          cap = 84;
          conf = 0.84;
        } else if (gp === 4) {
          cap = 88;
          conf = 0.89;
        } else if (gp === 5) {
          cap = 92;
          conf = 0.94;
        } else if (gp === 6) {
          cap = 95;
          conf = 0.97;
        }
        dynamicRating = Math.min(cap, Math.max(50, Math.round(50 + (rawRating - 50) * conf)));
      } else {
        // If gp is unknown or 0, cap at 82 for unverified sample size
        dynamicRating = Math.min(82, Math.max(50, rawRating));
      }
    }
  } else if (sport === "VOLLEYBALL") {
    const kills = Number(averages.spike_kills ?? stats.spike_kills ?? averages.kills ?? stats.kills ?? 0);
    const blocks = Number(averages.block_points ?? stats.block_points ?? averages.blocks ?? stats.blocks ?? 0);
    const aces = Number(averages.service_aces ?? stats.service_aces ?? averages.aces ?? stats.aces ?? 0);
    const digs = Number(averages.digs ?? stats.digs ?? 0);
    const hitPct = Number(averages.hitting_pct ?? stats.hitting_pct ?? 0);

    if (kills > 0 || blocks > 0 || aces > 0 || digs > 0 || gp > 0) {
      const hitBonus = hitPct > 0 ? Math.min(3, Math.max(-3, (hitPct - 35) * 0.2)) : 0;
      const vScore = (kills * 1.4) + (blocks * 2.2) + (aces * 1.8) + (digs * 0.7) + hitBonus;
      const rawRating = Math.round(55 + vScore * 0.95);

      if (gp > 0) {
        let cap = 99;
        let conf = 1.0;
        if (gp <= 1) { cap = 76; conf = 0.72; }
        else if (gp === 2) { cap = 80; conf = 0.78; }
        else if (gp === 3) { cap = 84; conf = 0.84; }
        else if (gp === 4) { cap = 88; conf = 0.89; }
        else if (gp === 5) { cap = 92; conf = 0.94; }
        else if (gp === 6) { cap = 95; conf = 0.97; }
        dynamicRating = Math.min(cap, Math.max(50, Math.round(50 + (rawRating - 50) * conf)));
      } else {
        dynamicRating = Math.min(82, Math.max(50, rawRating));
      }
    }
  } else if (sport === "SWIMMING") {
    const pb50 = parseTimeToSeconds(averages.pb_50m_free || stats.pb_50m_free || averages.pb_50m || athlete.pb_50m_free || averages.times_50m_free || stats.times_50m_free);
    const pb100 = parseTimeToSeconds(averages.pb_100m_free || stats.pb_100m_free || averages.pb_100m || athlete.pb_100m_free || averages.times_100m_free || stats.times_100m_free || averages.times_100m || stats.times_100m);
    const pb100Fly = parseTimeToSeconds(averages.pb_100m_fly || stats.pb_100m_fly || averages.times_100m_fly || stats.times_100m_fly);
    const pb200Fly = parseTimeToSeconds(averages.pb_200m_fly || stats.pb_200m_fly || averages.times_200m_fly || stats.times_200m_fly);
    const pb200Back = parseTimeToSeconds(averages.pb_200m_back || stats.pb_200m_back || averages.times_200m_back || stats.times_200m_back);
    const finishTimeMs = Number(averages.finish_time_ms ?? stats.finish_time_ms ?? athlete.finish_time_ms ?? 0);
    const swimIndex = Number(averages.swim_index_score ?? stats.swim_index_score ?? 0);
    const podiums = Number(averages.podiums_count ?? averages.podiums ?? stats.podiums_count ?? stats.podiums ?? 0);

    let rawRating = 0;
    if (pb50 > 0) {
      if (pb50 <= 22.8) rawRating = 99;
      else if (pb50 <= 23.5) rawRating = 95;
      else if (pb50 <= 24.5) rawRating = 90;
      else if (pb50 <= 25.5) rawRating = 85;
      else if (pb50 <= 27.0) rawRating = 80;
      else if (pb50 <= 29.0) rawRating = 74;
      else rawRating = Math.min(99, Math.max(55, Math.round(74 - (pb50 - 29.0) * 2.5)));
    } else if (pb100 > 0) {
      if (pb100 <= 49.5) rawRating = 99;
      else if (pb100 <= 51.5) rawRating = 95;
      else if (pb100 <= 53.5) rawRating = 90;
      else if (pb100 <= 56.0) rawRating = 85;
      else if (pb100 <= 59.0) rawRating = 80;
      else if (pb100 <= 63.0) rawRating = 74;
      else rawRating = Math.min(99, Math.max(55, Math.round(74 - (pb100 - 63.0) * 1.5)));
    } else if (pb100Fly > 0) {
      rawRating = pb100Fly <= 54.0 ? 95 : (pb100Fly <= 57.0 ? 90 : 84);
    } else if (pb200Fly > 0) {
      rawRating = pb200Fly <= 122.0 ? 95 : (pb200Fly <= 130.0 ? 90 : 84);
    } else if (pb200Back > 0) {
      rawRating = pb200Back <= 125.0 ? 95 : (pb200Back <= 135.0 ? 90 : 84);
    } else if (finishTimeMs > 0) {
      const s = finishTimeMs / 1000;
      rawRating = Math.min(99, Math.max(50, Math.round(95 - Math.max(0, (s - 23.0) * 3.0))));
    } else if (swimIndex > 0) {
      rawRating = Math.min(95, Math.max(50, Math.round(swimIndex / 10.5)));
    } else if (podiums > 0) {
      rawRating = Math.min(92, Math.max(70, 76 + podiums * 2));
    }

    if (rawRating > 0) {
      const sampleCap = gp === 1 ? 80 : 99;
      dynamicRating = Math.min(sampleCap, rawRating);
    }
  } else if (sport === "TRACK AND FIELD") {
    const pb100 = parseTimeToSeconds(averages.pb_100m || stats.pb_100m || athlete.pb_100m || averages.times_100m || stats.times_100m);
    const pb200 = parseTimeToSeconds(averages.pb_200m || stats.pb_200m || athlete.pb_200m || averages.times_200m || stats.times_200m);
    const poleVaultStr = String(averages.pole_vault || stats.pole_vault || averages.pole_vault_pb || stats.pole_vault_pb || athlete.pole_vault_pb || athlete.personal_best || "").trim();
    const pvMeters = parseFloat(poleVaultStr.replace(/[^\d.]/g, "")) || 0;
    const shotPutStr = String(averages.pb_shot_put || stats.pb_shot_put || averages.shot_put || stats.shot_put || "").trim();
    const spMeters = parseFloat(shotPutStr.replace(/[^\d.]/g, "")) || 0;

    let rawRating = 0;
    if (pvMeters > 0) {
      if (pvMeters >= 5.85) rawRating = 99;
      else if (pvMeters >= 5.55) rawRating = 95;
      else if (pvMeters >= 5.25) rawRating = 90;
      else if (pvMeters >= 4.85) rawRating = 85;
      else if (pvMeters >= 4.45) rawRating = 80;
      else rawRating = Math.min(99, Math.max(55, Math.round(65 + (pvMeters - 3.8) * 18)));
    } else if (spMeters > 0) {
      if (spMeters >= 20.0) rawRating = 99;
      else if (spMeters >= 18.5) rawRating = 95;
      else if (spMeters >= 16.5) rawRating = 90;
      else if (spMeters >= 14.5) rawRating = 85;
      else if (spMeters >= 12.5) rawRating = 80;
      else rawRating = Math.min(99, Math.max(55, Math.round(65 + (spMeters - 10.0) * 4)));
    } else if (pb100 > 0) {
      if (pb100 <= 10.2) rawRating = 99;
      else if (pb100 <= 10.5) rawRating = 95;
      else if (pb100 <= 10.8) rawRating = 90;
      else if (pb100 <= 11.2) rawRating = 85;
      else if (pb100 <= 11.8) rawRating = 80;
      else if (pb100 <= 12.5) rawRating = 74;
      else rawRating = Math.min(99, Math.max(55, Math.round(74 - (pb100 - 12.5) * 4)));
    } else if (pb200 > 0) {
      if (pb200 <= 20.5) rawRating = 99;
      else if (pb200 <= 21.2) rawRating = 95;
      else if (pb200 <= 22.0) rawRating = 90;
      else if (pb200 <= 23.0) rawRating = 85;
      else rawRating = 80;
    }

    if (rawRating > 0) {
      const sampleCap = gp === 1 ? 80 : 99;
      dynamicRating = Math.min(sampleCap, rawRating);
    }
  }

  // Radar competencies fallback (only if no match stats generated a rating)
  if (dynamicRating <= 0) {
    const radar = athlete.radar_competencies || athlete.physical_profile || athlete.radar || {};
    const radarVals = [
      radar.speed, radar.power, radar.agility, radar.iq, radar.tech,
      radar.scoring, radar.playmaking, radar.rebounding, radar.defense,
      radar.basketball_iq, radar.jump_serve, radar.pipe_attack,
      radar.all_around, radar.endurance, radar.motor, radar.athleticism
    ].map(Number).filter((v) => v > 0);
    if (radarVals.length >= 3) {
      dynamicRating = Math.round(radarVals.reduce((a, b) => a + b, 0) / radarVals.length);
    }
  }

  // PRECEDENCE:
  // If dynamicRating was derived from actual match/season production, dynamicRating takes full precedence!
  // We do NOT use explicitRating to artificially inflate a low-sample or lower-producing player.
  if (dynamicRating > 0) {
    return Math.min(99, Math.max(50, dynamicRating));
  }

  // If no dynamic rating could be derived from stats, use explicit profile rating:
  if (explicitRating > 0) {
    return Math.min(99, Math.max(50, Math.round(explicitRating)));
  }

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

  const sportCategory = detectSport(athlete);

  // If athlete already has explicit physical testing competencies recorded in DB
  const existingRadar = athlete.radar_competencies || athlete.radar;
  const hasExistingVerified = existingRadar && (
    (typeof existingRadar.speed === "number" && existingRadar.speed > 0) ||
    (typeof existingRadar.power === "number" && existingRadar.power > 0) ||
    (typeof existingRadar.scoring === "number" && existingRadar.scoring > 0) ||
    (typeof existingRadar.jump_serve === "number" && existingRadar.jump_serve > 0) ||
    (typeof existingRadar.all_around === "number" && existingRadar.all_around > 0)
  );

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
    const athRating = calculatePlayerRating(athlete);
    if (athRating > 0) {
      return {
        speed: Math.max(50, Math.min(99, athRating)),
        power: Math.max(50, Math.min(99, Math.round(athRating * 0.95))),
        agility: Math.max(50, Math.min(99, athRating)),
        iq: Math.max(50, Math.min(99, Math.round(athRating * 0.92))),
        tech: Math.max(50, Math.min(99, Math.round(athRating * 0.94))),
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
  const athRating = calculatePlayerRating(athlete);

  const baseSpeed = finishTime > 0
    ? Math.round(98 - Math.max(0, (finishTime / 1000 - 10.5) * 6))
    : (swimIndex > 0 ? Math.min(99, Math.round(swimIndex / 10)) : (athRating > 0 ? athRating : 85));

  return {
    speed: Math.max(50, Math.min(99, baseSpeed)),
    power: Math.max(50, Math.min(99, Math.round(baseSpeed * 0.95))),
    agility: Math.max(50, Math.min(99, reaction > 0 ? Math.round(99 - (reaction - 0.12) * 100) : baseSpeed)),
    iq: Math.max(50, Math.min(99, Math.round(baseSpeed * 0.92))),
    tech: Math.max(50, Math.min(99, swimIndex > 0 ? Math.min(99, Math.round(swimIndex / 10)) : Math.round(baseSpeed * 0.94))),
  };
}
