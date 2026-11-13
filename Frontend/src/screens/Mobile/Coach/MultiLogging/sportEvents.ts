export interface SportEventOption {
  key: string;
  label: string;
  shortLabel: string;
  eventType?: string; // Explicit eventType
  category: 'SWIMMING' | 'TRACK AND FIELD';
  distance_meters: number;
  isDistanceEvent?: boolean; // true for field events (Pole Vault, Long Jump, Shot Put) where mark is distance in meters
  unit: string; // 's' for time, 'm' for distance
  iconName?: string;
}

export const SWIMMING_EVENTS: SportEventOption[] = [
  { key: "50m_free", label: "50m Freestyle", shortLabel: "50M FREE", eventType: "50m Freestyle", category: "SWIMMING", distance_meters: 50, unit: "s" },
  { key: "100m_free", label: "100m Freestyle", shortLabel: "100M FREE", eventType: "100m Freestyle", category: "SWIMMING", distance_meters: 100, unit: "s" },
  { key: "200m_free", label: "200m Freestyle", shortLabel: "200M FREE", eventType: "200m Freestyle", category: "SWIMMING", distance_meters: 200, unit: "s" },
  { key: "400m_free", label: "400m Freestyle", shortLabel: "400M FREE", eventType: "400m Freestyle", category: "SWIMMING", distance_meters: 400, unit: "s" },
  { key: "800m_free", label: "800m Freestyle", shortLabel: "800M FREE", eventType: "800m Freestyle", category: "SWIMMING", distance_meters: 800, unit: "s" },
  { key: "1500m_free", label: "1500m Freestyle", shortLabel: "1500M FREE", eventType: "1500m Freestyle", category: "SWIMMING", distance_meters: 1500, unit: "s" },
  { key: "50m_back", label: "50m Backstroke", shortLabel: "50M BACK", eventType: "50m Backstroke", category: "SWIMMING", distance_meters: 50, unit: "s" },
  { key: "100m_back", label: "100m Backstroke", shortLabel: "100M BACK", eventType: "100m Backstroke", category: "SWIMMING", distance_meters: 100, unit: "s" },
  { key: "200m_back", label: "200m Backstroke", shortLabel: "200M BACK", eventType: "200m Backstroke", category: "SWIMMING", distance_meters: 200, unit: "s" },
  { key: "50m_breast", label: "50m Breaststroke", shortLabel: "50M BREAST", eventType: "50m Breaststroke", category: "SWIMMING", distance_meters: 50, unit: "s" },
  { key: "100m_breast", label: "100m Breaststroke", shortLabel: "100M BREAST", eventType: "100m Breaststroke", category: "SWIMMING", distance_meters: 100, unit: "s" },
  { key: "200m_breast", label: "200m Breaststroke", shortLabel: "200M BREAST", eventType: "200m Breaststroke", category: "SWIMMING", distance_meters: 200, unit: "s" },
  { key: "50m_fly", label: "50m Butterfly", shortLabel: "50M FLY", eventType: "50m Butterfly", category: "SWIMMING", distance_meters: 50, unit: "s" },
  { key: "100m_fly", label: "100m Butterfly", shortLabel: "100M FLY", eventType: "100m Butterfly", category: "SWIMMING", distance_meters: 100, unit: "s" },
  { key: "200m_fly", label: "200m Butterfly", shortLabel: "200M FLY", eventType: "200m Butterfly", category: "SWIMMING", distance_meters: 200, unit: "s" },
  { key: "200m_im", label: "200m Individual Medley", shortLabel: "200M IM", eventType: "200m Individual Medley", category: "SWIMMING", distance_meters: 200, unit: "s" },
  { key: "400m_im", label: "400m Individual Medley", shortLabel: "400M IM", eventType: "400m Individual Medley", category: "SWIMMING", distance_meters: 400, unit: "s" },
  { key: "flip_turn", label: "Flip Turn Split", shortLabel: "FLIP TURN", eventType: "Flip Turn Split", category: "SWIMMING", distance_meters: 0, unit: "s" },
];

