// The Hollywood SIGN scene: loads data/signals.json, seeds the RNG from its content, draws the fixed lot
// once to an offscreen buffer, then runs the actors. Every actor is bound to one signal and explains
// itself on hover (on a tap, on a touch screen, where a pinch zooms and a drag pans). Default view is
// zoomed on Soundstage Row / Gate / Boulevard so the lot reads on a phone; pinch or scroll out for the
 // full 2400×1600. Nothing here is generated; the same JSON gives the same picture.

import { W, H, DISTRICTS, ANCHORS, inRect } from './districts.js';
import { PALETTE, greyed } from './palette.js';
import { hashString, mulberry32, child } from './rng.js';
import { drawLot } from './lot.js';
import { ACTORS } from './actors/_registry.js';
import { provenance } from './scale.js';
import { installTimeline } from './timeline.js';
import { installAbout } from './about.js';
import { installIntro } from './intro.js';
import { installNumbers } from './numbers.js';
import { freshnessBadge } from './freshness.js';
import { clampCamera, fitScale, ZOOM_STEP, zoomTowardLogical, defaultCamera, tourCamera, TOUR_STOPS } from './camera.js';
import { installTour } from './tour.js';
import { installDistrictNav } from './navigation.js';
import { installInspector } from './inspector.js';
import { installSignalCatalog } from './signal-catalog.js';
import { installPause } from './pause.js';
import { installExplore } from './explore.js';

const SIGNALS_URL = new URL('../data/signals.json', import.meta.url);
const REFRESH_MS = 10 * 60 * 1000;

// ------------------------------------------------------------------ clock (Pacific time)
function pacificHour(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', hour12: false, minute: 'numeric' })
    .formatToParts(d);
  const h = Number(parts.find(p => p.type === 'hour').value) % 24;
  const m = Number(parts.find(p => p.type === 'minute').value);
  return h + m / 60;
}

