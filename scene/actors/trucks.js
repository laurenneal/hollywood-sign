// Trucks at The Gate = LA's share of US motion picture and sound recording jobs (la_share, 0..1, direction +1).
// The LOWER the share, the LONGER the queue of production trucks at the gate:
// n = inversePopulation(sig, 0, 12) = 12 × (1 - percentile). Fewer, bigger trucks (was 0–30).
// The queue snakes through ANCHORS.truckLane nose-to-tail toward the gate mouth on the left.
// No destination pennants — la_share is not an origin/destination flow (see AUDIT / plan §4).
// A stencil on the gate wall reads the share itself.

import { inversePopulation, dashVersus, plainPeriod } from '../scale.js';
import { range } from '../rng.js';
import { useDisplay } from '../fonts.js';
import { TIER } from '../detail.js';
import { gateRoof } from '../lot.js';

const MIN = 0, MAX = 12;
const BOX = { w: 42, h: 26 };
const CAB = { w: 16, h: 18 };
const PITCH = 56;                 // slot spacing for quieter gate queue
const ROW_DY = 36;
const CYCLE = 9;
const MOVE = 1.6;
const WAVE = 0.12;
const EXIT_DY = 34;
const WALL = { y: 700, h: 24 };   // lot.js: the gate wall the stencil is painted on
export default {
  id: 'trucks',
  signal: 'la_share',
  district: 'gate',
  layer: 'mid',
  slots: [],        // slots[j] = path slot (j - 1); slot -1 is the exit under the roof
  count: 0,         // trucks in the queue
  personas: [],     // 64 deterministic per-truck jitters, indexed by truck identity
  n: null,
  share: null,
  sig: null,

  init(scene) {},

  // called on every signals.json load; the queue path and the per-truck jitters come from the child RNG
  update(sig, scene) {
    const rng = scene.childRng('trucks');
    const A = scene.ANCHORS, lane = A.truckLane;
    this.sig = sig;
    this.share = shareOf(sig);
    this.n = (sig && sig.value != null) ? inversePopulation(sig, MIN, MAX, null) : null;
    const n = Math.max(0, Math.min(MAX, this.n ?? 0));

    const { headX, cap } = queueOf(A);
    const row0 = lane.y + 41;                                  // box top of the front row (661); the wheels tuck behind the gatehouse roof
    const row1 = row0 - ROW_DY;                                // box top of the back row (635); pennant tops ride a few px over the lane top, clear of the board
    this.slots = [{ x: headX, y: row0 + EXIT_DY, face: -1, exit: true }];
    const count = Math.min(n, cap * 2);
    for (let i = 0; i < count; i++) {
      if (i < cap) this.slots.push({ x: headX + i * PITCH, y: row0, face: -1 });                       // front row heads left
      else this.slots.push({ x: headX + (cap - 1 - (i - cap)) * PITCH, y: row1, face: 1 });            // back row heads right
    }
    this.count = count;
    this.personas = [];
    for (let k = 0; k < 64; k++) this.personas.push({ jx: range(rng, -2, 2), jy: range(rng, -1.5, 1.5), shudder: range(rng, 0, Math.PI * 2) });
  },

  draw(p, t, scene) {
    const C = scene.PALETTE, A = scene.ANCHORS, lane = A.truckLane, gm = A.gateMouth;
    const sig = this.sig;
    const paint = (hex) => scene.paint(sig, hex);
    p.noStroke();

    if (this.n == null) {
      // no data: an empty lane that says so
      p.fill(C.inkSoft); useDisplay(p); p.textAlign(p.LEFT, p.TOP);
      p.textSize(18); p.text('share not computed', lane.x + 24, lane.y + 22);
      p.textSize(15); p.text(sig ? 'LA share has no value yet' : 'LA share feed not loaded', lane.x + 24, lane.y + 44);
    } else if (this.count > 0) {
      const c = Math.floor(t / CYCLE), u = t - c * CYCLE;      // cycle number and seconds into it
      const blink = (t % 1.4) < 0.7;                           // head truck's brake lights
      // once the exiting truck has vanished under the roof (1 - s <= 0.02), the truck waiting in the head slot is the head
      const headIdx = (1 - ease(u / MOVE)) <= 0.02 ? 1 : 0;
      // tail first (back row) so the front row overlaps it; index count is the truck arriving at the tail slot
      for (let i = this.count; i >= 0; i--) {
        const s = ease((u - i * WAVE) / MOVE);
        const b = this.slots[i];                                 // where truck i is going: slot i - 1
        const a = i < this.count ? this.slots[i + 1] : b;        // where it started: slot i (the arriving truck holds its slot)
        const k = i + c;                                         // truck identity: stable across the wrap
        const per = this.personas[mod(k, 64)];
        const x = a.x + (b.x - a.x) * s + per.jx;
        const y = a.y + (b.y - a.y) * s + per.jy + Math.sin(t * 18 + per.shudder) * 0.35;
        const face = s < 0.5 ? a.face : b.face;                  // the U-turn flips facing halfway
        let alpha = 1;
        if (b.exit) alpha = 1 - s;
        else if (i === this.count) alpha = s;                    // the new tail truck fades in
        if (alpha <= 0.02) continue;
        truck(p, x, y, face, C, paint, alpha, {
          brake: i === headIdx && blink,
          night: scene.isNight,
        });
      }
      // the gatehouse front, laid again over the queue: trucks waiting near the mouth sit behind it instead of on its
      // roof, and the head truck rolls under it
      gateRoof(p, { night: scene.isNight, washed: scene.isNight });
    }

    // stencil painted on the gate wall's band, below the trucks' wheels — CLOSE only (readable share lives in inspector otherwise)
    if (scene.detailTier === TIER.CLOSE) {
      const label = this.share == null ? 'LA SHARE  --' : `LA SHARE ${Math.round(this.share)}%`;
      const inkCol = this.share == null ? C.inkSoft : paint(C.ink);
      const sx = gm.x + gm.w + 28;
      useDisplay(p, 20); p.textAlign(p.LEFT, p.CENTER);
      const tw = p.textWidth(label);
      p.noStroke();
      p.fill(C.panel);
      p.rect(sx - 10, WALL.y + 1, tw + 20, WALL.h - 2, 2);
      p.noFill(); p.stroke(inkCol); p.strokeWeight(2);
      p.rect(sx - 10, WALL.y + 1, tw + 20, WALL.h - 2, 2);
      p.noStroke(); p.fill(inkCol);
      p.text(label, sx, WALL.y + WALL.h / 2);
      p.textAlign(p.LEFT, p.TOP);
    }

    // the queue at its longest plus the wall the stencil sits on
    const q = queueOf(A);
    const x0 = q.headX - CAB.w - 4, reach = q.headX + (Math.min(MAX, q.cap) - 1) * PITCH + BOX.w + CAB.w;
    scene.hit(x0, lane.y, reach + 4 - x0, 120, this);
  },

  legend(sig) {
    if (!sig || sig.value == null) {
      return { title: 'Trucks at the gate', text: 'No figure yet for LA\u2019s share of America\u2019s film and TV jobs.', sig: sig || null };
    }
    const n = this.n ?? inversePopulation(sig, MIN, MAX, null);
    const vs2019 = sig.baseline_ratio != null ? ` That share is ${Math.round(sig.baseline_ratio * 100)}% of what it was in 2019.` : '';
    return {
      title: `${n} truck${n === 1 ? '' : 's'} at the gate`,
      text: `LA had ${shareOf(sig)}% of America\u2019s film and TV jobs in ${plainPeriod(sig)}${dashVersus(sig)}.` +
            ` The line of trucks grows when LA\u2019s share shrinks.${vs2019}`,
      sig,
    };
  },
};

