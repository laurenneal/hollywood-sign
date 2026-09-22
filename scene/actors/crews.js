// Crews on Soundstage Row = LA metro film and TV jobs (BLS SMU06310845051200001).
// 4 to 14 clusters of four (grip, PA, camera op, director's chair on a dolly),
// count = 4 + 10 × percentile of the latest month inside its trailing 24 months.
// Fewer, bigger figures so crews read when the lot is zoomed (was 5–60 tiny blobs).

import { population, fmt, pct, periodLabel, provenance } from '../scale.js';
import { range, pick } from '../rng.js';
import { useDisplay } from '../fonts.js';

const MIN = 4, MAX = 14;
const FIG = 2.35;  // full-lot friendly; district zoom still readable

export default {
  id: 'crews',
  signal: 'la_jobs',
  district: 'stages',
  layer: 'mid',
  crews: [],
  n: null,

  init(scene) {},

  // called on every signals.json load; lay the crews out deterministically from the scene's child RNG
  update(sig, scene) {
    const rng = scene.childRng('crews');
    const d = scene.DISTRICTS.stages;
    const A = scene.ANCHORS;
    this.n = sig ? population(sig, MIN, MAX, null) : null;
    const count = this.n ?? 0;
    this.crews = [];
    // walkable lanes: the gap under each stage row and the aisle between the two rows
    const lanes = [A.stageRows[0].y + A.stageSize.h + 12, A.stageRows[1].y - 40, A.stageRows[1].y + A.stageSize.h + 12];
    for (let i = 0; i < count; i++) {
      const laneY = pick(rng, lanes);
      this.crews.push({
        x: range(rng, d.x + 30, d.x + d.w - 90),
        y: laneY + range(rng, -6, 6),
        dir: rng() < 0.5 ? -1 : 1,
        speed: range(rng, 6, 14),           // logical px per second
        phase: range(rng, 0, Math.PI * 2),
        skin: [pick(rng, scene.PALETTE.skin), pick(rng, scene.PALETTE.skin), pick(rng, scene.PALETTE.skin), pick(rng, scene.PALETTE.skin)],
        shirt: [pick(rng, scene.PALETTE.shirt), pick(rng, scene.PALETTE.shirt), pick(rng, scene.PALETTE.shirt), pick(rng, scene.PALETTE.shirt)],
      });
    }
    this.sig = sig;
  },

  draw(p, t, scene) {
    const d = scene.DISTRICTS.stages;
    const C = scene.PALETTE;
    const stale = this.sig && this.sig.stale;
    for (const c of this.crews) {
      // walk back and forth along the lane
      const span = d.w - 120;
      const u = ((t * c.speed + c.phase * 40) % (span * 2));
      const off = u < span ? u : span * 2 - u;
      const x = d.x + 30 + off;
      const bob = Math.sin(t * 6 + c.phase) * 1.5;
      const step = 26 * FIG;
      figure(p, x, c.y + bob, c.skin[0], scene.paint(this.sig, c.shirt[0]), 'cstand', stale);
      figure(p, x + step, c.y + 2 + bob, c.skin[1], scene.paint(this.sig, c.shirt[1]), 'walkie', stale);
      figure(p, x + step * 2, c.y - 1 - bob, c.skin[2], scene.paint(this.sig, c.shirt[2]), 'camera', stale);
      chair(p, x + step * 3, c.y + 6, scene.paint(this.sig, C.lamp), stale);
    }
    if (!this.crews.length) {
      p.fill(C.inkSoft); useDisplay(p, 16); p.textAlign(p.LEFT, p.TOP);
      p.text(this.sig ? 'no crews yet — jobs number missing' : 'no crews — jobs feed not loaded', d.x + 24, d.y + 30);
    }
    scene.hit(d.x, d.y + 30, d.w, d.h - 30, this);
  },

  legend(sig, scene) {
    if (!sig || sig.value == null) return { title: 'Crews on the lot', text: 'Employment (Income domain): no LA jobs number loaded — jobs are the proxy for Income.' };
    const ghost = sig.baseline_ratio != null ? ` About ${Math.round(sig.baseline_ratio * 100)}% of the 2019 average.` : '';
    let cross = '';
    if (scene && scene.sig) {
      const edd = scene.sig('edd_la_mp_jobs');
      const qcew = scene.sig('la_qcew_5121');
      if (edd && edd.value != null && edd.period === sig.period) {
        cross += ` EDD CES same month: ${fmt(edd.value)}k.`;
      }
      if (qcew && qcew.value != null) {
        cross += ` QCEW LA County 5121 latest: ${fmt(qcew.value)} jobs (${qcew.period}).`;
      }
    }
    return {
      title: `${this.n} crews on the lot`,
      text: `Employment (Income domain; jobs are the proxy): ${fmt(sig.value * 1000)} LA film & TV jobs, ${periodLabel(sig)}` +
            ` (${pct(sig.normalized)} of the last ${sig.window_n} months).` +
            ` Drawn as ${MIN}–${MAX} crew clusters (${MIN} + ${MAX - MIN} × that percentile).${ghost}${cross}`,
      source: provenance(sig),
    };
  },
};

