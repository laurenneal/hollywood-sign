// The theater marquee and its ticket line = the weekend number-one film (signal weekend_no1).
// value = weekend gross in USD, label = film title, period = the Sunday the weekend ended, window 52.
// Ticket line: 0 to 40 larger figures = 40 × the gross's percentile (was 0–120 tiny blobs).

import { population, periodLabel, versusParts } from '../scale.js';
import { range, pick } from '../rng.js';
import { useDisplay } from '../fonts.js';
import { TIER } from '../detail.js';

const MIN = 0, MAX = 20;
const TITLE_MAX = 26;
const STEP_SECONDS = 2.4;
const CHASE_HZ = 6;
const FIG = 1.25;  // match crew scale vs stage door
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// Local colors: the palette has no bulb or lit-panel entries, so they live here.
const BULB_NIGHT_ON = '#ffe9a6';
const BULB_NIGHT_OFF = '#7a5a34';
const BULB_DAY_ON = '#d9b56a';
const BULB_DAY_OFF = '#5a4a48';   // same as PALETTE.lampOff
const BULB_GLOW = BULB_NIGHT_ON + '55';   // translucent halo behind a lit bulb at night
const PANEL_NIGHT = '#fff4cf';    // the backlit panel after dark
const ROPE = '#8a2a24';           // velvet rope
const POST = '#b08d3c';           // brass stanchion

