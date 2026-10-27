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

  // If player has games or scoring recorded
  if (ppg > 0 || rpg > 0 || apg > 0 || gamesPlayed > 0 || storedPer > 0) {
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
  if (kills > 0 || blocks > 0 || aces > 0 || digs > 0) {
    const vEff = (kills * 1.5) + (blocks * 2.0) + (aces * 1.8) + (digs * 0.9);
    return Math.min(99, Math.max(50, Math.round(60 + vEff * 1.8)));
  }

  // 3. Track and field / Swimming stats
  const finishTime = Number(averages.finish_time_ms ?? stats.finish_time_ms ?? athlete.finish_time_ms ?? 0);
  if (finishTime > 0) {
    if (sportCategory.includes("TRACK") || sportCategory.includes("FIELD")) {
      const seconds = finishTime / 1000;
      const tRating = Math.round(99 - Math.max(0, (seconds - 10.5) * 6));
      return Math.min(99, Math.max(50, tRating));
    } else if (sportCategory.includes("SWIM")) {
      const seconds = finishTime / 1000;
      const sRating = Math.round(99 - Math.max(0, (seconds - 22.0) * 3));
      return Math.min(99, Math.max(50, sRating));
    }
  }

  // 4. Competencies / Radar attributes fallback (if physical testing conducted)
  const radar = athlete.radar_competencies || athlete.physical_profile || {};
  const speed = Number(radar.speed ?? 0);
  const power = Number(radar.power ?? 0);
  const agility = Number(radar.agility ?? 0);
  const iq = Number(radar.iq ?? 0);
  const tech = Number(radar.tech ?? 0);
  const radarVals = [speed, power, agility, iq, tech].filter((v) => v > 0);
  if (radarVals.length >= 3) {
    const avgRadar = Math.round(radarVals.reduce((a, b) => a + b, 0) / radarVals.length);
    return Math.min(99, Math.max(50, avgRadar));
  }

  // 5. If athlete has an explicitly verified custom rating in their profile (not equal to legacy dummy 85/75 fallback)
  const explicitRating = Number(athlete.rating_score || athlete.rating || 0);
  if (explicitRating > 0 && explicitRating !== 85 && explicitRating !== 75) {
    return Math.min(99, Math.max(50, Math.round(explicitRating)));
  }

  // Unrated (0 represents unrated; UI will display '-' cleanly)
  return 0;
}
