// Crews on Soundstage Row = LA metro film and TV jobs (BLS SMU06310845051200001).
// 4 to 14 clusters of four (grip, PA, camera op, director's chair on a dolly),
// count = 4 + 10 × percentile of the latest month inside its trailing 24 months.
// Fewer, bigger figures so crews read when the lot is zoomed (was 5–60 tiny blobs).

import { population, fmt, dashVersus, plainPeriod } from '../scale.js';
import { range, pick } from '../rng.js';
import { useDisplay } from '../fonts.js';
import { TIER } from '../detail.js';

const MIN = 4, MAX = 14;
const FIG = 1.25;  // shorter than a 70-unit stage door; overview uses dots when tiny
// Natural hair range so the crew reads mixed, not uniform.
const HAIR = ['#1a2022', '#241a12', '#3a2a1a', '#4a3728', '#6b533b', '#8a7355', '#2e2e2e', '#7a7a7a'];

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
    // Three walkable lanes: under each stage row and the aisle between them.
    const lanes = [A.stageRows[0].y + A.stageSize.h + 12, A.stageRows[1].y - 40, A.stageRows[1].y + A.stageSize.h + 12];
    const L = lanes.length;
    const laneStart = d.x + 40;
    const laneWidth = d.w - 190;            // leave room for the ~110-wide cluster on the right
    for (let i = 0; i < count; i++) {
      const lane = i % L;                   // consecutive crews alternate lanes → no vertical stacking
      // Even global slot across the whole row so crews spread out and line up left-to-right.
      const baseX = laneStart + laneWidth * (i + 0.5) / count + range(rng, -10, 10);
      this.crews.push({
        baseX,
        y: lanes[lane] + range(rng, -4, 4),
        amp: range(rng, 10, 20),            // small pacing around the slot (bunch a little, not a lot)
        speed: range(rng, 0.4, 0.9),        // slow sway
        phase: range(rng, 0, Math.PI * 2),
        skin: [pick(rng, scene.PALETTE.skin), pick(rng, scene.PALETTE.skin), pick(rng, scene.PALETTE.skin), pick(rng, scene.PALETTE.skin)],
        shirt: [pick(rng, scene.PALETTE.shirt), pick(rng, scene.PALETTE.shirt), pick(rng, scene.PALETTE.shirt), pick(rng, scene.PALETTE.shirt)],
        // ~half the crew reads female (longer hair); the rest short hair. Hair color varies per person.
        fem: [rng() < 0.5, rng() < 0.5, rng() < 0.5, rng() < 0.5],
        hair: [pick(rng, HAIR), pick(rng, HAIR), pick(rng, HAIR), pick(rng, HAIR)],
      });
    }
    this.sig = sig;
  },

  draw(p, t, scene) {
    const d = scene.DISTRICTS.stages;
    const C = scene.PALETTE;
    const stale = this.sig && this.sig.stale;
    const overview = scene.detailTier !== TIER.CLOSE;
    for (const c of this.crews) {
      // pace gently around the lined-up slot instead of roaming the whole row
      const x = c.baseX + Math.sin(t * c.speed + c.phase) * c.amp;
      const bob = Math.sin(t * 6 + c.phase) * 1.5;
      if (overview) {
        // Compact marks until close zoom — same crew count
        const paint = scene.paint(this.sig, c.shirt[0]);
        p.noStroke();
        p.fill(paint);
        p.ellipse(x + 20, c.y + bob - 4, 14, 14);
        p.ellipse(x + 36, c.y + bob - 2, 12, 12);
        p.ellipse(x + 50, c.y + bob - 3, 12, 12);
        p.ellipse(x + 64, c.y + bob, 10, 10);
        continue;
      }
      const step = 26 * FIG;
      figure(p, x, c.y + bob, c.skin[0], scene.paint(this.sig, c.shirt[0]), 'cstand', stale, c.fem[0], c.hair[0]);
      figure(p, x + step, c.y + 2 + bob, c.skin[1], scene.paint(this.sig, c.shirt[1]), 'walkie', stale, c.fem[1], c.hair[1]);
      figure(p, x + step * 2, c.y - 1 - bob, c.skin[2], scene.paint(this.sig, c.shirt[2]), 'camera', stale, c.fem[2], c.hair[2]);
      chair(p, x + step * 3, c.y + 6, scene.paint(this.sig, C.lamp), stale);
    }
    if (!this.crews.length) {
      p.fill(C.inkSoft); useDisplay(p, 16); p.textAlign(p.LEFT, p.TOP);
      p.text(this.sig ? 'no crews yet — jobs number missing' : 'no crews — jobs feed not loaded', d.x + 24, d.y + 30);
    }
    scene.hit(d.x, d.y + 30, d.w, d.h - 30, this);
  },

  legend(sig) {
    if (!sig || sig.value == null) {
      return { title: 'Crews on the lot', text: 'No figure yet for how many people work in LA film and TV.', sig: sig || null };
    }
    const vs2019 = sig.baseline_ratio != null ? ` That is about ${Math.round(sig.baseline_ratio * 100)}% of the 2019 level.` : '';
    return {
      title: `${this.n} crews on the lot`,
      text: `About ${fmt(Math.round(sig.value * 1000))} people worked in LA film and TV in ${plainPeriod(sig)}${dashVersus(sig)}.` +
            ` More jobs, more crews on the lot.${vs2019}`,
      sig,
    };
  },
};

// ---- crew silhouettes: grip (C-stand), PA (walkie), camera op, director's chair on a dolly.
// Explicit geometry + shared proportions; recipe in docs/art/recipes.md.
function figure(p, x, y, skin, shirt, prop, stale, fem, hairColor) {
  const s = FIG;
  p.noStroke();
  // contact shadow
  p.fill(26, 32, 34, 32); p.ellipse(x, y + 8 * s, 16 * s, 5 * s);
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
  // head + hair (long hair reads female; short cap reads male). Hair color varies per person.
  const hairC = stale ? '#7a8084' : (hairColor || '#1a2022');
  if (fem) {
    p.fill(hairC);
    p.ellipse(x, y - 25 * s, 15 * s, 19 * s);                   // hair mass framing the face
    // strands falling over the shoulders (over the torso so the long hair clearly reads)
    p.rect(x - 8.2 * s, y - 27 * s, 3.8 * s, 18 * s, 1.8);
    p.rect(x + 4.4 * s, y - 27 * s, 3.8 * s, 18 * s, 1.8);
    p.fill(stale ? '#b9bec0' : skin);
    p.ellipse(x, y - 27 * s, 11 * s, 11 * s);                   // face on top
    p.fill(hairC);
    p.arc(x, y - 29 * s, 11 * s, 8 * s, Math.PI, 0, p.CHORD);   // center-part fringe
  } else {
    p.ellipse(x, y - 27 * s, 11.5 * s, 11.5 * s);              // head (skin fill from arms)
    p.fill(hairC);
    p.arc(x, y - 28 * s, 11.5 * s, 8 * s, Math.PI, 0, p.CHORD); // short cap
  }
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
  p.fill(26, 32, 34, 28); p.ellipse(x + 8 * s, y + 6 * s, 20 * s, 6 * s);
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
