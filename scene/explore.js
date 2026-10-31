// Explore-map mode (§3): exclusive pan/pinch only while Explore is on.
 // Outside Explore, the page scrolls normally; canvas uses touch-action:pan-y.
 // Story/bare hide the control. Pass 1 defaults Explore off on every device.

export function installExplore(scene, { canvas, getTour } = {}) {
  if (typeof document === 'undefined' || !canvas) return null;
  const body = document.body;
  if (body.classList.contains('story') || body.classList.contains('bare')) return null;

  let el = document.getElementById('explore-btn');
  if (!el) {
    el = document.createElement('button');
    el.id = 'explore-btn';
    el.type = 'button';
    // Host on #map-controls (Pass 1 control row), outside the picture frame
    const host = document.getElementById('map-controls') || document.getElementById('viewport') || document.body;
    host.appendChild(el);
  }

  // Pass 1: keep Explore off by default so page scroll works; Pass 2 hardens gestures.
  let on = false;

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
