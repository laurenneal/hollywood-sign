// District navigation chips — same stops as the tour API. Visible at every width in
 // document flow (Pass 1). Hidden only in story/bare.

import { TOUR_STOPS, tourCamera, stopFocus, defaultStopIndex } from './camera.js';

const CUSTOM_LABEL = 'Custom view';

export function installDistrictNav(scene, { getP, setCamera, getTour } = {}) {
  if (typeof document === 'undefined') return null;
  const doc = document;
  const modeOff = () => doc.body.classList.contains('story') || doc.body.classList.contains('bare');

  let el = doc.getElementById('districts');
  if (!el) {
    el = doc.createElement('nav');
    el.id = 'districts';
    el.setAttribute('aria-label', 'Studio districts');
    const host = doc.getElementById('app') || doc.body;
    host.appendChild(el);
  }

  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
  el.innerHTML = TOUR_STOPS.map((s, i) =>
    `<button type="button" class="dstop" data-i="${i}" data-id="${esc(s.id)}">${esc(s.label)}</button>`
  ).join('');

  let active = defaultStopIndex(getP && getP());

  // i = -1: a hand-panned or zoomed view that matches no stop, so no chip is current.
  function syncActive(i) {
    active = i;
    el.querySelectorAll('.dstop').forEach((b) => {
      const on = Number(b.dataset.i) === i;
      b.setAttribute('aria-current', on ? 'true' : 'false');
      b.classList.toggle('on', on);
      if (on && typeof b.scrollIntoView === 'function') {
        try { b.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' }); } catch (_) {
          try { b.scrollIntoView(false); } catch (__) { /* ignore */ }
        }
      }
    });
    const stop = TOUR_STOPS[i];
    const text = stop ? stop.label : CUSTOM_LABEL;
    const label = doc.getElementById('district-label');
    if (label) label.textContent = text;
    else {
      const sum = doc.getElementById('district-summary');
      if (sum) sum.textContent = text;
    }
  }

  function show(i) {
    const tour = getTour && getTour();
    if (tour && typeof tour.go === 'function') {
      tour.go(i);
    } else {
      const p = getP && getP();
      if (!p || !setCamera) return false;
      const stop = TOUR_STOPS[i];
      setCamera(tourCamera(p, stop), { animate: true, focus: stopFocus(p, stop) });
    }
    syncActive(i);
    return true;
  }

  function go(i) {
    if (show(i)) syncDistrictUrl(i);
  }

  // Reset and double-tap. Home depends on the viewport (the whole lot, or The Gate on phones), so its link
  // carries no ?district.
  function home() {
    if (show(defaultStopIndex(getP && getP()))) syncDistrictUrl(-1);
  }

  function syncDistrictUrl(i) {
    try {
      const stop = TOUR_STOPS[i];
      const u = new URL(location.href);
      if (!stop || stop.fullLot) u.searchParams.delete('district');
      else u.searchParams.set('district', stop.id);
      history.replaceState(null, '', u);
    } catch (_) { /* ignore */ }
  }

  el.addEventListener('click', (e) => {
    const b = e.target.closest('.dstop');
    if (!b) return;
    e.preventDefault();
    go(Number(b.dataset.i));
  });

  function syncVisibility() {
    const show = !modeOff();
    el.hidden = !show;
    return show;
  }

  syncVisibility();
  syncActive(active);
  // Start collapsed — summary shows the active district; expand to switch
  try {
    const wrap = doc.getElementById('district-wrap');
    if (wrap) wrap.open = false;
  } catch (_) { /* ignore */ }
  window.addEventListener('resize', syncVisibility);

  return {
    el,
    go,
    home,
    syncActive,
    syncUrl: syncDistrictUrl,
    syncVisibility,
    get active() { return active; },
  };
}
