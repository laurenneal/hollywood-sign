// The poster wall = films now playing in US theaters (TMDB, signal tmdb_now_playing, context only).
// 6 to 24 of the wall's 24 frames light as one-sheets: 6 + 18 × the count's percentile inside its trailing
// 180 days. Lit cards carry a title from signals.json extra (display-only, never in history); no artwork is
// stored, so each card is coloured paper with a motif picked by a hash of its title. When today's #1 trending
// film is playing it takes the first card, where the searchlights converge. Unlit frames stay lot.js's glazed
// blanks.

import { population, periodLabel } from '../scale.js';
import { hashString } from '../rng.js';
import { TIER } from '../detail.js';

const COLS = 6, ROWS = 4, SLOTS = COLS * ROWS;
const MIN = 6, MAX = SLOTS;
const LINE_CHARS = 10;
const MAX_LINES = 3;
const TITLE_SIZE = 9;
const MIN_TITLE_SIZE = 5;
const GLOW = '#f1c76a';
const TRENDING_FRAME = '#f3d29a';
// The sheet inside frame i (row-major), matching the grid lot.js draws.
export function slotRect(A, i) {
  const pw = A.posterWall;
  const cellW = pw.w / COLS, cellH = pw.h / ROWS;
  const c = i % COLS, r = Math.floor(i / COLS);
  return { x: pw.x + c * cellW + 8, y: pw.y + r * cellH + 8, w: cellW - 16, h: cellH - 22 };
}

export function slotCenter(A, i) {
  const s = slotRect(A, i);
  return { x: s.x + s.w / 2, y: s.y + s.h / 2 };
}

