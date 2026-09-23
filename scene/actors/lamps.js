// Red shooting lamps on the twelve stages = FilmLA on-location shoot days in LA (quarterly, direction +1).
// N of 12 lamps light, N = round(12 x ratio), where ratio is the latest quarter over the mean of the reference-year
// quarters (sig.baseline_ratio), falling back to the quarter's percentile inside its trailing 8 quarters (norm)
// when no baseline exists; clamped to 0..1. Each lit stage has a production truck backed up beside its door,
// colored by FilmLA's category mix (feature = tower teal, TV = lamp red, commercial = stucco, other = ink soft,
// apportioned from filmla_feature_days / filmla_tv_days / filmla_commercial_days / filmla_other_days when they
// are in signals.json; neutral truck white when they are not). A share of the trucks equal to
// filmla_incentive_share fly a small CA pennant. Which stages light, and which trucks carry the pennant, come
// from the child RNG, so the picture is the same for the same JSON. The lot paints every lamp housing in
// lampOff; this actor only paints the lit ones (and their halos, larger and brighter after dark).
// Stale: lit lamps dim to lampOff with a gray ring, halos off, trucks gray. No data: all lamps off and a note
// (also when the feed's first quarter has neither a baseline nor a window to rank it in).
// Registry note: lamps must sit AFTER crews in ACTORS. crews registers the whole district as one hover region and
// hits resolve last-first, so an earlier lamps would never be hoverable; the trade-off is that parked trucks draw
// over crews walking the lane under row 1, which reads as crews passing behind the trucks.

import { norm, pct, periodLabel, provenance } from '../scale.js';
import { range } from '../rng.js';
import { useDisplay } from '../fonts.js';
import { TIER } from '../detail.js';

const STAGES = 12;
const LAMP_DY = 60;                 // lot.js stage(): housing at x + w/2, y + h - 60
const HALO_DAY = 28, HALO_NIGHT = 40;
const CORE = 17;
const HALO_A_DAY = 76, HALO_A_NIGHT = 160;   // halo alpha (0..255)
const BOX = { w: 42, h: 26 };
const CAB = { w: 16, h: 18 };
const DEFAULT_WINDOW = 8;
// category signals, legend order; color keys resolve against scene.PALETTE
const CATS = [
  { key: 'feature',    id: 'filmla_feature_days',    color: 'tower',   name: 'feature' },
  { key: 'tv',         id: 'filmla_tv_days',         color: 'lamp',    name: 'TV' },
  { key: 'commercial', id: 'filmla_commercial_days', color: 'stucco',  name: 'commercial' },
  { key: 'other',      id: 'filmla_other_days',      color: 'inkSoft', name: 'other' },
];
const INCENTIVE_ID = 'filmla_incentive_share';
const PENNANT_POSTER = 2;           // ochre, ink letters (same slot trucks.js uses for ATL)

// latest quarter over the reference-year mean when the feed computed it, else the trailing-window percentile
function ratioOf(sig) {
  if (!sig || sig.value == null) return null;
  let r = null, how = null;
  if (sig.baseline_ratio != null && Number.isFinite(Number(sig.baseline_ratio))) { r = Number(sig.baseline_ratio); how = 'baseline'; }
  else { r = norm(sig, null); how = r == null ? null : 'percentile'; }
  if (r == null) return null;
  return { r: Math.max(0, Math.min(1, r)), how };
}

// n trucks split across the categories that carry a value, largest remainder; null when none carry a value
function apportion(n, weights) {
  const live = weights.filter(w => w.v != null && w.v >= 0);
  const total = live.reduce((s, w) => s + w.v, 0);
  if (!live.length || total <= 0 || n <= 0) return null;
  const exact = live.map(w => ({ key: w.key, q: n * w.v / total }));
  const floors = exact.map(e => ({ key: e.key, n: Math.floor(e.q), rem: e.q - Math.floor(e.q) }));
  let left = n - floors.reduce((s, f) => s + f.n, 0);
  const order = floors.map((f, i) => i).sort((a, b) => floors[b].rem - floors[a].rem || a - b);
  for (const i of order) { if (left <= 0) break; floors[i].n++; left--; }
  return Object.fromEntries(floors.map(f => [f.key, f.n]));
}

function shuffle(rng, arr) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

function rgb(hex) {
  const c = hex.replace('#', '');
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}

function num(v) { return v == null ? 'no data' : Math.round(Number(v)).toLocaleString('en-US'); }

