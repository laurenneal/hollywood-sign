// The picket line on the sidewalk = strike_active (0, 1 or 2 unions on strike today; direction -1).
// Each striking union puts a file of 60 walkers with signs on the sidewalk, looping the long way round;
// two unions = two files side by side. When nothing is on strike the sidewalk stays clear and a small hover
// region in front of the union hall says so. The countdown sign on the hall wall reads days_to_next_expiry
// ("NEXT CONTRACT: N DAYS") whenever that signal exists.

import { range, pick } from '../rng.js';
import { useDisplay } from '../fonts.js';
import { TIER } from '../detail.js';

const PER_UNION = 24, MAX_FILES = 2;
const FIG = 1.25;              // the crews' scale
const LANE_R = 9;              // half the distance between the outbound and return lanes
const WALK = 14;               // logical px per second
const DAYS_ID = 'days_to_next_expiry';
// local colours: the palette has no stick wood
const STICK = '#6b5a3e';
const LEG = '#3a3f43';

// Writes the point on a stadium loop for u in [0, 1) into out.x / out.y (no allocation per frame):
// near lane left to right, right cap, far lane right to left, left cap.
function stadium(out, u, cx, cy, half, r) {
  const straight = 2 * half, cap = Math.PI * r, P = 2 * straight + 2 * cap;
  let s = (((u % 1) + 1) % 1) * P;
  if (s < straight) { out.x = cx - half + s; out.y = cy + r; return; }
  s -= straight;
  if (s < cap) { const a = Math.PI / 2 - (s / cap) * Math.PI; out.x = cx + half + Math.cos(a) * r; out.y = cy + Math.sin(a) * r; return; }
  s -= cap;
  if (s < straight) { out.x = cx + half - s; out.y = cy - r; return; }
  s -= straight;
  const a = -Math.PI / 2 - (s / cap) * Math.PI;
  out.x = cx - half + Math.cos(a) * r; out.y = cy + Math.sin(a) * r;
}

function daysText(days) {
  if (!days || days.value == null) return null;
  const d = Math.round(days.value);
  return d < 0 ? 'the current contract has already expired' : `${d} day${d === 1 ? '' : 's'} to the next contract expiry`;
}

// "Next to expire: the IATSE 2024 Hollywood Basic Agreement, in 310 days (Jul 31, 2027)."
function nextContract(days) {
  const d = Math.round(days.value);
  const m = /\((\d{4})-(\d{2})-(\d{2})\)\s*$/.exec(days.label || '');
  const name = String(days.label || '').replace(/\s*(expires?)?\s*\(\d{4}-\d{2}-\d{2}\)\s*$/i, '').trim();
  const date = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '';
  if (d < 0) return `${name ? `The ${name}` : 'The current contract'} has already expired.`;
  return `Next to expire: ${name ? `the ${name}` : 'a union contract'}, in ${d} day${d === 1 ? '' : 's'}${date ? ` (${date})` : ''}.`;
}

