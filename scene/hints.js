// First-run "tap anything" hint: which objects to ping, and the once-per-browser gate.
// Pure list + helpers here so they stay unit-testable; the drawing/DOM lives in scene.js.
// The FPF van is deliberately never a target — it is a find, not a tutorial pointer.

export const HINT_TARGETS = ['water_tower', 'departures', 'marquee'];
export const HINT_KEY = 'sign.hint.seen.v1';

export function isHintTarget(id) {
  return HINT_TARGETS.includes(id);
}

export function hintSeen() {
  try { return localStorage.getItem(HINT_KEY) === '1'; } catch (_) { return false; }
}

export function markHintSeen() {
  try { localStorage.setItem(HINT_KEY, '1'); } catch (_) { /* private mode: show again next visit */ }
}
