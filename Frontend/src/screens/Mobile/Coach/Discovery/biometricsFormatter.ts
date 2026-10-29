/**
 * biometricsFormatter.ts
 *
 * Clean biometrics formatting utility for Discovery player cards.
 * Strips cluttered shorthand prefixes (e.g. "ht-", "wt-", "wing-", "vert-")
 * and formats biometrics using standard metric units with balanced typography.
 */

import { AthleteDiscoveryItem } from './discoveryTypes';

/**
 * Strips shorthand prefixes like 'ht-', 'wt-', 'wing-', 'vert-', 'ht:', etc.
 */
export function stripBiometricPrefix(raw?: string | null): string {
  if (!raw) return '';
  return String(raw)
    .replace(/^(ht|wt|wing|wingspan|vert|vertical)[-:\s_]+/i, '')
    .trim();
}

/**
 * Cleanly formats height to standard metric units (e.g., "185 cm").
 */
export function formatCleanHeight(athlete?: Partial<AthleteDiscoveryItem> | any): string {
  if (!athlete) return '-';

  // 1. Check direct metric cm values first
  const cmVal =
    athlete.biometrics?.height_cm ||
    athlete.height_cm ||
    athlete.physical_attributes?.height_cm ||
    athlete.physical_profile?.height_cm;

  if (cmVal && !isNaN(Number(cmVal)) && Number(cmVal) > 0) {
    return `${Math.round(Number(cmVal))} cm`;
  }

  // 2. Parse raw string (strip any "ht-" or "ht:" prefix)
  const rawStr = stripBiometricPrefix(
    athlete.biometrics?.height_ft ||
    athlete.height_ft ||
    athlete.height ||
    athlete.physical_attributes?.height ||
    ''
  );

  if (!rawStr || rawStr === '-') return '-';

  // Already metric? (e.g. "185 cm" or "185cm")
  const cmMatch = rawStr.match(/^(\d+(\.\d+)?)\s*cm$/i);
  if (cmMatch) {
    return `${Math.round(parseFloat(cmMatch[1]))} cm`;
  }

  // Feet & Inches (e.g., 6'2", 6'2, 6ft 2in)
  const ftInMatch = rawStr.match(/(\d+)['’ft\s]+\s*(\d+)?/i);
  if (ftInMatch) {
    const feet = parseInt(ftInMatch[1], 10);
    const inches = parseInt(ftInMatch[2] || '0', 10);
    const totalInches = feet * 12 + inches;
    if (totalInches > 0) {
      const calculatedCm = Math.round(totalInches * 2.54);
      return `${calculatedCm} cm`;
    }
  }

  // Pure number assume cm if >= 100, or inches if < 100
  const pureNum = parseFloat(rawStr.replace(/[^0-9.]/g, ''));
  if (!isNaN(pureNum) && pureNum > 0) {
    if (pureNum >= 100) {
      return `${Math.round(pureNum)} cm`;
    }
    // inches
    return `${Math.round(pureNum * 2.54)} cm`;
  }

  return rawStr;
}

/**
 * Cleanly formats weight to standard metric units (e.g., "78 kg").
 */
export function formatCleanWeight(athlete?: Partial<AthleteDiscoveryItem> | any): string {
  if (!athlete) return '-';

  // 1. Check direct metric kg values first
  const kgVal =
    athlete.biometrics?.weight_kg ||
    athlete.weight_kg ||
    athlete.physical_attributes?.weight_kg ||
    athlete.physical_profile?.weight_kg;

  if (kgVal && !isNaN(Number(kgVal)) && Number(kgVal) > 0) {
    return `${Math.round(Number(kgVal))} kg`;
  }

  // 2. Parse raw string (strip any "wt-" or "wt:" prefix)
  const rawStr = stripBiometricPrefix(
    athlete.biometrics?.weight_lbs ||
    athlete.weight_lbs ||
    athlete.weight ||
    athlete.physical_attributes?.weight ||
    ''
  );

  if (!rawStr || rawStr === '-') return '-';

  // Already metric? (e.g., "78 kg" or "78kg")
  const kgMatch = rawStr.match(/^(\d+(\.\d+)?)\s*kg$/i);
  if (kgMatch) {
    return `${Math.round(parseFloat(kgMatch[1]))} kg`;
  }

  // Pounds (e.g., "185 lbs" or "185lbs")
  const lbsMatch = rawStr.match(/(\d+(\.\d+)?)/);
  if (lbsMatch) {
    const totalLbs = parseFloat(lbsMatch[1]);
    if (totalLbs > 0) {
      // If it looks already in kg range (< 120 and explicitly no lbs) vs lbs
      if (rawStr.toLowerCase().includes('lbs')) {
        const calculatedKg = Math.round(totalLbs / 2.20462);
        return `${calculatedKg} kg`;
      } else if (totalLbs > 115) {
        // High likelihood of pounds
        const calculatedKg = Math.round(totalLbs / 2.20462);
        return `${calculatedKg} kg`;
      } else {
        // Likely already kg
        return `${Math.round(totalLbs)} kg`;
      }
    }
  }

  return rawStr;
}

/**
 * Cleanly formats wingspan to standard metric units with descriptor (e.g., "190 cm wingspan").
 */
export function formatCleanWingspan(athlete?: Partial<AthleteDiscoveryItem> | any): string {
  if (!athlete) return '-';

  // 1. Check direct metric cm values first
  const cmVal =
    athlete.biometrics?.wingspan_cm ||
    athlete.wingspan_cm ||
    athlete.physical_attributes?.wingspan_cm ||
    athlete.physical_profile?.wingspan_cm;

  if (cmVal && !isNaN(Number(cmVal)) && Number(cmVal) > 0) {
    return `${Math.round(Number(cmVal))} cm wingspan`;
  }

  // 2. Parse raw string (strip any "wing-" or "wingspan-" prefix)
  const rawStr = stripBiometricPrefix(
    athlete.biometrics?.wingspan_ft ||
    athlete.wingspan_ft ||
    athlete.wingspan ||
    athlete.physical_attributes?.wingspan ||
    ''
  );

  if (!rawStr || rawStr === '-') return '-';

  // Already metric? (e.g., "190 cm" or "190 cm wingspan")
  const cmMatch = rawStr.match(/^(\d+(\.\d+)?)\s*cm/i);
  if (cmMatch) {
    return `${Math.round(parseFloat(cmMatch[1]))} cm wingspan`;
  }

  // Feet & Inches (e.g., 6'5", 6'5)
  const ftInMatch = rawStr.match(/(\d+)['’ft\s]+\s*(\d+)?/i);
  if (ftInMatch) {
    const feet = parseInt(ftInMatch[1], 10);
    const inches = parseInt(ftInMatch[2] || '0', 10);
    const totalInches = feet * 12 + inches;
    if (totalInches > 0) {
      const calculatedCm = Math.round(totalInches * 2.54);
      return `${calculatedCm} cm wingspan`;
    }
  }

  const pureNum = parseFloat(rawStr.replace(/[^0-9.]/g, ''));
  if (!isNaN(pureNum) && pureNum > 0) {
    if (pureNum >= 100) {
      return `${Math.round(pureNum)} cm wingspan`;
    }
    return `${Math.round(pureNum * 2.54)} cm wingspan`;
  }

  return rawStr;
}

/**
 * Cleanly formats vertical leap (e.g., "76 cm vert").
 */
export function formatCleanVertical(athlete?: Partial<AthleteDiscoveryItem> | any): string {
  if (!athlete) return '-';

  // 1. Check direct metric cm values first
  const cmVal =
    athlete.biometrics?.vertical_leap_cm ||
    athlete.vertical_leap_cm ||
    athlete.vertical_cm ||
    athlete.vertical_jump_cm ||
    athlete.physical_attributes?.vertical_cm;

  if (cmVal && !isNaN(Number(cmVal)) && Number(cmVal) > 0) {
    return `${Math.round(Number(cmVal))} cm vert`;
  }

  // 2. Parse raw string (strip any "vert-" or "vertical-" prefix)
  const rawStr = stripBiometricPrefix(
    athlete.biometrics?.vertical_leap_in ||
    athlete.vertical_leap_in ||
    athlete.vertical_leap ||
    athlete.vertical_jump_in ||
    ''
  );

  if (!rawStr || rawStr === '-') return '-';

  const cmMatch = rawStr.match(/^(\d+(\.\d+)?)\s*cm/i);
  if (cmMatch) {
    return `${Math.round(parseFloat(cmMatch[1]))} cm vert`;
  }

  const inMatch = rawStr.match(/(\d+(\.\d+)?)/);
  if (inMatch) {
    const inches = parseFloat(inMatch[1]);
    if (inches > 0) {
      const calculatedCm = Math.round(inches * 2.54);
      return `${calculatedCm} cm vert`;
    }
  }

  return rawStr;
}

/**
 * Returns a unified clean biometrics object for an athlete.
 */
export function getCleanBiometrics(athlete?: Partial<AthleteDiscoveryItem> | any) {
  return {
    height: formatCleanHeight(athlete),
    weight: formatCleanWeight(athlete),
    wingspan: formatCleanWingspan(athlete),
    vertical: formatCleanVertical(athlete),
  };
}
