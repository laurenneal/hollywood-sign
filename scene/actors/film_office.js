// The film-office window = projects approved in the latest California Film & Television Tax Credit round
// (ca_credit_round_projects, irregular cadence, direction +1). Behind the warm window lot.js paints inside
// ANCHORS.filmOffice sits a clerk who stamps: the stamping rate scales with the round's CA filming-days
// percentile (ca_credit_round_days, 0.25 to 2 stamps a second). On the counter a stack of 0 to 40 sheets =
// population(sig, 0, 40) = 40 x the round's percentile inside its trailing window (24 rounds per the feed manifest,
// read from sig.window_n); the independent share of the sheets (ca_credit_round_indie_share) is teal (PALETTE.tower),
// the rest paper. A wall sign under the window reads LAST ROUND: <MMM D> and N DAYS AGO, from sig.period (YYYY-MM-DD)
// against scene.today (the timeline sets scene.today to the replayed day before update runs, so the sign follows
// the scrubber). ca_credit_round_credits (USD) is read for the legend only. The clerk's skin and shirt, and the
// sheets' jitter, come from the child RNG. The feed's per-round extra dict (tv / film counts) is not copied into
// signals.json by summarise_signal(), so the legend does not read it.
// No data: the clerk sits idle at an empty counter and the sign reads NO ROUND DATA.

import { population, fmt, periodLabel, dashVersus } from '../scale.js';
import { range, pick } from '../rng.js';
import { useDisplay } from '../fonts.js';
import { TIER } from '../detail.js';

const MIN = 0, MAX = 40;
const WIN = { dx: 30, dy: 50, w: 160, h: 70 };   // lot.js: g.rect(f.x + 30, f.y + 50, 160, 70)
const COUNTER_H = 8;
const SHEET_W = 40, SHEET_H = 1.4;
// under the window (bottom f.y + 120) and clear of the coffee-cart awning the lot paints from y = 626 (cc.y - 14),
// which runs under the sign's left 30 px; the building ends at f.y + 150
const SIGN_DY = 116, SIGN_H = 58;
const RATE_MIN = 0.25, RATE_MAX = 2.0;           // stamps per second
const DAYS_ID = 'ca_credit_round_days';
const CREDITS_ID = 'ca_credit_round_credits';
const INDIE_ID = 'ca_credit_round_indie_share';
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
// local colors: the palette has no counter wood or stamp rubber
const WOOD = '#8a6a3e';
const STAMP = '#3a3f43';

function rgb(hex) {
  const c = hex.replace('#', '');
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}

function parseYMD(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + 'T00:00:00Z');
  return Number.isNaN(d.getTime()) ? null : d;
}

function valueOf(sig) {
  if (!sig || sig.value == null) return null;
  const v = Number(sig.value);
  return Number.isFinite(v) ? v : null;
}

// 0..1 share; tolerate a feed that hands over a percent
function shareOf(sig) {
  const v = valueOf(sig);
  if (v == null) return null;
  return Math.max(0, Math.min(1, v <= 1 ? v : v / 100));
}

function money(v) {
  if (v == null) return 'no data';
  const abs = Math.abs(v);
  if (abs >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
  return fmt(v, 'USD');
}

// how far down the arm is, 0 up .. 1 on the counter, over one stamp cycle u in 0..1: hold up, strike, hold, lift
function strike(u) {
  if (u < 0.55) return 0;
  if (u < 0.68) return ease((u - 0.55) / 0.13);
  if (u < 0.8) return 1;
  return 1 - ease((u - 0.8) / 0.2);
}
function ease(u) { return u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u); }