function pacificDate(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

// ------------------------------------------------------------------ the scene object shared with actors
const scene = {
  W, H, DISTRICTS, ANCHORS, PALETTE,
  signals: {},          // id -> entry from signals.json
  meta: {},             // built_at, method_version, feeds_ok, feeds_total
  seed: 0,
  rng: mulberry32(1),   // reseeded on every load
  hour: 12,
  isNight: false,
  today: pacificDate(),
  hits: [],             // per-frame hover regions: {x,y,w,h,actor}
  hovered: null,
  frozenTime: null,     // set by ?t= for deterministic screenshots
  frozenHour: null,     // set by ?hour=
  reduceMotion: false,  // prefers-reduced-motion: actors that scroll (billboard) hold still
  camera: null,         // {cx, cy, k} in logical units: recorder override for the letterbox fit
  forceMouse: null,     // {x, y} logical: recorder override for hover

  sig(id) { return this.signals[id] || null; },
  childRng(name) { return child(this.rng, name); },
  // color through the stale filter
  paint(sig, hex) { return (sig && sig.stale) ? greyed(hex) : hex; },
  hit(x, y, w, h, actor, extra) { this.hits.push({ x, y, w, h, actor, extra }); },
};

// ------------------------------------------------------------------ loading
async function loadSignals() {
  const r = await fetch(SIGNALS_URL, { cache: 'no-store' });
  if (!r.ok) throw new Error('signals.json ' + r.status);
  const j = await r.json();
  liveSignals = j.signals || {};
  scene.meta = { built_at: j.built_at, method_version: j.method_version, feeds_ok: j.feeds_ok, feeds_total: j.feeds_total,
                 feeds_known: j.feeds_known, today: j.today, reference_year: j.reference_year };
  if (timeline) timeline.setLive(liveSignals, scene.meta);
  if (!timeline || timeline.day == null) applySignals(liveSignals);
}

let liveSignals = null;
let timeline = null;

// bind a signals map to every actor and reseed: the live one, or a past day's from the scrubber
function applySignals(signals, info = {}) {
  scene.signals = signals;
  scene.replayed = !!info.replayed;
  const core = Object.fromEntries(Object.entries(scene.signals).map(([k, v]) => [k, [v.value, v.period]]));
  scene.seed = hashString(scene.today + JSON.stringify(core, Object.keys(core).sort()));
  scene.rng = mulberry32(scene.seed);
  for (const a of ACTORS) {
    try { a.update(sigFor(a), scene); } catch (e) { console.error('actor update failed', a.id || a.signal, e); }
  }
  renderHud();
}

function sigFor(actor) {
  return Array.isArray(actor.signal) ? actor.signal.map(s => scene.sig(s)) : scene.sig(actor.signal);
}

function renderHud() {
  const idx = scene.sig('sign_index');
  const el = document.getElementById('idx');
  const st = document.getElementById('status');
  const note = document.getElementById('hud-note');
  if (idx && idx.value != null) {
    el.textContent = `SIGN index · ${Math.round(idx.value)}/100` + (idx.label ? ` · ${idx.label}` : '');
  } else {
    el.textContent = 'SIGN index · not enough history yet';
  }
  const m = scene.meta;
  if (timeline && timeline.day) {
    el.textContent = (idx && idx.value != null ? `SIGN index · ${Math.round(idx.value)}/100` : 'SIGN index · n/a') + ` · ${timeline.day}` + (scene.replayed ? ' · replayed' : '');
    st.innerHTML = `replaying ${escHtml(timeline.day)}<br>seed ${escHtml(scene.seed.toString(16))}`;
    if (note) { note.textContent = `replay · ${scene.replayed ? 'from history' : 'as built that day'} · LIVE returns to today`; note.classList.remove('warn'); }
    const hud = document.getElementById('hud');
    if (hud) hud.classList.remove('feeds-warn');
    return;
  }
  const freshness = freshnessBadge(m, scene.signals);
  st.innerHTML = `${escHtml(freshness.statusLine)}<br>method v${escHtml(m.method_version || '?')} · seed ${escHtml(scene.seed.toString(16))}`;
  if (note) {
    const premise = `<span class="premise">50 means the components are at their recent averages · relative composite, not a grade.</span>`;
    note.innerHTML = premise + ' · ' + freshness.noteHtml;
    note.classList.toggle('warn', freshness.tone === 'warn');
  }
  const hud = document.getElementById('hud');
  if (hud) hud.classList.toggle('feeds-warn', freshness.tone === 'warn');
  if (scene.numbers && scene.numbers.refresh) scene.numbers.refresh();
  if (scene.catalog && scene.catalog.render) scene.catalog.render();
}

// ------------------------------------------------------------------ hover legend
const legendEl = document.getElementById('legend');
function escHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
// Optional legend.link = { href, label }: only http(s) URLs become an <a>; everything else is escaped text.
function legendLinkHtml(link) {
  if (!link || typeof link !== 'object') return '';
  const href = String(link.href || '').trim();
  const label = String(link.label || href).trim();
  if (!href || !/^https?:\/\//i.test(href)) return '';
  return `<div class="more"><a href="${escHtml(href)}" target="_blank" rel="noopener noreferrer">${escHtml(label)}</a></div>`;
}
function showLegend(hit, { pin = false } = {}) {
  const a = hit.actor;
  let s;
  try { s = a.legend(sigFor(a), scene, hit.extra); } catch (e) { s = { title: a.id || a.signal, text: 'legend error: ' + e.message }; }
  if (!s) { legendEl.style.display = 'none'; return; }
  const sigs = sigFor(a);
  const sig = Array.isArray(sigs) ? (sigs.find(x => x && x.value != null) || sigs[0]) : sigs;
  const stale = !!(sig && sig.stale);
  const staleHtml = stale ? ' <span class="stale">stale</span>' : '';
  legendEl.innerHTML =
    `<b>${escHtml(s.title)}${staleHtml}</b>${escHtml(s.text)}` +
    legendLinkHtml(s.link) +
    `<div class="src">${escHtml(s.source || provenance(sig))}</div>`;
  legendEl.style.display = 'block';
  if (pin && scene.inspector) {
    scene.inspector.show(hit, { ...s, stale }, s.source || provenance(sig));
  }
}

// ------------------------------------------------------------------ p5 sketch
let lotBuffer = null;
let lotDay = null;
let lotNight = null;

function ensureLot(p) {
  const night = !!scene.isNight;
  if (night) {
    if (!lotNight) {
      lotNight = p.createGraphics(W, H);
      drawLot(lotNight, scene, p, { night: true });
    }
    lotBuffer = lotNight;
  } else {
    if (!lotDay) {
      lotDay = p.createGraphics(W, H);
      drawLot(lotDay, scene, p, { night: false });
    }
    lotBuffer = lotDay;
  }
}
let view = { k: 1, ox: 0, oy: 0 };

// the topmost hover region under a logical point, from the regions the last painted frame registered
function topHit(lx, ly) {
  for (let i = scene.hits.length - 1; i >= 0; i--) {
    const h = scene.hits[i];
    if (lx >= h.x && lx <= h.x + h.w && ly >= h.y && ly <= h.y + h.h) return h;
  }
  return null;
}

// ------------------------------------------------------------------ touch + mouse: pan, pinch/wheel zoom, district tour
// Default camera is defaultCamera (full-lot letterbox). Interactions
// (interactive modes only, not story/bare):
//   • one-finger drag / left-mouse drag → pan
//   • two-finger pinch / wheel / ctrl-wheel → zoom toward cursor (full-lot fit … ZOOM_MAX×fit)
//   • tap/click pins inspector; double-tap returns default framing
//   • Zoom +/− / Reset buttons (installZoomChrome)
 // Recorders still set scene.camera via scene.step(); story/bare keep full letterbox (camera null).
 // Canvas size follows #viewport (not the window), so a CSS-stretched leftover zoom never sticks.
const touch = {
  active: false,        // the last input was a finger: hover comes from the pinned hit, not p.mouseX
  pinned: null,         // {actor, extra} of the tapped region, or null
  pointers: new Map(),  // pointerId -> {x, y} in canvas CSS px
  start: null,          // the gesture in progress: {cam, x, y, t} for one finger, {cam, dist, anchor} for two
  moved: false,         // the finger traveled: not a tap
  lastTap: null,        // {x, y, t} for the double-tap
};
// Desktop / pen drag-to-pan (separate from touch map so hover still works when idle)
const mouseDrag = {
  on: false,
  id: null,
  x: 0,
  y: 0,
  moved: false,
};
const TAP_MS = 400, TAP_PX = 8, DOUBLE_MS = 350, DOUBLE_PX = 30;

let tour = null;
let districtNav = null;
let sketchP = null;
// True once the visitor pans / zooms / picks a district. Until then, every resize re-applies
 // defaultCamera so a half-laid-out first paint (or bfcache restore) never sticks a weird crop.
let userFramed = false;

function useHomeView() {
  return !document.body.classList.contains('story') && !document.body.classList.contains('bare');
}

function exploreActive() {
  // Story/bare never explore; if explore control missing, allow gestures (desktop default).
  if (!useHomeView()) return false;
  if (scene.exploreOn == null) return true;
  return !!scene.exploreOn;
}

function viewportSize() {
  if (typeof document === 'undefined') return { w: 800, h: 600 };
  if (!useHomeView()) return { w: window.innerWidth, h: window.innerHeight };
  const vp = document.getElementById('viewport');
  if (vp) {
    const r = vp.getBoundingClientRect();
    const w = Math.max(1, Math.floor(r.width));
    const h = Math.max(1, Math.floor(r.height));
    if (w > 2 && h > 2) return { w, h };
  }
  return { w: window.innerWidth, h: window.innerHeight };
}

function applyDefaultCamera(p) {
  if (!p || !useHomeView()) { scene.camera = null; return; }
  if (tour && tour.syncVisibility()) {
    scene.camera = tour.applyCurrent(p);
  } else {
    scene.camera = defaultCamera(p);
  }
  userFramed = false;
}

function setSceneCamera(cam, opts = {}) {
  scene.camera = cam;
  if (opts.fromTour || opts.fromNav) userFramed = true;
  else if (opts.reset) userFramed = false;
  else if (opts.user) userFramed = true;
}

function resizeSketch(p) {
  const { w, h } = viewportSize();
  if (p.width !== w || p.height !== h) p.resizeCanvas(w, h);
  if (!useHomeView()) {
    scene.camera = null;
    fit(p);
    return;
  }
  if (tour) tour.syncVisibility();
  if (districtNav) districtNav.syncVisibility();
  if (scene.inspector) scene.inspector.syncVisibility();
  // Tour bar visible → stay on that stop. Otherwise: default until the user frames, then clamp.
  if (tour && !tour.el.hidden) scene.camera = tour.applyCurrent(p);
  else if (!userFramed || !scene.camera) applyDefaultCamera(p);
  else scene.camera = clampCamera(p, scene.camera);
  fit(p);
}

function installTouch(p, canvas) {
  if (typeof window === 'undefined' || !window.PointerEvent) return;
  canvas.style.touchAction = 'none';
  canvas.style.cursor = 'grab';
  const pos = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const cameraNow = () => scene.camera || (useHomeView() ? defaultCamera(p) : { k: fitScale(p), cx: W / 2, cy: H / 2 });
  const logical = (q) => ({ lx: (q.x - view.ox) / view.k, ly: (q.y - view.oy) / view.k });
  const panBy = (dx, dy) => {
    const cam = cameraNow();
    setSceneCamera(clampCamera(p, { cx: cam.cx - dx / cam.k, cy: cam.cy - dy / cam.k, k: cam.k }), { user: true });
  };

  // (re)start the gesture from the fingers that are down now: one finger pans (or taps), two or more pinch on the
  // first two. Called whenever the set of fingers changes, so a third finger landing or the first finger of a pinch
  // lifting never leaves a stale start (and a jump in zoom) behind.
  const rebase = (t) => {
    const [a, b] = [...touch.pointers.values()];
    if (!a) { touch.start = null; return; }
    if (!b) { touch.start = { cam: cameraNow(), x: a.x, y: a.y, t }; return; }
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    touch.start = { cam: cameraNow(), dist: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)), anchor: logical(mid), t };
    touch.moved = true;                         // two fingers is never a tap
  };

  canvas.addEventListener('pointerdown', (e) => {
    if (!useHomeView()) return;
    const q = pos(e);

    // ---- mouse / pen: drag to pan only in Explore; click-to-pin always
    if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
      if (e.button !== 0) return;
      touch.active = false;
      touch.pinned = null;
      mouseDrag.on = true;
      mouseDrag.id = e.pointerId;
      mouseDrag.x = q.x;
      mouseDrag.y = q.y;
      mouseDrag.moved = false;
      mouseDrag.explore = exploreActive();
      try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* older browsers */ }
      if (mouseDrag.explore) canvas.style.cursor = 'grabbing';
      if (e.cancelable && mouseDrag.explore) e.preventDefault();
      return;
    }

    // ---- touch: pin always; pan/pinch only in Explore
    if (e.pointerType !== 'touch') return;
    touch.active = true;
    mouseDrag.on = false;
    if (e.isPrimary) touch.pointers.clear();
    touch.pointers.set(e.pointerId, q);
    try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    if (touch.pointers.size === 1) touch.moved = false;
    if (exploreActive()) rebase(e.timeStamp);
    else touch.start = { cam: cameraNow(), x: q.x, y: q.y, t: e.timeStamp, tapOnly: true };
    if (e.cancelable && exploreActive()) e.preventDefault();
  }, { passive: false });

  const onMove = (e) => {
    if (!useHomeView()) return;

    // mouse / pen pan (Explore only)
    if (mouseDrag.on && e.pointerId === mouseDrag.id) {
      const q = pos(e);
      const dx = q.x - mouseDrag.x, dy = q.y - mouseDrag.y;
      if (!mouseDrag.moved && Math.hypot(dx, dy) > TAP_PX) mouseDrag.moved = true;
      if (mouseDrag.moved && mouseDrag.explore) {
        panBy(dx, dy);
        mouseDrag.x = q.x;
        mouseDrag.y = q.y;
        if (typeof scene.requestDraw === 'function') scene.requestDraw();
      }
      if (e.cancelable && mouseDrag.explore) e.preventDefault();
      return;
    }

    if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
      if (touch.active) { touch.active = false; touch.pinned = null; }
      // Hover legend still updates while paused (noLoop) — redraw on move.
      if (scene.paused && typeof scene.requestDraw === 'function') scene.requestDraw();
      return;
    }

    // touch pan / pinch only in Explore
    if (!exploreActive() || !touch.pointers.has(e.pointerId) || !touch.start || touch.start.tapOnly) return;
    const q = pos(e);
    const prev = touch.pointers.get(e.pointerId);
    touch.pointers.set(e.pointerId, q);
    if (touch.pointers.size >= 2 && touch.start.dist) {
      const [a, b] = [...touch.pointers.values()];
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const k = touch.start.cam.k * (dist / touch.start.dist);
      // the logical point that was under the pinch center stays under it
      const cx = touch.start.anchor.lx + (p.width / 2 - mid.x) / k;
      const cy = touch.start.anchor.ly + (p.height / 2 - mid.y) / k;
      setSceneCamera(clampCamera(p, { cx, cy, k }), { user: true });
      touch.moved = true;
    } else if (touch.pointers.size === 1) {
      if (!touch.moved && Math.hypot(q.x - touch.start.x, q.y - touch.start.y) > TAP_PX) touch.moved = true;
      if (touch.moved) panBy(q.x - prev.x, q.y - prev.y);
    }
    if (e.cancelable) e.preventDefault();
  };
  canvas.addEventListener('pointermove', onMove, { passive: false });
  window.addEventListener('pointermove', onMove, { passive: false });

  const up = (e) => {
    // end mouse drag
    if (mouseDrag.on && e.pointerId === mouseDrag.id) {
      mouseDrag.on = false;
      mouseDrag.id = null;
      canvas.style.cursor = 'grab';
      try { canvas.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      // click without drag: pin into the inspector (hover legend still follows the mouse)
      if (!mouseDrag.moved && e.type === 'pointerup' && useHomeView()) {
        const q = pos(e);
        const { lx, ly } = logical(q);
        const h = topHit(lx, ly);
        if (h) showLegend(h, { pin: true });
        else if (scene.inspector) scene.inspector.clear();
      }
      return;
    }

    if (e.pointerType !== 'touch' || !touch.pointers.has(e.pointerId)) return;
    const q = pos(e);
    touch.pointers.delete(e.pointerId);
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    const start = touch.start;
    if (touch.pointers.size) {
      // a pinch lost a finger: whatever is left goes on as a pan (one) or a fresh pinch (two or more), never a tap
      rebase(e.timeStamp);
      touch.moved = true;
      return;
    }
    touch.start = null;
    const tap = e.type === 'pointerup' && start && !touch.moved && (e.timeStamp - start.t) < TAP_MS;
    if (!tap) return;
    const last = touch.lastTap;
    if (last && e.timeStamp - last.t < DOUBLE_MS && Math.hypot(q.x - last.x, q.y - last.y) < DOUBLE_PX) {
      touch.lastTap = null;                     // double-tap: reset to default framing
      if (tour && tour.syncVisibility()) tour.home();
      else applyDefaultCamera(p);
      touch.pinned = null;
      if (scene.inspector) scene.inspector.clear();
      return;
    }
    touch.lastTap = { x: q.x, y: q.y, t: e.timeStamp };
    const { lx, ly } = logical(q);
    const h = topHit(lx, ly);                   // the regions of the last painted frame
    touch.pinned = h ? { actor: h.actor, extra: h.extra } : null;
    if (h) showLegend(h, { pin: true });
    else if (scene.inspector) scene.inspector.clear();
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);

  // Desktop wheel / trackpad pinch (ctrl+wheel) zoom toward the cursor; pinch-out reaches the full lot.
  canvas.addEventListener('wheel', (e) => {
    if (!useHomeView() || !exploreActive()) return;
    e.preventDefault();
    const q = pos(e);
    const before = logical(q);
    const cam = cameraNow();
    // ctrlKey = trackpad pinch on most browsers; otherwise step zoom
    let factor;
    if (e.ctrlKey) {
      factor = Math.exp(-e.deltaY * 0.01);
      factor = Math.min(1.25, Math.max(1 / 1.25, factor));
    } else {
      factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    }
    setSceneCamera(zoomTowardLogical(p, cam, factor, before.lx, before.ly, q.x, q.y), { user: true });
  }, { passive: false });
}

