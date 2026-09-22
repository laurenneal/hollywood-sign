// The weather over the lot = trade-press tone from GDELT only ('trade_tone': mean tone over trade
// domains, 7-day article-weighted mean). RSS keyword flag counts are not climate: they stay on the
// banner plane / newsstand, never paint the sky. Sky layer: paints the sky band (y 0..430, full width)
// before the lot buffer, so the hills sit on top of it.
//   z >= 1   golden hour: skyGolden, a low sun with soft rays
//   -1<z<1   overcast:    skyOvercast, 4..6 slow clouds (more clouds as z falls)
//   z <= -1  rain:        skyRain, diagonal rain and splash rings along the ridge line
//   z <= -2  storm:       skyStorm, rain plus a lightning flash about every 7 s of t
// Night mixes every color toward skyNight with a moon and stars on clear nights; stale goes gray through
// scene.paint; no data is a plain skyDay with one small cloud and an in-scene note.

import { fmt, pct, periodLabel, provenance } from '../scale.js';
import { range, int } from '../rng.js';
import { useDisplay } from '../fonts.js';

// The sky band, as DISTRICTS.sky. Kept local so nothing in draw() can reach outside it.
const SKY = { x: 0, y: 0, w: 2400, h: 430 };
// The hill ellipses lot.js paints over the bottom of the band (center x, center y, radius x, radius y).
// lot.js does not export them; the rain splashes need the ridge line so they land where the eye sees ground.
const HILLS = [
  { cx: 780,  cy: 460, rx: 620, ry: 90 },
  { cx: 1900, cy: 455, rx: 700, ry: 100 },
  { cx: 420,  cy: 515, rx: 320, ry: 55 },
  { cx: 2150, cy: 515, rx: 280, ry: 50 },
];
const SUN  = { x: 330, y: 330, r: 62 };   // low on the left, half behind the near hill
const MOON = { x: 1560, y: 112, r: 40 };
const SUN_DISC = '#fff3c9', RAY = '#fde7ae', MOON_DISC = '#f3efe0', STAR = '#fff9e6', SPLASH = '#6f7a80';
const RAIN_N = 220, STORM_N = 340, STAR_N = 80, SPLASH_N = 44, BOLT_N = 6, RAYS = 12;
const FLASH_PERIOD = 7;          // seconds of t between lightning flashes in a storm
const FLASH_LEN = 0.26;          // seconds a flash lasts

const STATES = {
  golden:   { name: 'golden hour', sky: 'skyGolden',   night: 0.88 },
  overcast: { name: 'overcast',    sky: 'skyOvercast', night: 0.80 },
  rain:     { name: 'rain',        sky: 'skyRain',     night: 0.72 },
  storm:    { name: 'storm',       sky: 'skyStorm',    night: 0.80 },
  nodata:   { name: 'plain sky',   sky: 'skyDay',      night: 0.85 },
};

