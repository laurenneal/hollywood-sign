// The NYC skyline on the far hill = NYC film permit events per week (nyc_permits; weekly; direction +1;
// trailing 104 weeks; NYC Open Data, Film Permits tg4x-b46p). Seven to nine slim towers in PALETTE.inkSoft
// stand inside ANCHORS.nycSkyline, the tallest with a spire (a red aircraft light blinks on it at night), a
// couple with rooftop water tanks. Lit windows 0 to 60 = population(sig, 0, 60) = 60 x the percentile of the
// latest week inside its trailing 2 years, seeded across the towers; windowWarm at night, a paler tint by day.
// 'NYC' under it and a lag tag 'as of <period>', because the dataset runs about three months behind.
// The legend adds nyc_permits_tv and nyc_permits_film (the manifest's two sub-signals) when they exist, and
// ny_credit_projects by its own title if such a signal ever lands (no feed defines it yet, so nothing is claimed).
// Stale: gray through scene.paint. No value or no percentile: dark towers and the tag says which. Mid layer, so it
// sits on the hill; its hover region is the anchor plus 6 px above, pushed after the weather actor's whole-sky one.

import { population, norm, fmt, periodLabel, dashVersus } from '../scale.js';
import { range, int } from '../rng.js';
import { useDisplay } from '../fonts.js';

const MIN = 0, MAX = 60;
const MIN_H = 33, MAX_H = 76;     // tower heights; the tallest is MAX_H and carries the spire
const SPIRE_H = 11;
const LABEL_H = 22;               // room under the towers for 'NYC' and the lag tag, inside the anchor
const WIN_W = 3, WIN_H = 3, PITCH_X = 5, PITCH_Y = 7;
// tower width as a share of its slot (anchor width / count). The narrowest tower (0.6 of a slot) holds two
// window columns and the shortest (MIN_H) four rows, so the worst-case grid is 68 slots with seven towers,
// 76 with eight, 84 with nine: always room for all MAX lit windows, so the legend's count is the drawn count.
const TOWER_W = [0.6, 0.85];
const BLINK = 1.0;                // Hz, the aircraft light on the spire
// the anchor as districts.js defines it, used only if a scene arrives without it
const NYC_FALLBACK = { x: 2200, y: 300, w: 180, h: 110 };

