// Deliberately small public interface for the landing page, independent of debug/recorder hooks.
export function installLandingBridge(scene, { focus }) {
  if (new URLSearchParams(location.search).get('embed') !== '1' || window.parent === window) return null;
  const allowed = new Set(['full', 'stages', 'block']);
  let current = 'full';
  const send = (message) => window.parent.postMessage({ channel: 'sign-scene-v1', ...message }, location.origin);
  const signals = () => send({ type: 'signals', signals: scene.signals });
  window.addEventListener('message', event => {
    const data = event.data;
    if (event.origin !== location.origin || event.source !== window.parent || !data || data.channel !== 'sign-landing-v1' || data.type !== 'view' || !allowed.has(data.district) || typeof data.paused !== 'boolean') return;
    scene.paused = data.paused;
    scene.reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const changed = current !== data.district;
    current = data.district;
    focus(current, changed);
    scene.syncDrawLoop?.();
    scene.requestDraw?.();
  });
  // Reframe after p5's own resize callback; a parent ResizeObserver can fire before it.
  window.addEventListener('resize', () => requestAnimationFrame(() => { focus(current, false); scene.requestDraw?.(); }));
  scene.paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
  focus(current, false);
  send({ type: 'ready' });
  signals();
  return { signals };
}