// Up to MAX_LINES lines of at most `perLine` characters; overflow ends in an ellipsis.
export function wrapTitle(title, perLine = LINE_CHARS, maxLines = MAX_LINES) {
  const lines = [];
  let cur = '';
  for (let w of String(title || '').toUpperCase().split(/\s+/).filter(Boolean)) {
    while (w.length > perLine) {
      if (cur) { lines.push(cur); cur = ''; }
      lines.push(w.slice(0, perLine));
      w = w.slice(perLine);
    }
    if (!w) continue;
    if (!cur) cur = w;
    else if (cur.length + 1 + w.length <= perLine) cur += ' ' + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = kept[maxLines - 1].slice(0, perLine - 1).trimEnd() + '\u2026';
  return kept;
}

function luminance(hex) {
  const c = hex.replace('#', '');
  return 0.3 * parseInt(c.slice(0, 2), 16) + 0.59 * parseInt(c.slice(2, 4), 16) + 0.11 * parseInt(c.slice(4, 6), 16);
}

export default {
  id: 'posters',
  signal: 'tmdb_now_playing',
  district: 'boulevard',
  layer: 'mid',
  sig: null,
  cards: [],
  titled: false,
  trendingFirst: false,

  init(scene) {},

  update(sig, scene) {
    this.sig = sig;
    const hasData = !!(sig && sig.value != null);
    const filled = hasData ? population(sig, MIN, MAX, null) : 0;
    const extra = (sig && sig.extra) || {};
    const titles = Array.isArray(extra.titles) ? extra.titles.filter((s) => typeof s === 'string' && s) : [];
    this.titled = titles.length > 0;
    this.trendingFirst = this.titled && extra.trending_first === true;
    const hues = scene.PALETTE.poster;
    this.cards = [];
    for (let i = 0; i < filled; i++) {
      const title = titles[i] || '';
      const h = hashString(title || `slot ${i} ${scene.today || ''}`);
      const color = hues[h % hues.length];
      this.cards.push({ title, color, motif: (h >>> 8) % 3, lines: wrapTitle(title), ink: luminance(color) > 150 });
    }
  },

  draw(p, t, scene) {
    const A = scene.ANCHORS, C = scene.PALETTE;
    const pw = A.posterWall;
    const tier = scene.detailTier;
    const stale = !!(this.sig && this.sig.stale);
    scene.hit(pw.x - 10, pw.y - 10, pw.w + 20, pw.h + 20, this, 'wall');
    p.push();
    p.noStroke();
    this.cards.forEach((card, i) => {
      const s = slotRect(A, i);
      if (scene.isNight && !stale) {                       // backlit cases after dark
        p.fill(GLOW + '40'); p.rect(s.x - 5, s.y - 5, s.w + 10, s.h + 10, 3);
      }
      const base = scene.paint(this.sig, card.color);
      p.fill(base); p.rect(s.x, s.y, s.w, s.h, 1);
      if (tier !== TIER.OVERVIEW) motif(p, card.motif, s);
      if (tier === TIER.CLOSE && card.lines.length) {
        titleBlock(p, card, s, stale ? C.staleLite : (card.ink ? C.ink : C.panel), card.ink ? null : C.ink);
      } else if (tier === TIER.DISTRICT) {
        p.fill(255, 250, 240, card.title ? 150 : 70);         // a billing block that reads as "titled"
        p.rect(s.x + 5, s.y + s.h - 12, s.w - 10, 5, 1);
      }
      if (i === 0 && this.trendingFirst) {
        p.noFill(); p.stroke(scene.paint(this.sig, TRENDING_FRAME)); p.strokeWeight(2.5);
        p.rect(s.x - 3, s.y - 3, s.w + 6, s.h + 6, 2);
        p.noStroke();
      }
      scene.hit(s.x - 4, s.y - 4, s.w + 8, s.h + 16, this, i);
    });
    p.pop();
  },

  legend(sig, scene, extra) {
    if (!sig || sig.value == null) {
      return {
        title: 'Poster wall \u2014 waiting for TMDB',
        text: `No TMDB figures yet. Once the daily update runs, ${MIN} to ${MAX} frames light up with the titles of films playing in US theaters.`,
        sig: sig || null,
      };
    }
    const n = Math.round(sig.value);
    const filled = this.cards.length;
    const rule = sig.normalized == null
      ? ' There is not much history to compare with yet, so the wall sits in the middle.'
      : ' More films than usual, more cards lit.';
    const titles = this.titled
      ? ' Each card shows a title; no posters are stored.'
      : ' Titles are kept only for today, so this day\u2019s cards are blank.';
    const wall = `${n} films are playing in US theaters, according to TMDB (${periodLabel(sig)}), and ${filled} of the ${SLOTS} frames are lit.` +
                 `${rule}${titles}`;
    const card = typeof extra === 'number' ? this.cards[extra] : null;
    const leadIsTrending = this.trendingFirst && this.cards[0];
    if (card) {
      const trending = extra === 0 && leadIsTrending
        ? 'Today\u2019s most-trending film on TMDB, and it is in US theaters: the searchlights are on it. ' : '';
      return {
        title: card.title ? `Now playing: ${card.title}` : `Poster wall card ${extra + 1}`,
        text: trending + wall,
        sig,
      };
    }
    return {
      title: 'Poster wall \u2014 now playing',
      text: wall + (leadIsTrending
        ? ` The first card is today\u2019s most-trending film on TMDB, ${this.cards[0].title}; the searchlights are on it.`
        : ''),
      sig,
    };
  },
};

// A title-hashed shape in a lighter tint of the sheet: sun, diagonal band, or stripes.
function motif(p, kind, s) {
  p.fill(255, 250, 240, 42);
  if (kind === 0) {
    p.ellipse(s.x + s.w * 0.62, s.y + s.h * 0.34, s.w * 0.62, s.w * 0.62);
  } else if (kind === 1) {
    p.quad(s.x, s.y + s.h * 0.62, s.x + s.w * 0.62, s.y, s.x + s.w, s.y, s.x, s.y + s.h);
  } else {
    for (let k = 0; k < 3; k++) p.rect(s.x, s.y + 5 + k * 7, s.w, 3);
  }
}

// Shrinks to the widest line so titles fit the sheet in Barlow Condensed or in a wider fallback face.
// p5 quotes any font name containing a space, so the family goes in bare (a CSS list would be dropped).
function titleBlock(p, card, s, ink, shadow) {
  p.textFont('Barlow Condensed');
  p.textSize(TITLE_SIZE);
  const widest = Math.max(1, ...card.lines.map((line) => p.textWidth(line)));
  const size = Math.max(MIN_TITLE_SIZE, Math.min(TITLE_SIZE, TITLE_SIZE * (s.w - 4) / widest));
  p.textSize(size);
  p.textAlign(p.CENTER, p.CENTER);
  const lead = size + 1;
  const top = s.y + s.h - 4 - card.lines.length * lead + lead / 2;
  card.lines.forEach((line, k) => {
    const y = top + k * lead;
    if (shadow) { p.fill(shadow); p.text(line, s.x + s.w / 2 + 0.6, y + 0.6); }
    p.fill(ink); p.text(line, s.x + s.w / 2, y);
  });
  p.textAlign(p.LEFT, p.TOP);
}