export default {
  id: 'lamps',
  signal: 'filmla_shoot_days',
  district: 'stages',
  layer: 'mid',
  stages: [],       // the 12 housings, row-major: {n, x, y, cx, lampY, lit, phase, truck|null}
  n: null,          // lamps lit, or null with no data
  ratio: null,      // {r, how}
  mix: null,        // {feature, tv, commercial, other} truck counts, or null without category signals
  catValues: {},    // category id -> value for the legend
  share: null,      // incentive share 0..1, or null
  pennants: 0,
  sig: null,

  init(scene) {},

  // called on every signals.json load; which stages light and which trucks fly the pennant come from the child RNG
  update(sig, scene) {
    const rng = scene.childRng('lamps');
    const D = scene.DISTRICTS.stages, A = scene.ANCHORS;
    const { w, h } = A.stageSize;
    this.sig = sig;
    this.ratio = ratioOf(sig);
    this.n = this.ratio ? Math.round(STAGES * this.ratio.r) : null;
    const count = this.n ?? 0;

    // the same twelve housings lot.js paints: two rows of six, numbered 1..12 row-major
    this.stages = [];
    for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) {
      const x = D.x + 20 + i * (w + A.stageGap), y = A.stageRows[r].y;
      this.stages.push({ n: i + 1 + r * 6, x, y, cx: x + w / 2, lampY: y + h - LAMP_DY, lit: false, phase: range(rng, 0, Math.PI * 2), truck: null });
    }
    const order = shuffle(rng, this.stages.map((_, i) => i));
    const lit = order.slice(0, count);
    for (const i of lit) this.stages[i].lit = true;

    // one truck per lit stage, colored by the category mix
    this.catValues = {};
    const weights = CATS.map(c => {
      const s = scene.sig(c.id);
      const v = s && s.value != null && Number.isFinite(Number(s.value)) ? Number(s.value) : null;
      if (v != null) this.catValues[c.key] = v;
      return { key: c.key, v };
    });
    this.mix = apportion(count, weights);
    const inc = scene.sig(INCENTIVE_ID);
    const sv = inc && inc.value != null ? Number(inc.value) : null;
    this.share = sv != null && Number.isFinite(sv) ? Math.max(0, Math.min(1, sv <= 1 ? sv : sv / 100)) : null;
    this.pennants = this.share != null ? Math.round(count * this.share) : 0;
    // hand out categories in legend order along the lit list, pennants on the first trucks of that list
    const bag = [];
    if (this.mix) for (const c of CATS) for (let k = 0; k < (this.mix[c.key] || 0); k++) bag.push(c);
    lit.forEach((i, k) => {
      const s = this.stages[i];
      const cat = bag[k] || null;
      s.truck = {
        x: s.cx + 33, y: s.y + h + 3,                    // backed up to the right of the roll-up door, cab outward
        cat: cat ? cat.key : null,
        color: cat ? cat.color : 'truck',
        name: cat ? cat.name : 'production',
        pennant: k < this.pennants,
        jx: range(rng, -1.5, 1.5),
      };
    });
  },

  draw(p, t, scene) {
    const C = scene.PALETTE, D = scene.DISTRICTS.stages, A = scene.ANCHORS;
    const { h } = A.stageSize;
    const sig = this.sig;
    const stale = !!(sig && sig.stale);
    const night = !!scene.isNight;
    const [lr, lg, lb] = rgb(C.lamp);
    const overview = scene.detailTier !== TIER.CLOSE;
    p.noStroke();

    for (const s of this.stages) {
      if (s.lit) {
        if (overview) {
          // Compact lit mark — count still faithful
          p.fill(stale ? C.lampOff : C.lamp);
          p.ellipse(s.cx, s.lampY, CORE, CORE);
        } else if (stale) {
          // dimmed to the housing color with a gray ring, so the count still reads
          p.fill(C.lampOff); p.ellipse(s.cx, s.lampY, CORE, CORE);
          p.noFill(); p.stroke(scene.paint(sig, C.lamp)); p.strokeWeight(2.5); p.ellipse(s.cx, s.lampY, CORE + 8, CORE + 8); p.noStroke();
        } else {
          const pulse = 0.85 + 0.15 * Math.sin(t * 2.2 + s.phase);
          const dia = (night ? HALO_NIGHT : HALO_DAY) * (0.95 + 0.05 * pulse);
          const a = (night ? HALO_A_NIGHT : HALO_A_DAY) * pulse;
          p.fill(lr, lg, lb, a * 0.55); p.ellipse(s.cx, s.lampY, dia, dia);
          p.fill(lr, lg, lb, a); p.ellipse(s.cx, s.lampY, dia * 0.55, dia * 0.55);
          p.fill(C.lamp); p.ellipse(s.cx, s.lampY, CORE, CORE);
          p.fill(255, 255, 255, night ? 170 : 130); p.ellipse(s.cx - 4, s.lampY - 4, 6, 6);   // glass highlight
        }
      }
      if (s.truck && !overview) truck(p, s.truck, C, (hex) => scene.paint(sig, hex), night);
      // the housing (and its truck) explain themselves on hover; nothing wider, so the crews keep their region
      scene.hit(s.cx - 52, s.lampY - 26, 104, 52, this, { stage: s.n });
      if (s.truck && !overview) scene.hit(s.cx + 28, s.y + h, 88, 44, this, { stage: s.n });
    }

    if (this.n == null) {
      const why = !sig ? 'not loaded' : sig.value == null ? 'have no value yet' : 'have nothing to compare against yet';
      p.fill(C.inkSoft); useDisplay(p, 18); p.textAlign(p.LEFT, p.TOP);
      p.text(`stage lamps: Shoot days (FilmLA) ${why}`, D.x + 24, D.y + 46);
      scene.hit(D.x + 20, D.y + 44, 480, 24, this, { note: true });
    }
  },

  legend(sig, scene, extra) {
    if (!sig || sig.value == null) {
      return {
        title: 'Stage lamps',
        text: 'No FilmLA shoot-days number yet — every lamp stays off.',
        source: sig ? provenance(sig) : 'Shoot days (FilmLA): not loaded',
      };
    }
    const ratio = this.ratio || ratioOf(sig);
    const n = this.n ?? (ratio ? Math.round(STAGES * ratio.r) : 0);
    const win = sig.window_n || DEFAULT_WINDOW;
    const ref = (scene && scene.meta && scene.meta.reference_year) || 2019;
    if (!ratio) {
      return {
        title: 'Stage lamps',
        text: `${num(sig.value)} on-location shoot days in ${periodLabel(sig)} (FilmLA) — first quarter on record, so no lamps until there is a baseline.`,
        source: provenance(sig),
      };
    }
    const rule = ratio.how === 'baseline'
      ? `${Math.round(Number(sig.baseline_ratio) * 100)}% of the ${ref} quarterly average (${pct(sig.normalized)} of the last ${win} quarters)`
      : `${pct(sig.normalized)} of the last ${win} quarters (no ${ref} baseline yet)`;
    let text = `${num(sig.value)} on-location shoot days in ${periodLabel(sig)} (FilmLA) — not soundstage occupancy. ${rule}. ` +
               `${n} of 12 lamps light (round(12 × that ${ratio.how === 'baseline' ? 'ratio' : 'percentile'})).`;
    if (n > 0) {
      if (this.mix) {
        const parts = CATS.filter(c => this.mix[c.key]).map(c => `${this.mix[c.key]} ${c.name}`);
        text += ` One truck per lit stage: ${parts.join(', ')}.`;
      } else {
        text += ` One truck per lit stage (category mix not loaded).`;
      }
      if (this.share != null) text += ` ${this.pennants} fly a CA pennant (${Math.round(this.share * 100)}% incentive share).`;
    }
    if (extra && extra.stage) {
      const s = this.stages[extra.stage - 1];
      if (s) text += s.lit ? ` Stage ${s.n} is lit${s.truck ? `, ${s.truck.name} truck outside` : ''}.` : ` Stage ${s.n} is dark.`;
    }
    return { title: `${n} of 12 lamps lit`, text, source: provenance(sig) };
  },
};

