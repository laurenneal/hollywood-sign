// Benches outside the union hall = industry unemployment rate (BLS LNU04034179, 12-month mean, direction -1).
// 0 to 16 larger figures holding résumés: three benches, a few standing, a short coffee-cart queue.
// count = 16 × the percentile of the latest month inside its trailing 36 months (was 0–40 tiny blobs).
// Signal: unemp_512_12m, falling back to unemp_512 while the 12-month series is not in signals.json.

import { norm, dashVersus, plainPeriod } from '../scale.js';
import { range, pick } from '../rng.js';
import { useDisplay } from '../fonts.js';
import { TIER } from '../detail.js';

const MIN = 0, MAX = 14;
const BENCHES = 3, SEATS = 4, BENCH_W = 160, BENCH_GAP = 30, SEAT_PITCH = 36;
const CART_QUEUE = 4, QUEUE_PITCH = 40;
const CURB_DY = 46;   // seat line below the sidewalk: the benches line the curb, clear of the hall and the picket lane
const FIG = 1.25;
// local colours: the palette has no bench wood or paper-in-hand
const WOOD = '#8a6a3e';
const PAPER = '#fbfaf5';
const LEG = '#3a3f43';

// The first entry that carries a value wins: unemp_512_12m, then unemp_512.
function resolve(sig) {
  const list = Array.isArray(sig) ? sig : [sig];
  return list.find(s => s && s.value != null) || list.find(s => s) || null;
}

// The benches fill with the raw percentile of unemployment (90th pct = 36 people). scale.population() flips
// direction -1 signals to 1 - percentile, which would empty the benches when unemployment is high, so the
// mapping lives here until scale.js settles that; swap this for population(sig, MIN, MAX) once it does.
function fill(sig, min, max) {
  const n = norm(sig, null);
  if (n == null) return Math.round((min + max) / 2);
  return Math.round(min + (max - min) * n);
}

function shuffle(rng, arr) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

// the bench row: three planks along the curb below the sidewalk, starting under the union hall
function row(A) {
  const x0 = A.unionHall.x - 14, seatY = A.sidewalk.y + A.sidewalk.h + CURB_DY;
  return { x0, seatY, end: x0 + BENCHES * BENCH_W + (BENCHES - 1) * BENCH_GAP };
}

export default {
  id: 'benches',
  signal: ['unemp_512_12m', 'unemp_512'],
  district: 'street',
  layer: 'mid',
  benches: [],
  people: [],
  n: null,
  sig: null,

  init(scene) {},

  // called on every signals.json load; seats, standing spots and the cart queue come from the child RNG
  update(sig, scene) {
    const rng = scene.childRng('benches');
    const A = scene.ANCHORS, C = scene.PALETTE;
    const u = A.unionHall, cc = A.coffeeCart;
    this.sig = resolve(sig);
    this.n = (this.sig && this.sig.value != null) ? fill(this.sig, MIN, MAX) : null;
    const count = this.n ?? 0;

    const { x0, seatY } = row(A);
    this.benches = [];
    for (let b = 0; b < BENCHES; b++) this.benches.push({ x: x0 + b * (BENCH_W + BENCH_GAP), y: seatY, w: BENCH_W });

    // slot pools: seats and standing spots in a shuffled order (low counts scatter, high counts crowd);
    // the cart queue fills from the cart outward
    const seats = [];
    for (const b of this.benches) {
      for (let s = 0; s < SEATS; s++) seats.push({ x: b.x + b.w / 2 + (s - (SEATS - 1) / 2) * SEAT_PITCH, y: seatY, kind: 'seat' });
    }
    shuffle(rng, seats);
    const cart = [];
    for (let i = 0; i < CART_QUEUE; i++) cart.push({ x: cc.x + cc.w + 10 + i * QUEUE_PITCH, y: cc.y + cc.h - 4, kind: 'cart' });
    // standing room in the gaps between the benches (the row's ends meet the road curb and the gate's guard booth)
    const stands = shuffle(rng, [
      { x: x0 + BENCH_W + BENCH_GAP / 2, y: seatY + 3 },
      { x: x0 + 2 * BENCH_W + 1.5 * BENCH_GAP, y: seatY + 3 },
    ].map(s => ({ ...s, kind: 'stand' })));

    // seats first, then stand / cart — 12 seats + 4 + 2 covers MAX 14 with room to spare
    const pattern = ['seat', 'seat', 'seat', 'cart', 'stand'];
    const pools = { seat: seats, cart, stand: stands };
    this.people = [];
    for (let i = 0; i < count; i++) {
      let kind = pattern[i % pattern.length];
      if (!pools[kind].length) kind = ['seat', 'stand', 'cart'].find(k => pools[k].length);
      if (!kind) break;
      const slot = pools[kind].shift();
      this.people.push({
        ...slot,
        skin: pick(rng, C.skin),
        shirt: pick(rng, C.shirt),
        phase: range(rng, 0, Math.PI * 2),
        sway: range(rng, 0.7, 1.5),          // radians per second for the weight shift
      });
    }
  },

  draw(p, t, scene) {
    const C = scene.PALETTE, A = scene.ANCHORS;
    const u = A.unionHall, cc = A.coffeeCart, sw = A.sidewalk;
    const stale = !!(this.sig && this.sig.stale);
    const wood = scene.paint(this.sig, WOOD);
    const overview = scene.detailTier !== TIER.CLOSE;
    for (const b of this.benches) bench(p, b.x, b.y, b.w, wood);
    for (const q of this.people) {
      const shirt = scene.paint(this.sig, q.shirt);
      if (overview) {
        p.noStroke();
        p.fill(stale ? '#9aa1a3' : shirt);
        p.ellipse(q.x, q.y - (q.kind === 'seat' ? 10 : 18), 12, 12);
        continue;
      }
      if (q.kind === 'seat') {
        const nod = Math.sin(t * 0.7 + q.phase) * 0.6;
        seated(p, q.x, q.y, q.skin, shirt, nod, stale);
      } else {
        const sway = Math.sin(t * q.sway + q.phase) * 1.5;
        standing(p, q.x + sway, q.y, q.skin, shirt, q.kind === 'stand', stale);
      }
    }
    if (this.n == null && !overview) {
      p.fill(C.inkSoft); useDisplay(p, 14); p.textAlign(p.LEFT, p.TOP);
      p.text(this.sig ? 'benches empty — no unemployment number yet' : 'benches empty — unemployment feed not loaded',
             u.x, sw.y + sw.h + 10);
    }
    const r = row(A);
    scene.hit(r.x0 - 4, r.seatY - 38, r.end + 4 - (r.x0 - 4), 68, this, 'benches');          // the benches and standing room
    scene.hit(cc.x + cc.w + 4, cc.y + cc.h - 44, CART_QUEUE * QUEUE_PITCH + 4, 52, this, 'cart');
  },

  legend(sig, scene, extra) {
    const s = resolve(sig);
    if (!s || s.value == null) {
      return { title: 'The benches', text: 'No unemployment figure yet for film and TV workers.', sig: s };
    }
    const n = this.n ?? fill(s, MIN, MAX);
    const kind = s.id === 'unemp_512' ? `in ${plainPeriod(s)}` : `on average over the 12 months to ${plainPeriod(s)}`;
    return {
      title: `${n} people on the benches`,
      text: `${Number(s.value).toFixed(1)}% of film, TV and music-recording workers nationwide were out of work ${kind}${dashVersus(s)}.` +
            ` More unemployment, more people waiting on the benches.${extra === 'cart' ? ' The coffee-cart line counts too.' : ''}`,
      sig: s,
    };
  },
};

