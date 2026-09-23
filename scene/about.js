// The About panel: a small '?' button top-right (hidden in story and bare modes by index.html's CSS) that opens a
// paper panel explaining the page in plain words: what it is, the legend (one line per district and actor with the
// mapping rule), how the index works, the timeline scrubber, the no-generative-AI line, the sources link and the
// attributions. index.html holds the CSS (#about-btn, #about). Closes on Escape, on the X, or on the backdrop.
// The legend list below is hardcoded on purpose (the page must explain itself without the actors loading) and has to
// be kept accurate to scene/actors/_registry.js: when an actor lands or its rule changes, change the row here too.
// Nothing at module top level touches the DOM, so the file imports under Node for the syntax check.

export const REPO_URL = 'https://github.com/laurenneal/hollywood-sign';
export const SOURCES_URL = `${REPO_URL}/blob/main/DATA_SOURCES.md`;
export const HISTORY_FROM = '2022';
export const LIVE_FROM = 'Sep 21 2026';   // the first day the daily build ran; earlier days are replayed

// One row per actor, grouped by district, in the lot's reading order. `soon` marks the actors landing this week
// (their files exist; the registry and feeds are catching up): the panel already explains what they will show,
// and each one draws its own "no data" note until its signal is in signals.json. Drop the flag once they are routine.
export const LEGEND = [
  { district: 'Sky and hills', rows: [
    { actor: 'Weather and light', signal: 'trade_tone',
      rule: 'Sky from GDELT trade-press tone (7-day mean): gold when tone is high, overcast in the middle, rain then storm when it sinks. RSS keyword counts do not paint the sky. Night pulls everything toward dark.' },
    { actor: 'Water tower', signal: 'sign_index',
      rule: 'Tank fills to the SIGN index (0–100). Empty tank and an em dash until there is enough history.' },
    { actor: 'Banner plane', signal: 'rss_items_24h', fallback: 'rss_flag_*',
      rule: 'If the biggest trade-headline keyword family (strike, layoffs, shutdown, greenlight, acquires, festival) hits 3+ items in 24h, a plane tows that word. Otherwise grounded with a windsock.' },
    { actor: 'NYC skyline', signal: 'nyc_permits', fallback: 'nyc_permits_tv, nyc_permits_film',
      rule: '0–60 lit windows = NYC film-permit events vs their last two years. Tagged “as of” — the open data runs ~3 months behind.' },
    { actor: 'Two planes over the hills', signal: 'bfi_inward_spend', fallback: 'georgia_productions',
      rule: 'UK (BFI inward spend) and Georgia (productions) as context regions — not a claim that production is leaving LA. Wingspan tracks each series’ percentile. No number → gray parked silhouette.' },
  ] },
  { district: 'Soundstage Row', rows: [
    { actor: 'Crews of four', signal: 'la_jobs',
      rule: '4–24 crew clusters (grip, PA, camera op, chair on a dolly) = 4 + 20 × LA metro film & TV jobs percentile (24 months). Legend also shows vs 2019.' },
    { actor: 'Red shooting lamps on the 12 stages', signal: 'filmla_shoot_days', fallback: 'filmla_*_days, filmla_incentive_share',
      rule: 'N of 12 lamps light from FilmLA on-location shoot days vs 2019 (or the trailing eight quarters). One truck per lit stage by category mix; incentive share flies CA pennants. Slowest number on the lot.' },
  ] },
  { district: 'Backlot Street', rows: [
    { actor: 'Benches and the coffee-cart queue', signal: 'unemp_512_12m', fallback: 'unemp_512',
      rule: '0–16 people with résumés = industry unemployment (12-month mean) vs its last 36 months. More unemployment, more people.' },
    { actor: 'Picket line', signal: 'strike_active', fallback: 'days_to_next_expiry',
      rule: '24 walkers with signs per union on strike today. Hall sign counts down to the next contract expiry.' },
    { actor: 'Pink slips on the union-hall board', signal: 'warn_la_employees', fallback: 'warn_la_notices',
      rule: '0–30 slips = LA County WARN layoff employees that week vs 52 weeks.' },
    { actor: 'Film-office window', signal: 'ca_credit_round_projects', fallback: 'ca_credit_round_days, ca_credit_round_indie_share',
      rule: 'Clerk stamps with CA filming-days pace; 0–40 sheets = projects in the latest tax-credit round. Indie share in teal. Wall sign: last round date.' },
  ] },
  { district: 'The Gate', rows: [
    { actor: 'Truck queue', signal: 'la_share',
      rule: '0–14 trucks at the gate = longer when LA’s share of US film & TV jobs falls. Not a destination flow — no ATL/LDN/YVR/NYC pennants.' },
    { actor: 'Departures board', signal: 'next_expected', fallback: 'every signal',
      rule: 'Next data releases (weekly or slower), soonest first. Overdue rows go gray.' },
    { actor: 'Tourists on the star walk', signal: 'attention', fallback: 'attention_daily', deferred: true,
      rule: 'Tourists: not hooked up yet. Star walk empty — Wikipedia attention deferred.' },
  ] },
  { district: 'The Boulevard', rows: [
    { actor: 'Marquee and ticket line', signal: 'weekend_no1',
      rule: 'Marquee shows weekend #1 title + gross (preliminary badge on Sunday estimates). 0–40 people in line from that gross vs 52 weeks of #1s.' },
    { actor: 'Trade billboard', signal: 'trade_headlines',
      rule: 'the two boulevard boards scroll a short GDELT trade-domain crawl (truncated titles, host only). prefers-reduced-motion and frozen frames hold the reel still. Empty or stale days read NO COPY — never invented text.' },
    { actor: 'Newsstand papers', signal: 'rss_items_24h',
      rule: '0–40 sheets blowing = trade-press item count in the last 24h vs the trailing week.' },
    { actor: 'The Fair Play Films van', signal: 'sign_index',
      rule: 'Fair Play Films van parks somewhere new each day. Tap for the index + fairplayfilms.com.' },
  ] },
  { district: 'The Apartment Block', rows: [
    { actor: 'Blue windows after dark', signal: 'netflix_hours', fallback: 'netflix_new_entrants, netflix_non_english_share',
      rule: 'Blue windows from Netflix Top 10 hours (derived aggregates only). New entrants flicker; non-English share gets a subtitle mark. Context — not in the index.' },
    { actor: 'Broadcast tower', signal: 'tv_episodes_today',
      rule: 'Blinks faster with that day’s scripted-episode count (TVmaze).' },
  ] },
  { district: 'The Park', rows: [
    { actor: 'Festival tent', signal: 'sundance_features', fallback: 'sundance_submissions, sundance_selections',
      rule: 'Tent scale 0.8×–1.2× from Sundance features; one figure per 1,000 submissions. Banner year. Moves once a year, in December.' },
    { actor: 'Globe kiosk', signal: 'global_box_office_month',
      rule: 'Globe spin from monthly global box office (Gower Street, cited). Arrow follows the z-score. Context only.' },
  ] },
  { district: 'Everywhere', rows: [
    { actor: 'Tap / hover legend', signal: 'every actor',
      rule: 'Number, source, period, mapping. Hover over anything (phone: tap to pin), or open #. District bar steps stop-to-stop; pinch out for the full lot; double-tap returns home.' },
    { actor: 'Stale / partial feeds', signal: 'every actor',
      rule: 'Past cadence → gray + stale. HUD as-of line marks partial runs and last-known values — no fake ~2h claim when feeds failed.' },
  ] },
];

