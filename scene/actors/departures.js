// The departures board at The Gate = when each next number lands. This actor reads ALL of scene.signals:
// every entry with a next_expected date (hourly and daily feeds left off, they are noise on a board), one row per
// distinct feed (deduped by source + cadence, earliest date kept), sorted by next_expected ascending, six rows.
// Each row reads "<MMM DD>  <short title>  <cadence>" in amber monospace on the dark board lot.js paints at
// ANCHORS.departures; the nearest upcoming release blinks; overdue rows go gray. Empty signals: "NO SCHEDULE".
// The declared signal is la_jobs so the harness has one to hand it; the board itself is built in update().

import { range } from '../rng.js';
import { useDisplay } from '../fonts.js';
import { TIER } from '../detail.js';

const MAX_ROWS = 6;
const SKIP = new Set(['hourly', 'daily']);
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const TITLE_CHARS = 28;
const RHYTHM = "The picture changes on the sources' own rhythm; this board is when each next number lands.";
const RULE = `Board rule: one row per source and cadence (earliest date kept), soonest first, ${MAX_ROWS} rows; the nearest upcoming row blinks, overdue rows go gray.`;
const PAD_X = 18;

export default {
  id: 'departures',
  signal: 'la_jobs',
  district: 'gate',
  layer: 'mid',
  rows: [],
  more: 0,          // feeds with a date that did not fit on the board
  total: 0,         // feeds with a next_expected at all
  blinkRow: -1,     // index of the nearest upcoming row
  sig: null,

  init(scene) {},

  // called on every signals.json load; rows come from every entry in scene.signals, not just the declared one
  update(sig, scene) {
    const rng = scene.childRng('departures');
    this.sig = sig;
    const today = scene.today || '';
    const dated = Object.values(scene.signals || {}).filter(e => e && e.next_expected);
    this.total = dated.length;
    const entries = dated
      .filter(e => !SKIP.has(String(e.cadence || '').toLowerCase()))
      .sort((a, b) => cmp(a.next_expected, b.next_expected) || cmp(a.id, b.id));
    const groups = new Map();
    for (const e of entries) {
      const key = `${e.source || 'source unknown'}|${e.cadence || 'cadence unknown'}`;
      const g = groups.get(key);
      if (g) { g.ids.push(e.id); continue; }             // entries arrive date-sorted, so the first is the earliest
      groups.set(key, {
        key, date: String(e.next_expected), title: e.title || e.id, cadence: e.cadence || '', source: e.source || 'source unknown',
        ids: [e.id], stale: !!e.stale, overdue: today ? cmp(String(e.next_expected).slice(0, 10), today) < 0 : false,
      });
    }
    const all = [...groups.values()].sort((a, b) => cmp(a.date, b.date) || cmp(a.key, b.key));
    this.rows = all.slice(0, MAX_ROWS).map(r => ({
      ...r,
      stale: r.stale || r.overdue,
      label: `${boardDate(r.date)}  ${shorten(r.title, TITLE_CHARS)}  ${r.cadence}`,
      days: daysBetween(today, r.date),
      flutter: range(rng, 0, Math.PI * 2),               // split-flap tremor phase, per row
    }));
    this.more = all.length - this.rows.length;
    this.blinkRow = this.rows.findIndex(r => !r.overdue);
  },

  draw(p, t, scene) {
    const C = scene.PALETTE, b = scene.ANCHORS.departures;
    const base = (hex) => scene.paint(this.sig, hex);
    const amber = base(C.windowWarm), dim = base(C.stuccoDk), paper = base(C.paper);
    const overview = scene.detailTier !== TIER.CLOSE;
    p.noStroke();
    if (scene.isNight) { p.fill(amber + '1c'); p.rect(b.x - 8, b.y - 8, b.w + 16, b.h + 16, 10); }

    p.noFill(); p.stroke(C.inkSoft); p.strokeWeight(1);
    p.rect(b.x + 5, b.y + 5, b.w - 10, b.h - 10, 3);
    p.noStroke();

    if (overview) {
      // Compact schedule card — keep the lot board face quiet until close zoom
      const cardW = 200, cardH = 72;
      const cx = b.x + 14, cy = b.y + 14;
      p.fill(26, 32, 34, 200);
      p.rect(cx, cy, cardW, cardH, 4);
      p.fill(paper); useDisplay(p, 26); p.textAlign(p.LEFT, p.TOP);
      p.text('NEXT DATA', cx + 12, cy + 10);
      p.fill(dim); p.textFont('monospace'); p.textSize(15);
      p.text(this.rows.length ? `${this.rows.length} upcoming` : 'no schedule', cx + 12, cy + 42);
      useDisplay(p); p.textAlign(p.LEFT, p.TOP);
      scene.hit(b.x, b.y, b.w, b.h, this);
      return;
    }

    p.stroke(C.inkSoft); p.strokeWeight(1);
    p.line(b.x + 12, b.y + 32, b.x + b.w - 12, b.y + 32);
    p.noStroke();

    p.fill(paper); useDisplay(p, 32); p.textAlign(p.LEFT, p.TOP);
    p.text('NEXT DATA', b.x + 14, b.y + 6);
    p.fill(dim); p.textFont('monospace'); p.textSize(18); p.textAlign(p.RIGHT, p.TOP);
    p.text(`TODAY ${boardDate(scene.today)}`, b.x + b.w - 14, b.y + 10);
    if (this.more > 0) {
      p.textSize(17); p.textAlign(p.CENTER, p.TOP);
      p.text(`+${this.more} more`, b.x + b.w / 2, b.y + 11);
    }

    const innerW = b.w - PAD_X * 2;
    p.push();
    try {
      p.drawingContext.save();
      p.drawingContext.beginPath();
      p.drawingContext.rect(b.x + 8, b.y + 36, b.w - 16, b.h - 44);
      p.drawingContext.clip();
    } catch (_) { /* headless / no canvas 2d */ }

    if (!this.rows.length) {
      p.fill(amber); p.textFont('monospace'); p.textSize(30); p.textAlign(p.CENTER, p.CENTER);
      p.text('NO SCHEDULE', b.x + b.w / 2, b.y + 90);
      p.fill(dim); p.textSize(17);
      p.text(this.total ? 'every dated feed is hourly or daily' : 'no feed has a next release date', b.x + b.w / 2, b.y + 118);
    } else {
      const on = (t % 1.2) < 0.75;
      p.textFont('monospace'); p.textSize(20); p.textAlign(p.LEFT, p.TOP);
      for (let i = 0; i < this.rows.length; i++) {
        const r = this.rows[i];
        const y = b.y + 42 + i * 24 + Math.sin(t * 9 + r.flutter) * 0.25;
        let col = scene.paint(r, amber);
        if (i === this.blinkRow) {
          col = on ? scene.paint(r, paper) : col;
          if (on) { p.fill(col); p.triangle(b.x + 8, y + 5, b.x + 8, y + 14, b.x + 14, y + 9.5); }
        }
        p.fill(col);
        const line = `${boardDate(r.date)}  ${shorten(r.title, TITLE_CHARS)}`;
        p.text(fitText(p, line, innerW), b.x + PAD_X, y);
      }
    }

    try { p.drawingContext.restore(); } catch (_) { /* ignore */ }
    p.pop();
    useDisplay(p); p.textAlign(p.LEFT, p.TOP);
    scene.hit(b.x, b.y, b.w, b.h, this);
  },

  legend(sig, scene) {
    const source = `${this.total} feed${this.total === 1 ? '' : 's'} with a next release date in data/signals.json; hourly and daily feeds stay off the board.` +
                   ` Each date is the source's own cadence plus its usual lag, not a promise.`;
    if (!this.rows.length) {
      const why = this.total ? 'Every dated feed is hourly or daily, so nothing is scheduled on the board.' : 'No feed has a scheduled next release yet.';
      return { title: 'Next data: no schedule', text: `${RHYTHM} ${why}`, source };
    }
    const lines = this.rows.map(r =>
      `${longDate(r.date)} (${whenWord(r.days)}): ${r.title}, ${r.cadence}, ${r.source}` +
      (r.ids.length > 1 ? ` (covers ${r.ids.join(', ')})` : '') + '.');
    const more = this.more > 0 ? `<br>${this.more} more feed${this.more === 1 ? '' : 's'} did not fit on the board.` : '';
    return {
      title: `Next data: ${this.rows.length} scheduled release${this.rows.length === 1 ? '' : 's'}`,
      text: `${RHYTHM}<br>${lines.join('<br>')}${more}<br>${RULE}`,
      source,
    };
  },
};

function cmp(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

function ymd(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
  return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
}

function boardDate(s) {
  const d = ymd(s);
  return d && d.m >= 1 && d.m <= 12 ? `${MON[d.m - 1]} ${String(d.d).padStart(2, '0')}` : '--- --';
}

function longDate(s) {
  const d = ymd(s);
  if (!d) return String(s);
  return new Date(Date.UTC(d.y, d.m - 1, d.d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function daysBetween(from, to) {
  const A = ymd(from), B = ymd(to);
  if (!A || !B) return null;
  return Math.round((Date.UTC(B.y, B.m - 1, B.d) - Date.UTC(A.y, A.m - 1, A.d)) / 86400000);
}

function whenWord(days) {
  if (days == null) return 'date unknown';
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days > 1) return `in ${days} days`;
  return `${-days} day${days === -1 ? '' : 's'} overdue`;
}

function shorten(s, n) {
  s = String(s || '');
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + '…';
}

function fitText(p, s, maxW) {
  let t = String(s || '');
  if (typeof p.textWidth !== 'function') return t;
  if (p.textWidth(t) <= maxW) return t;
  while (t.length > 1 && p.textWidth(t + '…') > maxW) t = t.slice(0, -1);
  return t.trimEnd() + '…';
}
