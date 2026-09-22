// Default view is full-lot letterbox. Figures/trucks are sized for that; district chips zoom in.
 // Mobile district tour reuses the same focusCamera helper.

import { W, H, DISTRICTS } from './districts.js';

// Primary readable crop: Soundstage Row + Boulevard (+ Gate/Street). Tower stays on the
 // full-lot / Gate tour stops — phone width cannot hold all three landmarks large at once.
export const HOME_FOCUS = { x: 40, y: 380, w: 1580, h: 1040 };
/** Tighter Soundstage Row crop so phone tour figures clear ~40 CSS px. */
export const STAGES_FOCUS = { x: 80, y: 500, w: 640, h: 340 };

export const ZOOM_MAX = 5;     // times the full-lot fit scale (push in further on stages)
export const HOME_MIN_ZOOM = 1.75; // soft overview — not full-lot crush, not tight crop
export const ZOOM_STEP = 1.2;  // button / key zoom factor

/** Named camera stops for the mobile district tour (and double-tap home). */
export const TOUR_STOPS = [
  { id: 'stages', label: 'Soundstage Row', focus: STAGES_FOCUS, minZoom: 3.2 },
  { id: 'street', label: 'Backlot Street', focus: { x: 1140, y: 450, w: 560, h: 450 }, minZoom: 2.4 },
  { id: 'gate', label: 'The Gate', focus: { x: 1760, y: 440, w: 580, h: 460 }, minZoom: 2.4 },
  { id: 'boulevard', label: 'The Boulevard', focus: { x: 70, y: 1020, w: 680, h: 380 }, minZoom: 2.6 },
  { id: 'block', label: 'Apartment Block', focus: DISTRICTS.block, minZoom: 2.5 },
  { id: 'park', label: 'The Park', focus: { x: 1960, y: 980, w: 400, h: 520 }, minZoom: 2.6 },
  { id: 'home', label: 'Overview', focus: HOME_FOCUS, minZoom: HOME_MIN_ZOOM },
  { id: 'full', label: 'Full lot', focus: { x: 0, y: 0, w: W, h: H }, minZoom: 1.0, fullLot: true },
];

/** Fresh load: full-lot letterbox (desktop + phone). District chips zoom in. */
export function defaultCamera(p) {
  return tourCamera(p, TOUR_STOPS.find((s) => s.id === 'full'));
}

export function fitScale(p) {
  return Math.min(p.width / W, p.height / H);
}

/** Camera that fills the viewport with a focus rect (padded), clamped to [fit×minZoom, fit×ZOOM_MAX]. */
export function focusCamera(p, focus, { minZoom = HOME_MIN_ZOOM, pad = 1.06 } = {}) {
  const kf = fitScale(p);
  const kWant = Math.min(p.width / (focus.w * pad), p.height / (focus.h * pad));
  const nearFull = focus.w >= W * 0.95 && focus.h >= H * 0.95;
  const floor = nearFull ? kf : kf * minZoom;
  const k = Math.max(floor, Math.min(kf * ZOOM_MAX, kWant));
  return clampCamera(p, {
    cx: focus.x + focus.w / 2,
    cy: focus.y + focus.h / 2,
    k,
  });
}

/** Camera that fills the viewport with HOME_FOCUS (padded), clamped to [fit×HOME_MIN_ZOOM, fit×ZOOM_MAX]. */
export function homeCamera(p) {
  return focusCamera(p, HOME_FOCUS, { minZoom: HOME_MIN_ZOOM, pad: 1.04 });
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
