// The About panel: a small '?' button top-right (hidden in story and bare modes by index.html's CSS) that opens a
// paper panel explaining the page in plain words: what it is, the legend (one line per district and actor with the
// mapping rule), how the index works, the timeline scrubber, the no-generative-AI line, the sources link and the
// attributions. index.html holds the CSS (#about-btn, #about). Closes on Escape, on the X, or on the backdrop.
// The legend list below is hardcoded on purpose (the page must explain itself without the actors loading) and has to
// be kept accurate to scene/actors/_registry.js: when an actor lands or its rule changes, change the row here too.
// Nothing at module top level touches the DOM, so the file imports under Node for the syntax check.

export const REPO_URL = 'https://github.com/laurenneal/hollywood-sign';
export const SOURCES_URL = `${REPO_URL}/blob/main/DATA_SOURCES.md`;
export const TMDB_LOGO = new URL('./assets/tmdb-logo.svg', import.meta.url).href;
export const HISTORY_FROM = '2022';
export const LIVE_FROM = 'Sep 21 2026';   // the first day the daily build ran; earlier days are replayed

// One row per actor, grouped by district, in the lot's reading order. `soon` marks the actors landing this week
// (their files exist; the registry and feeds are catching up): the panel already explains what they will show,
// and each one draws its own "no data" note until its signal is in signals.json. Drop the flag once they are routine.
export const LEGEND = [
  { district: 'Sky and hills', rows: [
    { actor: 'Weather and light', signal: 'trade_tone',
      rule: 'The sky shows the trade press’s mood, not LA weather: golden when coverage is upbeat, overcast when it is ordinary, rain and storms when it turns gloomy.' },
    { actor: 'Water tower', signal: 'sign_index',
      rule: 'The SIGN index: one number from 0 to 100 for Hollywood’s health. 50 is normal; the tank fills to the number.' },
    { actor: 'Banner plane', signal: 'rss_items_24h', fallback: 'rss_flag_*',
      rule: 'Flies when three or more trade stories in a day share a big theme (strikes, layoffs, shutdowns, greenlights, acquisitions, festivals) and tows that word.' },
    { actor: 'NYC skyline', signal: 'nyc_permits', fallback: 'nyc_permits_tv, nyc_permits_film',
      rule: 'More New York City film and TV permits than usual, more lit windows. The city’s data runs about three months behind.' },
    { actor: 'Two planes over the hills', signal: 'bfi_inward_spend', fallback: 'georgia_productions',
      rule: 'London and Atlanta: UK production spending from abroad and Georgia’s production count. A bigger plane means more. Context only, not productions leaving LA.' },
  ] },
  { district: 'Soundstage Row', rows: [
    { actor: 'Crews of four', signal: 'la_jobs',
      rule: 'More LA film and TV jobs than usual for the past two years, more crews on the lot.' },
    { actor: 'Red shooting lamps on the 12 stages', signal: 'filmla_shoot_days', fallback: 'filmla_*_days, filmla_incentive_share',
      rule: 'LA’s on-location filming days compared with 2019: all 12 lamps lit means filming at 2019’s pace. Trucks outside show the mix of TV, features and commercials. Updates once a quarter.' },
  ] },
  { district: 'Backlot Street', rows: [
    { actor: 'Benches and the coffee-cart queue', signal: 'unemp_512_12m', fallback: 'unemp_512',
      rule: 'More film and TV unemployment than usual, more people waiting on the benches.' },
    { actor: 'Picket line', signal: 'strike_active', fallback: 'days_to_next_expiry',
      rule: 'Picketers appear when a Hollywood union is on strike. The union-hall sign counts down to the next big contract.' },
    { actor: 'Pink slips on the union-hall board', signal: 'warn_la_employees', fallback: 'warn_la_notices',
      rule: 'More LA County layoff notices in a week, more pink slips on the board.' },
    { actor: 'Film-office window', signal: 'ca_credit_round_projects', fallback: 'ca_credit_round_days, ca_credit_round_indie_share',
      rule: 'Sheets on the counter track the projects in California’s latest film tax-credit round; independents are in teal. The wall sign says when the round was.' },
  ] },
  { district: 'The Gate', rows: [
    { actor: 'Truck queue', signal: 'la_share',
      rule: 'The line of trucks grows when LA’s share of America’s film and TV jobs shrinks.' },
    { actor: 'Departures board', signal: 'next_expected', fallback: 'every signal',
      rule: 'When each number on the lot updates next, soonest first. Late ones go grey.' },
    { actor: 'Tourists on the star walk', signal: 'attention', fallback: 'attention_daily', deferred: true,
      rule: 'Not hooked up yet: the star walk stays empty until the lot measures how much attention films and shows get online.' },
  ] },
  { district: 'The Boulevard', rows: [
    { actor: 'Marquee and ticket line', signal: 'weekend_no1',
      rule: 'The weekend’s number-one movie and what it took. The bigger the weekend, the longer the line.' },
    { actor: 'Trade billboard', signal: 'trade_headlines',
      rule: 'Scrolls the latest trade-press headlines, or notices about the lot when the trades are quiet. Never invented headlines.' },
    { actor: 'Poster wall', signal: 'tmdb_now_playing',
      rule: 'More films playing in US theaters than usual, more lit cards, each titled with a film now showing (TMDB). No posters are stored. Context only.' },
    { actor: 'Searchlights', signal: 'tmdb_trending',
      rule: 'Point at the first card when today’s most-trending film on TMDB is in US theaters; otherwise they sweep the sky.' },
    { actor: 'Newsstand papers', signal: 'rss_items_24h',
      rule: 'More trade-press stories in a day, more papers blowing down the street.' },
    { actor: 'The Fair Play Films van', signal: 'sign_index',
      rule: 'Parks somewhere new each day. Find it.' },
  ] },
  { district: 'The Apartment Block', rows: [
    { actor: 'Blue windows after dark', signal: 'netflix_hours', fallback: 'netflix_new_entrants, netflix_non_english_share',
      rule: 'More viewing of Netflix’s worldwide Top 10, more blue windows after dark. Flickers are new titles; subtitle marks are non-English ones. Context only.' },
    { actor: 'Broadcast tower', signal: 'tv_episodes_today',
      rule: 'Blinks faster on busier days for scripted TV.' },
  ] },
  { district: 'The Park', rows: [
    { actor: 'Festival tent', signal: 'sundance_features', fallback: 'sundance_submissions, sundance_selections',
      rule: 'Sundance submissions: one person in line for every 1,000 films. Changes once a year, in December.' },
    { actor: 'Globe kiosk', signal: 'global_box_office_month',
      rule: 'Spins faster in bigger months for worldwide box office; the arrow shows the direction. Context only.' },
  ] },
  { district: 'Everywhere', rows: [
    { actor: 'Hover or tap', signal: 'every actor',
      rule: 'Hover or tap anything for its number, what it means and where it comes from. Tap to pin it; pick a district to zoom in; Reset comes home.' },
    { actor: 'Late numbers', signal: 'every actor',
      rule: 'A number that has not updated on schedule turns grey and says so.' },
  ] },
];

