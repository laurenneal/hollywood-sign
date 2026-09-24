// Two Boulevard boards. Primary signal: trade_headlines (GDELT DOC short crawl lines).
// Four honest faces, never a fake headline:
//   trade  — fresh GDELT lines scroll the crawl
//   stale  — last-known lines, greyed, "as of <date>"
//   house  — feed ran clean but the wire was quiet: the lot's own house notices (header relabeled THE LOT)
//   dark   — feed missing/errored: boards dark
// prefers-reduced-motion (and ?t= freeze) hold the crawl still. House copy is deterministic (data + date).

import { useDisplay } from '../fonts.js';
import { TIER } from '../detail.js';

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
  mode: 'dark',            // trade | stale | house | dark
  reduceMotion: false,

  init(scene) {},

  update(sig, scene) {
    this.sig = sig;
    this.reduceMotion = !!(scene && scene.reduceMotion);
    const headlines = (sig && sig.extra && Array.isArray(sig.extra.headlines)) ? sig.extra.headlines : [];
    const tradeLines = headlines.map((h) => (h && h.text ? String(h.text) : '')).filter(Boolean);
    if (tradeLines.length) {
      this.mode = (sig && sig.stale) ? 'stale' : 'trade';
      this.lines = tradeLines;
    } else if (sig && !sig.error && !sig.stale) {
      this.mode = 'house';                     // quiet on the trades → the lot talks about itself
      this.lines = houseLines(scene);
    } else {
      this.mode = 'dark';                      // missing / errored / stale-empty
      this.lines = [];
    }
  },

  draw(p, t, scene) {
    const boards = scene.ANCHORS.billboards || [];
    const C = scene.PALETTE;
    const overview = scene.detailTier === TIER.OVERVIEW;
    const stale = this.mode === 'stale';
    const ink = stale ? C.staleLite : INK;
    const dim = stale ? C.stale : INK_DIM;

    boards.forEach((b, i) => {
      const x = b.x + 6, y = b.y + 34, w = b.w - 12, h = b.h - 42;
      const ctx2d = p.drawingContext;
      const canClip = ctx2d && typeof ctx2d.save === 'function';
      p.push();
      if (canClip) { ctx2d.save(); ctx2d.beginPath(); ctx2d.rect(x, y, w, h); ctx2d.clip(); }

      if (this.mode === 'dark') {
        if (!overview) {
          p.noStroke(); p.fill(38, 46, 48, 70); p.rect(x, y, w, h);
          p.fill(dim); useDisplay(p, 24); p.textAlign(p.CENTER, p.CENTER);
          p.text('BOARDS DARK', x + w / 2, y + h / 2);
        }
      } else if (!this.lines.length) {
        /* nothing to draw */
      } else if (overview) {
        // one static fragment — no illegible smear when small
        p.fill(ink); useDisplay(p, 20); p.textAlign(p.LEFT, p.CENTER);
        p.text(this.lines[0].slice(0, 28), x + 8, y + h / 2);
      } else {
        const staticCrawl = this.reduceMotion || scene.frozenTime != null;
        this._crawl(p, this.lines, x, y, w, h, ink, t, i, staticCrawl);
      }

      if (canClip) ctx2d.restore();
      p.pop();

      // House boards relabel the baked "TRADE" header to "THE LOT" so house copy can't read as trade press.
      if (this.mode === 'house') {
        p.noStroke(); p.fill(C.tower); p.rect(b.x + 2, b.y + 3, b.w - 4, 28);
        p.fill(C.paper); useDisplay(p, 28); p.textAlign(p.LEFT, p.CENTER);
        p.text('THE LOT', b.x + 12, b.y + 18);
        p.textAlign(p.LEFT, p.TOP);
      }

      scene.hit(b.x, b.y, b.w, b.h + 70, this, i === 0 ? 'board' : 'board2');
    });
  },

  _crawl(p, lines, x, y, w, h, ink, t, boardIndex, staticCrawl) {
    const crawl = lines.join('   \u00b7   ') + '   \u00b7   ';
    p.fill(ink); useDisplay(p, 22); p.textAlign(p.LEFT, p.CENTER);
    const tw = Math.max(p.textWidth(crawl), 1);
    if (staticCrawl) {
      const offset = (boardIndex * Math.floor(tw / 4)) % tw;
      p.text(crawl, x + 4 - offset, y + h / 2);
      p.text(crawl, x + 4 - offset + tw, y + h / 2);
    } else {
      const shift = (t * SPEED) % tw;
      p.text(crawl, x + 4 - shift, y + h / 2);
      p.text(crawl, x + 4 - shift + tw, y + h / 2);
    }
  },

  legend(sig) {
    if (this.mode === 'trade' || this.mode === 'stale') {
      const sample = this.lines[0] || '';
      const held = this.mode === 'stale' ? ' These are the most recent ones; the feed has not updated since.' : '';
      return {
        title: 'Trade billboard',
        text: `The latest headlines from Hollywood\u2019s trade press, scrolling. First up: \u201c${sample}\u201d.${held}`,
        sig: sig || null,
      };
    }
    if (this.mode === 'house') {
      return {
        title: 'Trade billboard \u2014 quiet',
        text: 'No new trade headlines in the last day, so the boards show notices about the lot.' +
              ' They fill with real headlines from Variety, Deadline and the other trades when news breaks.',
        sig: sig || null,
      };
    }
    return {
      title: 'Trade billboard \u2014 dark',
      text: 'The headline feed is not available right now, so the boards are dark.',
      sig: sig || null,
    };
  },
};

// Soonest upcoming release across all signals (deterministic given signals.json + today).
function soonestNext(scene) {
  const today = String((scene && scene.today) || '');
  let best = null;
  const sigs = (scene && scene.signals) || {};
  for (const [id, s] of Object.entries(sigs)) {
    const d = s && s.next_expected;
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
    if (today && d < today) continue;
    if (!best || d < best.date) best = { date: d, title: s.title || id };
  }
  return best;
}

// House-board copy: true statements about the lot, never a fabricated headline.
function houseLines(scene) {
  const out = ['THE HOLLYWOOD SIGN \u2014 EVERY CROWD HERE IS ONE PUBLIC NUMBER'];
  const idx = (scene && typeof scene.sig === 'function') ? scene.sig('sign_index') : null;
  if (idx && idx.value != null) out.push(`SIGN INDEX ${Math.round(idx.value)} / 100`);
  out.push('NOW REPLAYING \u2014 DRAG THE BAR TO 2023');
  const nx = soonestNext(scene);
  if (nx) out.push(`NEXT DATA \u2014 ${String(nx.title).toUpperCase()} ${nx.date}`);
  return out;
}
