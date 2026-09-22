// Desktop + tablet district navigation. Same stops as the phone tour bar.
 // Hidden in story/bare. Phone keeps the bottom tour; this strip is for ≥721px
 // and also as a compact chip row under the masthead on mid widths.

import { TOUR_STOPS, tourCamera } from './camera.js';

export function installDistrictNav(scene, { getP, setCamera, getTour } = {}) {
  if (typeof document === 'undefined') return null;
  const doc = document;
  const modeOff = () => doc.body.classList.contains('story') || doc.body.classList.contains('bare');

  let el = doc.getElementById('districts');
  if (!el) {
    el = doc.createElement('nav');
    el.id = 'districts';
    el.setAttribute('aria-label', 'Studio districts');
    const host = doc.getElementById('chrome-top') || doc.body;
    host.appendChild(el);
  }

  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
  el.innerHTML = TOUR_STOPS.map((s, i) =>
    `<button type="button" class="dstop" data-i="${i}" data-id="${esc(s.id)}">${esc(s.label)}</button>`
  ).join('');

  let active = Math.max(0, TOUR_STOPS.findIndex((s) => s.id === 'full'));

  function syncActive(i) {
    active = i;
    el.querySelectorAll('.dstop').forEach((b) => {
      const on = Number(b.dataset.i) === i;
      b.setAttribute('aria-current', on ? 'true' : 'false');
      b.classList.toggle('on', on);
    });
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
    setCamera(tourCamera(p, TOUR_STOPS[i]));
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
  window.addEventListener('resize', syncVisibility);

  return {
    el,
    go,
    syncActive,
    syncVisibility,
    get active() { return active; },
  };
}