export default {
  id: 'nyc_skyline',
  signal: 'nyc_permits',
  district: 'sky',
  layer: 'mid',
  towers: [],       // {x, y, w, h, spire, tank}
  slots: [],        // every window position {x, y}
  lit: [],          // the lit subset
  baseY: 0,
  n: null,
  sig: null,
  tv: null,
  film: null,
  credit: null,
  warm: [241, 199, 106],

  darkHex: '#333b3d',   // unlit window tint (inkSoft toward ink); recomputed from the palette in update()
  dayLitHex: '#f2d99a', // a lit window by day (windowWarm toward paper)

  init(scene) {
    this.tints(scene.PALETTE);
  },

  // the two local tints, mixed once per load rather than once per frame
  tints(C) {
    this.warm = hexRgb(C.windowWarm);
    this.darkHex = mix(C.inkSoft, C.ink, 0.5);
    this.dayLitHex = mix(C.windowWarm, C.paper, 0.45);
  },

  // called on every signals.json load; tower widths, heights and which windows glow come from the child RNG
  update(sig, scene) {
    const rng = scene.childRng('nyc_skyline');
    const A = scene.ANCHORS.nycSkyline || NYC_FALLBACK;
    this.sig = sig;
    this.tv = scene.sig('nyc_permits_tv');
    this.film = scene.sig('nyc_permits_film');
    this.credit = scene.sig('ny_credit_projects');
    this.tints(scene.PALETTE);
    const hasPct = sig && sig.value != null && norm(sig, null) != null;
    this.n = hasPct ? population(sig, MIN, MAX, null) : null;
    const n = this.n ?? 0;

    const count = int(rng, 7, 9);
    const baseY = A.y + A.h - LABEL_H;
    this.baseY = baseY;
    const slotW = A.w / count;
    const tallest = int(rng, Math.floor(count / 2) - 1, Math.floor(count / 2) + 1);
    this.towers = [];
    this.slots = [];
    for (let i = 0; i < count; i++) {
      const w = Math.round(slotW * range(rng, TOWER_W[0], TOWER_W[1]));
      const x = Math.round(A.x + i * slotW + range(rng, 0, slotW - w));
      const h = i === tallest ? MAX_H : Math.round(range(rng, MIN_H, MAX_H - 14));
      const tw = { x, y: baseY - h, w, h, spire: i === tallest, tank: i !== tallest && rng() < 0.3 && w >= 14 };
      // the window grid, centered on the face
      const cols = Math.max(1, Math.floor((w - 2) / PITCH_X));
      const rows = Math.max(1, Math.floor((h - 5) / PITCH_Y));
      const ox = x + Math.round((w - (cols * PITCH_X - (PITCH_X - WIN_W))) / 2);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) this.slots.push({ x: ox + c * PITCH_X, y: tw.y + 3 + r * PITCH_Y });
      this.towers.push(tw);
    }
    // which windows are lit: a seeded shuffle, then the first n
    const order = this.slots.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = order[i]; order[i] = order[j]; order[j] = tmp;
    }
    this.lit = order.slice(0, Math.min(n, this.slots.length)).map(i => this.slots[i]);
  },

  draw(p, t, scene) {
    const C = scene.PALETTE;
    const A = scene.ANCHORS.nycSkyline || NYC_FALLBACK;
    const sig = this.sig;
    const stale = !!(sig && sig.stale);
    const night = !!scene.isNight;
    const paint = (hex) => scene.paint(sig, hex);
    const body = paint(C.inkSoft);
    const dark = paint(this.darkHex);
    const lit = paint(night ? C.windowWarm : this.dayLitHex);
    const baseY = this.baseY || (A.y + A.h - LABEL_H);
    const cx = A.x + A.w / 2;
    p.noStroke();

    // quiet street plinth under the towers
    p.fill(26, 32, 34, 40);
    p.ellipse(cx + 4, baseY + 4, A.w * 0.92, 12);
    p.fill(paint(mix(C.inkSoft, C.ink, 0.45)));
    p.rect(A.x + 6, baseY - 2, A.w - 12, 5, 1);

    // towers: shallow right side plane + contact shadow (same light as the lot)
    for (const tw of this.towers) {
      p.fill(26, 32, 34, 32);
      p.ellipse(tw.x + tw.w / 2 + 3, baseY + 3, tw.w * 1.15, 7);
      p.fill(paint(mix(C.inkSoft, C.ink, 0.35)));
      p.quad(
        tw.x + tw.w, tw.y,
        tw.x + tw.w + 5, tw.y + 3,
        tw.x + tw.w + 5, baseY + 2,
        tw.x + tw.w, baseY
      );
      p.fill(body); p.rect(tw.x, tw.y, tw.w, tw.h);
      // left light strip
      p.fill(255, 250, 240, night ? 18 : 28);
      p.rect(tw.x, tw.y, 1.5, tw.h);
      if (tw.spire) {
        p.fill(body);
        p.rect(tw.x + tw.w / 2 - 1, tw.y - SPIRE_H, 2, SPIRE_H);
        p.rect(tw.x + tw.w / 2 - 3, tw.y - 3, 6, 3);                       // the crown the spire rises from
      }
      if (tw.tank) {                                                       // rooftop water tank on two legs
        const tx = tw.x + tw.w - 7, ty = tw.y - 7;
        p.fill(body);
        p.rect(tx, ty - 1, 1.5, 5); p.rect(tx + 4, ty - 1, 1.5, 5);
        p.rect(tx - 1, ty - 6, 7.5, 5, 1);
        p.triangle(tx - 1, ty - 6, tx + 6.5, ty - 6, tx + 2.75, ty - 9);
      }
    }
    // every window dark first, then the lit ones over them
    p.fill(dark);
    for (const s of this.slots) p.rect(s.x, s.y, WIN_W, WIN_H);
    if (this.lit.length) {
      if (night && !stale) {
        const g = this.warm;
        p.fill(g[0], g[1], g[2], 40);
        for (const s of this.lit) p.rect(s.x - 1.5, s.y - 1.5, WIN_W + 3, WIN_H + 3, 1);
      }
      p.fill(lit);
      for (const s of this.lit) p.rect(s.x, s.y, WIN_W, WIN_H);
      // soft mute so the water tower stays the sky landmark
      p.fill(26, 32, 34, night ? 48 : 32);
      for (const s of this.lit) p.rect(s.x, s.y, WIN_W, WIN_H);
    }
    // the aircraft light on the spire blinks at night; it sits on the tip, so its 3 px disc stays inside the anchor
    const top = this.towers.find(tw => tw.spire);
    if (top && night) {
      const on = (t * BLINK) % 1 < 0.5;
      p.fill(on ? paint(C.lamp) : C.lampOff);
      p.ellipse(top.x + top.w / 2, top.y - SPIRE_H + 1, 3, 3);
    }

    // labels under the towers: very quiet secondary — water tower keeps the sky
    useDisplay(p); p.textAlign(p.CENTER, p.TOP);
    p.fill(paint(mix(C.ink, C.inkSoft, 0.78))); p.textSize(8);
    p.text('NYC', cx, baseY + 3);
    p.fill(26, 32, 34, 90); p.textSize(6);
    p.text(this.tag(), cx, baseY + 13);
    p.textAlign(p.LEFT, p.TOP);

    scene.hit(A.x, A.y - 6, A.w, A.h + 6, this);
  },

  // the tiny line under 'NYC' (8 px type inside a 180 px anchor, so at most about 38 characters; the legend has the ids)
  tag() {
    const sig = this.sig;
    if (!sig) return 'no data: not in signals.json yet';
    if (sig.value == null) return 'no data: no value yet';
    const asOf = 'as of ' + periodLabel(sig);
    if (this.n == null) return asOf + ' · no percentile yet';
    return sig.stale ? asOf + ' · stale' : asOf;
  },

  legend(sig, scene) {
    if (!sig || sig.value == null) {
      return { title: 'NYC skyline', text: 'No New York City film permit figures yet, so the towers are dark.', sig: sig || null };
    }
    const n = this.n;
    const sc = scene && typeof scene.sig === 'function' ? scene.sig.bind(scene) : () => null;
    const tv = sc('nyc_permits_tv') || this.tv, film = sc('nyc_permits_film') || this.film;
    const parts = [];
    if (tv && tv.value != null) parts.push(`${fmt(tv.value)} for TV`);
    if (film && film.value != null) parts.push(`${fmt(film.value)} for film`);
    const split = parts.length ? ` (${parts.join(', ')})` : '';
    return {
      title: n == null ? 'NYC skyline, dark' : `${n} lit window${n === 1 ? '' : 's'}`,
      text: `New York City issued ${fmt(sig.value)} film and TV shoot permits in the week ending ${periodLabel(sig)}${split}${dashVersus(sig)}.` +
            ' More permits, more lit windows. The city\u2019s data runs about three months behind.',
      sig,
    };
  },
};

// ---- helpers local to this actor
function hexRgb(hex) {
  const c = String(hex || '#000000').replace('#', '');
  return [parseInt(c.slice(0, 2), 16) || 0, parseInt(c.slice(2, 4), 16) || 0, parseInt(c.slice(4, 6), 16) || 0];
}
function mix(a, b, t) {
  const A = hexRgb(a), B = hexRgb(b);
  const h = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${h(A[0] + (B[0] - A[0]) * t)}${h(A[1] + (B[1] - A[1]) * t)}${h(A[2] + (B[2] - A[2]) * t)}`;
}
