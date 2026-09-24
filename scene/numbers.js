// Accessible live-numbers board: same numbers as hover/tap legends, without needing the canvas.
// Mobile and screen-reader path. Hidden in story / bare modes via index.html CSS.

import { ACTORS } from './actors/_registry.js';
import { provenance } from './scale.js';
import { FACTS } from './facts.js';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function sigFor(scene, actor) {
  return Array.isArray(actor.signal) ? actor.signal.map(s => scene.sig(s)) : scene.sig(actor.signal);
}

function rowState(legend, sig) {
  const text = (legend && legend.text) || '';
  const title = (legend && legend.title) || '';
  const blob = (title + ' ' + text).toLowerCase();
  if (/\bdeferred\b/.test(blob)) return 'deferred';
  if (sig && sig.stale) return 'stale';
  const hasVal = Array.isArray(sig)
    ? sig.some(s => s && s.value != null)
    : !!(sig && sig.value != null);
  if (!hasVal && /no |not in |not loaded|empty|deferred|waiting|plain sky/.test(blob)) return 'missing';
  return 'live';
}

export function installNumbers(scene) {
  if (typeof document === 'undefined') return null;
  const doc = document;
  const modeOff = () => doc.body.classList.contains('story') || doc.body.classList.contains('bare');

  const btn = doc.createElement('button');
  btn.id = 'numbers-btn';
  btn.type = 'button';
  btn.textContent = 'Numbers';
  btn.setAttribute('aria-label', 'Live numbers');
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.setAttribute('aria-controls', 'numbers');
  btn.setAttribute('aria-expanded', 'false');
  btn.title = 'Live numbers (same as tap / hover)';

  const wrap = doc.createElement('div');
  wrap.id = 'numbers';
  wrap.hidden = true;
  const panel = doc.createElement('div');
  panel.className = 'panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'numbers-title');
  panel.tabIndex = -1;
  panel.innerHTML =
    `<button class="x" type="button" aria-label="Close">×</button>` +
    `<h2 id="numbers-title">Live numbers</h2>` +
    `<p class="lede">One row per thing on the lot — same facts as a tap, without poking the canvas.</p>` +
    `<ul class="num-list" id="numbers-list"></ul>` +
    `<p class="fine">Missing and deferred rows say so.</p>`;
  wrap.appendChild(panel);
  const actions = doc.getElementById('header-actions');
  (actions || doc.body).appendChild(btn);
  doc.body.appendChild(wrap);
  const list = panel.querySelector('#numbers-list');
  const closeBtn = panel.querySelector('.x');

  function refresh() {
    if (!scene || !list) return;
    const rows = [];
    for (const a of ACTORS) {
      if (a.id === 'waldo') continue; // van stays a find; board is the data path
      let legend;
      try { legend = a.legend(sigFor(scene, a), scene); } catch (e) {
        legend = { title: a.id || a.signal, text: 'could not read this actor' };
      }
      if (!legend) continue;
      const sig = sigFor(scene, a);
      const one = Array.isArray(sig) ? (sig.find(x => x && x.value != null) || sig[0]) : sig;
      const state = rowState(legend, sig);
      const src = legend.source || provenance(one) || '';
      rows.push(
        `<li class="${esc(state)}">` +
        `<b>${esc(legend.title)}</b>` +
        `<span class="tag">${esc(state)}</span>` +
        `<span class="rule">${esc(legend.text)}</span>` +
        (FACTS[a.id] ? `<span class="fact">Did you know · ${esc(FACTS[a.id])}</span>` : '') +
        (src ? `<span class="src">${esc(src)}</span>` : '') +
        `</li>`
      );
    }
    list.innerHTML = rows.join('');
  }

  let open = false;
  let lastFocus = null;
  function show() {
    if (open || modeOff()) return;
    open = true;
    lastFocus = doc.activeElement;
    refresh();
    wrap.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    panel.scrollTop = 0;
    closeBtn.focus();
  }
  function hide() {
    if (!open) return;
    open = false;
    wrap.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    if (lastFocus && lastFocus !== doc.body && lastFocus.focus && doc.contains(lastFocus)) lastFocus.focus();
    else btn.focus();
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
    if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === '#' || (e.key === '3' && e.shiftKey))) {
      e.preventDefault();
      toggle();
    }
  });

  if (scene) {
    scene.numbers = { open: show, close: hide, toggle, refresh, get isOpen() { return open; } };
  }
  return { open: show, close: hide, toggle, refresh, get isOpen() { return open; }, button: btn, panel: wrap };
}
