// The festival tent in the park = feature submissions to Sundance (sundance_features, annual, direction 0).
// A striped tent (PALETTE.lamp roof with paper stripes, a dark doorway, a flag on the pole) stands at
// ANCHORS.tent, drawn at 0.8x to 1.2x with the feature count's percentile inside its trailing 10 festivals.
// Outside it, along ANCHORS.tentQueue, one figure waits per 1,000 total submissions (sundance_submissions,
// read via scene.sig: 16 figures for 16,201), the head of the line under the door, snaking right then back
// left. The banner over the door reads the festival year from sig.period ("SUNDANCE 2026"). The legend also
// carries sundance_selections. Everything changes once a year, in December, and the legend says so.
// No data: a gray tent with a "NO DATA" banner and an empty lane that names the missing signal.

import { norm, pct, periodLabel, provenance } from '../scale.js';
import { range, pick } from '../rng.js';
import { useDisplay } from '../fonts.js';

const SUBS_ID = 'sundance_submissions', SEL_ID = 'sundance_selections';
const PER_FIGURE = 1000;
const BASE_W = 196, BASE_H = 140;     // the tent at 1.0x; readable at park district zoom
const S_MIN = 0.8, S_MAX = 1.2;
const DEFAULT_WINDOW = 10;
const STRIPES = 7;                    // wedges from the apex; the odd ones are paper
const PITCH = 36, ROW_DY = 42;        // queue spacing for FIG 2.35 silhouettes
const LEG = '#3a3f43';                // trouser color shared with crews.js
const ROPE = '#6b5d45';               // guy ropes and the queue rope; not in the palette

