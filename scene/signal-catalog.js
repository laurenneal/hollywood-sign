// Grouped HTML signal catalog — every inspectable actor reachable without the canvas.
 // One model with canvas hits + inspector. Story/bare hide the panel with the inspector.

import { ACTORS } from './actors/_registry.js';
import { fmt, periodLabel, provenance } from './scale.js';
import { FACTS } from './facts.js';
import { sourceHtml } from './sources.js';

/** Plain names for the tray; unlisted actors fall back to their id. */
export const LABELS = {
  water_tower: 'SIGN index', crews: 'LA film & TV jobs', lamps: 'LA shoot days', trucks: 'LA share of US jobs',
  film_office: 'California tax credit', pink_slips: 'Layoff notices', picket: 'Strikes', marquee: 'Box office #1',
  windows: 'Netflix viewing', tent: 'Sundance', billboard: 'Trade headlines', newsstand: 'Trade stories',
  weather: 'Press mood (the sky)', banner_plane: 'Headline themes', planes: 'UK & Georgia production',
  nyc_skyline: 'NYC film permits', departures: 'Next data releases', globe: 'Worldwide box office',
  benches: 'Film & TV unemployment', tourists: 'Online attention (not yet)', waldo: 'Fair Play Films van',
  posters: 'Films in theaters', searchlights: 'Trending film',
};

const GROUPS = [
  { id: 'index', label: 'SIGN index', ids: ['water_tower'] },
  { id: 'production', label: 'Production', ids: ['crews', 'lamps', 'trucks', 'film_office', 'pink_slips', 'picket'] },
  { id: 'audience', label: 'Audience', ids: ['marquee', 'posters', 'searchlights', 'windows', 'tent'] },
  { id: 'press', label: 'Press & tone', ids: ['billboard', 'newsstand', 'weather', 'banner_plane'] },
  { id: 'context', label: 'Context', ids: ['planes', 'nyc_skyline', 'departures', 'globe', 'benches', 'tourists', 'waldo'] },
];

/** method.json v0.3 index members — keep in sync with method.json `components`. */
const INDEX_SIGNALS = new Set([
  'sign_index',
  'la_jobs', 'la_share', 'unemp_512_12m', 'unemp_512',
  'filmla_shoot_days',
  'weekend_no1_4wk', 'weekend_no1',
  'trade_tone',
]);

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function signalIdsFor(actor) {
  if (!actor) return [];
  return Array.isArray(actor.signal) ? actor.signal : [actor.signal];
}

function signalFor(actor, scene) {
  const ids = signalIdsFor(actor);
  for (const id of ids) {
    const s = scene.sig(id);
    if (s && s.value != null) return s;
  }
  return ids.length ? scene.sig(ids[0]) : null;
}

function roleOf(actor) {
  if (!actor) return 'Context';
  if (actor.id === 'water_tower') return 'Index';
  const ids = signalIdsFor(actor);
  if (ids.some((id) => INDEX_SIGNALS.has(id))) return 'Index component';
  return 'Context';
}