export default {
  id: 'weather',
  signal: 'trade_tone',
  district: 'sky',
  layer: 'sky',
  sig: null,
  state: 'nodata',
  z: null,
  clouds: [], rain: [], stars: [], splashes: [], bolts: [],

  init(scene) {},

  // every layout choice comes from the child RNG; the state only decides how much of it is shown
  update(sig, scene) {
    const rng = scene.childRng('weather');
    this.sig = sig;
    this.z = signedZ(sig);
    this.state = stateOf(sig, this.z);

    this.clouds = [];
    for (let i = 0; i < 6; i++) {
      const blobs = [];
      const n = int(rng, 3, 5);
      for (let b = 0; b < n; b++) blobs.push({ dx: range(rng, -70, 70), dy: range(rng, -12, 12), w: range(rng, 70, 150), h: range(rng, 34, 58) });
      this.clouds.push({ x0: range(rng, 0, SKY.w), y: range(rng, 60, 250), speed: range(rng, 4, 9), scale: range(rng, 0.8, 1.3), blobs });
    }
    this.rain = [];
    for (let i = 0; i < STORM_N; i++) this.rain.push({ x0: range(rng, 0, SKY.w), y0: range(rng, 0, SKY.h), len: range(rng, 16, 32), speed: range(rng, 520, 820) });
    this.stars = [];
    for (let i = 0; i < STAR_N; i++) this.stars.push({ x: range(rng, 10, SKY.w - 10), y: range(rng, 8, 290), r: range(rng, 1.2, 2.6), phase: range(rng, 0, Math.PI * 2) });
    this.splashes = [];
    for (let i = 0; i < SPLASH_N; i++) {
      const x = 20 + (i + range(rng, 0.1, 0.9)) * (SKY.w - 40) / SPLASH_N;
      this.splashes.push({ x, y: ridge(x) - 3, phase: range(rng, 0, 1) });
    }
    this.bolts = [];
    for (let i = 0; i < BOLT_N; i++) {
      let x = range(rng, 300, SKY.w - 300), y = range(rng, 30, 90);
      const pts = [[x, y]];
      const n = int(rng, 6, 9);
      for (let k = 0; k < n; k++) { x += range(rng, -45, 45); y += range(rng, 28, 48); pts.push([x, y]); }
      this.bolts.push(pts);
    }
  },

  draw(p, t, scene) {
    const C = scene.PALETTE;
    const sig = this.sig;
    const st = STATES[this.state] || STATES.nodata;
    const nm = nightMix(scene);
    const day = 1 - nm;
    const paint = (hx) => scene.paint(sig, hx);
    const sky = paint(mix(C[st.sky], C.skyNight, nm * st.night));
    const state = this.state;

    p.push();
    withSkyClip(p, () => {
      // the wash, then four bands that lighten toward the ridge so the hills read against it
      p.noStroke();
      p.fill(sky); p.rect(SKY.x, SKY.y, SKY.w, SKY.h);
      const glow = rgb(paint(state === 'golden' ? mix(C.skyGolden, '#ffe6b0', 0.6) : mix(C[st.sky], '#ffffff', 0.35)));
      for (let i = 0; i < 4; i++) {
        p.fill(glow[0], glow[1], glow[2], (10 + 12 * i) * (1 - 0.6 * nm));
        p.rect(SKY.x, 190 + i * 60, SKY.w, SKY.h - 190 - i * 60);
      }
      // warm horizon blush on clear / plain days (distinct from press-tone weather states)
      if ((state === 'nodata' || state === 'golden') && day > 0.2) {
        const warm = rgb(paint(mix(C.skyGolden, C.paper, 0.35)));
        p.fill(warm[0], warm[1], warm[2], 28 * day);
        p.ellipse(SKY.w * 0.35, SKY.h - 20, SKY.w * 0.9, 120);
        p.fill(warm[0], warm[1], warm[2], 18 * day);
        p.ellipse(SKY.w * 0.75, SKY.h - 10, SKY.w * 0.55, 80);
      }

      // clear nights: stars and the moon (dimmer under cloud, gone in rain)
      const moonW = state === 'golden' || state === 'nodata' ? 1 : state === 'overcast' ? 0.35 : 0;
      if (nm > 0 && moonW > 0) {
        if (moonW === 1) {
          const sc = rgb(paint(STAR));
          for (const s of this.stars) {
            const tw = 0.55 + 0.45 * Math.sin(t * 2.5 + s.phase);
            p.fill(sc[0], sc[1], sc[2], 230 * nm * tw);
            p.ellipse(s.x, s.y, s.r * 2, s.r * 2);
          }
        }
        const mc = rgb(paint(MOON_DISC));
        p.fill(mc[0], mc[1], mc[2], 40 * nm * moonW); p.ellipse(MOON.x, MOON.y, MOON.r * 5, MOON.r * 5);
        p.fill(mc[0], mc[1], mc[2], 255 * nm * moonW); p.ellipse(MOON.x, MOON.y, MOON.r * 2, MOON.r * 2);
        const sk = rgb(sky);
        p.fill(sk[0], sk[1], sk[2], 255 * nm * moonW); p.ellipse(MOON.x + 13, MOON.y - 8, MOON.r * 1.8, MOON.r * 1.8);  // crescent bite
      }

      if (state === 'golden' && day > 0) {
        // soft rays turn slowly; the disc sits low and half behind the near hill (the lot paints over it)
        const rc = rgb(paint(RAY));
        p.fill(rc[0], rc[1], rc[2], 34 * day);
        for (let i = 0; i < RAYS; i++) {
          const a = i * (Math.PI * 2 / RAYS) + t * 0.025;
          const ca = Math.cos(a), sa = Math.sin(a), L = 900, w = 26;
          p.beginShape();
          p.vertex(SUN.x + ca * (SUN.r + 6), SUN.y + sa * (SUN.r + 6));
          p.vertex(SUN.x + ca * L - sa * w, SUN.y + sa * L + ca * w);
          p.vertex(SUN.x + ca * L + sa * w, SUN.y + sa * L - ca * w);
          p.endShape(p.CLOSE);
        }
        const dc = rgb(paint(SUN_DISC));
        p.fill(dc[0], dc[1], dc[2], 30 * day); p.ellipse(SUN.x, SUN.y, SUN.r * 6.4, SUN.r * 6.4);
        p.fill(dc[0], dc[1], dc[2], 55 * day); p.ellipse(SUN.x, SUN.y, SUN.r * 4.2, SUN.r * 4.2);
        p.fill(dc[0], dc[1], dc[2], 90 * day); p.ellipse(SUN.x, SUN.y, SUN.r * 2.8, SUN.r * 2.8);
        p.fill(dc[0], dc[1], dc[2], 255 * day); p.ellipse(SUN.x, SUN.y, SUN.r * 2, SUN.r * 2);
      }

      if (state === 'overcast') {
        const n = 4 + Math.round(Math.max(0, Math.min(2, 1 - (this.z ?? 0))));
        const body = paint(mix(sky, '#ffffff', 0.35 * (1 - 0.7 * nm)));
        const under = paint(mix(sky, C.skyStorm, 0.35));
        for (let i = 0; i < n; i++) cloud(p, this.clouds[i], t, body, under, this.clouds[i].scale, 0);
      }

      if (state === 'nodata') {
        const body = paint(mix(sky, '#ffffff', 0.5 * (1 - 0.6 * nm)));
        const under = paint(mix(sky, C.skyOvercast, 0.4));
        cloud(p, this.clouds[0], t, body, under, 0.6, 20);
        // the note sits at the top-left of the band (same offset as crews.js): the bottom of the band is
        // behind the hill ellipses the lot buffer paints over the sky, so anything near y 400 is hidden
        p.fill(nm > 0.5 ? C.paper : C.inkSoft); useDisplay(p, 15); p.textAlign(p.LEFT, p.TOP);
        const note = !sig ? 'press tone: trade_tone (GDELT) not in signals.json'
                   : sig.value == null ? 'press tone: no value yet'
                   : 'press tone: no trailing window yet';
        p.text(note, SKY.x + 24, SKY.y + 30);
      }

      if (state === 'rain' || state === 'storm') {
        const storm = state === 'storm';
        const body = paint(storm ? mix(sky, C.ink, 0.35) : mix(sky, C.skyStorm, 0.35));
        const under = paint(storm ? mix(sky, C.ink, 0.55) : mix(sky, C.skyStorm, 0.65));
        for (let i = 0; i < 6; i++) cloud(p, this.clouds[i], t, body, under, this.clouds[i].scale * 1.15, storm ? -30 : -20);

        // diagonal rain across the whole band, drifting left with the wind
        const slant = storm ? 0.45 : 0.28;
        const n = storm ? STORM_N : RAIN_N;
        const rc = rgb(paint(mix(sky, '#ffffff', 0.45)));
        p.stroke(rc[0], rc[1], rc[2], storm ? 170 : 150); p.strokeWeight(1.5);
        for (let i = 0; i < n; i++) {
          const r = this.rain[i];
          const y = ((r.y0 + t * r.speed) % (SKY.h + r.len)) - r.len;
          const x = ((r.x0 - t * r.speed * slant) % (SKY.w + 60) + SKY.w + 60) % (SKY.w + 60) - 30;
          p.line(x, y, x - r.len * slant, y + r.len);
        }

        // splash rings along the ridge line: gray drops where the rain meets the ground
        const sc = rgb(paint(SPLASH));
        p.noFill(); p.strokeWeight(1.2);
        for (const s of this.splashes) {
          const ph = (t * 2.2 + s.phase) % 1;
          p.stroke(sc[0], sc[1], sc[2], 170 * (1 - ph));
          p.ellipse(s.x, s.y, 3 + 10 * ph, 1.2 + 3 * ph);
          p.line(s.x - 2 - 4 * ph, s.y - 1 - 5 * ph, s.x - 1 - 3 * ph, s.y - 1 - 6 * ph);
        }
        p.noStroke();

        if (storm) {
          // one flash about every 7 s; its moment inside the period comes from the seeded noise
          const k = Math.floor(t / FLASH_PERIOD);
          const at = 1.2 + (FLASH_PERIOD - 2 - FLASH_LEN) * p.noise(k * 0.731 + 3.1);
          const u = (t - k * FLASH_PERIOD - at) / FLASH_LEN;
          if (u >= 0 && u < 1) {
            const env = Math.sin(u * Math.PI) * (Math.sin(u * 40) > -0.3 ? 1 : 0.35);
            p.noStroke(); p.fill(255, 250, 235, 120 * env); p.rect(SKY.x, SKY.y, SKY.w, SKY.h);
            const pts = this.bolts[k % this.bolts.length];
            p.noFill();
            p.stroke(255, 250, 220, 90 * env); p.strokeWeight(9); polyline(p, pts);
            p.stroke(255, 252, 240, 255 * env); p.strokeWeight(2.5); polyline(p, pts);
            p.noStroke();
          }
        }
      }
    });
    p.pop();
    scene.hit(SKY.x, SKY.y, SKY.w, SKY.h, this);
  },

  legend(sig, scene) {
    if (!sig) {
      return { title: 'Weather: plain sky',
               text: 'Sky reflects press tone, not LA weather. No GDELT trade tone loaded — plain day, one cloud. RSS keywords do not paint the sky.' };
    }
    if (sig.value == null) {
      return { title: 'Weather: plain sky',
               text: 'Sky reflects press tone, not LA weather. GDELT trade tone has no value yet — plain day, one cloud.',
               source: provenance(sig) };
    }
    const z = signedZ(sig);
    const window = sig.window_n ? `${sig.window_n} ${cadenceUnit(sig.cadence)}` : 'days';
    const number = `mean tone ${fmt(Number(sig.value))} across the trade press, ${periodLabel(sig)}`;
    if (z == null) {
      return { title: 'Weather: plain sky',
               text: `Sky reflects GDELT trade-press tone (not LA weather): ${number}, but there is no trailing window to place it in yet, so the sky stays a plain day.`,
               source: provenance(sig) };
    }
    const state = stateOf(sig, z);
    const name = STATES[state].name;
    const moon = state === 'golden' ? ' with a moon and stars' : state === 'overcast' ? ' with a faint moon' : '';
    const text =
      `Sky reflects GDELT trade-press tone (not LA weather): ${number} (${pct(sig.normalized)} of the trailing ${window}) -> ${name}.` +
      ` The sky follows z (${z.toFixed(1)}): at or above +1 golden hour, between -1 and +1 overcast, at or below -1 rain, at or below -2 storm.` +
      (scene && scene.isNight ? ` It is night on the lot, so the same weather is drawn dark${moon}.` : '') +
      (sig.stale ? ' The feed is stale, so the sky is grayed (last known value).' : '');
    return { title: `Weather: ${name}`, text, source: provenance(sig) };
  },
};