export default {
  id: 'marquee',
  signal: 'weekend_no1',
  district: 'boulevard',
  layer: 'mid',
  sig: null,
  n: null,
  title: '',
  gross: '',
  weekend: '',
  subline: '',
  bulbs: [],
  figures: [],
  path: null,       // the serpentine the line follows
  spacing: 1,
  posts: [],
  ropes: [],

  init(scene, p) {},

  // called on every signals.json load: fixed geometry plus a deterministic layout of the figures
  update(sig, scene) {
    const rng = scene.childRng('marquee');
    const A = scene.ANCHORS;
    const M = A.marquee, TL = A.ticketLine, TH = A.theater;
    this.sig = sig;
    // a loaded signal whose value is still null (feed registered, no observation yet) is no data, not the midpoint
    const hasData = !!(sig && sig.value != null);
    this.n = hasData ? population(sig, MIN, MAX, null) : null;
    const count = this.n ?? 0;

    // ---- marquee copy (strings are built here, once per load, not per frame)
    if (hasData) {
      const raw = String(sig.label || 'UNTITLED').toUpperCase();
      this.title = raw.length > TITLE_MAX ? raw.slice(0, TITLE_MAX - 1).trimEnd() + '\u2026' : raw;
      this.gross = money(sig.value);
      this.weekend = 'WEEKEND OF ' + weekendLabel(sig);
      this.subline = this.gross + '   \u00b7   ' + this.weekend;
    } else {
      this.title = 'NO SHOW';
      this.gross = '';
      this.weekend = '';
      this.subline = sig ? 'weekend_no1 has no value yet' : 'weekend_no1 not in signals.json';
    }

    // ---- bulbs around the marquee edge, inset 7 px so the night glow stays inside the frame, about every 14 px
    this.bulbs = [];
    const bx = M.x + 7, by = M.y + 7, bw = M.w - 14, bh = M.h - 14;
    const nx = Math.round(bw / 14), ny = Math.round(bh / 14);
    for (let i = 0; i <= nx; i++) this.bulbs.push({ x: bx + (bw * i) / nx, y: by });
    for (let j = 1; j < ny; j++) this.bulbs.push({ x: bx + bw, y: by + (bh * j) / ny });
    for (let i = nx; i >= 0; i--) this.bulbs.push({ x: bx + (bw * i) / nx, y: by + bh });
    for (let j = ny - 1; j >= 1; j--) this.bulbs.push({ x: bx, y: by + (bh * j) / ny });

    // ---- the serpentine: head at the doors, left along row one, down, right along row two
    const doorX = TH.x + 260;                 // center of the doors lot.js draws at TH.x + 200 .. + 320
    const leftX = TL.x + 16, rightX = TL.x + TL.w - 16;
    const y1 = TL.y + 28, y2 = TL.y + 70;
    const seg1 = doorX - leftX, seg2 = y2 - y1, seg3 = rightX - leftX;
    this.path = { doorX, leftX, rightX, y1, y2, seg1, seg2, seg3, total: seg1 + seg2 + seg3 };
    this.spacing = this.path.total / MAX;

    // stanchions and ropes: outside row one, between the rows, outside row two
    this.posts = [];
    this.ropes = [];
    const ropeRuns = [
      { y: y1 - 14, x0: leftX - 8, x1: doorX - 20 },
      { y: (y1 + y2) / 2, x0: leftX - 8, x1: doorX - 20 },
      { y: y2 + 14, x0: leftX - 8, x1: rightX + 8 },
    ];
    for (const r of ropeRuns) {
      const k = Math.max(1, Math.round((r.x1 - r.x0) / 72));
      for (let i = 0; i <= k; i++) this.posts.push({ x: r.x0 + ((r.x1 - r.x0) * i) / k, y: r.y });
      this.ropes.push(r);
    }

    // ---- the people in line
    this.figures = [];
    for (let i = 0; i < count; i++) {
      this.figures.push({
        i,
        phase: range(rng, 0, Math.PI * 2),
        stepPhase: rng(),
        side: i % 2 ? 1.5 : -1.5,
        skin: pick(rng, scene.PALETTE.skin),
        shirt: pick(rng, scene.PALETTE.shirt),
        hat: rng() < 0.18,
      });
    }
  },

  draw(p, t, scene) {
    const A = scene.ANCHORS;
    const M = A.marquee, TL = A.ticketLine;
    const C = scene.PALETTE;
    const sig = this.sig;
    const stale = !!(sig && sig.stale);
    const hasData = !!(sig && sig.value != null);
    const night = scene.isNight;
    const tier = scene.detailTier;
    const overview = tier === TIER.OVERVIEW;
    const close = tier === TIER.CLOSE;

    // ---- the panel: dark when there is no show, cream by day, backlit after dark
    p.noStroke();
    const panel = !hasData ? C.windowOff : scene.paint(sig, night ? PANEL_NIGHT : C.paper);
    p.fill(panel);
    p.rect(M.x + 12, M.y + 12, M.w - 24, M.h - 24, 3);

    // ---- bulbs chasing around the edge (district+)
    if (!overview) {
      const chase = Math.floor(t * CHASE_HZ);
      const onCol = scene.paint(sig, night ? BULB_NIGHT_ON : BULB_DAY_ON);
      const offCol = scene.paint(sig, night ? BULB_NIGHT_OFF : BULB_DAY_OFF);
      for (let i = 0; i < this.bulbs.length; i++) {
        const b = this.bulbs[i];
        const lit = hasData && ((i + chase) % 3 === 0);
        if (lit && night && !stale) { p.fill(BULB_GLOW); p.ellipse(b.x, b.y, 20, 20); }
        p.fill(lit ? onCol : offCol);
        p.ellipse(b.x, b.y, 8.5, 8.5);
        if (lit && !stale) {
          p.fill(255, 255, 255, night ? 160 : 90);
          p.ellipse(b.x - 1.8, b.y - 1.8, 3.4, 3.4);
        }
      }
    }

    // ---- the copy: overview = short title; district = title; close = title + subline
    useDisplay(p);
    p.textAlign(p.CENTER, p.CENTER);
    if (hasData) {
      p.fill(scene.paint(sig, C.ink));
      p.textStyle(p.BOLD); p.textSize(overview ? 22 : 28);
      p.text(this.title, M.x + M.w / 2, M.y + (close ? 28 : 40));
      if (close) {
        p.textStyle(p.NORMAL); p.textSize(22);
        p.text(this.subline, M.x + M.w / 2, M.y + 56);
        if (sig.preliminary) {
          p.fill(scene.paint(sig, C.lamp)); p.rect(M.x + M.w - 62, M.y + 10, 52, 26, 2);
          p.fill(C.paper); p.textSize(18); p.text('EST', M.x + M.w - 36, M.y + 23);
        }
      }
    } else if (!overview) {
      p.fill(C.staleLite);
      p.textStyle(p.BOLD); p.textSize(28);
      p.text('NO SHOW', M.x + M.w / 2, M.y + 40);
    }
    p.textAlign(p.LEFT, p.TOP);

    // ---- ropes / stanchions / line — district+ (dots at overview)
    if (overview) {
      const n = this.figures.length;
      p.noStroke();
      for (let i = 0; i < n; i++) {
        const f = this.figures[i];
        const d = i * this.spacing;
        pointAt(this.path, d, PT);
        p.fill(scene.paint(sig, f.shirt));
        p.ellipse(PT.x, PT.y + f.side - 8, 12, 12);
      }
    } else {
      p.stroke(scene.paint(sig, ROPE)); p.strokeWeight(2);
      for (const r of this.ropes) p.line(r.x0, r.y - 7, r.x1, r.y - 7);
      p.noStroke();
      for (const s of this.posts) {
        p.fill(scene.paint(sig, POST)); p.rect(s.x - 2, s.y - 12, 4, 14);
        p.ellipse(s.x, s.y - 12, 7, 7);
        p.fill(C.asphaltDk); p.ellipse(s.x, s.y + 2, 10, 4);
      }

      const n = this.figures.length;
      if (n) {
        const s = this.spacing;
        const k = t / STEP_SECONDS, kf = Math.floor(k), u = k - kf;
        for (const f of this.figures) {
          const ui = Math.max(0, Math.min(1, (u - f.stepPhase * 0.4) / 0.6));
          const e = ui * ui * (3 - 2 * ui);
          const slot = ((f.i - kf) % n + n) % n;
          const d = slot * s + (1 - e) * s;
          pointAt(this.path, d, PT);
          const bob = Math.sin(t * 3 + f.phase) * 0.7;
          figure(p, PT.x, PT.y + f.side + bob, f.skin, scene.paint(sig, f.shirt), f.hat, stale);
        }
      }
    }

    scene.hit(M.x, M.y, M.w, M.h, this, 'marquee');
    scene.hit(TL.x, TL.y, TL.w, TL.h, this, 'line');
  },

  legend(sig) {
    if (!sig || sig.value == null) {
      return { title: 'Nobody in line', text: 'No weekend box-office number one loaded yet, so the marquee is dark.', sig: sig || null };
    }
    const title = sig.label ? sig.label : 'The number-one film';
    const est = sig.preliminary ? ' (an early estimate)' : '';
    const vs = versusParts(sig);
    return {
      title: `${this.n} in line`,
      text: `${title} was the number-one movie in US theaters the weekend of ${periodLabel(sig)}, taking ${money(sig.value)}${est}.` +
            (vs ? ` That is ${vs.band} for a number-one weekend over ${vs.span}.` : '') + ' The bigger the weekend, the longer the line.',
      sig,
    };
  },
};