// la_share is 0..1; tolerate a feed that already hands over a percent. One decimal.
function shareOf(sig) {
  if (!sig || sig.value == null) return null;
  const v = Number(sig.value);
  if (!Number.isFinite(v)) return null;
  return Math.round((v <= 1 ? v * 100 : v) * 10) / 10;
}

// the head truck's nose just inside the gate mouth, and how many trucks one row of the lane holds
function queueOf(A) {
  const headX = A.gateMouth.x + 12;
  return { headX, cap: Math.max(1, Math.floor((A.truckLane.x + A.truckLane.w - headX) / PITCH)) };
}

function ease(u) { return u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u); }
function mod(a, m) { return ((a % m) + m) % m; }
function hexA(hex, alpha) {
  if (alpha >= 1) return hex;
  return hex + Math.round(Math.max(0, alpha) * 255).toString(16).padStart(2, '0');
}

// ---- one truck. (x, y) is the box's top-left; face -1 heads left (cab on the left), +1 heads right.
// No destination flags — share is not a flow. Recipe: docs/art/recipes.md.
function truck(p, x, y, face, C, paint, alpha, o) {
  const col = (hex) => hexA(paint(hex), alpha);
  const left = face < 0;
  const cabX = left ? x - CAB.w : x + BOX.w;
  const wheelY = y + BOX.h + 3;
  p.noStroke();
  p.fill(26, 32, 34, Math.round(40 * alpha)); p.ellipse(x + BOX.w / 2, wheelY + 2, BOX.w + 8, 8);
  p.fill(col(C.ink)); p.ellipse(cabX + CAB.w / 2, wheelY, 9, 9);
  p.ellipse(left ? x + BOX.w - 8 : x + 8, wheelY, 9, 9);
  p.fill(col(C.truck)); p.rect(x, y, BOX.w, BOX.h, 3);
  // box side panel seam + rear bumper
  p.fill(col(C.inkSoft));
  p.rect(x + 3, y + 8, 2, BOX.h - 12);
  p.rect(left ? x + BOX.w - 6 : x + 2, y + BOX.h - 4, 6, 3);
  p.fill(col(C.truckCab)); p.rect(cabX, y + BOX.h - CAB.h, CAB.w, CAB.h, 2);
  p.fill(col(C.windowBlue)); p.rect(left ? cabX + 2 : cabX + CAB.w - 6, y + BOX.h - CAB.h + 3, 5, 6);
  // side mirror
  p.fill(col(C.inkSoft));
  p.rect(left ? cabX - 2 : cabX + CAB.w, y + BOX.h - CAB.h + 4, 3, 5, 1);
  // door handle + exhaust stack behind cab
  p.fill(col(C.ink));
  p.rect(left ? cabX + CAB.w - 4 : cabX + 2, y + BOX.h - CAB.h + 8, 2, 4);
  p.fill(col(C.metalDk || C.inkSoft));
  p.rect(left ? cabX + CAB.w - 3 : cabX - 1, y + BOX.h - CAB.h - 8, 3, 10, 1);
  // roof stripe (brand-neutral lot dressing)
  p.fill(col(C.tower)); p.rect(x + 4, y + 2, BOX.w - 8, 4, 1);
  if (o.brake) {
    const rx = left ? x + BOX.w - 1 : x + 1;
    p.fill(col(C.lamp)); p.ellipse(rx, y + 4, 4, 4); p.ellipse(rx, y + BOX.h - 4, 4, 4);
  }
  if (o.night) {
    p.fill(col(C.windowWarm)); p.ellipse(left ? cabX + 1 : cabX + CAB.w - 1, y + BOX.h - 4, 5, 5);
  }
}