/** Zoom + / − / Reset chrome (44×44 targets). Hidden in story/bare. */
function installZoomChrome(p) {
  if (typeof document === 'undefined') return;
  let el = document.getElementById('zoom');
  if (!el) {
    el = document.createElement('div');
    el.id = 'zoom';
    el.setAttribute('role', 'group');
    el.setAttribute('aria-label', 'Map zoom');
    el.innerHTML =
      '<button type="button" class="zin" aria-label="Zoom in">+</button>' +
      '<button type="button" class="zout" aria-label="Zoom out">−</button>' +
      '<button type="button" class="zreset" aria-label="Reset view">⌂</button>';
    // Host on #viewport so zoom stacks with Pause/Explore over the map, not the district chips
    const host = document.getElementById('viewport') || document.body;
    host.appendChild(el);
  }
  const cameraNow = () => scene.camera || (useHomeView() ? defaultCamera(p) : { k: fitScale(p), cx: W / 2, cy: H / 2 });
  const zoomCenter = (factor) => {
    if (!useHomeView()) return;
    const cam = cameraNow();
    const sx = p.width / 2, sy = p.height / 2;
    const lx = (sx - view.ox) / view.k, ly = (sy - view.oy) / view.k;
    setSceneCamera(zoomTowardLogical(p, cam, factor, lx, ly, sx, sy), { user: true });
  };
  el.querySelector('.zin').onclick = () => zoomCenter(ZOOM_STEP);
  el.querySelector('.zout').onclick = () => zoomCenter(1 / ZOOM_STEP);
  el.querySelector('.zreset').onclick = () => {
    if (!useHomeView()) return;
    if (tour && tour.syncVisibility()) tour.home();
    else applyDefaultCamera(p);
  };
}