export function installSignalCatalog(scene, { onSelect } = {}) {
  if (typeof document === 'undefined') return null;
  const doc = document;
  let wrap = doc.getElementById('signal-catalog-wrap');
  let host = doc.getElementById('signal-catalog');
  if (!host) {
    if (!wrap) {
      wrap = doc.createElement('details');
      wrap.id = 'signal-catalog-wrap';
      wrap.innerHTML = '<summary>All signals</summary>';
      const insp = doc.getElementById('inspector');
      if (insp) insp.appendChild(wrap);
      else doc.body.appendChild(wrap);
    }
    host = doc.createElement('div');
    host.id = 'signal-catalog';
    wrap.appendChild(host);
  }

  function render() {
    const parts = [];
    for (const g of GROUPS) {
      const actors = g.ids.map((id) => ACTORS.find((a) => a.id === id)).filter(Boolean);
      if (!actors.length) continue;
      parts.push(`<div class="cat-group"><div class="cat-label">${esc(g.label)}</div>`);
      for (const a of actors) {
        const sig = signalFor(a, scene);
        let value = '—';
        if (sig && sig.value != null) value = fmt(sig.value, sig.unit || '');
        else if (sig && sig.stale) value = 'stale';
        const role = roleOf(a);
        parts.push(
          `<button type="button" class="cat-item" data-actor="${esc(a.id)}">` +
          `<span class="cat-name">${esc(LABELS[a.id] || a.id.replace(/_/g, ' '))}</span>` +
          `<span class="cat-role">${esc(role)}</span>` +
          `<span class="cat-val">${esc(value)}</span>` +
          `</button>`
        );
      }
      parts.push(`</div>`);
    }
    host.innerHTML = parts.join('');
  }

  host.addEventListener('click', (e) => {
    const btn = e.target.closest('.cat-item');
    if (!btn) return;
    const actor = ACTORS.find((a) => a.id === btn.dataset.actor);
    if (!actor || !onSelect) return;
    onSelect(actor);
    syncSignalUrl(actor);
    // Return the picture to center stage after choosing a signal.
    if (wrap) wrap.open = false;
  });

  function syncOpenState() {
    const open = !!(wrap && wrap.open);
    doc.body.classList.toggle('catalog-open', open);
    if (open) positionOpenTray();
    else if (wrap) {
      wrap.style.removeProperty('--catalog-top');
      wrap.style.removeProperty('--catalog-bottom');
    }
  }

  function positionOpenTray() {
    if (!wrap || !wrap.open) return;
    if (window.matchMedia && window.matchMedia('(max-width: 640px)').matches) {
      wrap.style.removeProperty('--catalog-top');
      wrap.style.removeProperty('--catalog-bottom');
      return;
    }
    const viewport = doc.getElementById('viewport');
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    wrap.style.setProperty('--catalog-top', `${Math.max(8, Math.round(rect.top))}px`);
    wrap.style.setProperty('--catalog-bottom', `${Math.max(8, Math.round(window.innerHeight - rect.bottom))}px`);
  }

  if (wrap) {
    wrap.addEventListener('toggle', syncOpenState);
    doc.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !wrap.open) return;
      e.preventDefault();
      wrap.open = false;
      const summary = wrap.querySelector('summary');
      if (summary && summary.focus) summary.focus();
    });
    syncOpenState();
  }

  function syncSignalUrl(actor) {
    try {
      const u = new URL(location.href);
      if (actor && actor.id) u.searchParams.set('signal', actor.id);
      else u.searchParams.delete('signal');
      history.replaceState(null, '', u);
    } catch (_) { /* ignore */ }
  }

  function selectById(id) {
    const actor = ACTORS.find((a) => a.id === id)
      || ACTORS.find((a) => signalIdsFor(a).includes(id));
    if (!actor || !onSelect) return false;
    onSelect(actor);
    syncSignalUrl(actor);
    return true;
  }

  function syncVisibility() {
    const off = doc.body.classList.contains('story') || doc.body.classList.contains('bare');
    if (wrap) wrap.hidden = off;
    else host.hidden = off;
    if (off) doc.body.classList.remove('catalog-open');
  }
  syncVisibility();
  window.addEventListener('resize', () => {
    syncVisibility();
    positionOpenTray();
  });

  return { el: host, render, syncVisibility, selectById, GROUPS };
}

// A legend may name the signal it cites (`sig`, null = none); otherwise the actor's first signal with a value.
export function detailBlocks(actor, legend, sig) {
  const named = !!legend && Object.prototype.hasOwnProperty.call(legend, 'sig');
  const about = named ? legend.sig : sig;
  const title = legend?.title || LABELS[actor.id] || actor.id;
  const role = roleOf(actor);
  const stale = !!(about && about.stale) || !!legend?.stale;
  const missing = !(named && about === null) && (!about || about.value == null);
  const bits = [];
  bits.push(`<div class="insp-role">${esc(role)}</div>`);
  bits.push(`<b>${esc(title)}${stale ? ' <span class="stale">not updated</span>' : ''}${missing ? ' <span class="stale">no data yet</span>' : ''}</b>`);
  if (legend?.text) bits.push(`<p class="text">${esc(legend.text)}</p>`);
  const fact = actor && FACTS[actor.id];
  if (fact) bits.push(`<p class="insp-fact"><b>Did you know</b>${esc(fact)}</p>`);
  if (legend?.link) {
    const href = String(legend.link.href || '').trim();
    const label = String(legend.link.label || href).trim();
    if (href && /^https?:\/\//i.test(href)) {
      bits.push(`<p class="more"><a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a></p>`);
    }
  }
  const src = sourceHtml(about, esc);
  if (src) bits.push(`<p class="src">${src}</p>`);
  if (about) {
    bits.push(`<details class="tech"><summary>Data details</summary><p>${esc(provenance(about))}` +
      (about.value != null ? ` \u00b7 value ${esc(fmt(about.value, about.unit || ''))}` : '') + `</p></details>`);
  }
  return bits.join('');
}
