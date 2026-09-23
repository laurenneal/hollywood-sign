// The globe at the park kiosk = global monthly box office (global_box_office_month, USD, direction +1,
// window 24, Gower Street Analytics). The lot paints the kiosk box with its teal roof; this actor writes
// GLOBAL on its face and stands a globe on a ring stand in front of it (below it on the lawn, clear of
// the van's parking spot between the tent and the kiosk). The globe spins at 0.2 + 1.8 x the month's
// percentile inside its trailing 24 months (0.2 to 2 rad/s), an orthographic sphere tipped 20 degrees
// toward the viewer with meridians, parallels and a fictional set of land blobs. A small arrow floats
// above it: up when z > 0.5, down when z < -0.5, flat between (the actor has no history, so this stands in
// for year on year). The kiosk's counter window prints the month's number. Stale: gray and still.
// No data: gray and still, a dash for the arrow, and the counter window reads 'no data'.

import { norm, pct, periodLabel, provenance } from '../scale.js';
import { useDisplay } from '../fonts.js';

const RATE_MIN = 0.2, RATE_MAX = 2;      // rad/s
const R = 34;                            // globe radius — quieter on overview
const TILT = 0.35;                       // radians the north pole tips toward the viewer
const DEFAULT_WINDOW = 24;
const MERIDIANS = 8, PARALLELS = [-0.7, -0.35, 0, 0.35, 0.7];   // MERIDIANS great circles = 2 x MERIDIANS half-meridians
const STEPS = 18;                        // polyline samples per half-meridian and parallel
// a fictional map: longitude, latitude (radians), and the blob's size as fractions of R. No real coastlines.
const LAND = [
  { lon: 0.3, lat: 0.55, w: 0.8, h: 0.5 }, { lon: 0.9, lat: -0.35, w: 0.5, h: 0.6 },
  { lon: 2.2, lat: 0.3, w: 1.0, h: 0.5 }, { lon: 2.7, lat: -0.7, w: 0.45, h: 0.35 },
  { lon: 3.9, lat: 0.75, w: 0.7, h: 0.3 }, { lon: 4.5, lat: -0.15, w: 0.6, h: 0.7 },
  { lon: 5.5, lat: 0.1, w: 0.35, h: 0.35 },
];

