// Two premiere searchlights by the poster wall = today's trending film (TMDB, signal tmdb_trending, context
// only). When today's #1 trending film is playing in US theaters it is the wall's first card and both beams
// converge on it; otherwise they sweep, searching. Shown as motion, never drawn as a number; the legend
// carries the count (how many of today's 20 trending films are in theaters). Motion is a pure function of the
// scene clock; prefers-reduced-motion holds the beams still. The trending title is display-only, so replayed
// days (no extra) always sweep.

import { periodLabel } from '../scale.js';
import { TIER } from '../detail.js';
import { slotCenter } from './posters.js';

export const UNITS = [{ x: 752, y: 1332 }, { x: 978, y: 1332 }];   // clear of the ticket line and the van's spot
const LENS_UP = 12;
const SEARCH_LEN = 300;
const SPREAD = 0.075;          // beam half-width per unit of length
const BEAM = '#fff4cf';
export function lens(u) { return { x: u.x, y: u.y - LENS_UP }; }

// Beam angle (radians, canvas y down) for unit i at time t.
export function aim(i, target, t, still) {
  const L = lens(UNITS[i]);
  const phase = i * 2.1;
  if (target) {
    const base = Math.atan2(target.y - L.y, target.x - L.x);
    return base + (still ? 0 : 0.035 * Math.sin(t * 0.9 + phase));
  }
  const splay = i === 0 ? -0.28 : 0.28;
  return -Math.PI / 2 + splay + (still ? 0 : 0.5 * Math.sin(t * 0.35 + phase));
}

export default {
  id: 'searchlights',
  signal: 'tmdb_trending',
  district: 'boulevard',
  layer: 'mid',
  sig: null,
  mode: 'dark',              // converge | search | dark
  top: '',
  inTheaters: false,

  init(scene) {},

  update(sig, scene) {
    this.sig = sig;
    const extra = (sig && sig.extra) || {};
    this.top = typeof extra.top_title === 'string' ? extra.top_title : '';
    this.inTheaters = extra.top_in_theaters === true;
    if (!sig || sig.value == null) this.mode = 'dark';
    else this.mode = extra.on_wall === true && this.top ? 'converge' : 'search';
  },

  draw(p, t, scene) {
    const A = scene.ANCHORS, C = scene.PALETTE;
    const stale = !!(this.sig && this.sig.stale);
    const still = !!scene.reduceMotion;
    const target = this.mode === 'converge' ? slotCenter(A, 0) : null;
    const strength = (scene.isNight ? 64 : 22) * (stale ? 0.6 : 1);
    const color = scene.paint(this.sig, BEAM);
    p.push();
    p.noStroke();
    if (this.mode !== 'dark') {
      UNITS.forEach((u, i) => {
        const L = lens(u);
        const a = aim(i, target, t, still);
        const len = target ? Math.hypot(target.x - L.x, target.y - L.y) + 18 : SEARCH_LEN;
        beam(p, L, a, len, color, scene.detailTier === TIER.OVERVIEW ? strength * 0.7 : strength);
      });
      if (target) {
        const [r, g, b] = rgb(color);
        p.fill(r, g, b, scene.isNight ? 70 : 34);
        p.ellipse(target.x, target.y, 60, 52);
      }
    }
    UNITS.forEach((u, i) => {
      unit(p, u, C, this.mode !== 'dark' && !stale, scene.isNight, color);
      scene.hit(u.x - 24, u.y - 26, 48, 44, this, `unit${i}`);
    });
    p.pop();
  },

  legend(sig, scene) {
    if (this.mode === 'dark') {
      return {
        title: 'Searchlights \u2014 dark',
        text: 'No TMDB figures yet. Once the daily update runs, the lights point at today\u2019s most-trending film when it is ' +
              'playing in US theaters, and sweep the sky when it is not.',
        sig: sig || null,
      };
    }
    const n = Math.round(sig.value);
    const considered = (sig.extra && sig.extra.considered) || 20;
    const count = ` ${n} of today\u2019s ${considered} trending films on TMDB are playing in US theaters (${periodLabel(sig)}).`;
    let text;
    if (this.mode === 'converge') {
      text = `The lights converge on ${this.top}, today\u2019s most-trending film on TMDB: it is in US theaters, ` +
             'so it has the poster wall\u2019s first card.';
    } else if (!sig.extra) {
      text = 'The trending title is kept only for today, so on past days the lights sweep.';
    } else if (this.inTheaters) {
      text = 'Today\u2019s most-trending film on TMDB is in US theaters, but its title could not be shown safely, so the lights sweep.';
    } else {
      text = (this.top ? `Today\u2019s most-trending film on TMDB is ${this.top}, which is not on the US now-playing list, `
        : 'Today\u2019s most-trending film on TMDB is not on the US now-playing list, ') + 'so the lights sweep the sky.';
    }
    return {
      title: this.mode === 'converge' ? 'Searchlights \u2014 on today\u2019s trending film' : 'Searchlights \u2014 searching',
      text: text + count,
      sig,
    };
  },
};

function rgb(hex) {
  const c = String(hex).replace('#', '');
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}

// A soft cone from the lens: three nested wedges, widest faintest.
function beam(p, L, a, len, color, strength) {
  const [r, g, b] = rgb(color);
  const ex = L.x + Math.cos(a) * len, ey = L.y + Math.sin(a) * len;
  const nx = -Math.sin(a), ny = Math.cos(a);
  for (const [widthK, alphaK] of [[1, 0.35], [0.55, 0.6], [0.2, 1]]) {
    const w = len * SPREAD * widthK;
    p.fill(r, g, b, strength * alphaK);
    p.triangle(L.x, L.y, ex + nx * w, ey + ny * w, ex - nx * w, ey - ny * w);
  }
}

// A trailer-mounted drum light.
function unit(p, u, C, lit, night, color) {
  p.fill(26, 32, 34, 40); p.ellipse(u.x + 2, u.y + 14, 50, 10);
  p.fill(C.metalDk); p.rect(u.x - 20, u.y - 2, 40, 14, 3);
  p.fill(C.ink); p.ellipse(u.x - 12, u.y + 12, 9, 9); p.ellipse(u.x + 12, u.y + 12, 9, 9);
  p.fill(C.metal); p.ellipse(u.x, u.y - LENS_UP, 22, 22);
  if (lit && night) {
    const [r, g, b] = rgb(color);
    p.fill(r, g, b, 90); p.ellipse(u.x, u.y - LENS_UP, 30, 30);
  }
  p.fill(lit ? color : C.lampOff); p.ellipse(u.x, u.y - LENS_UP, 13, 13);
}
