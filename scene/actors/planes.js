// Two planes over the hills = UK (BFI inward spend) and Georgia (productions) as context regions.
// Not a claim that production is leaving LA. Wingspan = population(sig, 40, 90).
// Signals: bfi_inward_spend sizes the London-tagged plane and georgia_productions sizes the Atlanta-tagged plane.
// Both climb a diagonal from the airfield on the near hill toward the top right of the sky band; tags are
// region labels only. Missing signal → parked gray silhouette. Stale goes gray through scene.paint.

import { population, fmt, periodLabel, dashVersus } from '../scale.js';
import { range } from '../rng.js';
import { useDisplay } from '../fonts.js';

const MIN = 40, MAX = 90;                                   // wingspan at takeoff, logical px
const LOOP = 60;                                            // seconds of t per climb
const RECEDE = 0.4;                                         // the drawn wingspan shrinks by this much by the top of the climb
const TRAIL_LEN = 170, TRAIL_N = 12;                        // contrail: length along the track, segments
const SPEND_ID = 'georgia_spend';
// Each lane is its own diagonal from the airfield on the hill to the top right of the band. The tracks are
// set so a 90 px plane at takeoff (the lower wing tip sits about 50 px below the center once the shape is
// rotated onto the heading, plus 3 px of bob) and a nose at the top stay inside the sky band (y < 430,
// x < 2400). The parked silhouettes sit LDN left and ATL right with their captions running right, 100 px
// apart, so neither caption crosses the other silhouette and their hover regions do not overlap.
const LANES = {
  ldn: { name: 'London',  tag: 'LDN', from: { x: 1500, y: 376 }, to: { x: 2372, y: 120 }, bob: 0,   poster: 0, dark: true,  ground: { x: 1478, y: 392 }, unit: 'quarters', window: 12 },
  atl: { name: 'Atlanta', tag: 'ATL', from: { x: 1540, y: 372 }, to: { x: 2372, y: 150 }, bob: 2.1, poster: 2, dark: false, ground: { x: 1592, y: 410 }, unit: 'years',    window: 10 },
};
for (const lane of Object.values(LANES)) {
  lane.heading = Math.atan2(lane.to.y - lane.from.y, lane.to.x - lane.from.x);
  lane.length = Math.hypot(lane.to.x - lane.from.x, lane.to.y - lane.from.y);
}
const GROUND_SPAN = 46;                                     // wingspan of a grounded silhouette
// stable hover extras: scene.js compares a pinned tap's extra by identity across frames
const EXTRA = { ldn: { which: 'ldn' }, atl: { which: 'atl' } };
// Local colors: no aircraft entries in the palette. Body is PALETTE.truck (near white), wings PALETTE.stageWall.
const BEACON_ON = '#ff5a4a', BEACON_OFF = '#7a2a24';

