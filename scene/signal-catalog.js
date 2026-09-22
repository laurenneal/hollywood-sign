// Grouped HTML signal catalog — every inspectable actor reachable without the canvas.
 // One model with canvas hits + inspector. Story/bare hide the panel with the inspector.

import { ACTORS } from './actors/_registry.js';
import { fmt, periodLabel, provenance } from './scale.js';

const GROUPS = [
  { id: 'index', label: 'SIGN index', ids: ['water_tower'] },
  { id: 'production', label: 'Production', ids: ['crews', 'lamps', 'trucks', 'film_office', 'pink_slips', 'picket'] },
  { id: 'audience', label: 'Audience', ids: ['marquee', 'windows', 'tent'] },
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
  let host = doc.getElementById('signal-catalog');
  if (!host) {
    host = doc.createElement('div');
    host.id = 'signal-catalog';
    const insp = doc.getElementById('inspector');
    if (insp) insp.appendChild(host);
    else doc.body.appendChild(host);
  }

  function render() {
    const parts = [];
    parts.push(`<h3 class="cat-title">All signals</h3>`);
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
          `<span class="cat-name">${esc(a.id.replace(/_/g, ' '))}</span>` +
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
  });

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
    host.hidden = off;
  }
  syncVisibility();
  window.addEventListener('resize', syncVisibility);

  return { el: host, render, syncVisibility, selectById, GROUPS };
}

export function detailBlocks(actor, legend, sig, sourceLine) {
  const title = legend?.title || actor.id;
  const role = roleOf(actor);
  const stale = !!(sig && sig.stale) || !!legend?.stale;
  const missing = !sig || sig.value == null;
  const bits = [];
  bits.push(`<div class="insp-role">${esc(role)}</div>`);
  bits.push(`<b>${esc(title)}${stale ? ' <span class="stale">stale</span>' : ''}${missing ? ' <span class="stale">unavailable</span>' : ''}</b>`);
  if (sig && sig.value != null) {
    bits.push(`<p class="insp-value">${esc(fmt(sig.value, sig.unit || ''))}</p>`);
    const per = periodLabel(sig);
    if (per) bits.push(`<p class="insp-period">Period · ${esc(per)}</p>`);
  }
  if (legend?.text) bits.push(`<p class="text">${esc(legend.text)}</p>`);
  if (legend?.link) {
    const href = String(legend.link.href || '').trim();
    const label = String(legend.link.label || href).trim();
    if (href && /^https?:\/\//i.test(href)) {
      bits.push(`<p class="more"><a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a></p>`);
    }
  }
  bits.push(`<p class="src">${esc(sourceLine || legend?.source || provenance(sig))}</p>`);
  return bits.join('');
}