// ---- one parked truck. (x, y) is the box's top-left; the cab is on the right, nose outward from the door.
function truck(p, tr, C, paint, night) {
  const x = tr.x + tr.jx, y = tr.y;
  const cabX = x + BOX.w;
  const wheelY = y + BOX.h + 3;
  p.noStroke();
  p.fill(paint(C.ink)); p.ellipse(x + 8, wheelY, 10, 10); p.ellipse(cabX + CAB.w / 2, wheelY, 10, 10);
  p.fill(paint(C[tr.color] || C.truck)); p.rect(x, y, BOX.w, BOX.h, 2);
  // seam + roof stripe (matches gate trucks grammar)
  p.fill(paint(C.inkSoft)); p.rect(x + 3, y + 7, 2.5, BOX.h - 12);
  p.fill(paint(C.tower)); p.rect(x + 4, y + 2, BOX.w - 8, 4, 1);
  p.fill(paint(C.truckCab)); p.rect(cabX, y + BOX.h - CAB.h, CAB.w, CAB.h, 2);
  p.fill(paint(C.windowBlue)); p.rect(cabX + CAB.w - 6, y + BOX.h - CAB.h + 4, 5, 6);
  p.fill(paint(C.inkSoft)); p.rect(cabX + CAB.w, y + BOX.h - CAB.h + 5, 3, 5, 1);
  // bumper + exhaust (matches gate truck grammar)
  p.fill(paint(C.inkSoft)); p.rect(x + 2, y + BOX.h - 4, 8, 3);
  p.fill(paint(C.metalDk || C.inkSoft)); p.rect(cabX - 1, y + BOX.h - CAB.h - 8, 3, 10, 1);
  if (tr.pennant) {
    const poleX = x + 4;
    p.fill(paint(C.ink)); p.rect(poleX - 1, y - 16, 2.5, 16);
    p.fill(paint(C.poster[PENNANT_POSTER])); p.triangle(poleX, y - 30, poleX + 26, y - 22, poleX, y - 14);
    p.fill(paint(C.ink)); useDisplay(p, 13); p.textAlign(p.LEFT, p.CENTER);
    p.text('CA', poleX + 3, y - 22);
    p.textAlign(p.LEFT, p.TOP);
  }
  if (night) { p.fill(paint(C.windowWarm)); p.ellipse(cabX + CAB.w - 1, y + BOX.h - 4, 5, 5); }
}
