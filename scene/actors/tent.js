// The festival tent in the park = feature submissions to Sundance (sundance_features, annual, direction 0).
// A striped tent (PALETTE.lamp roof with paper stripes, a dark doorway, a flag on the pole) stands at
// ANCHORS.tent, drawn at 0.8x to 1.2x with the feature count's percentile inside its trailing 10 festivals.
// Outside it, along ANCHORS.tentQueue, one figure waits per 1,000 total submissions (sundance_submissions,
// read via scene.sig: 16 figures for 16,201), the head of the line at the door, snaking right and back in
// rows of up to eight. The banner over the door reads the festival year from sig.period ("SUNDANCE 2026"). The legend also
// carries sundance_selections. Everything changes once a year, in December, and the legend says so.
// No data: a gray tent with a "NO DATA" banner and an empty lane that names the missing signal.

import { norm, periodLabel } from '../scale.js';
import { range, pick } from '../rng.js';
import { useDisplay } from '../fonts.js';

const SUBS_ID = 'sundance_submissions', SEL_ID = 'sundance_selections';
const PER_FIGURE = 1000;
const BASE_W = 196, BASE_H = 140;     // the tent at 1.0x; readable at park district zoom
const S_MIN = 0.8, S_MAX = 1.2;
const STRIPES = 7;                    // wedges from the apex; the odd ones are paper
const FIG = 1.25;                     // the crews' scale: shorter than the tent door
const PITCH = 26, ROW_DY = 40;        // ROW_DY clears a whole figure, so every head in the back row shows
const ROW_MAX = 8, ROWS_MAX = 3;
const ROW0_DY = 42;                   // feet of the first row below the lane top
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
  perRow: 0,        // figures per row of the folded queue
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

    // the lane: row 0 runs right from the door, row 1 comes back left in front of it, row 2 runs right again.
    // Rows share the figures evenly so the line folds into a compact block instead of trailing across the lawn.
    const cx = A.x + A.w / 2;
    const want = this.q ?? 0;
    const count = Math.min(want, ROW_MAX * ROWS_MAX);
    this.capped = want > count;
    const rows = Math.max(1, Math.ceil(count / ROW_MAX));
    const perRow = Math.ceil(count / rows);
    const slots = [];
    for (let r = 0; r < rows; r++) {
      for (let i = 0; i < perRow; i++) {
        const k = r % 2 === 0 ? i : perRow - 1 - i;
        slots.push({ x: cx + k * PITCH, y: Q.y + ROW0_DY + r * ROW_DY, row: r });
      }
    }
    this.perRow = perRow;
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

    // ground shadow, guy ropes and pegs (short enough to stay on the lawn at the 1.2x tent)
    p.fill(26, 32, 34, 35); p.ellipse(cx + 8, baseY + 4, w * 1.05, 18);
    p.stroke(ROPE); p.strokeWeight(1.2);
    p.line(cx - w / 2, baseY - 10, cx - w / 2 - 8, baseY + 5);
    p.line(cx + w / 2, baseY - 10, cx + w / 2 + 8, baseY + 5);
    p.noStroke(); p.fill(C.inkSoft);
    p.rect(cx - w / 2 - 10, baseY + 2, 4, 6); p.rect(cx + w / 2 + 6, baseY + 2, 4, 6);

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
    const label = live ? ('SUNDANCE' + (this.year ? ' ' + this.year : '')) : 'NO DATA';
    const size = Math.max(34, 30 * s);
    useDisplay(p); p.textStyle(p.BOLD); p.textSize(size); p.textAlign(p.CENTER, p.CENTER);
    const tw = p.textWidth(label);
    if (tw > bw - 16) p.textSize(size * (bw - 16) / tw);   // fit the plate
    p.text(label, cx, by + bh / 2 + 0.5);
    p.textStyle(p.NORMAL); p.textAlign(p.LEFT, p.TOP);

    // pole and flag on the apex, fluttering
    const poleH = 26 * s;
    p.fill(C.inkSoft); p.rect(cx - 1, apexY - poleH, 2, poleH + 2);
    const fl = Math.sin(t * 3) * 3, fl2 = Math.sin(t * 3 + 1) * 2;
    p.fill(paint(C.tower));
    p.triangle(cx + 1, apexY - poleH, cx + 1, apexY - poleH + 12 * s, cx + 1 + 18 * s + fl, apexY - poleH + 6 * s + fl2);

    // the queue, back row first so nearer rows overlap farther ones; a stanchion rope divides each row from the
    // next and stops short of the end where the line turns
    if (this.figures.length) {
      const rows = this.figures[this.figures.length - 1].row + 1;
      const xEnd = cx + (this.perRow - 1) * PITCH;
      for (let r = 0; r < rows; r++) {
        for (const f of this.figures) {
          if (f.row !== r) continue;
          const sway = Math.sin(t * 1.3 + f.phase) * 0.6, bob = Math.sin(t * 2 + f.phase) * 0.8;
          figure(p, f.x + sway, f.y + bob, f.skin, scene.paint(sig, f.shirt), f.prop, stale, C);
        }
        if (r === rows - 1) break;
        const ry = Q.y + ROW0_DY + r * ROW_DY + 9;
        const x0 = r % 2 === 0 ? cx - 12 : cx + PITCH / 2, x1 = r % 2 === 0 ? xEnd - PITCH / 2 : xEnd + 12;
        p.stroke(ROPE); p.strokeWeight(1);
        p.line(x0, ry, x1, ry);
        p.noStroke(); p.fill(C.inkSoft);
        const posts = Math.max(1, Math.round((x1 - x0) / 52));
        for (let j = 0; j <= posts; j++) {
          const x = x0 + (x1 - x0) * j / posts;
          p.rect(x - 1, ry - 8, 2, 10); p.ellipse(x, ry - 9, 5, 5);
        }
      }
    } else {
      p.fill(C.inkSoft); useDisplay(p, 17); p.textAlign(p.LEFT, p.TOP);
      const note = !sig ? 'sundance_features is not in signals.json yet'
        : !live ? 'sundance_features has no value yet'
        : this.q == null ? 'queue: sundance_submissions not loaded'
        : 'queue: under 500 submissions';
      p.text(note, A.x, Q.y + 30);
    }

    // hover: the tent at its largest with flag, ropes and pegs, and the lane
    const reachX = BASE_W * S_MAX / 2 + 12, top = baseY - (BASE_H + 26) * S_MAX - 8;
    scene.hit(cx - reachX, top, 2 * reachX, baseY + 10 - top, this);
    scene.hit(Q.x, Q.y, Q.w, Q.h, this);
  },

  legend(sig, scene) {
    if (!sig || sig.value == null) {
      return { title: 'Festival tent', text: 'No Sundance figures yet. The tent changes once a year, in December.', sig: sig || null };
    }
    const subs = scene && typeof scene.sig === 'function' ? scene.sig(SUBS_ID) : null;
    const sel = scene && typeof scene.sig === 'function' ? scene.sig(SEL_ID) : null;
    const year = this.year || yearOf(sig) || periodLabel(sig);
    const lead = subs && subs.value != null
      ? `${count(subs.value)} films were submitted to Sundance ${year}, ${count(sig.value)} of them features`
      : `${count(sig.value)} feature films were submitted to Sundance ${year}`;
    const selText = sel && sel.value != null ? `; ${count(sel.value)} features made the festival` : '';
    return {
      title: `Sundance ${year}`,
      text: `${lead}${selText}. One person in line for every ${PER_FIGURE.toLocaleString('en-US')} submissions; the tent grows with more features.` +
            ' It changes once a year, in December.',
      sig,
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
  const s = FIG;
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