// ---- primitives only; sprites replace these later.
function bench(p, x, y, w, wood) {
  p.noStroke();
  p.fill(26, 32, 34, 36); p.ellipse(x + w / 2 + 2, y + 16, w * 0.95, 14);
  p.fill(wood); p.rect(x - 2, y - 8, w + 4, 16, 2);                               // seat plank
  p.fill('#6e5430'); p.rect(x + 2, y - 1, w - 4, 3);                             // plank seam
  p.fill(wood); p.rect(x - 2, y - 36, w + 4, 14, 2);                             // backrest
  p.fill(LEG); p.rect(x + 2, y + 6, 9, 20); p.rect(x + w - 11, y + 6, 9, 20);     // legs
  p.rect(x + 2, y - 36, 9, 34); p.rect(x + w - 11, y - 36, 9, 34);               // back posts
}

function seated(p, x, y, skin, shirt, nod, stale) {
  const s = FIG;
  p.noStroke();
  p.fill(26, 32, 34, 38); p.ellipse(x, y + 6 * s, 14 * s, 4 * s);
  p.fill(LEG); p.rect(x - 5.5 * s, y, 4 * s, 8 * s); p.rect(x + 1.5 * s, y, 4 * s, 8 * s);
  p.fill(stale ? '#9aa1a3' : shirt); p.rect(x - 5.5 * s, y - 16 * s, 11 * s, 16 * s, 2);
  p.fill(stale ? '#b9bec0' : skin);
  p.rect(x - 8.2 * s, y - 14 * s, 2.6 * s, 9 * s, 1);
  p.rect(x + 5.6 * s, y - 14 * s, 2.6 * s, 9 * s, 1);
  p.ellipse(x + nod, y - 22 * s, 11 * s, 11 * s);
  p.fill(stale ? '#7a8084' : '#1a2022');
  p.arc(x + nod, y - 23 * s, 11 * s, 7 * s, Math.PI, 0, p.CHORD);
  p.fill(PAPER); p.rect(x - 4 * s, y - 7 * s, 8 * s, 6 * s);
}

function standing(p, x, y, skin, shirt, resume, stale) {
  const s = FIG;
  p.noStroke();
  p.fill(26, 32, 34, 40); p.ellipse(x, y + 6 * s, 14 * s, 4.5 * s);
  p.fill(LEG); p.rect(x - 5.5 * s, y - 4 * s, 4 * s, 11 * s); p.rect(x + 1.5 * s, y - 4 * s, 4 * s, 11 * s);
  p.fill(stale ? '#9aa1a3' : shirt); p.rect(x - 5.5 * s, y - 20 * s, 11 * s, 16 * s, 2);
  p.fill(stale ? '#b9bec0' : skin);
  p.rect(x - 8.5 * s, y - 18 * s, 2.8 * s, 11 * s, 1);
  p.rect(x + 5.8 * s, y - 18 * s, 2.8 * s, 11 * s, 1);
  p.ellipse(x, y - 25 * s, 11 * s, 11 * s);
  p.fill(stale ? '#7a8084' : '#1a2022');
  p.arc(x, y - 26 * s, 11 * s, 7 * s, Math.PI, 0, p.CHORD);
  if (resume) { p.fill(PAPER); p.rect(x + 5 * s, y - 15 * s, 5 * s, 8 * s); }
}
