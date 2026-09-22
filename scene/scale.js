// Helpers that turn a signal entry from signals.json into a population, a queue length, a glow, a fill.
// Every actor goes through these so the mapping rules live in one place and read the same in the legend.

// normalized is the percentile rank (0..1) of the latest value inside its own trailing window.
export function norm(sig, fallback = null) {
  if (!sig || sig.normalized == null) return fallback;
  return Math.max(0, Math.min(1, sig.normalized));
}

// z is clipped to [-2, 2]; map to 0..1 with 0.5 at the window mean.
export function zUnit(sig, fallback = null) {
  if (!sig || sig.z == null) return fallback;
  return Math.max(0, Math.min(1, (sig.z + 2) / 4));
}

// A crowd size between min and max from the percentile. Direction -1 signals invert (more unemployment = more benches).
export function population(sig, min, max, fallback = null) {
  const n = norm(sig, null);
  if (n == null) return fallback ?? Math.round((min + max) / 2);
  const u = (sig.direction === -1) ? (1 - n) : n;
  return Math.round(min + (max - min) * u);
}

// Inverse population: the truck queue grows as the share falls.
export function inversePopulation(sig, min, max, fallback = null) {
  const n = norm(sig, null);
  if (n == null) return fallback ?? Math.round((min + max) / 2);
  return Math.round(min + (max - min) * (1 - n));
}

export function fmt(v, unit = '') {
  if (v == null) return 'no data';
  const abs = Math.abs(v);
  let s;
  if (unit === 'USD' || unit === '$') s = '$' + Math.round(v).toLocaleString('en-US');
  else if (abs >= 1e9) s = (v / 1e9).toFixed(2) + 'B';
  else if (abs >= 1e6) s = (v / 1e6).toFixed(1) + 'M';
  else if (abs >= 1e4) s = Math.round(v).toLocaleString('en-US');
  else if (Number.isInteger(v)) s = String(v);
  else s = v.toFixed(abs < 10 ? 2 : 1);
  return unit && unit !== 'USD' && unit !== '$' ? `${s} ${unit}` : s;
}

export function ordinal(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return n + 'th';
  return n + ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
}

export function pct(u) { return u == null ? 'n/a' : ordinal(Math.round(u * 100)) + ' pct'; }

export function periodLabel(sig) {
  if (!sig || !sig.period) return '';
  const p = sig.period;
  if (/^\d{4}-\d{2}$/.test(p)) {
    const [y, m] = p.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  }
  if (/^\d{4}Q\d$/.test(p)) return p.replace('Q', ' Q');
  if (/^\d{4}-\d{2}-\d{2}$/.test(p)) {
    const d = new Date(p + 'T00:00:00Z');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}$/.test(p)) {
    const d = new Date(p + ':00:00Z');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) + ', ' + p.slice(11) + ':00 UTC';
  }
  return p;
}

// The sentence every legend ends with: attribution (when present), source, series, period, next release.
// Prefer the short attribution line (e.g. "Source: FilmLA") so cited figures stay honest without inventing licence terms.
export function provenance(sig) {
  if (!sig) return 'no signal loaded';
  const bits = [];
  if (sig.attribution) bits.push(sig.attribution);
  else bits.push(sig.source || 'source unknown');
  if (sig.attribution && sig.source && !String(sig.attribution).includes(String(sig.source).slice(0, 24))) {
    bits.push(sig.source);
  }
  if (sig.series) bits.push(sig.series);
  if (sig.period) {
    const when = periodLabel(sig) + (sig.preliminary ? ' (preliminary)' : '');
    bits.push(sig.as_of ? `${when} · as of ${sig.as_of}` : when);
  } else if (sig.as_of) {
    bits.push('as of ' + sig.as_of);
  }
  if (sig.next_expected) bits.push('next expected ' + sig.next_expected);
  if (sig.stale) bits.push('STALE: last known value · no update since ' + (sig.period_end || sig.as_of));
  if (sig.error) bits.push('last fetch failed: ' + sig.error);
  if (sig.redistributable === 'derived-only') bits.push('derived aggregates only');
  return bits.join(' · ');
}