export default {
  id: 'picket',
  signal: 'strike_active',
  district: 'street',
  layer: 'mid',
  files: [],
  unions: null,
  sig: null,
  days: null,

  init(scene) {},

  // called on every signals.json load; each file's walkers get a fixed spacing plus a little RNG jitter
  update(sig, scene) {
    const rng = scene.childRng('picket');
    const A = scene.ANCHORS, C = scene.PALETTE;
    const sw = A.sidewalk;
    this.sig = sig;
    this.days = scene.sig(DAYS_ID);
    this.unions = (sig && sig.value != null) ? Math.max(0, Math.round(sig.value)) : null;
    const files = Math.min(this.unions ?? 0, MAX_FILES);
    this.files = [];
    const cy = sw.y + sw.h / 2 + 9;                  // lanes at cy - 9 and cy + 9, feet on the sidewalk
    for (let f = 0; f < files; f++) {
      const seg = sw.w / files;
      const cx = sw.x + seg * (f + 0.5);
      const half = seg / 2 - (files === 1 ? 40 : 25);
      const P = 4 * half + 2 * Math.PI * LANE_R;
      const walkers = [];
      for (let i = 0; i < PER_UNION; i++) {
        walkers.push({
          u0: (i + range(rng, -0.25, 0.25)) / PER_UNION,
          dy: range(rng, -1.5, 1.5),
          phase: range(rng, 0, Math.PI * 2),
          skin: pick(rng, C.skin),
          shirt: pick(rng, C.shirt),
          sign: i % 2 ? C.ink : C.lamp,             // signs alternate ink and lamp red
          x: 0, y: 0,                                // current position, written by draw()
        });
      }
      this.files.push({ cx, cy, half, P, dir: f % 2 ? -1 : 1, walkers });
    }
  },

  draw(p, t, scene) {
    const C = scene.PALETTE, A = scene.ANCHORS;
    const sw = A.sidewalk, u = A.unionHall;
    const stale = !!(this.sig && this.sig.stale);

    // walkers: positions written in place (no per-frame allocation), then the far lane first so the near lane overdraws it
    p.noStroke();
    for (const f of this.files) {
      const adv = f.dir * t * WALK / f.P;
      for (const w of f.walkers) stadium(w, w.u0 + adv, f.cx, f.cy, f.half, LANE_R);
      for (let pass = 0; pass < 2; pass++) {
        for (const w of f.walkers) {
          if ((w.y < f.cy) !== (pass === 0)) continue;
          const bob = Math.sin(t * 7 + w.phase) * 1.2;
          walker(p, w.x, w.y + w.dy + bob, w.skin, scene.paint(this.sig, w.shirt), scene.paint(this.sig, w.sign), stale);
        }
      }
    }

    if (this.unions == null) {
      p.fill(C.inkSoft); useDisplay(p, 14); p.textAlign(p.LEFT, p.TOP);
      p.text(this.sig ? 'no picket — strike flag missing' : 'no picket — strike feed not loaded', sw.x + 24, sw.y + 22);
    }

    // the countdown, lettered on the red fascia lot.js paints under the hall's name; the words from district zoom on
    if (this.days && this.days.value != null) {
      const sx = u.x + 8, sy = u.y + 36, w = u.w - 16, h = 34;
      if (scene.detailTier !== TIER.OVERVIEW) {
        const d = Math.round(this.days.value);
        const label = d < 0 ? 'NEXT CONTRACT: EXPIRED' : `NEXT CONTRACT: ${d} DAY${d === 1 ? '' : 'S'}`;
        p.noStroke();
        p.fill(scene.paint(this.days, scene.isNight ? C.windowWarm : C.paper));
        useDisplay(p, 22); p.textAlign(p.CENTER, p.CENTER);
        const tw = p.textWidth(label);
        if (tw > w - 16) p.textSize(22 * (w - 16) / tw);
        p.text(label, sx + w / 2, sy + h / 2 - 1);
        p.textAlign(p.LEFT, p.TOP);
      }
      scene.hit(sx, sy, w, h, this, 'countdown');
    }

    // hover: the whole sidewalk when a line is walking, a small patch in front of the hall when it is quiet
    if (this.files.length) scene.hit(sw.x, sw.y, sw.w, sw.h, this, 'line');
    else scene.hit(u.x + 60, sw.y + 17, 120, 26, this, 'quiet');
  },

  legend(sig, scene, extra) {
    const days = scene.sig(DAYS_ID);
    const dtxt = daysText(days);
    const next = dtxt ? ` ${nextContract(days)}` : '';
    if (extra === 'countdown' && dtxt) {
      return { title: 'Next contract', text: `The sign on the union hall counts down to the next big Hollywood union contract.${next}`, sig: days };
    }
    if (!sig || sig.value == null) {
      return { title: 'The picket line', text: 'No strike information loaded yet.', sig: sig || null };
    }
    const n = Math.max(0, Math.round(sig.value));
    if (n === 0) {
      return { title: 'No picket line', text: `No Hollywood union is on strike today.${next}`, sig };
    }
    const files = Math.min(n, MAX_FILES);
    return {
      title: `${files * PER_UNION} on the picket line`,
      text: `${n} Hollywood union${n === 1 ? ' is' : 's are'} on strike today; each union gets its own line of picketers.${next}`,
      sig,
    };
  },
};

// ---- silhouettes match crews grammar (shadow, arms, hair); count still from strike_active.
function walker(p, x, y, skin, shirt, sign, stale) {
  const s = FIG;
  p.noStroke();
  p.fill(26, 32, 34, 42); p.ellipse(x, y + 7 * s, 15 * s, 5 * s);
  p.fill(LEG);
  p.rect(x - 5.5 * s, y - 4 * s, 4.2 * s, 11 * s, 1);
  p.rect(x + 1.5 * s, y - 4 * s, 4.2 * s, 11 * s, 1);
  p.fill(stale ? '#9aa1a3' : shirt);
  p.rect(x - 6 * s, y - 20 * s, 12 * s, 16 * s, 2);
  p.fill(stale ? '#b9bec0' : skin);
  p.rect(x - 9 * s, y - 18 * s, 3 * s, 11 * s, 1);
  p.rect(x + 6 * s, y - 18 * s, 3 * s, 11 * s, 1);
  p.ellipse(x, y - 26 * s, 11 * s, 11 * s);
  p.fill(stale ? '#7a8084' : '#1a2022');
  p.arc(x, y - 27 * s, 11 * s, 7.5 * s, Math.PI, 0, p.CHORD);
  p.fill(STICK); p.rect(x + 5 * s, y - 46 * s, 2.6 * s, 28 * s);
  p.fill(sign); p.rect(x - 4 * s, y - 58 * s, 20 * s, 14 * s, 1);
  // fictional slogan bars (no real union marks)
  p.fill(stale ? '#c2c7c9' : '#f6f1e2');
  p.rect(x - 0.5 * s, y - 54 * s, 13 * s, 2 * s);
  p.rect(x - 0.5 * s, y - 49 * s, 10 * s, 2 * s);
}
