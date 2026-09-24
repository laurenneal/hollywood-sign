// Deterministic randomness. Same seed, same sequence, on every machine.
// The scene seeds from hash(today + signal values), so the same numbers always give the same picture.

export function hashString(s) {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  const fn = function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  fn.seed = seed;
  return fn;
}

// A child generator with its own stream, so actors do not disturb each other's sequences
// when one is added or removed. Name it by the actor id.
export function child(rng, name) {
  return mulberry32(hashString(String(rng.seed) + ':' + name));
}

export function range(rng, a, b) { return a + (b - a) * rng(); }
export function int(rng, a, b) { return Math.floor(range(rng, a, b + 1)); }
export function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
