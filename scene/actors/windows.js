// The apartment block = Netflix global Top 10 total weekly hours (netflix_hours; weekly; trailing 52 weeks; context, direction 0).
// 240 windows (12 columns x 20 rows) on the block at ANCHORS.apartment. At night, blue windows = round(240 x percentile),
// the rest warm or dark; of the blue ones, netflix_new_entrants flicker (new Top 10 entrants this week) and
// netflix_non_english_share of them carry a subtitle glyph (two short white lines). By day the same blue count shows
// as drawn blinds, a thin blue line at the sill, so the number reads without waiting for night.
// No signal, no value or no percentile = every window dark, day and night, and a line under the block says which.
// A broadcast tower on the roof (ANCHORS.towerTop) blinks red: 1 Hz until tv_episodes_today lands, then faster with its percentile.

import { norm, fmt, periodLabel, dashVersus } from '../scale.js';
import { useDisplay } from '../fonts.js';

const COLS = 12, ROWS = 20, TOTAL = COLS * ROWS;
const MARGIN_X = 20, MARGIN_TOP = 22;    // inside the apartment rect
const MARGIN_BOTTOM = 80;                // the grid ends above the lobby canopy lot.js paints at ap.y + ap.h - 74
const WIN_W = 20, WIN_H = 13;
const DAY_WARM_SHARE = 0.015;            // by day a few windows are warm regardless of data
const NIGHT_WARM_SHARE = 0.03;           // quieter warm ambient so tower/stages/cinema stay primary
const WINDOW_OFF = '#161a1e';            // darker off panes — secondary to tower/stages/cinema
const FLICKER_PERIOD = 1.2;              // seconds per blue/off cycle for a new-entrant window
const WHITE = '#f6f3ea';                 // local: the palette has no subtitle white
const TOWER_EXTRA = { part: 'tower' };   // hover tag for the tower, allocated once, not per frame

