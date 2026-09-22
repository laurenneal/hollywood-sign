// Scrolling trade billboard on the Boulevard = GDELT DOC short crawl lines (signal trade_headlines).
// Continuous horizontal scroll across ANCHORS.billboards; prefers-reduced-motion (and ?t= freeze) → static.
// Empty / zero / missing → grey board with NO COPY (and STALE when the signal is stale). Hover legend is short;
// provenance rides in the quiet .src line.

import { fmt, periodLabel, provenance } from '../scale.js';
import { useDisplay } from '../fonts.js';

const INK = '#f4efe4';
const INK_DIM = '#b9b3a6';
const SPEED = 42;           // logical px per second

export default {
  id: 'billboard',
  signal: 'trade_headlines',
  district: 'boulevard',
  layer: 'mid',
  sig: null,
  lines: [],
  note: '',
  reduceMotion: false,

  init(scene) {},

  update(sig, scene) {
    this.sig = sig;
    this.reduceMotion = !!(scene && scene.reduceMotion);
    const headlines = (sig && sig.extra && Array.isArray(sig.extra.headlines)) ? sig.extra.headlines : [];
    this.lines = headlines
      .map((h) => (h && h.text ? String(h.text) : ''))
      .filter(Boolean);
    if (!sig) this.note = 'NO COPY';
    else if (sig.value == null || !this.lines.length) this.note = sig.stale ? 'STALE · NO COPY' : 'NO COPY';
    else this.note = '';
  },

  draw(p, t, scene) {
    const boards = scene.ANCHORS.billboards || [];
    const C = scene.PALETTE;
    const sig = this.sig;
    const stale = !!(sig && sig.stale);
    const ink = stale ? C.staleLite : INK;
    const dim = stale ? C.stale : INK_DIM;

    boards.forEach((b, i) => {
      // face sits on the lot's designed board; crawl clears the teal TRADE header strip
      const x = b.x + 6, y = b.y + 34, w = b.w - 12, h = b.h - 42;
      const ctx2d = p.drawingContext;
      const canClip = ctx2d && typeof ctx2d.save === 'function';
      p.push();
      if (canClip) {
        ctx2d.save();
        ctx2d.beginPath();
        ctx2d.rect(x, y, w, h);
        ctx2d.clip();
      }

      if (this.note || !this.lines.length) {
        p.fill(dim); useDisplay(p, 26); p.textAlign(p.CENTER, p.CENTER);
        p.text(this.note || 'NO COPY', x + w / 2, y + h / 2);
      } else {
        const crawl = this.lines.join('   ·   ') + '   ·   ';
        p.fill(ink); useDisplay(p, 22); p.textAlign(p.LEFT, p.CENTER);
        const tw = Math.max(p.textWidth(crawl), 1);
        if (this.reduceMotion || scene.frozenTime != null) {
          // static: pin the start of the reel; second board offsets into the string
          const offset = (i * Math.floor(tw / 4)) % tw;
          p.text(crawl, x + 4 - offset, y + h / 2);
          p.text(crawl, x + 4 - offset + tw, y + h / 2);
        } else {
          const shift = (t * SPEED) % tw;
          p.text(crawl, x + 4 - shift, y + h / 2);
          p.text(crawl, x + 4 - shift + tw, y + h / 2);
        }
      }

      if (canClip) ctx2d.restore();
      p.pop();
      scene.hit(b.x, b.y, b.w, b.h + 70, this, i === 0 ? 'board' : 'board2');
    });
  },

  legend(sig) {
    if (!sig || sig.value == null || !this.lines.length) {
      return {
        title: 'Trade billboard',
        text: 'No GDELT trade crawl lines for this day — the boards stay blank (NO COPY).',
        source: sig ? provenance(sig) : 'GDELT Project (gdeltproject.org)',
      };
    }
    const sample = this.lines[0];
    const n = Math.round(sig.value);
    return {
      title: 'Trade billboard',
      text: `${n} short GDELT trade-domain line${n === 1 ? '' : 's'} from the last day` +
            (sig.period ? ` (${periodLabel(sig)})` : '') +
            `. Scrolls the crawl; reduced motion holds it still. First line: “${sample}”.`,
      source: provenance(sig),
    };
  },
};