export default {
  id: 'tent',
  signal: 'sundance_features',
  district: 'park',
  layer: 'mid',
  sig: null,
  scale: 1,
  year: '',
  q: null,          // figures in the queue, or null when submissions are not loaded
  capped: false,    // true when the lane could not hold every figure
  figures: [],

  init(scene) {},

  // called on every signals.json load; who stands where, and what they carry, comes from the child RNG
  update(sig, scene) {
    const rng = scene.childRng('tent');
    const A = scene.ANCHORS.tent, Q = scene.ANCHORS.tentQueue, C = scene.PALETTE;
    this.sig = sig;
    const live = sig && sig.value != null;
    const n = live ? norm(sig, null) : null;
    this.scale = n == null ? 1 : Math.round((S_MIN + (S_MAX - S_MIN) * n) * 100) / 100;
    this.year = yearOf(sig);

    const subs = live && typeof scene.sig === 'function' ? scene.sig(SUBS_ID) : null;
    this.q = subs && subs.value != null ? Math.max(0, Math.round(Number(subs.value) / PER_FIGURE)) : null;

    // the lane: row 0 runs right from under the door, row 1 comes back left along the front
    const cx = A.x + A.w / 2;
    const row0 = Q.y + 22, row1 = row0 + ROW_DY;
    const slots = [];
    for (let x = cx; x <= Q.x + Q.w - 8; x += PITCH) slots.push({ x, y: row0, row: 0 });
    for (let x = Q.x + Q.w - 8; x >= Q.x + 10; x -= PITCH) slots.push({ x, y: row1, row: 1 });
    const count = Math.min(this.q ?? 0, slots.length);
    this.capped = (this.q ?? 0) > slots.length;
    this.figures = slots.slice(0, count).map((s, i) => ({
      x: s.x + range(rng, -1.5, 1.5),
      y: s.y + range(rng, -1, 1),
      row: s.row,
      phase: range(rng, 0, Math.PI * 2),
      skin: pick(rng, C.skin),
      shirt: pick(rng, C.shirt),
      prop: pick(rng, ['none', 'badge', 'paper', 'none', 'coffee']),
    }));
  },

  draw(p, t, scene) {
    const A = scene.ANCHORS.tent, Q = scene.ANCHORS.tentQueue, C = scene.PALETTE;
    const sig = this.sig;
    const live = sig && sig.value != null;
    const stale = live && !!sig.stale;
    const paint = (hex) => live ? scene.paint(sig, hex) : C.stale;
    const white = live && !stale ? C.paper : C.staleLite;
    const s = this.scale;
    const cx = A.x + A.w / 2, baseY = A.y + A.h;
    const w = BASE_W * s, h = BASE_H * s;
    const apexY = baseY - h;
    p.noStroke();

    // ground shadow, guy ropes and pegs
    p.fill(26, 32, 34, 35); p.ellipse(cx + 8, baseY + 4, w * 1.05, 18);
    p.stroke(ROPE); p.strokeWeight(1.2);
    p.line(cx - w / 2, baseY - 10, cx - w / 2 - 16, baseY + 6);
    p.line(cx + w / 2, baseY - 10, cx + w / 2 + 16, baseY + 6);
    p.noStroke(); p.fill(C.inkSoft);
    p.rect(cx - w / 2 - 18, baseY + 3, 4, 6); p.rect(cx + w / 2 + 14, baseY + 3, 4, 6);

    // the roof: one red triangle, paper wedges from the apex, a shaded right half
    p.fill(paint(C.lamp)); p.triangle(cx - w / 2, baseY, cx + w / 2, baseY, cx, apexY);
    p.fill(white);
    const sw = w / STRIPES;
    for (let k = 1; k < STRIPES; k += 2) {
      const x0 = cx - w / 2 + k * sw;
      p.triangle(cx, apexY, x0, baseY, x0 + sw, baseY);
    }
    p.fill(0, 0, 0, 22); p.triangle(cx, apexY, cx + w / 2, baseY, cx, baseY);
    // a scalloped hem along the base
    p.fill(paint(C.lamp));
    for (let x = cx - w / 2 + 6; x < cx + w / 2; x += 12) p.ellipse(x, baseY, 12, 8);

    // doorway (warm inside after dark) and the banner over it
    const dw = 34 * s, dh = 46 * s;
    p.fill(scene.isNight && live ? scene.paint(sig, C.windowWarm) : paint(C.ink));
    p.rect(cx - dw / 2, baseY - dh, dw, dh, 6 * s);
    if (scene.isNight && live) { p.fill(paint(C.ink)); p.rect(cx - dw / 2 + 3, baseY - dh + 3, dw - 6, dh - 3, 4 * s); }
    const bw = w * 0.78, bh = Math.max(36, 32 * s), by = baseY - dh - 8 * s - bh;
    p.fill(white); p.rect(cx - bw / 2, by, bw, bh, 3);
    p.fill(live ? scene.paint(sig, C.ink) : C.stale);
    useDisplay(p); p.textStyle(p.BOLD); p.textSize(Math.max(34, 30 * s)); p.textAlign(p.CENTER, p.CENTER);
    p.text(live ? ('SUNDANCE' + (this.year ? ' ' + this.year : '')) : 'NO DATA', cx, by + bh / 2 + 0.5);
    p.textStyle(p.NORMAL); p.textAlign(p.LEFT, p.TOP);

    // pole and flag on the apex, fluttering
    const poleH = 26 * s;
    p.fill(C.inkSoft); p.rect(cx - 1, apexY - poleH, 2, poleH + 2);
    const fl = Math.sin(t * 3) * 3, fl2 = Math.sin(t * 3 + 1) * 2;
    p.fill(paint(C.tower));
    p.triangle(cx + 1, apexY - poleH, cx + 1, apexY - poleH + 12 * s, cx + 1 + 18 * s + fl, apexY - poleH + 6 * s + fl2);

    // the queue: a rope with stanchions along the front of row 0, then the figures (row 1 first so row 0 overlaps it)
    if (this.figures.length) {
      const row0 = this.figures.filter(f => f.row === 0);
      const last = row0[row0.length - 1];
      const ry = Q.y + 22 + 8;
      p.stroke(ROPE); p.strokeWeight(1);
      p.line(cx - 8, ry, last.x + 8, ry);
      p.noStroke(); p.fill(C.inkSoft);
      for (let x = cx - 8; x <= last.x + 8; x += 56) { p.rect(x - 1, ry - 8, 2, 10); p.ellipse(x, ry - 9, 5, 5); }
      for (let i = this.figures.length - 1; i >= 0; i--) {
        const f = this.figures[i];
        const sway = Math.sin(t * 1.3 + f.phase) * 0.6, bob = Math.sin(t * 2 + f.phase) * 0.8;
        figure(p, f.x + sway, f.y + bob, f.skin, scene.paint(sig, f.shirt), f.prop, stale, C);
      }
    } else {
      p.fill(C.inkSoft); useDisplay(p, 17); p.textAlign(p.LEFT, p.TOP);
      const note = !sig ? 'sundance_features is not in signals.json yet'
        : !live ? 'sundance_features has no value yet'
        : this.q == null ? 'queue: sundance_submissions not loaded'
        : 'queue: under 500 submissions';
      p.text(note, Q.x + 12, Q.y + 8);
    }

    // hover: the tent with its flag, and the lane
    scene.hit(A.x - 24, A.y - 44, A.w + 48, A.h + 48, this);
    scene.hit(Q.x, Q.y, Q.w, Q.h, this);
  },

  legend(sig, scene) {
    if (!sig) {
      return { title: 'Festival tent', text: 'Sundance features not loaded — gray tent, empty lane. Changes once a year, in December.' };
    }
    if (sig.value == null) {
      return { title: 'Festival tent', text: 'No Sundance feature count yet — gray tent, empty lane. Changes once a year, in December.', source: provenance(sig) };
    }
    const subs = scene && typeof scene.sig === 'function' ? scene.sig(SUBS_ID) : null;
    const sel = scene && typeof scene.sig === 'function' ? scene.sig(SEL_ID) : null;
    const year = this.year || yearOf(sig) || periodLabel(sig);
    const q = this.q;
    const subsText = subs && subs.value != null
      ? `${count(subs.value)} submissions to Sundance ${year}, ${count(sig.value)} features`
      : `${count(sig.value)} feature submissions to Sundance ${year} (total submissions not loaded)`;
    const selText = sel && sel.value != null ? `, ${count(sel.value)} selected` : '';
    const cap = this.capped ? ` (the lane holds ${this.figures.length})` : '';
    const win = sig.window_n || DEFAULT_WINDOW;
    return {
      title: q != null ? `${q} in the queue` : 'Festival tent',
      text: `${subsText}${selText} (Sundance). One figure per ${PER_FIGURE.toLocaleString('en-US')} submissions${cap}.` +
            ` Tent at ${this.scale}× (${pct(sig.normalized)} of the last ${win} festivals). Changes once a year, in December.`,
      source: provenance(sig),
    };
  },
};

