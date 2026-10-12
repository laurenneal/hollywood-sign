// Procedural material tiles for the studio lot. Seeded value-noise, no image models.
 // Each tile is baked once into a p5 Graphics and stamped onto the lot buffer.
 // Recipes: docs/art/recipes.md

const SEED = 0x51c4_a11e; // fixed: captures stay identical

function hash2(x, y, s = SEED) {
  let n = (x * 374761393 + y * 668265263 + s) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

/** Value noise in [0,1] at continuous (x,y). */
export function valueNoise(x, y, seed = SEED) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = smooth(x - x0), fy = smooth(y - y0);
  const a = hash2(x0, y0, seed);
  const b = hash2(x0 + 1, y0, seed);
  const c = hash2(x0, y0 + 1, seed);
  const d = hash2(x0 + 1, y0 + 1, seed);
  const u = a + (b - a) * fx;
  const v = c + (d - c) * fx;
  return u + (v - u) * fy;
}

/** Sum three octaves; returns 0..1. */
export function fbm(x, y, { seed = SEED, scale = 0.08, octaves = 3 } = {}) {
  let amp = 0.5, freq = 1, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise(x * scale * freq, y * scale * freq, seed + i * 97);
    norm += amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return sum / norm;
}

function hexRgb(hex) {
  const c = hex.replace('#', '');
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}

function mixRgb(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/**
 * Bake a seamless-ish material tile.
 * mode: 'paper' | 'stucco' | 'asphalt' | 'hill' | 'grass' | 'metal' | 'brick'.
 * `p` must be the main p5 sketch (Graphics.createGraphics is unsupported).
 * Returns a p5.Graphics of size sz×sz.
 */
export function bakeMaterial(p, mode, baseHex, { sz = 128, contrast = 0.18, seed = SEED } = {}) {
  const g = p.createGraphics(sz, sz);
  g.pixelDensity(1);
  g.loadPixels();
  const base = hexRgb(baseHex);
  const dark = mixRgb(base, [26, 32, 34], 0.55);
  const lite = mixRgb(base, [255, 250, 240], 0.35);
  for (let y = 0; y < sz; y++) {
    for (let x = 0; x < sz; x++) {
      let n;
      if (mode === 'paper') {
        // fine grain + faint fiber streaks
        n = fbm(x, y, { seed, scale: 0.22, octaves: 4 });
        const fiber = valueNoise(x * 0.9, y * 0.05, seed + 3);
        n = n * 0.75 + fiber * 0.25;
      } else if (mode === 'stucco') {
        n = fbm(x, y, { seed: seed + 11, scale: 0.11, octaves: 3 });
        const pebble = valueNoise(x * 0.35, y * 0.35, seed + 19);
        n = n * 0.65 + pebble * 0.35;
      } else if (mode === 'asphalt') {
        n = fbm(x, y, { seed: seed + 29, scale: 0.28, octaves: 2 });
        const grit = hash2(x, y, seed + 41);
        n = n * 0.7 + grit * 0.3;
      } else if (mode === 'grass') {
        // anisotropic blades: stretch noise vertically + sparse taller tufts
        n = fbm(x * 1.6, y * 0.55, { seed: seed + 71, scale: 0.2, octaves: 3 });
        const tuft = hash2(Math.floor(x / 3), Math.floor(y / 5), seed + 83);
        n = n * 0.82 + tuft * 0.18;
      } else if (mode === 'metal') {
        // brushed horizontal streaks + sparse sparkle
        n = valueNoise(x * 0.04, y * 0.55, seed + 97);
        const spark = hash2(x, y, seed + 101);
        n = n * 0.88 + (spark > 0.92 ? 1 : 0.35) * 0.12;
      } else if (mode === 'brick') {
        // running-bond mortar grid + soft body noise (quiet secondary district)
        const row = Math.floor(y / 8);
        const ox = (row % 2) * 10;
        const bx = Math.floor((x + ox) / 20), by = row;
        const edgeX = ((x + ox) % 20) < 1.2 || ((x + ox) % 20) > 18.8;
        const edgeY = (y % 8) < 1.1;
        const body = fbm(bx * 3.1, by * 2.7, { seed: seed + 113, scale: 0.4, octaves: 2 });
        n = edgeX || edgeY ? 0.22 : 0.45 + body * 0.35;
      } else {
        // hill: soft large-scale mottling
        n = fbm(x, y, { seed: seed + 53, scale: 0.045, octaves: 3 });
      }
      const t = (n - 0.5) * 2 * contrast; // -contrast..contrast around mid
      const rgb = t >= 0 ? mixRgb(base, lite, t) : mixRgb(base, dark, -t);
      const i = 4 * (y * sz + x);
      g.pixels[i] = rgb[0];
      g.pixels[i + 1] = rgb[1];
      g.pixels[i + 2] = rgb[2];
      g.pixels[i + 3] = 255;
    }
  }
  g.updatePixels();
  return g;
}

/** Cache of baked tiles keyed by mode+hex. */
const cache = new Map();

export function material(p, mode, baseHex, opts) {
  const key = `${mode}|${baseHex}|${opts?.sz || 128}|${opts?.contrast ?? 0.18}`;
  if (!cache.has(key)) cache.set(key, bakeMaterial(p, mode, baseHex, opts));
  return cache.get(key);
}

/** Stamp a material tile across a rect at low opacity (multiplicative feel via tint). */
export function stampMaterial(g, tile, x, y, w, h, alpha = 48) {
  g.push();
  g.tint(255, alpha);
  const tw = tile.width, th = tile.height;
  for (let yy = y; yy < y + h; yy += th) {
    for (let xx = x; xx < x + w; xx += tw) {
      const dw = Math.min(tw, x + w - xx);
      const dh = Math.min(th, y + h - yy);
      g.image(tile, xx, yy, dw, dh, 0, 0, dw, dh);
    }
  }
  g.noTint();
  g.pop();
}