// [who, what, pending, logo]: `pending` marks a source whose feed has no manifest in feeds/ yet (its actor is a "new"
// row above), so the panel credits it without claiming its numbers are on the page. Drop the flag when the manifest
// lands. `logo` is for sources whose terms require their mark (TMDB); keep it smaller than the page's own title.
export const ATTRIBUTIONS = [
  ['U.S. Bureau of Labor Statistics', 'LA metro and US film and TV jobs, LA share, industry unemployment, LA County QCEW 5121. Public domain; series ids are printed in every legend.'],
  ['Wikipedia', 'weekend number-one film and gross (rows cite Box Office Mojo). Text CC BY-SA 4.0; derived rows in the data are share-alike.'],
  ['Netflix Top 10', 'weekly global Top 10 hours, netflix.com/tudum/top10. Derived aggregates and shares only — no raw Tudum tables on the public site.'],
  ['FilmLA', 'on-location shoot days; cited as the source of every shoot-day figure.'],
  ['The GDELT Project', 'trade-press tone (sky / news path) and short trade crawl lines on the boulevard billboard; cited and linked, gdeltproject.org.'],
  ['Wikimedia and Wikidata', 'daily top-1,000 page views (Attention deferred).'],
  ['TVmaze', 'scripted episodes airing today, tvmaze.com. CC BY-SA.'],
  ['NYC Open Data', 'film permit events, Mayor’s Office of Media and Entertainment.'],
  ['California EDD', 'WARN layoff notices (public record) and CES metro motion-picture jobs via data.ca.gov (CC BY), a cross-check on la_jobs.'],
  ['SEC EDGAR', 'studio-basket quarterly revenue from XBRL frames; public domain. Stooq prices stay local-only.'],
  ['California Film Commission', 'Film and Television Tax Credit Program approved-projects list.'],
  ['Sundance Institute', 'festival submissions and selections, as announced.'],
  ['BFI Research and Statistics', 'UK inward-investment production spend, quarterly.'],
  ['Georgia Film Office', 'annual production counts.'],
  ['Gower Street Analytics', 'monthly global box office; cited.'],
  ['TMDB', 'films now playing in US theaters and today’s trending films (poster wall, searchlights); titles are display-only. ' +
    'This product uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.', false, TMDB_LOGO],
  ['Trade press RSS', 'Deadline, Variety, The Hollywood Reporter, IndieWire, TheWrap: counts for banner plane / newsstand — not the sky.'],
  ['Union dates', 'WGA, SAG-AFTRA and IATSE announcements, as listed in data/static/events.json.'],
];

