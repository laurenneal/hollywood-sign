// Pinned signal inspector — HTML detail panel for click/tap selection.
 // Hover still uses the floating #legend as a preview; a pin copies into this panel
 // until the selection changes or the user closes it. Story/bare hide it.
 // Empty state stays off-map; All signals lives in #chrome-bottom.

import { detailBlocks } from './signal-catalog.js';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

void esc;

function sigForActor(actor, scene) {
  if (!actor) return null;
  const id = Array.isArray(actor.signal) ? actor.signal[0] : actor.signal;
  const multi = Array.isArray(actor.signal)
    ? actor.signal.map((s) => scene.sig(s))
    : null;
  if (multi) return multi.find((x) => x && x.value != null) || multi[0];
  return scene.sig(id);
}

export function installInspector(scene) {
  if (typeof document === 'undefined') return null;
  const doc = document;
  const modeOff = () => doc.body.classList.contains('story') || doc.body.classList.contains('bare');

  let el = doc.getElementById('inspector');
  if (!el) {
    el = doc.createElement('aside');
    el.id = 'inspector';
    const app = doc.getElementById('app') || doc.body;
    app.appendChild(el);
  }
  el.setAttribute('aria-label', 'Selected signal');
  el.innerHTML =
    `<div class="insp-head">` +
    `<h2 class="insp-title">Selected</h2>` +
    `<button type="button" class="x" aria-label="Clear selection">×</button>` +
    `</div>` +
    `<div class="insp-body"></div>`;

  // Catalog is a chrome-bottom disclosure (always reachable without occupying the map column).
  let catalogWrap = doc.getElementById('signal-catalog-wrap');
  if (!catalogWrap) {
    const bottom = doc.getElementById('chrome-bottom') || doc.body;
    catalogWrap = doc.createElement('details');
    catalogWrap.id = 'signal-catalog-wrap';
    catalogWrap.innerHTML = `<summary>All signals</summary><div id="signal-catalog"></div>`;
    bottom.appendChild(catalogWrap);
  }

  const body = el.querySelector('.insp-body');
  const closeBtn = el.querySelector('.x');
  let pinnedKey = null;

  function keyOf(hit) {
    if (!hit || !hit.actor) return null;
    const extra = hit.extra == null ? '' : JSON.stringify(hit.extra);
    return `${hit.actor.id || hit.actor.signal}|${extra}`;
  }

  function clear() {
    pinnedKey = null;
    body.innerHTML = '';
    el.classList.remove('has-sel');
    doc.body.classList.remove('inspector-on');
  }

  function refreshSummary() {
    if (pinnedKey != null) return;
    clear();
  }

  function show(hit, legend) {
    if (!hit || !legend) { clear(); return; }
    pinnedKey = keyOf(hit);
    const actor = hit.actor;
    const sig = sigForActor(actor, scene);
    body.innerHTML = detailBlocks(actor, legend, sig);
    el.classList.add('has-sel');
    if (!modeOff()) doc.body.classList.add('inspector-on');
  }

  /** Pin from the HTML catalog (no canvas hit). */
  function showActor(actor, legend) {
    if (!actor) { clear(); return; }
    const fake = { actor, extra: null };
    show(fake, legend || { title: actor.id, text: '' });
  }

  closeBtn.addEventListener('click', (e) => { e.preventDefault(); clear(); });

  function syncVisibility() {
    el.hidden = modeOff();
    if (catalogWrap) catalogWrap.hidden = modeOff();
    if (modeOff()) doc.body.classList.remove('inspector-on');
  }
  syncVisibility();
  window.addEventListener('resize', syncVisibility);

  return {
    el,
    clear,
    show,
    showActor,
    refreshSummary,
    syncVisibility,
    get pinnedKey() { return pinnedKey; },
    isPinned(hit) { return pinnedKey != null && keyOf(hit) === pinnedKey; },
  };
}
