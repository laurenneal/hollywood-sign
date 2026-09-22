// Pinned signal inspector — HTML detail panel for click/tap selection.
 // Hover still uses the floating #legend as a preview; a pin copies into this panel
 // until the selection changes or the user closes it. Story/bare hide it.

import { detailBlocks } from './signal-catalog.js';
import { provenance } from './scale.js';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function linkHtml(link) {
  if (!link || typeof link !== 'object') return '';
  const href = String(link.href || '').trim();
  const label = String(link.label || href).trim();
  if (!href || !/^https?:\/\//i.test(href)) return '';
  return `<p class="more"><a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a></p>`;
}

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
    const row = doc.getElementById('main-row') || doc.body;
    row.appendChild(el);
  }
  el.setAttribute('aria-label', 'Selected signal');
  el.innerHTML =
    `<div class="insp-head">` +
    `<h2 class="insp-title">Selected</h2>` +
    `<button type="button" class="x" aria-label="Clear selection">×</button>` +
    `</div>` +
    `<div class="insp-body"><p class="placeholder">Tap or click anything on the lot — or pick a signal below — to pin its number and source here.</p></div>` +
    `<div id="signal-catalog"></div>` +
    `<p class="insp-foot"><a href="https://github.com/laurenneal/hollywood-sign/blob/main/SOURCES.md">Sources</a> · Lauren Neal · <a href="https://www.instagram.com/thelaurenneal/" rel="me">@thelaurenneal</a></p>`;

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
    body.innerHTML = `<p class="placeholder">Tap or click anything on the lot — or pick a signal below — to pin its number and source here.</p>`;
    el.classList.remove('has-sel');
    doc.body.classList.remove('inspector-on');
  }

  function show(hit, legend, sourceLine) {
    if (!hit || !legend) { clear(); return; }
    pinnedKey = keyOf(hit);
    const actor = hit.actor;
    const sig = sigForActor(actor, scene);
    body.innerHTML = detailBlocks(actor, { ...legend, stale: legend.stale || !!(sig && sig.stale) }, sig, sourceLine || provenance(sig));
    el.classList.add('has-sel');
    if (!modeOff()) doc.body.classList.add('inspector-on');
  }

  /** Pin from the HTML catalog (no canvas hit). */
  function showActor(actor, legend, sourceLine) {
    if (!actor) { clear(); return; }
    const fake = { actor, extra: null };
    show(fake, legend || { title: actor.id, text: '' }, sourceLine);
  }

  closeBtn.addEventListener('click', (e) => { e.preventDefault(); clear(); });

  function syncVisibility() {
    el.hidden = modeOff();
    if (modeOff()) doc.body.classList.remove('inspector-on');
  }
  syncVisibility();
  window.addEventListener('resize', syncVisibility);

  return {
    el,
    clear,
    show,
    showActor,
    syncVisibility,
    get pinnedKey() { return pinnedKey; },
    isPinned(hit) { return pinnedKey != null && keyOf(hit) === pinnedKey; },
  };
}

void linkHtml;
