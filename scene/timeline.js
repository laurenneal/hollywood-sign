// The timeline scrubber: drag to any past day and the lot redraws from that day's snapshot.
// Snapshots carry only the moving fields; stable descriptive/source fields stay from live.
 // §5: request-id guard so a slow A→B fetch cannot commit after Live/B; bounded cache.
// Days before the cron existed are replayed from history by scripts/replay.py and marked as such.

const INDEX_URL = new URL('../data/snapshots/index.json', import.meta.url);
const SNAP_URL = (day) => new URL(`../data/snapshots/${day}.json`, import.meta.url);
const CACHE_MAX = 60;

/** Fields that must come from the snapshot (or be null) — never leak from today. */
export const TIME_FIELDS = [
  'value', 'period', 'as_of', 'normalized', 'z', 'stale', 'label',
  'baseline_ratio', 'window_n', 'window_mean', 'period_end', 'preliminary',
  'age_days', 'history_n', 'next_expected', 'error', 'extra',
];

export function mergeSnapshot(liveSignals, snap) {
  const merged = {};
  const snapSigs = (snap && snap.signals) || {};
  for (const [id, base] of Object.entries(liveSignals || {})) {
    const s = snapSigs[id];
    if (!s) {
      // Absent in snapshot → unavailable that day (do not keep today's value)
      const out = { ...base };
      for (const f of TIME_FIELDS) out[f] = f === 'stale' ? true : null;
      out.label = '';
      out.error = null;
      out.next_expected = null;
      merged[id] = out;
      continue;
    }
    const out = { ...base };
    for (const f of TIME_FIELDS) {
      out[f] = Object.prototype.hasOwnProperty.call(s, f) ? s[f] : null;
    }
    // Clear live-only cadence when replaying
    out.next_expected = null;
    out.error = s.error != null ? s.error : null;
    merged[id] = out;
  }
  return merged;
}

function trimCache(cache) {
  while (cache.size > CACHE_MAX) {
    const first = cache.keys().next().value;
    cache.delete(first);
  }
}

