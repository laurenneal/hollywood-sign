// Newspapers blowing along the Boulevard = trade-press items in the last 24 hours (signal rss_items_24h,
// five feeds: Deadline, Variety, THR, IndieWire, TheWrap; hourly; window 168 = one week).
// 0 to 40 sheets = 40 x the count's percentile inside the trailing week. Each sheet is a small pale
// rectangle that tumbles (rotates with t), drifts right along ANCHORS.streetRun and wraps around.
// A stack on the newsstand counter grows with the same number. No data: no papers, and a note under the stand.
// The banner plane that reads the rss_flag_* signals lives in banner_plane.js (one file, one actor).

import { population, fmt, pct, periodLabel, provenance } from '../scale.js';
import { range } from '../rng.js';
import { useDisplay } from '../fonts.js';

const MIN = 0, MAX = 40;
const FEEDS_TOTAL = 5;
const NEWSPRINT = '#f7f3e8';     // local: paler than PALETTE.paper so a sheet reads on the road and the ground
const NEWSPRINT_EDGE = '#d8d2c2';

export default {
  id: 'newsstand',
  signal: 'rss_items_24h',
  district: 'boulevard',
  layer: 'mid',
  sig: null,
  n: null,
  sheets: [],
  stack: 0,
  note: '',

  init(scene, p) {},

  update(sig, scene) {
    const rng = scene.childRng('newsstand');
    const R = scene.ANCHORS.streetRun;
    this.sig = sig;
    // a loaded signal whose value is still null (feed registered, first poll pending) is no data, not the midpoint
    this.n = (sig && sig.value != null) ? population(sig, MIN, MAX, null) : null;
    const count = this.n ?? 0;
    this.note = sig ? 'no papers: rss_items_24h has no value yet' : 'no papers: rss_items_24h not in signals.json';
    this.sheets = [];
    for (let i = 0; i < count; i++) {
      this.sheets.push({
        x0: range(rng, 0, R.w - 28),            // start offset along the run
        y: range(rng, R.y + 24, R.y + R.h - 24),
        speed: range(rng, 28, 70),              // logical px per second, rightward
        spin: range(rng, 1.2, 3.2) * (rng() < 0.5 ? -1 : 1),
        phase: range(rng, 0, Math.PI * 2),
        w: range(rng, 34, 48),
        h: range(rng, 24, 34),
        flutter: range(rng, 4, 8),
      });
    }
    this.stack = Math.ceil(count / 8);         // 0..5 papers on the counter
  },

  draw(p, t, scene) {
    const A = scene.ANCHORS;
    const R = A.streetRun, NS = A.newsstand;
    const C = scene.PALETTE;
    const sig = this.sig;
    const hasData = !!(sig && sig.value != null);
    // newsprint is nearly white, so desaturating it (scene.paint) would not read as stale; use the palette grays outright
    const stale = !!(sig && sig.stale);
    const ink = stale ? C.staleLite : NEWSPRINT;
    const edge = stale ? C.stale : NEWSPRINT_EDGE;

    // ---- the stack on the counter
    p.noStroke();
    for (let i = 0; i < this.stack; i++) {
      p.fill(ink); p.rect(NS.x + 10, NS.y + NS.h - 12 - i * 6, 56, 6, 1);
      p.fill(edge); p.rect(NS.x + 10, NS.y + NS.h - 12 - i * 6 + 5, 56, 1);
    }

    // ---- the sheets blowing along the run
    for (const s of this.sheets) {
      const x = R.x + 14 + ((s.x0 + t * s.speed) % (R.w - 28));   // 14 px margin keeps a spinning sheet inside the run
      const y = s.y + Math.sin(t * 1.7 + s.phase) * s.flutter;
      const a = t * s.spin + s.phase;
      p.push();
      p.translate(x, y);
      p.rotate(a);
      p.fill(ink); p.rect(-s.w / 2, -s.h / 2, s.w, s.h, 1);
      p.fill(edge); p.rect(-s.w / 2 + 2, -1, s.w - 4, 1);        // the fold
      p.pop();
    }

    // ---- no data: say so under the stand
    if (!hasData) {
      p.fill(C.inkSoft); useDisplay(p, 16); p.textAlign(p.LEFT, p.TOP);
      p.text(this.note, NS.x - 40, NS.y + NS.h + 8);
    }

    scene.hit(R.x, R.y, R.w, R.h, this, 'run');
    scene.hit(NS.x, NS.y - 12, NS.w, NS.h + 12, this, 'stand');
  },

  legend(sig, scene) {
    if (!sig || sig.value == null) {
      return { title: 'No papers blowing', text: 'No trade-press count for the last 24 hours.', source: provenance(sig) };
    }
    const ok = scene && scene.sig ? scene.sig('rss_feeds_ok') : null;
    const feeds = ok && ok.value != null && ok.value < FEEDS_TOTAL ? ` (${Math.round(ok.value)} of ${FEEDS_TOTAL} feeds answered)` : '';
    const when = sig.period ? `24h to ${hourLabel(sig)}` : 'last 24 hours';
    return {
      title: `${this.n} papers blowing`,
      text: `${fmt(sig.value)} trade items in ${when} (Deadline, Variety, THR, IndieWire, TheWrap)` +
            ` — ${pct(sig.normalized)} of the trailing week. Drawn as 0–40 sheets${feeds}.`,
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