function signedZ(sig) {
  if (!sig || sig.z == null || sig.value == null) return null;
  return sig.z * (sig.direction === -1 ? -1 : 1);
}

function stateOf(sig, z) {
  if (!sig || sig.value == null || z == null) return 'nodata';
  if (z <= -2) return 'storm';
  if (z <= -1) return 'rain';
  if (z >= 1) return 'golden';
  return 'overcast';
}

function cadenceUnit(c) {
  return { hourly: 'hours', daily: 'days', weekly: 'weeks', monthly: 'months', quarterly: 'quarters', annual: 'years', yearly: 'years' }[c] || 'periods';
}

// 1 when scene.isNight; a soft ramp through dusk (18:30..19:30) and dawn (06:00..07:00) either side of it
function nightMix(scene) {
  if (scene.isNight) return 1;
  const h = scene.hour == null ? 12 : scene.hour;
  if (h >= 18.5 && h < 19.5) return h - 18.5;
  if (h >= 6 && h < 7) return 7 - h;
  return 0;
}

// ---- geometry
// y of the visible ridge (hill tops, else the ground line) at x, so splashes sit where the eye sees ground
function ridge(x) {
  let y = SKY.h;
  for (const h of HILLS) {
    const u = (x - h.cx) / h.rx;
    if (u > -1 && u < 1) y = Math.min(y, h.cy - h.ry * Math.sqrt(1 - u * u));
  }
  return y;
}