const INDEX_PARAGRAPH =
  'The number on the water tower, the SIGN index, sums up LA film and TV jobs (40%), filming days (20%), box office (20%) ' +
  'and the trade press’s mood (20%). 50 means they are all at their usual levels for the past couple of years; higher is ' +
  'stronger, lower is weaker. It is a comparison, not a grade. A piece that is out of date is left out and the rest share ' +
  'its weight. A second reading compares the same mix with 2019. The full method is published with the data.';

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Signal ids stay in LEGEND for tooling; the panel shows the plain rule only (ids live in DATA_SOURCES.md).
export function renderAboutHtml() {
  const legend = LEGEND.map((d) => {
    const rows = d.rows.map((r) => {
      const tag = r.deferred ? 'coming later' : r.soon ? 'new' : '';
      const cls = r.deferred ? 'deferred' : r.soon ? 'soon' : '';
      return `<li${cls ? ` class="${cls}"` : ''}><b>${esc(r.actor)}</b>${tag ? ` <span class="tag">${tag}</span>` : ''}` +
        `<span class="rule">${esc(r.rule)}</span></li>`;
    }).join('');
    return `<h3>${esc(d.district)}</h3><ul class="legend">${rows}</ul>`;
  }).join('');
  const attrib = ATTRIBUTIONS.map(([who, what, pending, logo]) =>
    `<li${pending ? ' class="soon"' : ''}>${logo ? `<img class="logo" src="${esc(logo)}" alt="${esc(who)} logo">` : ''}` +
    `<b>${esc(who)}</b> ${esc(what)}${pending ? ' <span class="tag">feed pending</span>' : ''}</li>`).join('');
  return `
    <button class="x" type="button" aria-label="Close">×</button>
    <h2 id="about-title">The Hollywood SIGN</h2>
    <p class="lede">A drawn map of a fictional studio lot. Every crowd, queue, lamp, and weather beat is one public number.
      SIGN = Shoot days · Income · Grosses · News. LA is the reference city; ambiguous numbers show as context.
      Nothing is generated. Same <code>signals.json</code>, same picture. Tap or hover OVER anything (or open <b>#</b>) for the number and source.
      Opens on the whole lot (The Gate on phones). Pick a district to zoom in, or use Explore to pan and zoom; Reset returns home. The Fair Play Films van (marked FPF) parks somewhere new each day.</p>
    <p class="noai"><b>No generative AI image model anywhere.</b> The lot is drawn in code (p5.js geometry plus seeded
      procedural material tiles — paper grain, stucco, asphalt). Movers are placed by a number. See <code>docs/art/recipes.md</code>.</p>

    <h3 class="section">The legend</h3>
    <p class="small">Every crowd, light and queue stands for one public number. Sizes compare each number with its own
      recent past: a full crowd means “high for this number lately,” not a head count.</p>
    ${legend}

    <h3 class="section">How the index works</h3>
    <p>${esc(INDEX_PARAGRAPH)}</p>
    <p class="small">Most of it does not move most days: jobs monthly, shoot days quarterly, box office weekly.
      That is Hollywood’s public data, not a bug. The gate departures board says when each number lands next.</p>

    <h3 class="section">The timeline</h3>
    <p>Drag the bar to any day since ${esc(HISTORY_FROM)} and the lot redraws. Days before ${esc(LIVE_FROM)}
      replay from history with latest revisions (the index as we would compute it now). LIVE returns to today.
      <b>July 2023 strikes</b> jumps to mid dual-strike (2023-07-15). Shareable links:
      <code>?replay=2023-07-15</code>, <code>?district=stages</code>, <code>?signal=water_tower</code>.</p>

    <h3 class="section">Sources and attributions</h3>
    <p>Every number traces to a credit. Full table: <a href="${SOURCES_URL}" target="_blank" rel="noopener">DATA_SOURCES.md</a>.</p>
    <ul class="attrib">${attrib}</ul>
    <p class="small">No Hollywood Sign imagery and no real studio marks — fictional lot; the water tower carries a number.
      Lauren Neal (<a href="https://www.instagram.com/thelaurenneal/" target="_blank" rel="me noopener">@thelaurenneal</a>).
      Code MIT © 2026 Lauren Neal; data keeps upstream terms.
      <a href="${REPO_URL}" target="_blank" rel="noopener">Repository</a>.</p>
    <p class="keys small">Keys: <kbd>?</kbd> About, <kbd>#</kbd> live numbers, <kbd>Esc</kbd> closes, <kbd>←</kbd> <kbd>→</kbd> timeline
      (<kbd>Shift</kbd> = week). Phone: tap to pin, district bar or <kbd>[</kbd>/<kbd>]</kbd> for stops.
      Explore toggles pan/pinch; Pause freezes ambient motion. All signals opens a bounded tray so the lot stays visible.</p>
  `;
}