// ---- crew silhouettes: grip (C-stand), PA (walkie), camera op, director's chair on a dolly.
// Explicit geometry + shared proportions; recipe in docs/art/recipes.md.
function figure(p, x, y, skin, shirt, prop, stale) {
  const s = FIG;
  p.noStroke();
  // contact shadow
  p.fill(26, 32, 34, 45); p.ellipse(x, y + 8 * s, 16 * s, 5 * s);
  // legs
  p.fill(stale ? '#9aa1a3' : '#2e3438');
  p.rect(x - 5.5 * s, y - 4 * s, 4.2 * s, 12 * s, 1);
  p.rect(x + 1.5 * s, y - 4 * s, 4.2 * s, 12 * s, 1);
  // torso + slight shoulder width
  p.fill(stale ? '#9aa1a3' : shirt);
  p.rect(x - 6.5 * s, y - 22 * s, 13 * s, 18 * s, 2.5);
  // arms
  p.fill(stale ? '#b9bec0' : skin);
  p.rect(x - 9.5 * s, y - 20 * s, 3.2 * s, 12 * s, 1);
  p.rect(x + 6.5 * s, y - 20 * s, 3.2 * s, 12 * s, 1);
  // head
  p.ellipse(x, y - 27 * s, 11.5 * s, 11.5 * s);
  // hair cap (asymmetry)
  p.fill(stale ? '#7a8084' : '#1a2022');
  p.arc(x, y - 28 * s, 11.5 * s, 8 * s, Math.PI, 0, p.CHORD);
  if (prop === 'cstand') {
    p.stroke(stale ? '#9aa1a3' : '#3a3f43'); p.strokeWeight(3.6);
    p.line(x + 12 * s, y - 40 * s, x + 12 * s, y + 6 * s);
    p.line(x + 4 * s, y + 6 * s, x + 20 * s, y + 6 * s);
    p.line(x + 8 * s, y - 36 * s, x + 16 * s, y - 36 * s);
    p.noStroke();
  }
  if (prop === 'walkie') {
    p.fill(stale ? '#9aa1a3' : '#3a3f43');
    p.rect(x + 7.5 * s, y - 24 * s, 4.5 * s, 10 * s, 1);
    p.rect(x + 9 * s, y - 28 * s, 1.5 * s, 4 * s);
  }
  if (prop === 'camera') {
    p.fill(stale ? '#9aa1a3' : '#1a2022');
    p.rect(x + 5 * s, y - 34 * s, 20 * s, 13 * s, 1.5);
    p.rect(x + 25 * s, y - 31 * s, 8 * s, 8 * s, 1);
    p.fill(stale ? '#b9bec0' : '#4c5659'); p.ellipse(x + 13 * s, y - 27 * s, 5.5 * s, 5.5 * s);
    // tripod legs
    p.stroke(stale ? '#9aa1a3' : '#3a3f43'); p.strokeWeight(2.8);
    p.line(x + 14 * s, y - 20 * s, x + 6 * s, y + 6 * s);
    p.line(x + 14 * s, y - 20 * s, x + 22 * s, y + 6 * s);
    p.line(x + 14 * s, y - 20 * s, x + 14 * s, y + 6 * s);
    p.noStroke();
  }
}

function chair(p, x, y, color, stale) {
  const s = FIG;
  p.noStroke();
  p.fill(26, 32, 34, 40); p.ellipse(x + 8 * s, y + 6 * s, 20 * s, 6 * s);
  p.fill(stale ? '#9aa1a3' : color);
  p.rect(x, y - 22 * s, 17 * s, 5 * s, 1);
  p.rect(x, y - 12 * s, 17 * s, 4.5 * s, 1);
  p.rect(x, y - 22 * s, 4 * s, 14 * s, 1); // back
  // canvas weave lines on the seat
  p.fill(stale ? '#7a8084' : mixChair(color, 0.25));
  p.rect(x + 2 * s, y - 11 * s, 13 * s, 1);
  p.rect(x + 2 * s, y - 9 * s, 13 * s, 1);
  p.fill(stale ? '#7a8084' : '#3a3f43');
  p.rect(x + 1.5 * s, y - 14 * s, 2.5 * s, 18 * s);
  p.rect(x + 13 * s, y - 14 * s, 2.5 * s, 18 * s);
  p.ellipse(x + 4 * s, y + 5 * s, 6 * s, 6 * s);
  p.ellipse(x + 14 * s, y + 5 * s, 6 * s, 6 * s);
}

function mixChair(hex, t) {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  const h = (v) => Math.max(0, Math.min(255, Math.round(v + (26 - v) * t))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}
