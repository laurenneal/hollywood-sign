// Mobile district tour: one named stop at a time with a big label and prev/next (or swipe on the bar).
// Reuses HOME_FOCUS / focusCamera from camera.js. Pinch-out still reaches the full lot; the Full lot stop
// is also one tap away. Hidden in story/bare modes.

import { TOUR_STOPS, tourCamera, homeCamera } from './camera.js';

const MQ = '(max-width: 720px)';

function tourWanted() {
  if (typeof window === 'undefined' || typeof matchMedia === 'undefined') return false;
  return matchMedia(MQ).matches;
}

export function installTour(scene, { getP, setCamera } = {}) {
  if (typeof document === 'undefined') return null;
  const doc = document;
  const modeOff = () => doc.body.classList.contains('story') || doc.body.classList.contains('bare');

  const bar = doc.createElement('nav');
  bar.id = 'tour';
  bar.setAttribute('aria-label', 'District tour');
  bar.hidden = true;
  bar.innerHTML =
    `<button type="button" class="prev" aria-label="Previous district">‹</button>` +
    `<div class="mid"><span class="stop-label" id="tour-label"></span>` +
    `<span class="stop-meta" id="tour-meta"></span></div>` +
    `<button type="button" class="next" aria-label="Next district">›</button>`;
  doc.body.appendChild(bar);

  const labelEl = bar.querySelector('#tour-label');
  const metaEl = bar.querySelector('#tour-meta');
  const prevBtn = bar.querySelector('.prev');
  const nextBtn = bar.querySelector('.next');

  const fullIdx = Math.max(0, TOUR_STOPS.findIndex((s) => s.id === 'full'));
  let index = fullIdx; // match defaultCamera (full lot)
  let swipe = null;

  function stop() { return TOUR_STOPS[index]; }

  function render() {
    const s = stop();
    const n = TOUR_STOPS.length;
    labelEl.textContent = s.label;
    metaEl.textContent = `${index + 1} / ${n}`;
    prevBtn.disabled = false;
    nextBtn.disabled = false;
  }

  function go(i, { animate = true } = {}) {
    index = ((i % TOUR_STOPS.length) + TOUR_STOPS.length) % TOUR_STOPS.length;
    render();
    const p = getP && getP();
    if (!p || !setCamera) return;
    const cam = tourCamera(p, stop());
    setCamera(cam, { fromTour: true, animate });
    // Keep desktop district chips in sync when tour API is driven directly (captures / deep links)
    if (scene.districtNav && typeof scene.districtNav.syncActive === 'function') {
      scene.districtNav.syncActive(index);
    }
  }

  function next() { go(index + 1); }
  function prev() { go(index - 1); }
  function home() {
    const i = TOUR_STOPS.findIndex((s) => s.id === 'full');
    go(i >= 0 ? i : 0);
  }

  function syncVisibility() {
    const show = !modeOff() && tourWanted();
    bar.hidden = !show;
    doc.body.classList.toggle('tour-on', show);
    return show;
  }

  prevBtn.addEventListener('click', (e) => { e.preventDefault(); prev(); });
  nextBtn.addEventListener('click', (e) => { e.preventDefault(); next(); });

  // Swipe on the tour bar only (does not fight canvas pan/pinch).
  bar.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest('button')) return;
    swipe = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp };
    try { bar.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
  });
  bar.addEventListener('pointerup', (e) => {
    if (!swipe || swipe.id !== e.pointerId) return;
    const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
    const dt = e.timeStamp - swipe.t;
    swipe = null;
    if (dt > 600 || Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    if (dx < 0) next(); else prev();
  });
  bar.addEventListener('pointercancel', () => { swipe = null; });

  function onKey(e) {
    if (modeOff() || !tourWanted()) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (doc.getElementById('about') && !doc.getElementById('about').hidden) return;
    if (doc.getElementById('numbers') && !doc.getElementById('numbers').hidden) return;
    if (e.key === 'ArrowRight' || e.key === ']') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft' || e.key === '[') { e.preventDefault(); prev(); }
  }
  doc.addEventListener('keydown', onKey);

  const mq = typeof matchMedia !== 'undefined' ? matchMedia(MQ) : null;
  const onMq = () => { syncVisibility(); };
  if (mq) {
    if (mq.addEventListener) mq.addEventListener('change', onMq);
    else if (mq.addListener) mq.addListener(onMq);
  }
  window.addEventListener('resize', syncVisibility);

  syncVisibility();
  render();

  return {
    el: bar,
    stops: TOUR_STOPS,
    get index() { return index; },
    get stop() { return stop(); },
    go, next, prev, home,
    syncVisibility,
    applyCurrent(p) {
      if (!p) return homeCamera(p);
      return tourCamera(p, stop());
    },
  };
}
