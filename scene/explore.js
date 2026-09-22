// Explore-map mode (§3): exclusive pan/pinch only while Explore is on.
 // Outside Explore, the page scrolls normally; canvas uses touch-action:pan-y.
 // Story/bare hide the control. Desktop can leave Explore on by default.

export function installExplore(scene, { canvas, getTour } = {}) {
  if (typeof document === 'undefined' || !canvas) return null;
  const body = document.body;
  if (body.classList.contains('story') || body.classList.contains('bare')) return null;

  let el = document.getElementById('explore-btn');
  if (!el) {
    el = document.createElement('button');
    el.id = 'explore-btn';
    el.type = 'button';
    // Host on #viewport so phone layout keeps Explore clear of SELECTED / tour
    const host = document.getElementById('viewport') || document.body;
    host.appendChild(el);
  }

  // Phone defaults off so the district bar / inspector can scroll; desktop on.
  let on = true;
  try {
    if (matchMedia('(max-width: 1100px)').matches) on = false;
  } catch (_) { on = true; }

  function apply() {
    body.classList.toggle('explore-on', on);
    canvas.style.touchAction = on ? 'none' : 'pan-y';
    canvas.style.cursor = on ? 'grab' : 'default';
    el.textContent = on ? 'Done' : 'Explore';
    el.setAttribute('aria-pressed', on ? 'true' : 'false');
    el.setAttribute('aria-label', on ? 'Exit map explore mode' : 'Explore map — pan and zoom');
    el.classList.toggle('on', on);
    scene.exploreOn = on;
  }

  el.onclick = () => { on = !on; apply(); };

  // Tour bar swipe should still work when Explore is off
  apply();
  return {
    el,
    get on() { return on; },
    set(v) { on = !!v; apply(); },
    apply,
  };
}
