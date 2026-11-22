// Pink slips on the union hall bulletin board = employees on WARN layoff notices in LA County (weekly, direction -1).
// 0 to 30 slips = 30 x the percentile of the latest week inside its trailing 52 weeks, so more layoffs = more slips.
// Signal: warn_la_employees, falling back to warn_la_notices. With neither in signals.json the board stays empty
// and reads "WARN feed not live".

import { norm, fmt, periodLabel, dashVersus } from '../scale.js';
import { range } from '../rng.js';
import { useDisplay } from '../fonts.js';
import { TIER } from '../detail.js';

const MIN = 0, MAX = 30;
// The board fits on the hall front between the door (lot.js: u.x + 16 .. + 84) and the wall's right edge,
// under the countdown fascia (u.y + 36 .. + 70), so it covers neither.
const BOARD_DX = 92, BOARD_DY = 76, BOARD_W = 136, BOARD_H = 118;
const COLS = 5, ROWS = 6, COL_PITCH = 25, ROW_PITCH = 15, SLIP_W = 21, SLIP_H = 13;
const NOTICES_ID = 'warn_la_notices';
// local colours: the palette has no pink, cork or board frame
const PINK = '#f4b3c2';
const CORK = '#c49a63';
const FRAME = '#5a4634';
const PRINT = '#8a6b74';

// The first entry that carries a value wins: warn_la_employees, then warn_la_notices.
function resolve(sig) {
  const list = Array.isArray(sig) ? sig : [sig];
  return list.find(s => s && s.value != null) || list.find(s => s) || null;
}

// The board fills with the raw percentile of layoffs (90th pct = 27 slips). scale.population() flips
// direction -1 signals to 1 - percentile, which would empty the board in a bad week, so the mapping lives
// here until scale.js settles that; swap this for population(sig, MIN, MAX) once it does.
function fill(sig, min, max) {
  const n = norm(sig, null);
  if (n == null) return Math.round((min + max) / 2);
  return Math.round(min + (max - min) * n);
}

function shuffle(rng, arr) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

export default {
  id: 'pink_slips',
  signal: ['warn_la_employees', 'warn_la_notices'],
  district: 'street',
  layer: 'mid',
  board: null,
  slips: [],
  n: null,
  sig: null,
  live: false,

  init(scene) {},

  // called on every signals.json load; which slots get a slip, and each slip's tilt, come from the child RNG
  update(sig, scene) {
    const rng = scene.childRng('pink_slips');
    const u = scene.ANCHORS.unionHall;
    const list = Array.isArray(sig) ? sig : [sig];
    this.live = list.some(s => s);
    this.sig = resolve(sig);
    this.n = (this.sig && this.sig.value != null) ? fill(this.sig, MIN, MAX) : null;

    this.board = { x: u.x + BOARD_DX, y: u.y + BOARD_DY, w: BOARD_W, h: BOARD_H };
    const slots = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      slots.push({ x: this.board.x + 8 + c * COL_PITCH, y: this.board.y + 24 + r * ROW_PITCH });
    }
    shuffle(rng, slots);
    this.slips = slots.slice(0, this.n ?? 0).map(s => ({
      x: s.x + range(rng, -1.5, 1.5),
      y: s.y + range(rng, -1, 1),
      tilt: range(rng, -0.09, 0.09),
    }));
  },

  draw(p, t, scene) {
    const C = scene.PALETTE, b = this.board;
    const overview = scene.detailTier !== TIER.CLOSE;
    p.noStroke();
    p.fill(scene.paint(this.sig, FRAME)); p.rect(b.x - 3, b.y - 3, b.w + 6, b.h + 6, 3);
    p.fill(scene.paint(this.sig, CORK)); p.rect(b.x, b.y, b.w, b.h, 2);
    if (!overview) {
      p.fill(90, 70, 52, 28);
      for (let i = 0; i < 40; i++) {
        const sx = b.x + 4 + ((i * 47) % (b.w - 8));
        const sy = b.y + 18 + ((i * 31) % (b.h - 24));
        p.ellipse(sx, sy, 2.2, 1.6);
      }
      p.fill(C.ink); useDisplay(p, 18); p.textAlign(p.LEFT, p.TOP);
      p.text('LAYOFF NOTICES', b.x + 8, b.y + 3);
    }
    if (scene.isNight && !overview) {
      p.fill(241, 199, 106, 40); p.ellipse(b.x + b.w / 2, b.y + 16, b.w - 4, 50);
      p.fill(C.windowWarm); p.ellipse(b.x + b.w / 2, b.y - 1, 7, 5);
    }
    const pink = scene.paint(this.sig, PINK), pin = scene.paint(this.sig, C.lamp), print = scene.paint(this.sig, PRINT);
    if (overview) {
      // Compact aggregate — same slip count as small marks, not a cork full of noise
      const n = this.slips.length;
      const cols = COLS, pitch = 24;
      for (let i = 0; i < n; i++) {
        const col = i % cols, row = Math.floor(i / cols);
        p.fill(pink);
        p.rect(b.x + 12 + col * pitch, b.y + 26 + row * 14, 16, 10, 1);
      }
      if (n) {
        p.fill(C.ink); useDisplay(p, 20); p.textAlign(p.CENTER, p.BOTTOM);
        p.text(String(n), b.x + b.w / 2, b.y + 23);
      }
    } else {
      for (const s of this.slips) {
        p.push(); p.translate(s.x + SLIP_W / 2, s.y); p.rotate(s.tilt);
        p.fill(pink); p.rect(-SLIP_W / 2, 0, SLIP_W, SLIP_H, 1);
        p.fill(print); p.rect(-SLIP_W / 2 + 3, 5, SLIP_W - 6, 1); p.rect(-SLIP_W / 2 + 3, 8, SLIP_W - 10, 1);
        p.fill(pin); p.ellipse(0, 1.5, 3, 3);
        p.pop();
      }
    }
    if (this.n == null && !overview) {
      p.fill(C.ink); useDisplay(p, 17); p.textAlign(p.CENTER, p.CENTER);
      p.text(this.live ? 'WARN feed:\nno value yet' : 'WARN feed\nnot live', b.x + b.w / 2, b.y + b.h / 2);
    }
    scene.hit(b.x - 3, b.y - 3, b.w + 6, b.h + 6, this);
  },

  legend(sig, scene) {
    const s = resolve(sig);
    if (!s || s.value == null) {
      return { title: 'The bulletin board', text: 'No layoff notices loaded yet, so the board is empty.', sig: s };
    }
    const n = this.n ?? fill(s, MIN, MAX);
    let what;
    if (s.id === NOTICES_ID) {
      what = `LA County employers filed ${fmt(s.value)} layoff notices`;
    } else {
      const notices = scene.sig(NOTICES_ID);
      what = notices && notices.value != null
        ? `LA County employers filed ${fmt(notices.value)} layoff notices covering ${fmt(s.value)} jobs`
        : `LA County employers filed layoff notices covering ${fmt(s.value)} jobs`;
    }
    return {
      title: `${n} pink slips`,
      text: `${what} in the week ending ${periodLabel(s)}${dashVersus(s)}. Companies must file these notices (WARN) before big layoffs.` +
            ' More layoffs, more slips on the board.',
      sig: s,
    };
  },
};
