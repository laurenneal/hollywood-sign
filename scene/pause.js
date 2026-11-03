// Pause / Play for ambient motion (§6). Respects prefers-reduced-motion on first load.
 // Deliberate selection / date / camera still work while paused. Hidden in story/bare.

export function installPause(scene) {
  if (typeof document === 'undefined') return null;
  const body = document.body;
  if (body.classList.contains('story') || body.classList.contains('bare')) return null;

  let el = document.getElementById('pause-btn');
  if (!el) {
    el = document.createElement('button');
    el.id = 'pause-btn';
    el.type = 'button';
    el.setAttribute('aria-pressed', 'false');
    // Host on #map-controls (Pass 1 control row), outside the picture frame
    const host = document.getElementById('map-controls') || document.getElementById('viewport') || document.body;
    host.appendChild(el);
  }

  let paused = false;
  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      paused = true;
      scene.reduceMotion = true;
    }
  } catch (_) { /* ignore */ }

  function render() {
    el.textContent = paused ? 'Play' : 'Pause';
    el.setAttribute('aria-label', paused ? 'Play ambient motion' : 'Pause ambient motion');
    el.setAttribute('aria-pressed', paused ? 'true' : 'false');
    el.classList.toggle('on', paused);
    scene.paused = paused;
    if (paused) scene.reduceMotion = true;
    if (typeof scene.syncDrawLoop === 'function') scene.syncDrawLoop();
  }

  el.onclick = () => {
    paused = !paused;
    if (!paused) {
      try {
        scene.reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      } catch (_) { scene.reduceMotion = false; }
    }
    render();
  };

  render();
  return {
    el,
    get paused() { return paused; },
    set(v) { paused = !!v; render(); },
  };
}