export default {
  id: 'film_office',
  signal: 'ca_credit_round_projects',
  district: 'street',
  layer: 'mid',
  win: null,        // the window rect
  sheets: [],       // {y, indie, jx} bottom first
  n: null,          // sheets on the counter, or null with no data
  rate: 0,          // stamps per second
  phase: 0,
  clerk: null,      // {skin, shirt}
  sign: null,       // {line1, line2}
  daysAgo: null,
  indie: null, days: null, credits: null, pctDays: null, rateFrom: null,
  sig: null,

  init(scene) {},

  // called on every signals.json load; the clerk's look and the sheets' jitter come from the child RNG
  update(sig, scene) {
    const rng = scene.childRng('film_office');
    const f = scene.ANCHORS.filmOffice, C = scene.PALETTE;
    this.sig = sig;
    this.win = { x: f.x + WIN.dx, y: f.y + WIN.dy, w: WIN.w, h: WIN.h };
    this.clerk = { skin: pick(rng, C.skin), shirt: pick(rng, C.shirt) };
    this.phase = range(rng, 0, 1);

    const v = valueOf(sig);
    this.n = v != null ? population(sig, MIN, MAX, null) : null;
    const daysSig = scene.sig(DAYS_ID), creditsSig = scene.sig(CREDITS_ID), indieSig = scene.sig(INDIE_ID);
    this.days = valueOf(daysSig);
    this.credits = valueOf(creditsSig);
    this.indie = shareOf(indieSig);
    // the stamping rate: the round's filming-days percentile, else the project count's own, else the middle
    if (daysSig && daysSig.normalized != null) { this.pctDays = Math.max(0, Math.min(1, daysSig.normalized)); this.rateFrom = 'days'; }
    else if (sig && sig.normalized != null) { this.pctDays = Math.max(0, Math.min(1, sig.normalized)); this.rateFrom = 'projects'; }
    else { this.pctDays = null; this.rateFrom = null; }
    this.rate = this.n == null ? 0 : RATE_MIN + (RATE_MAX - RATE_MIN) * (this.pctDays ?? 0.5);

    // the stack: sheet 0 on the counter, the independent share teal at the bottom
    this.sheets = [];
    const count = Math.max(0, Math.min(MAX, this.n ?? 0));
    const nIndie = this.indie != null ? Math.round(count * this.indie) : 0;
    const counterTop = this.win.y + this.win.h - COUNTER_H;
    for (let i = 0; i < count; i++) {
      this.sheets.push({ y: counterTop - (i + 1) * SHEET_H, indie: i < nIndie, jx: range(rng, -1.2, 1.2) });
    }

    // the wall sign
    this.daysAgo = null;
    if (v == null) {
      this.sign = { line1: 'NO ROUND DATA', line2: null };
    } else {
      const when = parseYMD(sig.period), today = parseYMD(scene.today);
      if (when) {
        const yr = when.getUTCFullYear();
        const sameYear = today && today.getUTCFullYear() === yr;
        this.sign = { line1: `LAST ROUND: ${MONTHS[when.getUTCMonth()]} ${when.getUTCDate()}${sameYear ? '' : ' ' + yr}`, line2: null };
        if (today) {
          this.daysAgo = Math.round((today - when) / 86400000);
          this.sign.line2 = this.daysAgo === 0 ? 'TODAY' : this.daysAgo === 1 ? '1 DAY AGO' : this.daysAgo < 0 ? 'DATED AHEAD' : `${this.daysAgo} DAYS AGO`;
        }
      } else {
        // a period that is not a calendar date: show it as the feed labels it, and its age if the feed computed one
        this.sign = { line1: `LAST ROUND: ${(periodLabel(sig) || String(sig.period || '?')).toUpperCase()}`, line2: null };
        if (sig.age_days != null) { this.daysAgo = Math.round(sig.age_days); this.sign.line2 = `${this.daysAgo} DAYS AGO`; }
      }
    }
  },

  draw(p, t, scene) {
    const C = scene.PALETTE, w = this.win, sig = this.sig;
    const paint = (hex) => scene.paint(sig, hex);
    const counterTop = w.y + w.h - COUNTER_H;
    p.noStroke();

    // after dark the warm window throws light on the wall
    if (scene.isNight) { const [gr, gg, gb] = rgb(C.windowWarm); p.fill(gr, gg, gb, 44); p.rect(w.x - 8, w.y - 8, w.w + 16, w.h + 16, 5); }

    // the clerk, left of center, seated behind the counter (scaled up for phone district zoom)
    const cx = w.x + 48, shoulderY = w.y + 30;
    const skin = paint(this.clerk.skin), shirt = paint(this.clerk.shirt);
    p.fill(shirt); p.rect(cx - 22, shoulderY, 44, w.h - COUNTER_H - 30 + 2, 6, 6, 0, 0);   // shoulders and torso
    p.fill(skin); p.rect(cx - 5, shoulderY - 10, 10, 12);                                     // neck
    p.ellipse(cx, shoulderY - 18, 26, 28);                                                 // head
    p.fill(C.ink); p.arc(cx, shoulderY - 22, 27, 20, Math.PI, Math.PI * 2);                // hair
    // resting arm on the counter
    p.fill(skin); p.rect(cx - 22, counterTop - 9, 28, 8, 2);

    // the stamping arm: shoulder to hand, a stamp in the hand
    const u = this.rate > 0 ? ((t * this.rate + this.phase) % 1) : 0;
    const d = this.rate > 0 ? strike(u) : 0;
    const sx = cx + 18, sy = shoulderY + 6;
    const upX = w.x + 68, upY = w.y + 14;
    const dnX = w.x + 76, dnY = counterTop - 7;
    const hx = upX + (dnX - upX) * d, hy = upY + (dnY - upY) * d;
    p.stroke(skin); p.strokeWeight(7); p.line(sx, sy, hx, hy); p.noStroke();
    p.fill(skin); p.ellipse(hx, hy, 11, 11);
    p.fill(paint(STAMP)); p.rect(hx - 4, hy - 1, 8, 8); p.rect(hx - 9, hy + 4, 18, 5, 1);  // stamp handle and rubber
    if (d > 0.95 && this.n != null) { p.fill(paint(C.lamp)); p.rect(dnX - 6, counterTop - 2, 12, 2); }   // the mark

    // the counter, then the stack on it
    p.fill(paint(WOOD)); p.rect(w.x, counterTop, w.w, COUNTER_H);
    const stackX = w.x + 96;
    const paper = paint(C.paper), teal = paint(C.tower);
    for (const s of this.sheets) { p.fill(s.indie ? teal : paper); p.rect(stackX + s.jx, s.y, SHEET_W, SHEET_H + 0.4); }
    if (this.sheets.length) { p.fill(paint(C.inkSoft)); p.rect(stackX + 6, this.sheets[this.sheets.length - 1].y - 0.2, SHEET_W - 12, 0.6); }
    // an ink pad beside the stack
    p.fill(paint(STAMP)); p.rect(w.x + 140, counterTop - 4, 16, 4, 1);

    // the wall sign under the window — CLOSE only (LAST ROUND copy is noise at district)
    if (scene.detailTier === TIER.CLOSE) {
      const f = scene.ANCHORS.filmOffice;
      const sgn = { x: w.x, y: f.y + SIGN_DY, w: w.w, h: SIGN_H };
      const inkCol = this.n == null ? C.inkSoft : paint(C.ink);
      p.fill(paint(C.paper)); p.stroke(inkCol); p.strokeWeight(1); p.rect(sgn.x, sgn.y, sgn.w, sgn.h, 2); p.noStroke();
      p.fill(inkCol); useDisplay(p); p.textAlign(p.CENTER, p.TOP);
      if (this.sign) {
        const lines = this.sign.line2 ? [this.sign.line1, this.sign.line2] : [this.sign.line1];
        const size = lines.length > 1 ? 24 : 26;
        p.textSize(size);
        const widest = Math.max(1, ...lines.map((l) => p.textWidth(l)));
        if (widest > sgn.w - 12) p.textSize(size * (sgn.w - 12) / widest);   // fit the plate
        if (lines.length > 1) { p.text(lines[0], sgn.x + sgn.w / 2, sgn.y + 6); p.text(lines[1], sgn.x + sgn.w / 2, sgn.y + 30); }
        else p.text(lines[0], sgn.x + sgn.w / 2, sgn.y + 16);
      }
      p.textAlign(p.LEFT, p.TOP);
      scene.hit(w.x - 4, w.y - 4, w.w + 8, (sgn.y + sgn.h) - w.y + 6, this);
    } else {
      scene.hit(w.x - 4, w.y - 4, w.w + 8, w.h + 20, this);
    }
  },

  legend(sig) {
    if (!sig || sig.value == null) {
      return { title: 'The film office', text: 'No California tax-credit round loaded yet, so the counter is empty.', sig: sig || null };
    }
    const n = this.n ?? population(sig, MIN, MAX, null);
    const indiePct = this.indie != null ? Math.round(this.indie * 100) : null;
    const indie = indiePct == null ? '' : indiePct === 0 ? ', none of them independent' : `, ${indiePct}% of them independent`;
    const credits = this.credits != null ? ` The round awarded ${money(this.credits)} in credits.` : '';
    const ago = this.daysAgo == null ? '' : this.daysAgo === 0 ? ' It was announced today.'
      : ` It was announced ${this.daysAgo} day${this.daysAgo === 1 ? '' : 's'} ago.`;
    return {
      title: `${n} sheets on the counter`,
      text: `California\u2019s film tax credit approved ${fmt(Math.round(sig.value))} projects in its latest round (${periodLabel(sig)})${indie}` +
            `${dashVersus(sig, { unit: 'rounds' })}.${credits}${ago} The clerk stamps faster when a round brings more filming to California.`,
      sig,
    };
  },
};
