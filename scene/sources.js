// Who publishes each number, as a name and a home page, for legends read by people rather than parsers.
// Matched by the host of the manifest's source_url; hand-curated and computed signals are listed by id.
// Dataset names, series ids and file URLs stay in the manifests, DATA_SOURCES.md and the inspector's
// collapsed "Data details".

import { plainPeriod } from './scale.js';

const TRADES = [
  ['Variety', 'https://variety.com/'],
  ['Deadline', 'https://deadline.com/'],
  ['The Hollywood Reporter', 'https://www.hollywoodreporter.com/'],
  ['IndieWire', 'https://www.indiewire.com/'],
  ['TheWrap', 'https://www.thewrap.com/'],
];
const GDELT = ['GDELT', 'https://www.gdeltproject.org/'];
const UNIONS = [['WGA', 'https://www.wga.org/'], ['SAG-AFTRA', 'https://www.sagaftra.org/'], ['IATSE', 'https://iatse.net/']];
const CALCULATED_ENTRY = { name: 'The Hollywood SIGN', href: null };
const CALCULATED = [CALCULATED_ENTRY];

const BY_ID = {
  sign_index: CALCULATED,
  sign_index_vs2019: CALCULATED,
  sign_index_components_live: CALCULATED,
  strike_active: UNIONS,
  days_to_next_expiry: UNIONS,
};

const BY_HOST = [
  ['bls.gov', [['U.S. Bureau of Labor Statistics', 'https://www.bls.gov/']]],
  ['filmla.com', [['FilmLA', 'https://www.filmla.com/']]],
  ['wikipedia.org', [['Wikipedia', 'https://en.wikipedia.org/'], ['Box Office Mojo', 'https://www.boxofficemojo.com/']]],
  ['wikimedia.org', [['Wikipedia page views', 'https://wikimedia.org/']]],
  ['netflix.com', [['Netflix Top 10', 'https://www.netflix.com/tudum/top10']]],
  ['gdeltproject.org', [GDELT, ...TRADES]],
  ['deadline.com', TRADES],
  ['tvmaze.com', [['TVmaze', 'https://www.tvmaze.com/']]],
  ['cityofnewyork.us', [['NYC Open Data', 'https://opendata.cityofnewyork.us/']]],
  ['edd.ca.gov', [['California EDD', 'https://edd.ca.gov/']]],
  ['data.ca.gov', [['California EDD', 'https://edd.ca.gov/']]],
  ['film.ca.gov', [['California Film Commission', 'https://film.ca.gov/']]],
  ['esd.ny.gov', [['Empire State Development', 'https://esd.ny.gov/']]],
  ['georgia.org', [['Georgia Film Office', 'https://www.georgia.org/industries/film-entertainment']]],
  ['gower.st', [['Gower Street Analytics', 'https://gower.st/']]],
  ['sec.gov', [['SEC EDGAR', 'https://www.sec.gov/edgar/search/']]],
  ['sundance.org', [['Sundance Institute', 'https://www.sundance.org/']]],
  ['bfi.org.uk', [['BFI', 'https://www.bfi.org.uk/']]],
  ['themoviedb.org', [['TMDB', 'https://www.themoviedb.org/']]],
];

function hostOf(url) {
  try { return new URL(String(url)).hostname.replace(/^www\./, ''); } catch (_) { return ''; }
}

function fromAttribution(sig) {
  const raw = String(sig.attribution || sig.source || '').replace(/^source:\s*/i, '');
  const name = raw.split(/\s[(—-]|[,;(]/)[0].trim();
  if (!name) return [];
  const href = /^https?:\/\//i.test(sig.source_url || '') ? sig.source_url : null;
  return [{ name, href }];
}

/** [{name, href|null}] for a signal entry; [] when there is nothing to cite. */
export function sourcesOf(sig) {
  if (!sig) return [];
  const byId = BY_ID[sig.id];
  if (byId === CALCULATED) return CALCULATED;
  if (byId) return byId.map(([name, href]) => ({ name, href }));
  const host = hostOf(sig.source_url);
  const hit = host && BY_HOST.find(([h]) => host === h || host.endsWith('.' + h));
  if (hit) return hit[1].map(([name, href]) => ({ name, href }));
  return fromAttribution(sig);
}

function shortDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '').slice(0, 10));
  if (!m) return '';
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

// "figures for August 2026 · next update Oct 20", "updated Sep 24" for hourly counts, or "no update since
// Aug 31" when stale. Revisable ("preliminary") figures are the norm here, so the card does not flag them.
function when(sig) {
  const bits = [];
  if (sig.cadence === 'hourly') {
    const day = shortDate(sig.as_of || sig.period);
    return day ? [`updated ${day}`] : [];
  }
  const per = plainPeriod(sig);
  if (per) bits.push(`figures for ${per}`);
  if (sig.stale && sig.value != null) {
    const since = shortDate(sig.period_end || sig.as_of);
    bits.push(since ? `no update since ${since}` : 'not updated recently');
  } else if (sig.next_expected) {
    const next = shortDate(sig.next_expected);
    if (next) bits.push(`next update ${next}`);
  }
  return bits;
}

const calculated = (list) => list.length === 1 && list[0] === CALCULATED_ENTRY;

/** One plain line for the hover card: "Source: FilmLA · figures for 2026 Q2 · next update Oct 25". */
export function sourceNote(sig) {
  const list = sourcesOf(sig);
  if (!list.length) return '';
  const who = calculated(list) ? 'Calculated from the numbers on this page' : `Source: ${list.map((s) => s.name).join(', ')}`;
  return [who, ...when(sig)].join(' \u00b7 ');
}

/** Same line with each organisation linked to its home page, for panels that take clicks. */
export function sourceHtml(sig, esc) {
  const list = sourcesOf(sig);
  if (!list.length) return '';
  const linked = list.map((s) => (s.href
    ? `<a href="${esc(s.href)}" target="_blank" rel="noopener noreferrer">${esc(s.name)}</a>`
    : esc(s.name))).join(', ');
  const who = calculated(list) ? 'Calculated from the numbers on this page' : `Source: ${linked}`;
  return [who, ...when(sig).map(esc)].join(' \u00b7 ');
}