// ---- helpers

// "$60.0M", "$1.20B", "$850K"
function money(v) {
  const a = Math.abs(v);
  if (a >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
  if (a >= 1e3) return '$' + Math.round(v / 1e3) + 'K';
  return '$' + Math.round(v);
}

// "SEP 20" from a YYYY-MM-DD period; anything else falls back to the shared period label
function weekendLabel(sig) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(sig.period || '');
  if (m) return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}`;
  return periodLabel(sig).toUpperCase();
}

const PT = { x: 0, y: 0 };
function pointAt(P, d, out) {
  if (d <= P.seg1) { out.x = P.doorX - d; out.y = P.y1; return out; }
  d -= P.seg1;
  if (d <= P.seg2) { out.x = P.leftX; out.y = P.y1 + d; return out; }
  d -= P.seg2;
  out.x = P.leftX + Math.min(d, P.seg3); out.y = P.y2; return out;
}

function figure(p, x, y, skin, shirt, hat, stale) {
  const s = FIG;
  p.noStroke();
  // Match crews grammar: contact shadow, legs, torso, arms, head, hair / optional hat
  p.fill(26, 32, 34, 42); p.ellipse(x, y + 6 * s, 14 * s, 4.5 * s);
  p.fill('#2e3438');
  p.rect(x - 5 * s, y - 4 * s, 3.8 * s, 10 * s, 1);
  p.rect(x + 1.2 * s, y - 4 * s, 3.8 * s, 10 * s, 1);
  p.fill(stale ? '#9aa1a3' : shirt);
  p.rect(x - 5.5 * s, y - 20 * s, 11 * s, 16 * s, 2);
  p.fill(stale ? '#b9bec0' : skin);
  p.rect(x - 8.5 * s, y - 18 * s, 2.8 * s, 11 * s, 1);
  p.rect(x + 5.8 * s, y - 18 * s, 2.8 * s, 11 * s, 1);
  p.ellipse(x, y - 25 * s, 10.5 * s, 10.5 * s);
  p.fill(stale ? '#7a8084' : '#1a2022');
  p.arc(x, y - 26 * s, 10.5 * s, 7 * s, Math.PI, 0, p.CHORD);
  if (hat) {
    p.fill(stale ? '#8b9498' : '#1a2022');
    p.rect(x - 5.5 * s, y - 28 * s, 11 * s, 2.5 * s);
    p.rect(x - 3.5 * s, y - 32 * s, 7 * s, 4 * s);
  }
}
