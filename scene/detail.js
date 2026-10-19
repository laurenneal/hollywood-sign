// Level of detail from projected CSS pixels (world × view.k).
 // Reference: a 140-unit stage. Thresholds tuned so Overview framing stays quiet
 // and district stops (Stages/Gate) land in DISTRICT — CLOSE only when truly close.

export const TIER = Object.freeze({ OVERVIEW: 0, DISTRICT: 1, CLOSE: 2 });

const STAGE_W = 140;
const OVERVIEW_BELOW = 85;   // stage projected width — Overview framing (~60px) stays here
const CLOSE_ABOVE = 145;     // Stages/Gate (~110–130px) stay DISTRICT; push in for CLOSE
const HYST = 0.1;

export function projected(worldWidth, k) {
  return worldWidth * (k || 0);
}

/** Resolve tier from camera scale k. Pass previous tier for hysteresis (omit when frozen). */
export function detailTier(k, { prev = null, frozen = false } = {}) {
  const stagePx = projected(STAGE_W, k);
  if (frozen || prev == null) {
    if (stagePx < OVERVIEW_BELOW) return TIER.OVERVIEW;
    if (stagePx < CLOSE_ABOVE) return TIER.DISTRICT;
    return TIER.CLOSE;
  }
  // Stay in previous band until clearly past the boundary (±10%).
  if (prev === TIER.OVERVIEW) {
    if (stagePx < OVERVIEW_BELOW * (1 + HYST)) return TIER.OVERVIEW;
    if (stagePx < CLOSE_ABOVE) return TIER.DISTRICT;
    return TIER.CLOSE;
  }
  if (prev === TIER.DISTRICT) {
    if (stagePx < OVERVIEW_BELOW * (1 - HYST)) return TIER.OVERVIEW;
    if (stagePx < CLOSE_ABOVE * (1 + HYST)) return TIER.DISTRICT;
    return TIER.CLOSE;
  }
  // CLOSE
  if (stagePx < OVERVIEW_BELOW) return TIER.OVERVIEW;
  if (stagePx < CLOSE_ABOVE * (1 - HYST)) return TIER.DISTRICT;
  return TIER.CLOSE;
}

export function isOverview(tier) { return tier === TIER.OVERVIEW; }
export function isDistrict(tier) { return tier === TIER.DISTRICT; }
export function isClose(tier) { return tier === TIER.CLOSE; }

/** True when a label in world units would render below ~minPx on screen. */
export function labelTooSmall(worldHeight, k, minPx = 11) {
  return projected(worldHeight, k) < minPx;
}