export default {
  id: 'planes',
  signal: ['bfi_inward_spend', 'georgia_productions'],
  district: 'sky',
  layer: 'mid',
  sigs: { ldn: null, atl: null },
  size: { ldn: null, atl: null },     // wingspan at takeoff, or null when the plane is grounded
  phase: { ldn: 0, atl: 0.5 },        // 0..1 along the loop at t = 0

  init(scene) {},

  // called on every signals.json load; the two phases come from the child RNG (half a loop apart, give or take)
  update(sigs, scene) {
    const rng = scene.childRng('planes');
    const list = Array.isArray(sigs) ? sigs : [sigs];
    this.sigs = { ldn: list[0] || null, atl: list[1] || null };
    for (const k of ['ldn', 'atl']) {
      const s = this.sigs[k];
      this.size[k] = (s && s.value != null) ? population(s, MIN, MAX, null) : null;
    }
    const p0 = range(rng, 0, 1);
    this.phase = { ldn: p0, atl: (p0 + 0.5 + range(rng, -0.08, 0.08) + 1) % 1 };
  },

  draw(p, t, scene) {
    const C = scene.PALETTE;
    for (const k of ['ldn', 'atl']) {
      const lane = LANES[k], sig = this.sigs[k], span = this.size[k];
      const extra = EXTRA[k];
      if (span == null) {
        // grounded: a small gray silhouette on the hill, nose to the runway, and the note beside it
        const g = lane.ground;
        plane(p, g.x, g.y, -0.12, GROUND_SPAN, lane.tag, { body: C.stale, wing: C.stale, fin: C.stale, tag: C.staleLite, windows: null }, 1);
        // wheel chocks under a grounded silhouette
        p.noStroke(); p.fill(C.inkSoft);
        p.rect(g.x - 10, g.y + 8, 6, 3, 1);
        p.rect(g.x + 4, g.y + 8, 6, 3, 1);
        p.fill(C.inkSoft); useDisplay(p, 15); p.textAlign(p.LEFT, p.CENTER);
        p.text(`${lane.tag} no data`, g.x + GROUND_SPAN * 0.6, g.y + 1);
        p.textAlign(p.LEFT, p.TOP);
        scene.hit(g.x - GROUND_SPAN * 0.6, g.y - 14, GROUND_SPAN * 1.2 + 70, 28, this, extra);
        continue;
      }
      const u = ((t / LOOP) + this.phase[k]) % 1;
      const alpha = Math.max(0, Math.min(1, u / 0.06, (1 - u) / 0.08));
      const pos = along(lane, u, t);
      const drawn = span * (1 - RECEDE * u);
      const stale = !!sig.stale;
      const body = stale ? C.staleLite : (scene.isNight ? mix(C.truck, C.skyNight, 0.3) : C.truck);
      const cols = {
        body,
        wing: scene.paint(sig, scene.isNight ? mix(C.stageWall, C.skyNight, 0.3) : C.stageWall),
        fin: scene.paint(sig, C.poster[lane.poster]),
        tag: stale ? C.staleLite : (lane.dark ? C.paper : C.ink),
        windows: drawn >= 56 ? (stale ? C.staleLite : C.windowBlue) : null,
      };

      // contrail: short segments back along the track, fading with distance; starts once the plane has left the ground
      if (alpha > 0.02 && u > 0.03) {
        const trail = TRAIL_LEN * Math.min(1, (u - 0.03) / 0.2) * (1 - RECEDE * u);
        const du = trail / lane.length / TRAIL_N;
        const [r, g, b] = rgb(stale ? C.staleLite : C.paper);
        let prev = pos;
        for (let i = 1; i <= TRAIL_N; i++) {
          const uu = u - i * du;
          if (uu <= 0.01) break;
          const q = along(lane, uu, t);
          const a = alpha * 0.7 * (1 - i / (TRAIL_N + 1));
          p.stroke(r, g, b, Math.round(a * 255)); p.strokeWeight(Math.max(0.8, 2.2 * (1 - i / TRAIL_N)));
          p.line(prev.x, prev.y, q.x, q.y);
          prev = q;
        }
        p.noStroke();
      }

      if (alpha > 0.02) {
        plane(p, pos.x, pos.y, lane.heading, drawn, lane.tag, cols, alpha);
        if (scene.isNight) {
          p.noStroke(); p.fill(hexA(Math.floor(t * 2 + (k === 'atl' ? 1 : 0)) % 2 ? BEACON_ON : BEACON_OFF, alpha));
          p.ellipse(pos.x - drawn * 0.36, pos.y - drawn * 0.16, 4, 4);
        }
      }
      // hover region: the plane plus its tail tag (clipped to the sky band)
      const hx0 = Math.max(0, pos.x - drawn * 0.6), hx1 = Math.min(scene.W, pos.x + drawn * 0.6);
      const hy0 = Math.max(0, pos.y - drawn * 0.55), hy1 = Math.min(scene.DISTRICTS.sky.h, pos.y + drawn * 0.5);
      if (hx1 > hx0 && hy1 > hy0) scene.hit(hx0, hy0, hx1 - hx0, hy1 - hy0, this, extra);
    }
  },

  legend(sigs, scene, extra) {
    const k = extra && extra.which === 'atl' ? 'atl' : 'ldn';
    const lane = LANES[k];
    const list = Array.isArray(sigs) ? sigs : [sigs];
    const sig = k === 'ldn' ? list[0] : list[1];
    const title = `${lane.name} plane`;
    const context = ' A bigger plane means more. Shown for context, not as productions leaving LA; not part of the SIGN index.';
    if (!sig || sig.value == null) {
      return { title: `${title}: grounded`, text: `No ${k === 'ldn' ? 'UK' : 'Georgia'} production figures yet, so the plane waits on the hill.`, sig: sig || null };
    }
    if (k === 'ldn') {
      return {
        title,
        text: `The UK drew ${money('£', sig.value, sig.unit)} of film and high-end TV production spending from abroad in the year to ${yearTo(sig)}${dashVersus(sig)}.${context}`,
        sig,
      };
    }
    const spend = scene && typeof scene.sig === 'function' ? scene.sig(SPEND_ID) : null;
    const spendText = spend && spend.value != null ? `, spending ${money('$', spend.value, spend.unit)}` : '';
    return {
      title,
      text: `Georgia hosted ${fmt(sig.value)} film and TV productions in its ${fiscalLabel(sig)} fiscal year${spendText}${dashVersus(sig)}.${context}`,
      sig,
    };
  },
};