export const TRACK_FIELD_EVENTS: SportEventOption[] = [
  { key: "100m", label: "100m Dash", shortLabel: "100M DASH", eventType: "100m Dash", category: "TRACK AND FIELD", distance_meters: 100, unit: "s" },
  { key: "200m", label: "200m Dash", shortLabel: "200M DASH", eventType: "200m Dash", category: "TRACK AND FIELD", distance_meters: 200, unit: "s" },
  { key: "400m", label: "400m Dash", shortLabel: "400M DASH", eventType: "400m Dash", category: "TRACK AND FIELD", distance_meters: 400, unit: "s" },
  { key: "800m", label: "800m Run", shortLabel: "800M RUN", eventType: "800m Run", category: "TRACK AND FIELD", distance_meters: 800, unit: "s" },
  { key: "1500m", label: "1500m Run", shortLabel: "1500M RUN", eventType: "1500m Run", category: "TRACK AND FIELD", distance_meters: 1500, unit: "s" },
  { key: "5000m", label: "5000m Run", shortLabel: "5000M RUN", eventType: "5000m Run", category: "TRACK AND FIELD", distance_meters: 5000, unit: "s" },
  { key: "110m_hurdles", label: "110m Hurdles", shortLabel: "110M HURDLES", eventType: "110m Hurdles", category: "TRACK AND FIELD", distance_meters: 110, unit: "s" },
  { key: "400m_hurdles", label: "400m Hurdles", shortLabel: "400M HURDLES", eventType: "400m Hurdles", category: "TRACK AND FIELD", distance_meters: 400, unit: "s" },
  { key: "pole_vault", label: "Pole Vault", shortLabel: "POLE VAULT", eventType: "Pole Vault", category: "TRACK AND FIELD", distance_meters: 0, isDistanceEvent: true, unit: "m" },
  { key: "high_jump", label: "High Jump", shortLabel: "HIGH JUMP", eventType: "High Jump", category: "TRACK AND FIELD", distance_meters: 0, isDistanceEvent: true, unit: "m" },
  { key: "long_jump", label: "Long Jump", shortLabel: "LONG JUMP", eventType: "Long Jump", category: "TRACK AND FIELD", distance_meters: 0, isDistanceEvent: true, unit: "m" },
  { key: "triple_jump", label: "Triple Jump", shortLabel: "TRIPLE JUMP", eventType: "Triple Jump", category: "TRACK AND FIELD", distance_meters: 0, isDistanceEvent: true, unit: "m" },
  { key: "shot_put", label: "Shot Put", shortLabel: "SHOT PUT", eventType: "Shot Put", category: "TRACK AND FIELD", distance_meters: 0, isDistanceEvent: true, unit: "m" },
  { key: "discus", label: "Discus Throw", shortLabel: "DISCUS", eventType: "Discus Throw", category: "TRACK AND FIELD", distance_meters: 0, isDistanceEvent: true, unit: "m" },
  { key: "javelin", label: "Javelin Throw", shortLabel: "JAVELIN", eventType: "Javelin Throw", category: "TRACK AND FIELD", distance_meters: 0, isDistanceEvent: true, unit: "m" },
  { key: "reaction", label: "Reaction Time", shortLabel: "REACTION", eventType: "Reaction Time", category: "TRACK AND FIELD", distance_meters: 0, unit: "s" },
];

export function getEventsForSport(sport?: string): SportEventOption[] {
  const s = String(sport || "").toUpperCase();
  if (s.includes("SWIM")) return SWIMMING_EVENTS;
  if (s.includes("TRACK") || s.includes("FIELD") || s.includes("RUN")) return TRACK_FIELD_EVENTS;
  return [];
}

export function findEventOption(sport: string, eventNameOrKey?: string): SportEventOption | undefined {
  if (!eventNameOrKey) return undefined;
  const events = getEventsForSport(sport);
  const target = String(eventNameOrKey).toLowerCase().trim();
  return (
    events.find((e) => e.key === target || e.label.toLowerCase() === target || e.shortLabel.toLowerCase() === target) ||
    events.find((e) => target.includes(e.key) || e.label.toLowerCase().includes(target) || target.includes(e.label.toLowerCase()))
  );
}

export function parseSecondsOrMeters(raw: any): number {
  if (typeof raw === "number") return raw;
  if (!raw) return 0;
  const str = String(raw).trim().toLowerCase().replace(/s$/, "").replace(/m$/, "");
  if (str.includes(":")) {
    const parts = str.split(":");
    if (parts.length === 2) {
      const min = parseFloat(parts[0]) || 0;
      const sec = parseFloat(parts[1]) || 0;
      return +(min * 60 + sec).toFixed(2);
    }
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

export function pickBetterTime(existing: string | undefined | null, candidate: string): string {
  if (!existing || existing === "-" || existing === "N/A") return candidate;
  if (!candidate || candidate === "-" || candidate === "N/A") return existing;
  const nExisting = parseSecondsOrMeters(existing);
  const nCandidate = parseSecondsOrMeters(candidate);
  if (nExisting <= 0) return candidate;
  if (nCandidate <= 0) return existing;
  return nCandidate < nExisting ? candidate : existing;
}

export function pickBetterDistance(existing: string | undefined | null, candidate: string): string {
  if (!existing || existing === "-" || existing === "N/A") return candidate;
  if (!candidate || candidate === "-" || candidate === "N/A") return existing;
  const nExisting = parseSecondsOrMeters(existing);
  const nCandidate = parseSecondsOrMeters(candidate);
  if (nExisting <= 0) return candidate;
  if (nCandidate <= 0) return existing;
  return nCandidate > nExisting ? candidate : existing;
}

export function matchesEvent(eventName?: string, targetEvent?: string): boolean {
  if (!eventName || !targetEvent) return false;
  const a = String(eventName).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const b = String(targetEvent).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (a === b || a.includes(b) || b.includes(a)) return true;

  // Specific aliases
  if (b.includes("50mfree") && a.includes("50") && (a.includes("free") || a.includes("swim"))) return true;
  if (b.includes("100mfree") && a.includes("100") && (a.includes("free") || a.includes("swim"))) return true;
  if (b.includes("200mfree") && a.includes("200") && (a.includes("free") || a.includes("swim"))) return true;
  if (b.includes("100mdash") && a.includes("100") && (a.includes("dash") || a.includes("sprint") || a.includes("run") || !a.includes("free"))) return true;
  if (b.includes("200mdash") && a.includes("200") && (a.includes("dash") || a.includes("sprint") || a.includes("run") || !a.includes("free"))) return true;
  if (b.includes("polevault") && (a.includes("pole") || a.includes("vault"))) return true;
  if (b.includes("highjump") && a.includes("high") && a.includes("jump")) return true;
  if (b.includes("longjump") && a.includes("long") && a.includes("jump")) return true;

  return false;
}