export function installTimeline(scene, { onChange }) {
  const wrap = document.getElementById('timeline');
  if (!wrap) return null;
  const slider = wrap.querySelector('input[type="range"]');
  const dateInput = wrap.querySelector('#timeline-date');
  const label = wrap.querySelector('.day');
  const live = wrap.querySelector('.live');
  const note = wrap.querySelector('.note');
  let days = [];
  let liveSignals = null;
  let liveMeta = null;
  let current = null;          // committed day string when scrubbed, null when live
  let pending = null;          // day string while loading
  let reqId = 0;
  let queuedReplay = null;     // ?replay= day waiting for liveSignals
  const cache = new Map();

  function syncDateInput() {
    if (!dateInput || !days.length) return;
    dateInput.min = days[0];
    dateInput.max = days[days.length - 1];
    dateInput.value = current || days[days.length - 1];
  }

  async function load() {
    try {
      const r = await fetch(INDEX_URL, { cache: 'no-store' });
      if (!r.ok) throw new Error('index ' + r.status);
      const j = await r.json();
      days = j.days || [];
    } catch (e) {
      wrap.hidden = true;
      return;
    }
    if (days.length < 2) { wrap.hidden = true; return; }
    slider.min = 0; slider.max = days.length - 1; slider.value = days.length - 1;
    wrap.hidden = false;
    syncDateInput();
    render();
    // §7: ?replay=YYYY-MM-DD deep-link (preserve legacy ?date= for seed-only in scene.js)
    try {
      const q = new URLSearchParams(location.search).get('replay');
      if (q && /^\d{4}-\d{2}-\d{2}$/.test(q) && days.includes(q)) {
        if (liveSignals) {
          slider.value = days.indexOf(q);
          await goTo(days.indexOf(q), { fromUrl: true });
        } else {
          queuedReplay = q;
        }
      }
    } catch (_) { /* ignore */ }
  }

  function setLive(signals, meta) {
    liveSignals = signals; liveMeta = meta;
    if (queuedReplay) {
      const day = queuedReplay;
      queuedReplay = null;
      const i = days.indexOf(day);
      if (i >= 0) {
        slider.value = i;
        goTo(i, { fromUrl: true });
        return;
      }
    }
    // Refreshing live while in replay must not reset the selected date
    if (current == null) render();
  }

  function syncUrl(opts = {}) {
    try {
      const u = new URL(location.href);
      if (current) u.searchParams.set('replay', current);
      else u.searchParams.delete('replay');
      // Keep legacy ?date= alone; do not invent district/signal here.
      if (opts.push) history.pushState({ replay: current }, '', u);
      else history.replaceState({ replay: current }, '', u);
    } catch (_) { /* ignore */ }
  }

  async function goTo(i, opts = {}) {
    const day = days[i];
    if (!day) return;
    if (i === days.length - 1) { return goLive(opts); }
    const myReq = ++reqId;
    pending = day;
    render();
    try {
      let snap = cache.get(day);
      if (!snap) {
        const r = await fetch(SNAP_URL(day), { cache: 'force-cache' });
        if (!r.ok) throw new Error('snap ' + r.status);
        snap = await r.json();
        cache.set(day, snap);
        trimCache(cache);
      }
      if (myReq !== reqId) return; // superseded by a newer scrub or Live
      current = day;
      pending = null;
      const merged = mergeSnapshot(liveSignals, snap);
      scene.today = day;
      onChange(merged, { replayed: !!snap.replayed, day });
      render(snap);
      if (!opts.fromUrl) syncUrl({ push: !!opts.push });
      else syncUrl({ push: false });
    } catch (e) {
      if (myReq !== reqId) return;
      pending = null;
      note.textContent = `Could not load ${day}`;
      wrap.classList.add('scrubbed');
      // keep last confirmed scene; expose Retry via re-firing goTo on live click path
      live.hidden = false;
      live.disabled = false;
      live.removeAttribute('aria-disabled');
      live.textContent = 'RETRY';
      live.onclick = () => { live.textContent = 'LIVE'; goTo(i); };
    }
  }

  function goLive(opts = {}) {
    reqId += 1; // invalidate in-flight historical fetches
    pending = null;
    current = null;
    scene.today = todayPacific();
    live.textContent = 'LIVE';
    live.onclick = () => { slider.value = days.length - 1; goLive(); };
    if (liveSignals) onChange(liveSignals, { live: true });
    render();
    if (!opts.fromUrl) syncUrl({ push: !!opts.push });
    else syncUrl({ push: false });
  }

  function render(snap) {
    if (pending) {
      label.textContent = `loading ${pending}…`;
      live.hidden = false;
      note.textContent = current ? `still showing ${current}` : 'still showing today';
      wrap.classList.add('scrubbed');
      return;
    }
    if (current == null) {
      label.textContent = 'today';
      live.hidden = false;
      live.disabled = true;
      live.textContent = 'LIVE';
      live.setAttribute('aria-disabled', 'true');
      note.textContent = days.length ? `${days[0]} to today` : '';
      wrap.classList.remove('scrubbed');
    } else {
      const d = new Date(current + 'T00:00:00Z');
      label.textContent = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
      live.hidden = false;
      live.disabled = false;
      live.removeAttribute('aria-disabled');
      live.textContent = 'LIVE';
      note.textContent = snap && snap.replayed ? 'replayed from history (latest revisions)' : 'as built that day';
      wrap.classList.add('scrubbed');
    }
    syncDateInput();
  }

  slider.addEventListener('input', () => goTo(Number(slider.value), { push: true }));
  live.addEventListener('click', () => { slider.value = days.length - 1; goLive({ push: true }); });
  const prevBtn = wrap.querySelector('#timeline-prev');
  const nextBtn = wrap.querySelector('#timeline-next');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (!days.length) return;
      const i = Math.max(0, Number(slider.value) - 1);
      slider.value = i;
      goTo(i, { push: true });
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (!days.length) return;
      const i = Math.min(days.length - 1, Number(slider.value) + 1);
      slider.value = i;
      goTo(i, { push: true });
    });
  }
  if (dateInput) {
    dateInput.addEventListener('change', () => {
      const day = dateInput.value;
      if (!day || !days.length) return;
      const i = days.indexOf(day);
      if (i < 0) {
        note.textContent = `No snapshot for ${day}`;
        syncDateInput();
        return;
      }
      slider.value = i;
      goTo(i, { push: true });
    });
  }
  wrap.querySelectorAll('.jump').forEach((btn) => {
    btn.addEventListener('click', () => {
      const day = btn.getAttribute('data-day');
      if (!day || !days.length) return;
      const i = days.indexOf(day);
      if (i < 0) {
        note.textContent = `No snapshot for ${day}`;
        return;
      }
      slider.value = i;
      goTo(i, { push: true });
    });
  });
  slider.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const step = e.shiftKey ? 7 : 1;
      slider.value = Math.max(0, Math.min(days.length - 1, Number(slider.value) + (e.key === 'ArrowLeft' ? -step : step)));
      goTo(Number(slider.value), { push: true });
    }
  });
  window.addEventListener('popstate', () => {
    try {
      const q = new URLSearchParams(location.search).get('replay');
      if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) {
        const i = days.indexOf(q);
        if (i >= 0) { slider.value = i; goTo(i, { fromUrl: true }); return; }
      }
      slider.value = days.length - 1;
      goLive({ fromUrl: true });
    } catch (_) { /* ignore */ }
  });
  load();
  return {
    setLive, goTo, goLive,
    get day() { return current; },
    get pending() { return pending; },
    _mergeSnapshot: mergeSnapshot, // tests
  };
}

function todayPacific() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