export default {
  id: 'globe',
  signal: 'global_box_office_month',
  district: 'park',
  layer: 'mid',
  sig: null,
  rate: 0,            // rad/s; 0 when stale or without data
  trend: null,        // 'up' | 'down' | 'flat' | null
  cx: 0, cy: 0,

  init(scene) {},

  // no layout randomness: the globe stands where the kiosk is; only the rate and the arrow change
  update(sig, scene) {
    const k = scene.ANCHORS.kiosk;
    this.sig = sig;
    const live = sig && sig.value != null;
    const n = live ? norm(sig, null) : null;
    this.rate = !live || sig.stale ? 0 : Math.round((RATE_MIN + (RATE_MAX - RATE_MIN) * (n ?? 0.5)) * 100) / 100;
    this.trend = !live || sig.z == null ? null : (sig.z > 0.5 ? 'up' : sig.z < -0.5 ? 'down' : 'flat');
    this.cx = k.x + k.w / 2;
    this.cy = k.y + k.h + 62;
  },

  draw(p, t, scene) {
    const C = scene.PALETTE, k = scene.ANCHORS.kiosk;
    const sig = this.sig;
    const live = sig && sig.value != null;
    const stale = live && !!sig.stale;
    const paint = (hex) => live ? scene.paint(sig, hex) : C.stale;
    const cx = this.cx, cy = this.cy;
    const spin = this.rate * t;
    p.noStroke();

    // GLOBAL on the kiosk face, and a counter window (warm after dark) that prints the month's number or 'no data'
    p.fill(scene.isNight ? C.windowWarm : C.paper); p.rect(k.x + 8, k.y + 52, k.w - 16, 38, 3);
    p.fill(C.ink); useDisplay(p); p.textStyle(p.BOLD); p.textSize(26); p.textAlign(p.CENTER, p.CENTER);
    p.text('GLOBAL', k.x + k.w / 2, k.y + 20);
    p.textStyle(p.NORMAL); p.textSize(24); p.fill(C.inkSoft);
    p.text('BOX OFFICE', k.x + k.w / 2, k.y + 42);
    p.textSize(26); p.fill(live ? scene.paint(sig, C.ink) : C.stale);
    p.text(live ? money('$', sig.value, sig.unit) : 'no data', k.x + k.w / 2, k.y + 70);
    p.textAlign(p.LEFT, p.TOP);

    // stand: foot, stem, then the ring on the right side from pivot to pivot
    p.fill(26, 32, 34, 35); p.ellipse(cx + 4, cy + R + 25, 44, 8);
    p.fill(C.inkSoft); p.ellipse(cx, cy + R + 24, 40, 8); p.rect(cx - 3, cy + R + 4, 6, 20, 2);
    // pedestal plate under the stem
    p.fill(paint(C.tower)); p.ellipse(cx, cy + R + 6, 16, 5);
    p.noFill(); p.stroke(paint(C.tower)); p.strokeWeight(3);
    p.arc(cx, cy, 2 * R + 10, 2 * R + 10, -Math.PI / 2, Math.PI / 2);
    p.noStroke(); p.fill(paint(C.tower)); p.ellipse(cx, cy - R - 5, 6, 6); p.ellipse(cx, cy + R + 5, 6, 6);

    // the sphere: ocean, land, graticule, a highlight
    p.fill(paint(C.water)); p.ellipse(cx, cy, 2 * R, 2 * R);
    p.fill(paint(C.hill));
    for (const b of LAND) {
      const q = project(b.lon + spin, b.lat);
      if (q.z < 0.12) continue;
      p.ellipse(cx + q.x * R, cy + q.y * R, Math.max(1, b.w * R * q.z), Math.max(1, b.h * R * (0.55 + 0.45 * q.z)));
    }
    p.noFill(); p.stroke(paint(C.tower)); p.strokeWeight(0.8);
    // both halves of every meridian: with only the front halves the graticule went missing for half of each turn
    for (let m = 0; m < 2 * MERIDIANS; m++) polyline(p, cx, cy, i => project(spin + m * Math.PI / MERIDIANS, -Math.PI / 2 + Math.PI * i / STEPS));
    for (const lat of PARALLELS) polyline(p, cx, cy, i => project(spin + Math.PI * 2 * i / STEPS, lat));
    p.noStroke();
    p.fill(255, 255, 255, live && !stale ? 70 : 40); p.ellipse(cx - R * 0.38, cy - R * 0.42, R * 0.5, R * 0.3);
    p.stroke(paint(C.tower)); p.strokeWeight(1.2); p.noFill(); p.ellipse(cx, cy, 2 * R, 2 * R); p.noStroke();

    // the arrow above the ring: up in green, down in red, flat in ink; a dash when there is no data
    const ay = cy - R - 22 + (live && !stale ? Math.sin(t * 2) * 1.5 : 0);
    if (this.trend === 'up') {
      p.fill(paint(C.poster[5])); p.triangle(cx - 7, ay + 4, cx + 7, ay + 4, cx, ay - 7); p.rect(cx - 2, ay + 4, 4, 6);
    } else if (this.trend === 'down') {
      p.fill(paint(C.lamp)); p.triangle(cx - 7, ay - 4, cx + 7, ay - 4, cx, ay + 7); p.rect(cx - 2, ay - 10, 4, 6);
    } else if (this.trend === 'flat') {
      p.fill(paint(C.inkSoft)); p.rect(cx - 9, ay - 2, 12, 4); p.triangle(cx + 3, ay - 6, cx + 3, ay + 6, cx + 10, ay);
    } else {
      p.fill(C.stale); p.rect(cx - 7, ay - 1.5, 14, 3);
    }

    // hover: the kiosk face, the arrow, the globe and its stand
    scene.hit(k.x - 6, k.y - 14, k.w + 12, (cy + R + 30) - (k.y - 14), this);
  },

  legend(sig) {
    if (!sig) {
      return { title: 'Globe kiosk', text: 'Global box office not loaded — globe still and gray.' };
    }
    if (sig.value == null) {
      return { title: 'Globe kiosk', text: 'No global box-office value yet — globe still and gray.', source: provenance(sig) };
    }
    const win = sig.window_n || DEFAULT_WINDOW;
    const arrow = this.trend === 'up' ? 'up' : this.trend === 'down' ? 'down' : this.trend === 'flat' ? 'flat' : 'a dash (no z yet)';
    return {
      title: sig.stale ? 'Globe standing still (stale)' : `Globe spinning at ${this.rate} rad/s`,
      text: `${money('$', sig.value, sig.unit)} global box office in ${periodLabel(sig)} (Gower Street)` +
            ` — ${pct(sig.normalized)} of the last ${win} months. Spin 0.2–2 rad/s with the percentile` +
            `${sig.stale ? ' (stale → still)' : ''}; arrow ${arrow} from the z-score.`,
      source: provenance(sig),
    };
  },
};

// orthographic projection of a point on the unit sphere, north pole tipped TILT toward the viewer.
// x right, y down (screen), z toward the viewer; a point is on the near side when z > 0.
function project(lon, lat) {
  const X = Math.cos(lat) * Math.sin(lon);
  const Y = -Math.sin(lat);
  const Z = Math.cos(lat) * Math.cos(lon);
  return { x: X, y: Y * Math.cos(TILT) + Z * Math.sin(TILT), z: -Y * Math.sin(TILT) + Z * Math.cos(TILT) };
}

// draw the near-side segments of a sampled curve on the sphere
function polyline(p, cx, cy, at) {
  let prev = null;
  for (let i = 0; i <= STEPS; i++) {
    const q = at(i);
    if (prev && prev.z > 0 && q.z > 0) p.line(cx + prev.x * R, cy + prev.y * R, cx + q.x * R, cy + q.y * R);
    prev = q;
  }
}

// money with the unit respected: a feed may hand over dollars, millions of dollars or billions
function money(sym, v, unit = '') {
  if (v == null || !Number.isFinite(Number(v))) return sym + '?';
  let n = Number(v);
  const u = String(unit).toLowerCase();
  if (/billion|\bbn\b/.test(u)) n *= 1e9;
  else if (/million|\bmn\b|\bm\b/.test(u)) n *= 1e6;
  else if (/thousand|\bk\b/.test(u)) n *= 1e3;
  const a = Math.abs(n);
  if (a >= 1e9) return sym + (n / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return sym + Math.round(n / 1e6).toLocaleString('en-US') + 'M';
  return sym + Math.round(n).toLocaleString('en-US');
}