export default {
  id: 'windows',
  signal: 'netflix_hours',
  district: 'block',
  layer: 'mid',
  windows: [],      // {x, y, blue, flicker, subtitle, dayWarm, nightWarm, phase}
  nBlue: null,
  nFlicker: 0,
  nSubtitle: 0,
  share: null,      // 0..1 or null
  sig: null,
  entrants: null,   // netflix_new_entrants entry or null
  nonEnglish: null, // netflix_non_english_share entry or null
  episodes: null,   // tv_episodes_today entry or null
  rgb: {},

  init(scene) {
    const C = scene.PALETTE;
    this.rgb = { blue: hexRgb(C.windowBlue), warm: hexRgb(C.windowWarm), lamp: hexRgb(C.lamp) };
  },

  // called on every signals.json load; every choice below comes from the scene's child RNG, so the same JSON lights the same windows
  update(sig, scene) {
    const rng = scene.childRng('windows');
    const ap = scene.ANCHORS.apartment;
    this.sig = sig;
    this.entrants = scene.sig('netflix_new_entrants');
    this.nonEnglish = scene.sig('netflix_non_english_share');
    this.episodes = scene.sig('tv_episodes_today');
    const C = scene.PALETTE;
    this.rgb = { blue: hexRgb(C.windowBlue), warm: hexRgb(C.windowWarm), lamp: hexRgb(C.lamp) };

    const u = sig && sig.value != null ? norm(sig, null) : null;
    this.nBlue = u == null ? null : Math.round(TOTAL * u);
    const blue = this.nBlue ?? 0;

    // new entrants: a count of windows, clipped to the blue ones
    const ent = this.entrants && this.entrants.value != null ? Math.round(this.entrants.value) : null;
    this.nFlicker = ent == null ? 0 : Math.max(0, Math.min(blue, ent));

    // non-English share: accept 0..1 or 0..100
    let share = this.nonEnglish && this.nonEnglish.value != null ? Number(this.nonEnglish.value) : null;
    if (share != null && share > 1) share = share / 100;
    this.share = share == null ? null : Math.max(0, Math.min(1, share));
    this.nSubtitle = this.share == null ? 0 : Math.round(blue * this.share);

    // grid
    const cellW = (ap.w - MARGIN_X * 2) / COLS;
    const cellH = (ap.h - MARGIN_TOP - MARGIN_BOTTOM) / ROWS;
    this.windows = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        this.windows.push({
          x: ap.x + MARGIN_X + c * cellW + (cellW - WIN_W) / 2,
          y: ap.y + MARGIN_TOP + r * cellH + (cellH - WIN_H) / 2,
          blue: false, flicker: false, subtitle: false,
          dayWarm: rng() < DAY_WARM_SHARE,
          nightWarm: rng() < NIGHT_WARM_SHARE,
          phase: rng(),
        });
      }
    }
    // deterministic choice of which windows are blue: a seeded shuffle, then the first `blue`
    const order = shuffle(rng, this.windows.map((_, i) => i));
    const blueIdx = order.slice(0, blue);
    for (const i of blueIdx) this.windows[i].blue = true;
    for (const i of blueIdx.slice(0, this.nFlicker)) this.windows[i].flicker = true;
    // subtitles spread over the blue set with their own shuffle so they do not all land on the flickering ones
    for (const i of shuffle(rng, blueIdx.slice()).slice(0, this.nSubtitle)) this.windows[i].subtitle = true;
  },

  draw(p, t, scene) {
    const ap = scene.ANCHORS.apartment;
    const top = scene.ANCHORS.towerTop;
    const C = scene.PALETTE;
    const sig = this.sig;
    const hasData = sig && sig.value != null && this.nBlue != null;
    const night = !!scene.isNight;
    const blueC = scene.paint(sig, C.windowBlue);
    const warmC = scene.paint(sig, C.windowWarm);
    const glow = sig && sig.stale ? null : this.rgb;    // no glow when gray

    p.noStroke();
    if (!hasData) {
      // no data: every window dark, day or night, and a line under the block says why
      p.fill(WINDOW_OFF);
      for (const w of this.windows) p.rect(w.x, w.y, WIN_W, WIN_H, 1);
      p.fill(C.inkSoft); useDisplay(p, 15); p.textAlign(p.LEFT, p.TOP);
      p.text('no windows lit: ' + noData(sig), ap.x, ap.y + ap.h + 14);
    } else if (night) {
      for (const w of this.windows) {
        let state = 'off';
        if (w.blue) {
          state = w.flicker && ((t / FLICKER_PERIOD + w.phase) % 1) >= 0.55 ? 'off' : 'blue';
        } else if (w.nightWarm) {
          state = 'warm';
        }
        if (state === 'off') { p.fill(WINDOW_OFF); p.rect(w.x, w.y, WIN_W, WIN_H, 1); continue; }
        if (glow && state === 'blue') {
          const g = glow.blue;
          p.fill(g[0], g[1], g[2], 55); p.rect(w.x - 2, w.y - 2, WIN_W + 4, WIN_H + 4, 2);
        }
        if (state === 'warm') {
          p.fill(warmC); p.rect(w.x, w.y, WIN_W, WIN_H, 1);
          p.fill(26, 32, 34, 185); p.rect(w.x, w.y, WIN_W, WIN_H, 1); // mute warm so blue/landmarks read first
        } else {
          p.fill(blueC); p.rect(w.x, w.y, WIN_W, WIN_H, 1);
          p.fill(26, 32, 34, 70); p.rect(w.x, w.y, WIN_W, WIN_H, 1); // soft mute — tower/stages stay primary
        }
        if (state === 'blue' && w.subtitle) {
          p.stroke(WHITE); p.strokeWeight(1);
          p.line(w.x + 4, w.y + WIN_H - 5, w.x + WIN_W - 4, w.y + WIN_H - 5);
          p.line(w.x + 6, w.y + WIN_H - 2.5, w.x + WIN_W - 6, w.y + WIN_H - 2.5);
          p.noStroke();
        }
      }
    } else {
      for (const w of this.windows) {
        p.fill(w.dayWarm ? warmC : WINDOW_OFF); p.rect(w.x, w.y, WIN_W, WIN_H, 1);
        if (w.dayWarm) { p.fill(26, 32, 34, 100); p.rect(w.x, w.y, WIN_W, WIN_H, 1); }
        if (w.blue) {
          // drawn blinds: the same count as tonight's blue windows, as a thin blue line at the sill
          p.stroke(blueC); p.strokeWeight(2.5);
          p.line(w.x, w.y + WIN_H + 1.5, w.x + WIN_W, w.y + WIN_H + 1.5);
          p.noStroke();
        }
      }
    }

    // ---- broadcast tower on the roof
    const roofY = ap.y - 10;
    const tx = top.x, ty = top.y;
    p.fill(C.asphaltDk); p.rect(tx - 10, roofY - 8, 20, 8, 2);                 // base box
    p.stroke(C.asphaltDk); p.strokeWeight(3); p.line(tx, roofY - 8, tx, ty + 4);
    p.strokeWeight(1.5);
    p.line(tx - 12, roofY - 8, tx, ty + 24); p.line(tx + 12, roofY - 8, tx, ty + 24);   // guy lines
    p.line(tx - 8, ty + 22, tx + 8, ty + 22); p.line(tx - 5, ty + 12, tx + 5, ty + 12); // cross-bars
    p.noStroke();
    const epi = this.episodes;
    const rate = epi && epi.value != null && epi.normalized != null ? 1 + 3 * norm(epi, 0) : 1;   // Hz
    const on = (t * rate) % 1 < 0.5;
    const lampGlow = !(epi && epi.stale);                                       // the lamp goes gray with its own signal, not the windows'
    if (on && night && lampGlow) { const g = this.rgb.lamp; p.fill(g[0], g[1], g[2], 70); p.ellipse(tx, ty, 26, 26); }
    p.fill(on ? scene.paint(epi, C.lamp) : C.lampOff); p.ellipse(tx, ty, 9, 9);

    // hover regions: the block (plus the no-data line under it) first, the tower on top (later hits win)
    scene.hit(ap.x, ap.y - 10, ap.w, ap.h + (hasData ? 10 : 40), this);   // plus the no-data line under the block
    scene.hit(tx - 16, ty - 14, 32, roofY - ty + 14, this, TOWER_EXTRA);
  },

  legend(sig, scene, extra) {
    if (extra && extra.part === 'tower') return this.towerLegend(scene);
    if (!sig || sig.value == null || this.nBlue == null) {
      return { title: 'The apartment block', text: `No windows are lit yet: ${noData(sig)}.`, sig: sig || null };
    }
    const ent = this.entrants;
    const flick = ent && ent.value != null ? ` Flickering windows mark the ${fmt(ent.value)} titles new to the Top 10.` : '';
    const sub = this.share != null ? ` ${Math.round(this.share * 100)}% of the hours were for non-English titles (marked with a subtitle).` : '';
    return {
      title: `${this.nBlue} blue windows`,
      text: `People watched ${hoursM(sig)} million hours of Netflix\u2019s worldwide Top 10 in the week ending ${periodLabel(sig)}${dashVersus(sig)}.` +
            ` More viewing, more blue windows after dark.${flick}${sub} Shown for context; not part of the SIGN index.`,
      sig,
    };
  },

  towerLegend() {
    const epi = this.episodes;
    if (!epi || epi.value == null) {
      return { title: 'Broadcast tower', text: 'No count of today\u2019s TV episodes yet, so the light blinks slowly.', sig: epi || null };
    }
    return {
      title: 'Broadcast tower',
      text: `${fmt(epi.value)} scripted TV episodes aired on US networks and streamers on ${periodLabel(epi)}${dashVersus(epi)}.` +
            ' The busier the TV day, the faster the light blinks.',
      sig: epi,
    };
  },
};

// ---- helpers local to this actor
// why the block is dark: the signal is missing, has no value, or has a value but no percentile yet
function noData(sig) {
  if (!sig || sig.value == null) return 'no Netflix Top 10 figures loaded';
  return 'not enough weeks of Netflix history to compare against';
}

function shuffle(rng, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

function hexRgb(hex) {
  const c = String(hex || '#000000').replace('#', '');
  return [parseInt(c.slice(0, 2), 16) || 0, parseInt(c.slice(2, 4), 16) || 0, parseInt(c.slice(4, 6), 16) || 0];
}

// hours viewed in millions, whatever unit the feed reports in (hours, million hours, billion hours)
function hoursM(sig) {
  const v = Number(sig.value);
  const unit = String(sig.unit || '').toLowerCase();
  let m;
  if (/billion/.test(unit)) m = v * 1000;
  else if (/million/.test(unit)) m = v;
  else m = v / 1e6;
  return Math.round(m).toLocaleString('en-US');
}