// a point on a lane's track at u (0..1), with a gentle bob that is a function of t only
function along(lane, u, t) {
  return {
    x: lane.from.x + (lane.to.x - lane.from.x) * u,
    y: lane.from.y + (lane.to.y - lane.from.y) * u + Math.sin(t * 0.9 + lane.bob) * 3,
  };
}

// ---- one plane, seen from above and behind as it climbs. (x, y) is the center, ang the heading, span the wingspan.
// Everything is primitives so the file has no assets; a sprite replaces this later.
function plane(p, x, y, ang, span, tag, cols, alpha) {
  const W = span, L = W * 0.78;
  const col = (hex) => hexA(hex, alpha);
  p.push();
  p.translate(x, y);
  p.rotate(ang);
  p.noStroke();
  // soft under-shadow (reads at district zoom)
  p.fill(26, 32, 34, Math.round(32 * alpha));
  p.ellipse(0, 0.06 * W, W * 0.9, 0.18 * W);
  // wings, swept back, then the tailplane
  p.fill(col(cols.wing));
  p.quad(0.10 * W, -0.02 * W, -0.16 * W, -0.5 * W, -0.25 * W, -0.5 * W, -0.14 * W, 0.02 * W);
  p.quad(0.10 * W, 0.02 * W, -0.16 * W, 0.5 * W, -0.25 * W, 0.5 * W, -0.14 * W, -0.02 * W);
  p.quad(-0.30 * W, 0, -0.40 * W, -0.17 * W, -0.46 * W, -0.17 * W, -0.40 * W, 0);
  p.quad(-0.30 * W, 0, -0.40 * W, 0.17 * W, -0.46 * W, 0.17 * W, -0.40 * W, 0);
  // fuselage + nose
  p.fill(col(cols.body)); p.ellipse(-0.03 * W, 0, L, 0.12 * W);
  p.ellipse(0.34 * W, 0, 0.14 * W, 0.09 * W);
  if (cols.windows) {
    p.fill(col(cols.windows));
    for (let i = 0; i < 4; i++) p.ellipse(0.16 * W - i * 0.07 * W, -0.01 * W, 0.025 * W, 0.025 * W);
  }
  // tail fin, rising from the rear of the fuselage, in the destination color, with the tag on a label at its tip
  p.fill(col(cols.fin)); p.triangle(-0.28 * W, 0, -0.44 * W, 0, -0.47 * W, -0.22 * W);
  const ts = Math.max(15, 0.18 * W), lw = ts * 2.6, lh = ts * 1.4;
  const lx = -0.47 * W - lw * 0.5, ly = -0.22 * W - lh - 1;
  p.rect(lx, ly, lw, lh, 2);
  p.fill(col(cols.tag));
  useDisplay(p, ts); p.textAlign(p.CENTER, p.CENTER);
  p.text(tag, lx + lw / 2, ly + lh / 2 + 0.5);
  p.textAlign(p.LEFT, p.TOP);
  p.pop();
}

// 'FY2026' or '2026' or a raw period; the legend says "fiscal <year>" so a leading FY is dropped
// "June 2026" for a rolling year ending 2026Q2; other periods as labelled
function yearTo(sig) {
  const m = /^(\d{4})Q([1-4])$/.exec(String(sig.period || ''));
  return m ? `${['March', 'June', 'September', 'December'][Number(m[2]) - 1]} ${m[1]}` : periodLabel(sig);
}

function fiscalLabel(sig) {
  const raw = periodLabel(sig) || String(sig.period || '');
  return raw.replace(/^FY\s*/i, '');
}

// money with the unit respected: a feed may hand over pounds, millions of pounds or billions
function money(sym, v, unit = '') {
  if (v == null || !Number.isFinite(Number(v))) return sym + '?';
  let n = Number(v);
  const u = String(unit).toLowerCase();
  if (/billion|\bbn\b/.test(u)) n *= 1e9;
  else if (/million|\bmn\b|\bm\b/.test(u)) n *= 1e6;
  else if (/thousand|\bk\b/.test(u)) n *= 1e3;
  const a = Math.abs(n);
  if (a >= 1e9) return sym + (n / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return sym + Math.round(n / 1e6).toLocaleString('en-US') + 'M';
  return sym + Math.round(n).toLocaleString('en-US');
}

function rgb(hex) {
  const c = hex.replace('#', '');
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}
function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  const h = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${h(A[0] + (B[0] - A[0]) * t)}${h(A[1] + (B[1] - A[1]) * t)}${h(A[2] + (B[2] - A[2]) * t)}`;
}
function hexA(hex, alpha) {
  if (alpha >= 1) return hex.length > 7 ? hex.slice(0, 7) : hex;
  return hex.slice(0, 7) + Math.round(Math.max(0, alpha) * 255).toString(16).padStart(2, '0');
}