// two hover tags name the same region: the same string, the same object, or objects with the same own fields
// (an actor may allocate its tag per frame, e.g. { stage: n })
function sameExtra(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every(k => a[k] === b[k]);
}

// the hover region to explain this frame: the recorder's forced point, the pinned tap, or the mouse
function currentHit(p) {
  if (scene.forceMouse) return topHit(scene.forceMouse.x, scene.forceMouse.y);
  if (touch.active) {
    if (!touch.pinned) return null;
    for (let i = scene.hits.length - 1; i >= 0; i--) {
      const h = scene.hits[i];
      if (h.actor === touch.pinned.actor && sameExtra(h.extra, touch.pinned.extra)) return h;
    }
    return touch.pinned;                        // the region is not on screen this frame: keep the legend up
  }
  return topHit((p.mouseX - view.ox) / view.k, (p.mouseY - view.oy) / view.k);
}

const sketch = (p) => {
  sketchP = p;
  p.setup = () => {
    const { w, h } = viewportSize();
    const c = p.createCanvas(w, h);
    c.parent('stage');
    try {
      c.elt.setAttribute('role', 'img');
      c.elt.setAttribute('aria-label',
        'Illustrated studio lot. Numbers are also listed in the Selected signal panel. Use Explore to pan and zoom.');
    } catch (_) { /* ignore */ }
    p.pixelDensity(Math.min(2, p.displayDensity()));
    p.frameRate(30);
    p.noiseSeed(scene.seed);
    try {
      scene.reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (_) {
      scene.reduceMotion = false;
    }
    scene.hour = scene.frozenHour != null ? scene.frozenHour : pacificHour();
    scene.isNight = scene.hour < 6 || scene.hour >= 19.5;
    ensureLot(p);
    for (const a of ACTORS) {
      try { a.init(scene, p); } catch (e) { console.error('actor init failed', a.id || a.signal, e); }
    }
    scene.inspector = installInspector(scene);
    tour = installTour(scene, {
      getP: () => sketchP,
      setCamera: (cam, opts) => setSceneCamera(cam, { fromTour: true, ...(opts || {}) }),
    });
    scene.tour = tour;
    districtNav = installDistrictNav(scene, {
      getP: () => sketchP,
      setCamera: (cam, opts) => setSceneCamera(cam, { fromNav: true, ...(opts || {}) }),
      getTour: () => tour,
    });
    scene.districtNav = districtNav;
    scene.catalog = installSignalCatalog(scene, {
      onSelect: (actor) => {
        let legend;
        try {
          const sigs = Array.isArray(actor.signal) ? actor.signal.map((s) => scene.sig(s)) : scene.sig(actor.signal);
          legend = actor.legend(sigs, scene);
        } catch (e) {
          legend = { title: actor.id, text: String(e.message || e) };
        }
        if (scene.inspector) scene.inspector.showActor(actor, legend);
        // Frame the actor's district when possible
        let stop = TOUR_STOPS.find((s) => s.id === actor.district);
        if (!stop && actor.district === 'sky') stop = TOUR_STOPS.find((s) => s.fullLot);
        if (!stop) stop = TOUR_STOPS.find((s) => s.id === 'stages');
        if (stop && sketchP) {
          if (actor.id === 'water_tower') {
            const A = scene.ANCHORS.waterTower;
            const kf = fitScale(sketchP);
            setSceneCamera(clampCamera(sketchP, { cx: A.x - 40, cy: A.y + 60, k: kf * 2.2 }), { fromNav: true });
          } else {
            setSceneCamera(tourCamera(sketchP, stop), { fromNav: true });
          }
        }
      },
    });
    if (scene.catalog) scene.catalog.render();
    // Sync district-nav highlight with the default framing
    if (districtNav && useHomeView()) {
      const phone = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 1100px)').matches;
      const i = TOUR_STOPS.findIndex((s) => phone ? s.id === 'stages' : s.id === 'home');
      if (i >= 0) districtNav.syncActive(i);
    }
    // Fresh load always starts at defaultCamera for this viewport — never a leftover crop.
    applyDefaultCamera(p);
    // §7: ?district=<stop id> overrides default framing (stages / street / gate / … / full)
    try {
      const dParam = params.get('district');
      if (dParam && districtNav && useHomeView()) {
        const i = TOUR_STOPS.findIndex((s) => s.id === dParam);
        if (i >= 0) districtNav.go(i);
      }
    } catch (_) { /* ignore */ }
    // §7: ?signal=<actor id or signal id> pins the inspector (after framing so it can re-frame)
    try {
      const sParam = params.get('signal');
      if (sParam && scene.catalog && typeof scene.catalog.selectById === 'function') {
        scene.catalog.selectById(sParam);
      }
    } catch (_) { /* ignore */ }
    fit(p);
    installTouch(p, c.elt);
    installZoomChrome(p);
    scene.pauseCtl = installPause(scene);
    scene.exploreCtl = installExplore(scene, { canvas: c.elt, getTour: () => tour });
    // Shell layout can settle after first paint; ResizeObserver re-sizes to the real viewport.
    const vp = document.getElementById('viewport');
    if (vp && typeof ResizeObserver !== 'undefined') {
      let last = `${w}x${h}`;
      const ro = new ResizeObserver(() => {
        if (!sketchP) return;
        const next = viewportSize();
        const key = `${next.w}x${next.h}`;
        if (key === last) return;
        last = key;
        resizeSketch(sketchP);
      });
      ro.observe(vp);
    }
    // bfcache restore: drop any frozen camera from the previous visit
    window.addEventListener('pageshow', (e) => {
      if (!e.persisted || !sketchP) return;
      applyDefaultCamera(sketchP);
      fit(sketchP);
    });
  };

  p.windowResized = () => { resizeSketch(p); syncDrawLoop(p); };

  p.draw = () => {
    let t;
    if (scene.frozenTime != null) {
      t = scene.frozenTime;
      scene._ambientWall = p.millis() / 1000;
    } else {
      // Jump-free ambient clock: only advances while visible and not paused (§6).
      const wall = p.millis() / 1000;
      if (scene._ambientT == null) scene._ambientT = 0;
      if (scene._ambientWall == null) scene._ambientWall = wall;
      const hidden = typeof document !== 'undefined' && document.hidden;
      if (!scene.paused && !hidden) scene._ambientT += Math.max(0, wall - scene._ambientWall);
      scene._ambientWall = wall;
      t = scene._ambientT;
    }
    scene.hour = scene.frozenHour != null ? scene.frozenHour : pacificHour();
    scene.isNight = scene.hour < 6 || scene.hour >= 19.5;
    ensureLot(p);
    scene.hits.length = 0;
    fit(p);   // every frame: the camera can be set (recorder, pinch) or cleared (double-tap, step with no camera) between frames

    p.background(16, 20, 22);
    p.push();
    p.translate(view.ox, view.oy);
    p.scale(view.k);
    // sky first (the weather actor paints it), then the lot, then everything else in district order
    for (const a of ACTORS) if (a.layer === 'sky') safeDraw(a, p, t);
    p.image(lotBuffer, 0, 0);
    for (const a of ACTORS) if (a.layer !== 'sky' && a.layer !== 'front') safeDraw(a, p, t);
    for (const a of ACTORS) if (a.layer === 'front') safeDraw(a, p, t);
    p.pop();

    // hover: the recorder's forced point, a finger's pinned tap, or the mouse
    const hit = currentHit(p);
    if (hit !== scene.hovered) {
      scene.hovered = hit;
      if (hit) showLegend(hit); else legendEl.style.display = 'none';
    }
  };

  scene.requestDraw = () => { if (sketchP) sketchP.redraw(); };
  scene.syncDrawLoop = () => syncDrawLoop(p);
  document.addEventListener('visibilitychange', () => syncDrawLoop(p));
  // After setup settles, honor initial pause / reduced-motion without spinning the loop.
  queueMicrotask(() => syncDrawLoop(p));
};

