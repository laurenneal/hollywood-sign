// District navigation chips — same stops as the tour API. Visible at every width in
 // document flow (Pass 1). Hidden only in story/bare.

import { TOUR_STOPS, tourCamera, defaultStopIndex } from './camera.js';

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

  let active = defaultStopIndex();

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
    const label = doc.getElementById('district-label');
    const stop = TOUR_STOPS[i];
    if (label && stop) label.textContent = stop.label;
    else {
      const sum = doc.getElementById('district-summary');
      if (sum && stop) sum.textContent = stop.label;
    }
  }

  function go(i) {
    const tour = getTour && getTour();
    if (tour && typeof tour.go === 'function') {
      tour.go(i);
      syncActive(i);
      syncDistrictUrl(i);
      return;
    }
    const p = getP && getP();
    if (!p || !setCamera) return;
    const stop = TOUR_STOPS[i];
    setCamera(tourCamera(p, stop), { animate: true, focus: stop.fullLot ? null : stop.focus });
    syncActive(i);
    syncDistrictUrl(i);
  }

  function syncDistrictUrl(i) {
    try {
      const stop = TOUR_STOPS[i];
      if (!stop) return;
      const u = new URL(location.href);
      if (stop.fullLot) u.searchParams.delete('district');
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
    syncActive,
    syncVisibility,
    get active() { return active; },
  };
}
