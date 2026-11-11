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

const CURRENCY = { USD: '$', $: '$', GBP: '£' };

// Counts take thousands separators (no signal is a year); 'ratio' and 'share' are fractions and 'percent' is
// already ×100, and all three read as a percentage. Money is shortened from a million the way the marquee and
// the globe print it ($26.0M, $4.64B) and is whole below that.
export function fmt(v, unit = '') {
  if (v == null) return 'no data';
  if (unit === 'ratio' || unit === 'share') return percent(v * 100);
  if (unit === 'percent') return percent(v);
  const abs = Math.abs(v);
  const sym = CURRENCY[unit];
  let s;
  if (abs >= 1e9) s = (v / 1e9).toFixed(2) + 'B';
  else if (abs >= 1e6) s = (v / 1e6).toFixed(1) + 'M';
  else if (abs >= 1e3 || sym) s = Math.round(v).toLocaleString('en-US');
  else if (Number.isInteger(v)) s = String(v);
  else s = v.toFixed(abs < 10 ? 2 : 1);
  if (sym) return sym + s;
  return unit ? `${s} ${unit}` : s;
}

// Whole percents from 10% up, one decimal below: 28%, 7.2%, 0.5%.
function percent(p) {
  return `${Math.abs(p) >= 10 ? Math.round(p) : Number(p.toFixed(1))}%`;
}

// Plain-language, relative read of the composite index (0..100). It is a relative composite, never a
// grade: 50 = every component near its own recent average. Bands describe direction, not quality.
export function indexRead(value) {
  if (value == null || Number.isNaN(Number(value))) return 'not enough history yet';
  const v = Math.round(Number(value));
  if (v < 40) return 'below its recent baseline';
  if (v < 60) return 'near its recent baseline';
  return 'above its recent baseline';
}

// What each index component did, said the way its points moved the index (up = it pushed the index up).
const MOVES = {
  trade_tone: (up, d) => (up
    ? (d.signed_z_to < 0 ? 'the trade press was less gloomy' : 'the trade press was more upbeat')
    : (d.signed_z_to > 0 ? 'the trade press was less upbeat' : 'the trade press was gloomier')),
  weekend_no1_4wk: (up) => (up ? 'the box office picked up' : 'the box office slowed'),
  filmla_shoot_days: (up) => (up ? 'LA shoot days picked up' : 'LA shoot days slowed'),
  la_jobs: (up) => (up ? 'LA film and TV jobs rose' : 'LA film and TV jobs fell'),
  la_share: (up) => (up ? 'LA\u2019s share of US film and TV jobs grew' : 'LA\u2019s share of US film and TV jobs shrank'),
  unemp_512_12m: (up) => (up ? 'film and TV unemployment eased' : 'film and TV unemployment rose'),
};

// "Up 3.1 since yesterday: the trade press was less gloomy." from the index's extra.change (METHOD.md): the move,
// and when the build could split it, the one or two components that did most of it. A component is named only
// when it pushed the way the index went and its own number moved the way the words say.
export function indexChange(sig) {
  const ex = sig && sig.extra;
  const ch = ex && ex.change;
  if (!ch || typeof ch.delta !== 'number') return '';
  const since = dayGap(ch.since, sig.period) === 1 ? 'yesterday' : shortDay(ch.since);
  if (!since) return '';
  if (Math.abs(ch.delta) < 0.05) return `Unchanged since ${since}.`;
  const up = ch.delta > 0;
  const move = `${up ? 'Up' : 'Down'} ${Math.abs(ch.delta).toFixed(1)} since ${since}`;
  if (ch.reason === 'method') return `${move}, but the method changed in between.`;
  if (ch.reason === 'coverage' && ex.live != null && ex.total != null && ch.live_from != null) {
    return `${move}, with ${ex.live} of ${ex.total} components live (${ch.live_from} before).`;
  }
  const said = (ch.attributed && Array.isArray(ch.drivers) ? ch.drivers : [])
    .filter((d) => MOVES[d.component] && (d.points > 0) === up && d.direction
      && (d.value_to - d.value_from) * d.direction * (up ? 1 : -1) > 0)
    .sort((a, b) => Math.abs(b.points) - Math.abs(a.points));
  const named = said.slice(0, 1);
  if (said[1] && Math.abs(said[1].points) >= Math.max(0.3, Math.abs(said[0].points) / 2)) named.push(said[1]);
  if (!named.length) return `${move}.`;
  return `${move}: ${named.map((d) => MOVES[d.component](up, d)).join(' and ')}.`;
}

function dayGap(from, to) {
  const a = utcDay(from), b = utcDay(to);
  return a == null || b == null ? null : Math.round((b - a) / 86400000);
}
function utcDay(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null;
}
function shortDay(s) {
  const t = utcDay(s);
  return t == null ? '' : new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

const CADENCE_DAYS = { hourly: 1 / 24, daily: 1, weekly: 7, monthly: 30.4, quarterly: 91.3, annual: 365, irregular: 365 };
const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October',
  'November', 'December'];
const QUARTER_SPANS = ['January\u2013March', 'April\u2013June', 'July\u2013September', 'October\u2013December'];

// The period in words: "August 2026", "April–June 2026", else the short label ("Sep 20, 2026").
export function plainPeriod(sig) {
  const p = sig && sig.period ? String(sig.period) : '';
  let m;
  if ((m = /^(\d{4})-(\d{2})$/.exec(p))) return `${MONTH_NAMES[Number(m[2]) - 1]} ${m[1]}`;
  if ((m = /^(\d{4})Q([1-4])$/.exec(p))) return `${QUARTER_SPANS[Number(m[2]) - 1]} ${m[1]}`;
  return periodLabel(sig);
}

// The span a signal's trailing window covers, in words: "the past two years". Irregular releases (tax-credit
// rounds) have no calendar length, so they count releases instead: "the last 24 rounds".
export function lookback(sig, { unit = 'releases' } = {}) {
  if (!sig || !sig.window_n) return '';
  if (sig.cadence === 'irregular') return `the last ${sig.window_n} ${unit}`;
  const days = sig.window_n * (CADENCE_DAYS[sig.cadence] || 30.4);
  if (days <= 10) return 'the past week';
  if (days <= 45) return 'the past month';
  if (days <= 135) return 'the past three months';
  if (days <= 270) return 'the past six months';
  if (days <= 540) return 'the past year';
  if (days <= 1000) return 'the past two years';
  const years = Math.round(days / 365);
  return `the past ${NUMBER_WORDS[years] || years} years`;
}

// Where the latest value sits among its own recent past, for people who have never met a percentile:
// { band: 'about average', span: 'the past two years' }, or null until the signal has a window.
export function versusParts(sig, opts) {
  const n = norm(sig, null), span = lookback(sig, opts);
  if (n == null || !span) return null;
  const band = n >= 0.9 ? 'near the top' : n >= 0.65 ? 'above average' : n > 0.35 ? 'about average'
    : n > 0.1 ? 'below average' : 'near the bottom';
  return { band, span };
}

// "about average for the past two years", "near the top of the past year", or ''.
export function versus(sig, opts) {
  const v = versusParts(sig, opts);
  return v ? `${v.band} ${v.band.startsWith('near') ? 'of' : 'for'} ${v.span}` : '';
}

// " — about average for the past two years", or nothing: appended to a sentence about the latest value.
export function dashVersus(sig, opts) {
  const v = versus(sig, opts);
  return v ? ` \u2014 ${v}` : '';
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