/** §6: noLoop while paused or tab-hidden; redraw on demand. Recorder step() still forces frames. */
function syncDrawLoop(p) {
  if (!p || typeof p.noLoop !== 'function') return;
  const hidden = typeof document !== 'undefined' && document.hidden;
  const freeze = !!scene.paused || hidden;
  if (freeze) {
    p.redraw();
    p.noLoop();
  } else {
    p.loop();
  }
}

function safeDraw(a, p, t) {
  try { a.draw(p, t, scene); } catch (e) { if (!a._errored) { console.error('actor draw failed', a.id || a.signal, e); a._errored = true; } }
}

function fit(p) {
  if (scene.camera) {
    const { cx, cy, k } = scene.camera;
    view = { k, ox: p.width / 2 - cx * k, oy: p.height / 2 - cy * k };
    return;
  }
  const k = Math.min(p.width / W, p.height / H);
  view = { k, ox: (p.width - W * k) / 2, oy: (p.height - H * k) / 2 };
}

// ------------------------------------------------------------------ boot
const params = new URLSearchParams(location.search);
if (params.has('t')) scene.frozenTime = Number(params.get('t'));
if (params.has('hour')) scene.frozenHour = Number(params.get('hour'));
if (params.has('date')) scene.today = params.get('date');
if (params.has('story')) document.body.classList.add('story');
if (params.has('bare')) document.body.classList.add('bare');
scene.card = (on) => document.getElementById('card').classList.toggle('on', !!on);
// Captions are recorder-driven; allow only a tiny HTML subset (em/strong/br) after escaping.
function safeCaptionHtml(text) {
  let s = escHtml(text);
  s = s.replace(/&lt;(\/?)(em|strong)&gt;/gi, (_, slash, tag) => `<${slash}${tag.toLowerCase()}>`);
  s = s.replace(/&lt;br\s*\/?&gt;/gi, '<br>');
  return s;
}
scene.caption = (text, pos) => {
  const el = document.getElementById('caption');
  el.className = pos === 'bottom' ? 'bottom' : 'top';
  el.innerHTML = text ? '<span>' + safeCaptionHtml(text) + '</span>' : '';
};