// [who, what, pending]: `pending` marks a source whose feed has no manifest in feeds/ yet (its actor is a "new" row
// above), so the panel credits it without claiming its numbers are on the page. Drop the flag when the manifest lands.
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
  ['Trade press RSS', 'Deadline, Variety, The Hollywood Reporter, IndieWire, TheWrap: counts for banner plane / newsstand — not the sky.'],
  ['Union dates', 'WGA, SAG-AFTRA and IATSE announcements, as listed in data/static/events.json.'],
];

const INDEX_PARAGRAPH =
  'The water-tower number is the SIGN index: near 50 when today’s inputs sit near their own recent averages, higher when ' +
  'they look healthier, lower when worse. Weights live in method.json (income .40, shoot days .20, grosses .20, ' +
  'news .20 from GDELT tone). Stale or missing pieces drop out and the rest re-weight; the legend says how many of six are live. ' +
  'Attention deferred. A second number compares the same mix to 2019. Math is in METHOD.md.';

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function sigTag(row) {
  const main = `<code>${esc(row.signal)}</code>`;
  const fb = row.fallback ? ` <span class="fb">(+ ${esc(row.fallback)})</span>` : '';
  return main + fb;
}

export function renderAboutHtml() {
  const legend = LEGEND.map((d) => {
    const rows = d.rows.map((r) => {
      const tag = r.deferred ? 'deferred' : r.soon ? 'new' : '';
      const cls = r.deferred ? 'deferred' : r.soon ? 'soon' : '';
      return `<li${cls ? ` class="${cls}"` : ''}><b>${esc(r.actor)}</b>${tag ? ` <span class="tag">${tag}</span>` : ''}` +
        `<span class="sig">${sigTag(r)}</span><span class="rule">${esc(r.rule)}</span></li>`;
    }).join('');
    return `<h3>${esc(d.district)}</h3><ul class="legend">${rows}</ul>`;
  }).join('');
  const attrib = ATTRIBUTIONS.map(([who, what, pending]) =>
    `<li${pending ? ' class="soon"' : ''}><b>${esc(who)}</b> ${esc(what)}${pending ? ' <span class="tag">feed pending</span>' : ''}</li>`).join('');
  return `
    <button class="x" type="button" aria-label="Close">×</button>
    <h2 id="about-title">The Hollywood SIGN</h2>
    <p class="lede">A drawn map of a fictional studio lot. Every crowd, queue, lamp, and weather beat is one public number.
      SIGN = Shoot days · Income · Grosses · News. LA is the reference city; ambiguous numbers show as context.
      Nothing is generated. Same <code>signals.json</code>, same picture. Tap or hover OVER anything (or open <b>#</b>) for the number and source.
      Opens at The Gate. Pick another district or use Explore to pan and zoom. The Fair Play Films van (marked FPF) parks somewhere new each day.</p>
    <p class="noai"><b>No generative AI image model anywhere.</b> The lot is drawn in code (p5.js geometry plus seeded
      procedural material tiles — paper grain, stucco, asphalt). Movers are placed by a number. See <code>docs/art/recipes.md</code>.</p>

    <h3 class="section">The legend</h3>
    <p class="small">Each actor sits in one district and names one signal. Crowd sizes use the percentile of the latest
      value inside that signal’s own trailing window — a full crowd means “high vs this signal’s recent past,” not a headcount.
      Drawn counts are fewer and larger than the first draft so figures read when zoomed (see METHOD.md).</p>
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
