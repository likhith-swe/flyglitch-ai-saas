import type { GlitchScoreInput, GlitchScoreParts } from "./types";

/**
 * FlyGlitch AI — Glitch Scoring Engine.
 *
 * Airlines price tickets through dynamic revenue-management systems
 * (Sabre / Amadeus / PROS). Genuine fare anomalies surface through four
 * signals:
 *
 *  1. Deviation  — price vs trailing 60-day median (currency-conversion
 *                  mismatches across POS countries show up here).
 *  2. Velocity   — how fast the lowest fare-class bucket (G/Q/V) is draining.
 *  3. Convenience— nonstop vs layover quality.
 *  4. Fuel       — YQ/YR surcharge omission ("fuel dumping") when legs are
 *                  mis-aligned across alliances.
 *
 * GlitchScore = 0.45*S_deviation + 0.25*S_velocity + 0.15*S_convenience
 *               + 0.15*S_fuel + B_floor - P_layover
 */

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const WEIGHTS = {
  deviation: 0.45,
  velocity: 0.25,
  convenience: 0.15,
  fuel: 0.15,
} as const;

export const FLOOR_BONUS = 15;
export const LAYOVER_PENALTY = 20;

export function deviationSignal(input: GlitchScoreInput): number {
  const { sixtyDayMedianMinor, currentPriceMinor } = input;
  if (sixtyDayMedianMinor <= 0) return 0;
  return clamp(
    ((sixtyDayMedianMinor - currentPriceMinor) / sixtyDayMedianMinor) * 125,
    0,
    100
  );
}

/**
 * Inventory drain velocity. We model the lowest fare bucket as 9 seats:
 * the fewer seats left and the faster they drained (short observation
 * window), the higher the velocity signal.
 */
export function velocitySignal(input: GlitchScoreInput): number {
  const seatsLeft = clamp(input.seatsRemaining, 1, 9);
  const hours = Math.max(0.25, input.observedHours);
  const seatsDrainedFactor = (9 - seatsLeft) / 8; // 0..1
  const drainSpeedFactor = clamp(6 / hours, 0, 1); // recent drain = 1
  return clamp(100 * (0.65 * seatsDrainedFactor + 0.35 * drainSpeedFactor), 0, 100);
}

export function convenienceSignal(input: GlitchScoreInput): number {
  if (input.stops === 0) return 100;
  const layover = input.layoverMinutes ?? 0;
  if (layover < 180) return 75; // short single layover
  if (layover > 360) return 30; // long haul marathons
  return 55; // 3–6h layover band
}

/**
 * Fuel-dump signal: full marks when the carried YQ/YR surcharge is below
 * 10% of the typical carrier fee for the route; linear decay to zero as the
 * ratio approaches parity.
 */
export function fuelSignal(input: GlitchScoreInput): number {
  const typical = input.typicalFuelFeeMinor;
  if (typical <= 0) return input.fuelSurchargeMinor === 0 ? 100 : 0;
  const ratio = input.fuelSurchargeMinor / typical;
  if (ratio < 0.1) return 100;
  return clamp(100 - ((ratio - 0.1) / 0.9) * 100, 0, 100);
}

export function computeGlitchScore(input: GlitchScoreInput): GlitchScoreParts {
  const sDev = deviationSignal(input);
  const sVel = velocitySignal(input);
  const sCon = convenienceSignal(input);
  const sFuel = fuelSignal(input);

  const floorBonus = input.currentPriceMinor <= input.lowestEverMinor ? FLOOR_BONUS : 0;
  const layoverPenalty =
    input.stops > 0 &&
    input.nonstopDurationMinutes > 0 &&
    input.durationMinutes > input.nonstopDurationMinutes * 2.5
      ? LAYOVER_PENALTY
      : 0;

  const total = clamp(
    WEIGHTS.deviation * sDev +
      WEIGHTS.velocity * sVel +
      WEIGHTS.convenience * sCon +
      WEIGHTS.fuel * sFuel +
      floorBonus -
      layoverPenalty,
    0,
    100
  );

  return {
    deviation: round2(WEIGHTS.deviation * sDev),
    velocity: round2(WEIGHTS.velocity * sVel),
    convenience: round2(WEIGHTS.convenience * sCon),
    fuel: round2(WEIGHTS.fuel * sFuel),
    floorBonus,
    layoverPenalty,
    raw: {
      deviation: round2(sDev),
      velocity: round2(sVel),
      convenience: round2(sCon),
      fuel: round2(sFuel),
    },
    total: round2(total),
  };
}

/** Glitch classification: score >= 85 AND >= 55% off retail. */
export function classifyGlitch(score: number, discountPercent: number): boolean {
  return score >= 85 && discountPercent >= 55;
}

export function discountPercentOf(retailMinor: number, priceMinor: number): number {
  if (retailMinor <= 0) return 0;
  return round2(((retailMinor - priceMinor) / retailMinor) * 100);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