// Build the button and the panel, wire them, return the controls. Safe to call once per page.
export function installAbout(scene, opts = {}) {
  if (typeof document === 'undefined') return null;
  const doc = document;
  const modeOff = () => doc.body.classList.contains('story') || doc.body.classList.contains('bare');

  const btn = doc.createElement('button');
  btn.id = 'about-btn';
  btn.type = 'button';
  btn.textContent = 'About';
  btn.setAttribute('aria-label', 'About this page');
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.setAttribute('aria-controls', 'about');
  btn.setAttribute('aria-expanded', 'false');
  btn.title = 'About this page (?)';

  const wrap = doc.createElement('div');
  wrap.id = 'about';
  wrap.hidden = true;
  const panel = doc.createElement('div');
  panel.className = 'panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'about-title');
  panel.tabIndex = -1;
  panel.innerHTML = renderAboutHtml();
  wrap.appendChild(panel);
  const actions = doc.getElementById('header-actions');
  (actions || doc.body).appendChild(btn);
  doc.body.appendChild(wrap);
  const closeBtn = panel.querySelector('.x');

  let open = false;
  let lastFocus = null;
  function show() {
    if (open || modeOff()) return;
    open = true;
    lastFocus = doc.activeElement;
    wrap.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    panel.scrollTop = 0;
    closeBtn.focus();
    if (opts.onOpen) opts.onOpen();
  }
  function hide() {
    if (!open) return;
    open = false;
    wrap.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    // back to whatever had focus, or to the button when nothing did (opened with the ? key from the page body)
    if (lastFocus && lastFocus !== doc.body && lastFocus.focus && doc.contains(lastFocus)) lastFocus.focus(); else btn.focus();
    if (opts.onClose) opts.onClose();
  }
  function toggle() { if (open) hide(); else show(); }

  btn.addEventListener('click', toggle);
  closeBtn.addEventListener('click', hide);
  wrap.addEventListener('click', (e) => { if (e.target === wrap) hide(); });
  doc.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) { e.preventDefault(); hide(); return; }
    if (open && e.key === 'Tab') {
      const focusables = [...panel.querySelectorAll('a[href], button, [tabindex]:not([tabindex="-1"])')]
        .filter((n) => !n.disabled && n.offsetParent !== null);
      if (!focusables.length) { e.preventDefault(); panel.focus(); return; }
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      return;
    }
    const t = e.target;
    const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if (e.key === '?' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); toggle(); }
  });

  if (scene) scene.about = { open: show, close: hide, toggle, get isOpen() { return open; } };
  return { open: show, close: hide, toggle, get isOpen() { return open; }, button: btn, panel: wrap };
}