// whole counts with thousands grouped: 16,201 and 4,000 read the same way
function count(v) { return v == null ? 'no data' : Math.round(Number(v)).toLocaleString('en-US'); }

// the festival year from the period: '2026', '2026-01' or '2026-01-22' all give 2026
function yearOf(sig) {
  const m = /(\d{4})/.exec(sig && sig.period ? String(sig.period) : '');
  return m ? m[1] : '';
}

// ---- one figure in the line, feet at (x, y). Same silhouette grammar as crews/marquee.
function figure(p, x, y, skin, shirt, prop, stale, C) {
  const s = 2.35;
  p.noStroke();
  p.fill(26, 32, 34, 40); p.ellipse(x, y + 6 * s, 14 * s, 4.5 * s);
  p.fill(stale ? '#9aa1a3' : LEG);
  p.rect(x - 5 * s, y - 4 * s, 3.8 * s, 11 * s, 1);
  p.rect(x + 1.2 * s, y - 4 * s, 3.8 * s, 11 * s, 1);
  p.fill(stale ? '#9aa1a3' : shirt);
  p.rect(x - 6 * s, y - 20 * s, 12 * s, 16 * s, 2);
  p.fill(stale ? '#b9bec0' : skin);
  p.rect(x - 8.5 * s, y - 18 * s, 2.8 * s, 10 * s, 1);
  p.rect(x + 5.8 * s, y - 18 * s, 2.8 * s, 10 * s, 1);
  p.ellipse(x, y - 25 * s, 10.5 * s, 10.5 * s);
  p.fill(stale ? '#7a8084' : '#1a2022');
  p.arc(x, y - 26 * s, 10.5 * s, 7 * s, Math.PI, 0, p.CHORD);
  if (prop === 'badge') { p.fill(stale ? '#b9bec0' : C.paper); p.rect(x - 2.5 * s, y - 12 * s, 5 * s, 6 * s); }
  if (prop === 'paper') { p.fill(stale ? '#b9bec0' : C.paper); p.rect(x + 4 * s, y - 16 * s, 6 * s, 9 * s); }
  if (prop === 'coffee') { p.fill(stale ? '#9aa1a3' : C.stuccoDk); p.rect(x + 5 * s, y - 14 * s, 4 * s, 5 * s); }
}