// Clip everything drawn inside fn to the sky band, so drifting clouds, rays and rain never reach the
// letterbox around the logical canvas. Uses the 2D context directly; when it is not there (the smoke stub)
// fn just runs unclipped.
function withSkyClip(p, fn) {
  const ctx = p.drawingContext;
  const can = ctx && typeof ctx.save === 'function' && typeof ctx.clip === 'function';
  if (!can) { fn(); return; }
  ctx.save();
  try {
    ctx.beginPath(); ctx.rect(SKY.x, SKY.y, SKY.w, SKY.h); ctx.clip();
    fn();
  } finally {
    ctx.restore();
  }
}

// ---- primitives
function cloud(p, c, t, body, under, scale, yOff) {
  const x = ((c.x0 + t * c.speed) % (SKY.w + 400)) - 200;
  const y = c.y + yOff;
  p.noStroke();
  p.fill(under); for (const b of c.blobs) p.ellipse(x + b.dx * scale, y + b.dy * scale + 7, b.w * scale, b.h * scale);
  p.fill(body);  for (const b of c.blobs) p.ellipse(x + b.dx * scale, y + b.dy * scale, b.w * scale, b.h * scale);
  // soft top highlight so clouds read as volume, not flat stamps
  p.fill(255, 255, 255, 28);
  for (const b of c.blobs) {
    p.ellipse(x + b.dx * scale - b.w * 0.08 * scale, y + b.dy * scale - b.h * 0.18 * scale, b.w * 0.55 * scale, b.h * 0.4 * scale);
  }
}

function polyline(p, pts) {
  for (let i = 1; i < pts.length; i++) p.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
}

// ---- colors (hex in, hex out; alpha is added at the p.fill call)
function rgb(hex) {
  const c = hex.replace('#', '');
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}
function toHex(r, g, b) {
  const h = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}
function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
