// Default view is a single district (The Gate) — one subject, readable, not a busy overview.
 // Overview + Full lot remain named stops. District chips / mobile tour share these focuses.

import { W, H, DISTRICTS } from './districts.js';

// Wide readable crop (Soundstage + Boulevard). Used by the Overview chip, not fresh load.
export const HOME_FOCUS = { x: 40, y: 380, w: 1580, h: 1040 };
/** Both stage rows + aisle + plaques — never crop mid-building (Pass 2 framing). */
export const STAGES_FOCUS = { x: 40, y: 440, w: 1080, h: 520 };
/** Gate + water tower — quiet default framing (one landmark, less clutter). */
export const GATE_FOCUS = { x: 1720, y: 420, w: 640, h: 500 };

export const ZOOM_MAX = 5;     // times the full-lot fit scale (push in further on stages)
export const HOME_MIN_ZOOM = 1.75; // soft overview — not full-lot crush, not tight crop
export const ZOOM_STEP = 1.2;  // button / key zoom factor

/** Named camera stops for the mobile district tour (and double-tap home). */
export const TOUR_STOPS = [
  { id: 'stages', label: 'Soundstage Row', focus: STAGES_FOCUS, minZoom: 2.2 },
  { id: 'street', label: 'Backlot Street', focus: { x: 1120, y: 440, w: 600, h: 480 }, minZoom: 2.2 },
  { id: 'gate', label: 'The Gate', focus: GATE_FOCUS, minZoom: 2.2 },
  { id: 'boulevard', label: 'The Boulevard', focus: { x: 50, y: 980, w: 1360, h: 560 }, minZoom: 2.0 },
  { id: 'block', label: 'Apartment Block', focus: DISTRICTS.block, minZoom: 2.2 },
  { id: 'park', label: 'The Park', focus: { x: 1920, y: 960, w: 440, h: 560 }, minZoom: 2.2 },
  { id: 'home', label: 'Overview', focus: HOME_FOCUS, minZoom: HOME_MIN_ZOOM },
  { id: 'full', label: 'Full lot', focus: { x: 0, y: 0, w: W, h: H }, minZoom: 1.0, fullLot: true },
];

/** Fresh load: The Gate — one district subject. Overview / Full lot are one chip away. */
export function defaultCamera(p) {
  return tourCamera(p, TOUR_STOPS.find((s) => s.id === 'gate'));
}

/** Default tour/nav index for fresh load and Reset. */
export function defaultStopIndex() {
  const i = TOUR_STOPS.findIndex((s) => s.id === 'gate');
  return i >= 0 ? i : 0;
}

export function fitScale(p) {
  return Math.min(p.width / W, p.height / H);
}

/** Camera that fills the viewport with a focus rect (padded). Never zooms in past what fits the focus. */
export function focusCamera(p, focus, { minZoom = HOME_MIN_ZOOM, pad = 1.06 } = {}) {
  void minZoom; // retained for callers; a forced floor must not crop the focus
  const kf = fitScale(p);
  const kFit = Math.min(p.width / (focus.w * pad), p.height / (focus.h * pad));
  const nearFull = focus.w >= W * 0.95 && focus.h >= H * 0.95;
  const k = nearFull ? kf : Math.max(kf, Math.min(kf * ZOOM_MAX, kFit));
  return clampCamera(p, {
    cx: focus.x + focus.w / 2,
    cy: focus.y + focus.h / 2,
    k,
  });
}

/** Camera that fills the viewport with HOME_FOCUS (padded). */
export function homeCamera(p) {
  return focusCamera(p, HOME_FOCUS, { minZoom: HOME_MIN_ZOOM, pad: 1.06 });
}

/** Alias used by Reset / double-tap — returns to the default Gate framing. */
export function resetCamera(p) {
  return defaultCamera(p);
}

/** Tour stop → camera. Full-lot stop uses the letterbox fit. */
export function tourCamera(p, stop) {
  if (!stop) return homeCamera(p);
  if (stop.fullLot) {
    return clampCamera(p, { cx: W / 2, cy: H / 2, k: fitScale(p) });
  }
  return focusCamera(p, stop.focus, { minZoom: stop.minZoom ?? HOME_MIN_ZOOM });
}

/** Keep the camera inside the lot and between the full-lot fit and ZOOM_MAX × fit. Always returns a camera. */
export function clampCamera(p, cam) {
  const kf = fitScale(p);
  const k = Math.max(kf, Math.min(kf * ZOOM_MAX, cam.k));
  const vw = p.width / k, vh = p.height / k;
  const cx = vw >= W ? W / 2 : Math.max(vw / 2, Math.min(W - vw / 2, cam.cx));
  const cy = vh >= H ? H / 2 : Math.max(vh / 2, Math.min(H - vh / 2, cam.cy));
  return { cx, cy, k };
}

export function isFullLot(p, cam) {
  if (!cam) return true;
  return cam.k <= fitScale(p) * 1.02;
}

/** Zoom by factor keeping logical (lx, ly) under screen (sx, sy). */
export function zoomTowardLogical(p, cam, factor, lx, ly, sx, sy) {
  const next = clampCamera(p, { cx: cam.cx, cy: cam.cy, k: cam.k * factor });
  const cx = lx - (sx - p.width / 2) / next.k;
  const cy = ly - (sy - p.height / 2) / next.k;
  return clampCamera(p, { cx, cy, k: next.k });
}
