// The banner plane = the loudest trade-press headline flag of the last 24 hours. Bound to rss_items_24h
// for freshness; reads the six rss_flag_* counts (strike, layoffs, shutdown, greenlight, acquires, festival)
// from scene.signals in update(). If the largest flag counts 3 or more items, a small plane crosses the sky
// band at y ~120 every 40 s of t towing that word in caps; otherwise the plane stays grounded and only a
// windsock on the far hill marks the airfield (hover it for the status). Layer front, so it flies over the hills.

import { fmt, pct, periodLabel, provenance } from '../scale.js';
import { useDisplay } from '../fonts.js';

const FLAGS = ['strike', 'layoffs', 'shutdown', 'greenlight', 'acquires', 'festival'];
const THRESHOLD = 3;
const LAP_SECONDS = 40;
const FLY_Y = 120;
const MARGIN = 260;              // the plane starts and ends this far off the left and right edges

// Local colors: no aircraft entries in the palette.
const FUSELAGE = '#e8dcc0';
const WING = '#c3302a';          // same red as PALETTE.lamp
const BANNER = '#fbf8ee';
const BANNER_INK = '#1a2022';
const SOCK = '#e0a33b';

export default {
  id: 'banner_plane',
  signal: 'rss_items_24h',
  district: 'sky',
  layer: 'front',
  sig: null,
  flag: null,        // {word, count, sig} of the winning flag, or null
  largest: null,     // the largest flag even when below threshold, for the legend
  flagsSeen: 0,
  word: '',          // the towed word in caps, built once per load
  bannerW: 0,
  sock: null,

  init(scene, p) {},

  update(sig, scene) {
    this.sig = sig;
    this.flag = null;
    this.largest = null;
    this.flagsSeen = 0;
    for (const word of FLAGS) {
      const f = scene.sig ? scene.sig('rss_flag_' + word) : null;
      if (!f || f.value == null) continue;
      this.flagsSeen++;
      const count = Number(f.value);
      if (!this.largest || count > this.largest.count) this.largest = { word, count, sig: f };
    }
    if (this.largest && this.largest.count >= THRESHOLD) this.flag = this.largest;
    this.word = this.flag ? this.flag.word.toUpperCase() : '';
    this.bannerW = this.flag ? this.flag.word.length * 30 + 64 : 0;
    // the windsock stands on the crest of the far hill lot.js draws (ellipse 1900,470 x 1400,300)
    this.sock = { x: 1560, y: 346 };
  },

  draw(p, t, scene) {
    const C = scene.PALETTE;
    const sig = this.sig;
    const night = scene.isNight;

    // ---- windsock on the hill: the airfield marker that carries the hover when nothing flies
    const s = this.sock;
    const gust = Math.sin(t * 1.3) * 0.5 + 0.5;
    p.noStroke();
    p.fill(26, 32, 34, 34); p.ellipse(s.x + 2, s.y + 3, 24, 8);
    p.fill(C.stuccoDk); p.ellipse(s.x, s.y, 16, 7);
    p.stroke(C.inkSoft); p.strokeWeight(3.2); p.line(s.x, s.y, s.x, s.y - 42);
    p.noStroke(); p.fill(scene.paint(sig, SOCK));
    p.triangle(s.x, s.y - 42, s.x, s.y - 26, s.x + 28 + gust * 12, s.y - 32 + gust * 4);
    p.fill(scene.paint(sig, mixHexLocal(SOCK, '#1a2022', 0.22)));
    p.triangle(s.x, s.y - 40, s.x, s.y - 30, s.x + 14 + gust * 6, s.y - 34 + gust * 2);
    scene.hit(s.x - 12, s.y - 50, 56, 56, this, 'sock');

    if (!this.flag) return;

    // ---- the plane, left to right, one lap every LAP_SECONDS
    const span = scene.W + MARGIN * 2;
    const x = -MARGIN + ((t * span) / LAP_SECONDS) % span;
    const y = FLY_Y + Math.sin(t * 0.8) * 6;
    // fuselage and banner are nearly white, so desaturating them would not read as stale: use the palette grays
    const fstale = !!this.flag.sig.stale;
    const fus = fstale ? C.staleLite : FUSELAGE;
    const wing = scene.paint(this.flag.sig, WING);

    // tow rope and banner, trailing behind the tail with a slow flutter
    const bw = this.bannerW, bh = 64;
    const bx = x - 52 - bw, by = y - bh / 2 + Math.sin(t * 2.1) * 3;
    p.stroke(C.inkSoft); p.strokeWeight(2.6); p.line(x - 28, y, bx + bw, by + bh / 2);
    p.noStroke();
    p.fill(26, 32, 34, 28); p.rect(bx + 2, by + 3, bw, bh, 3);
    p.fill(fstale ? C.staleLite : BANNER); p.rect(bx, by, bw, bh, 3);
    p.fill(fstale ? C.stale : '#c3302a'); p.rect(bx, by, 12, bh, 3, 0, 0, 3);
    p.fill(fstale ? C.stale : BANNER_INK);
    useDisplay(p); p.textStyle(p.BOLD); p.textSize(40); p.textAlign(p.CENTER, p.CENTER);
    p.text(this.word, bx + bw / 2 + 2, by + bh / 2 + 1);
    p.textStyle(p.NORMAL); p.textAlign(p.LEFT, p.TOP);

    // fuselage, wing, tail, propeller — larger so the sky pass reads at full-lot
    p.fill(26, 32, 34, Math.round(32 * (fstale ? 0.6 : 1))); p.ellipse(x + 2, y + 8, 78, 16);
    p.fill(fus); p.ellipse(x, y, 78, 22);
    p.fill(255, 250, 240, 55); p.ellipse(x + 8, y - 4, 36, 8);
    p.fill(wing); p.rect(x - 20, y - 5, 40, 10, 2);
    p.triangle(x - 36, y, x - 44, y - 20, x - 26, y - 2);
    p.stroke(C.ink); p.strokeWeight(2.4);
    const pa = t * 30;
    p.line(x + 32 + Math.cos(pa) * 1, y - Math.sin(pa) * 11, x + 32 - Math.cos(pa) * 1, y + Math.sin(pa) * 11);
    p.noStroke();
    if (night) { p.fill(Math.floor(t * 2) % 2 ? '#ff5a4a' : '#7a2a24'); p.ellipse(x - 34, y - 12, 6, 6); }

    // hover region clipped to the canvas: the plane starts and ends its lap off both edges
    const hx0 = Math.max(0, bx), hx1 = Math.min(scene.W, bx + bw + 96);
    if (hx1 > hx0) scene.hit(hx0, Math.min(by, y - 16), hx1 - hx0, bh + 16, this, 'plane');
  },

  legend(sig) {
    if (this.flag) {
      const f = this.flag;
      const when = f.sig.period ? `24h to ${hourLabel(f.sig)}` : 'last 24 hours';
      return {
        title: `Banner plane: ${this.word}`,
        text: `${fmt(f.count)} trade items in ${when} matched “${f.word}”` +
              ` (≥${THRESHOLD}, largest flag` +
              (f.sig.normalized != null ? `, ${pct(f.sig.normalized)} of the week` : '') +
              `). Plane loops every ${LAP_SECONDS}s while the flag holds.`,
        source: provenance(f.sig),
      };
    }
    if (!sig || sig.value == null) {
      return { title: 'Banner plane grounded', text: 'No trade-press feed — nothing to tow.', source: provenance(sig) };
    }
    const best = this.largest ? ` Largest flag: ${this.largest.word.toUpperCase()} at ${fmt(this.largest.count)}.` : '';
    const seen = this.flagsSeen ? '' : ' No rss_flag_* signals loaded yet.';
    return {
      title: 'Banner plane grounded',
      text: `No headline flag at ${THRESHOLD}+ items in 24h.${best}${seen}`,
      source: provenance(sig),
    };
  },
};

// The RSS feed's period is the UTC hour of the poll, "YYYY-MM-DDTHH"; scale.periodLabel does not know that
// shape and would print it raw. Anything else falls through to the shared label.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function hourLabel(sig) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2})$/.exec(sig.period || '');
  if (m) return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[4]}:00 UTC`;
  return periodLabel(sig);
}

function mixHexLocal(a, b, t) {
  const A = hexLocal(a), B = hexLocal(b);
  const h = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${h(A[0] + (B[0] - A[0]) * t)}${h(A[1] + (B[1] - A[1]) * t)}${h(A[2] + (B[2] - A[2]) * t)}`;
}
function hexLocal(s) {
  const c = s.replace('#', '');
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}