timeline = installTimeline(scene, { onChange: (signals, info) => { applySignals(signals, info); } });
installAbout(scene);   // the '?' button and its panel; index.html's CSS hides them in story and bare modes
installNumbers(scene); // live numbers list: same facts as tap/hover, no canvas required
// the first-visit card: once per browser; ?intro=1 forces it, ?intro=0 suppresses it
scene.intro = installIntro(scene, { force: params.get('intro') === '1', suppress: params.get('intro') === '0' });
loadSignals().catch(e => {
  console.error(e);
  document.getElementById('idx').textContent = 'could not load data/signals.json (' + e.message + '). Serve the repo root over http.';
}).finally(() => {
  new p5(sketch);
  setInterval(() => loadSignals().catch(console.error), REFRESH_MS);
});

// expose for tests and screenshots. scene.step(t, hour, camera, mouse) sets the frozen clock and camera,
// then resolves after the next painted frame, so a recorder can capture frame by frame.
scene.step = (t, hour, camera, mouse) => new Promise((resolve) => {
  scene.frozenTime = t;
  if (hour != null) scene.frozenHour = hour;
  scene.camera = camera || null;
  userFramed = !!camera;
  // a recorder never wants the real mouse: no hover point means no hover at all
  scene.forceMouse = mouse || { x: -1e9, y: -1e9 };
  if (sketchP && typeof sketchP.redraw === 'function') sketchP.redraw();
  requestAnimationFrame(() => requestAnimationFrame(resolve));
});
scene.ready = () => Object.keys(scene.signals).length > 0 && lotBuffer != null;
// Expose the scene for local captures/recorders. On the published host, require ?debug=1 so a
// drive-by XSS cannot drive the lot without an explicit opt-in.
(function exposeSign() {
  const host = (typeof location !== 'undefined' && location.hostname) || '';
  const local = host === 'localhost' || host === '127.0.0.1' || host === '' || host === '[::1]';
  const debug = params.get('debug') === '1';
  if (local || debug) window.__sign = scene;
})();
