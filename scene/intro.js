// First-visit explainer: a short, skimmable card that answers "what is this?" and "how do I use it?"
// It shows once per browser (localStorage), on a genuine first visit. ?intro=1 forces it (recordings);
// ?intro=0 suppresses it. Never in story/bare (capture) modes or inside an embed.
// scene.js pairs it with an establishing camera: the whole lot shows behind the card, then glides to the
// home view when the visitor enters (a no-op on desktop, where home is the whole lot). onClose fires on any
// dismissal so scene.js can run that glide.

const KEY = 'sign.intro.seen.v1';

function seen() {
  try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; }
}
function markSeen() {
  try { localStorage.setItem(KEY, '1'); } catch (e) { /* private window or blocked storage: show it again next time */ }
}

export function introSeen() { return seen(); }

export function installIntro(scene, { force = false, suppress = false, onOpen, onClose } = {}) {
  if (typeof document === 'undefined') return null;
  const body = document.body;
  if (suppress || body.classList.contains('story') || body.classList.contains('bare')) return null;
  if (scene && scene.frozenTime != null && !force) return null; // ?t= captures never show the card
  if (!force && seen()) return null;
  if (window.self !== window.top) return null; // not inside an embed

  const el = document.createElement('div');
  el.id = 'intro';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'intro-title');
  el.innerHTML = `
    <div class="card" tabindex="-1">
      <div class="eyebrow">What is this?</div>
      <h2 id="intro-title">The Hollywood SIGN</h2>
      <p class="lede">An illustrated studio lot where <b>every crowd, queue, light, and weather beat is one real public
        number</b> about Hollywood — jobs, shoot days, weekend box office, streaming hours, layoffs, press tone.
        Nothing is generated: the picture only moves when the data does.</p>
      <ul>
        <li><b>Hover or tap anything</b> for its number, source and date.</li>
        <li><b>Pick a district</b> from the bar above the map to zoom in; <b>Reset</b> brings you back.</li>
        <li><b>Drag the bar</b> at the bottom to replay any day since 2022 — try the 2023 strikes.</li>
        <li><b>Find the Fair Play Films van</b> (marked FPF), hidden somewhere new each day.</li>
      </ul>
      <div class="row">
        <button type="button" class="start">Explore the lot</button>
        <button type="button" class="more">Full legend</button>
        <span class="fine">SIGN = Shoot days · Income · Grosses · News. Built by Lauren Neal,
          <a href="https://www.instagram.com/thelaurenneal/" rel="me noopener" target="_blank">@thelaurenneal</a>.</span>
      </div>
    </div>`;
  body.appendChild(el);
  const card = el.querySelector('.card');
  const start = el.querySelector('.start');
  const more = el.querySelector('.more');

  let closed = false;
  function close(reason) {
    if (closed || !el.isConnected) return;
    closed = true;
    markSeen();
    el.classList.add('closing');
    setTimeout(() => el.remove(), 180);
    document.removeEventListener('keydown', onKey);
    if (onClose) onClose(reason);
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close('escape'); }
  }
  start.addEventListener('click', () => close('start'));
  more.addEventListener('click', () => { close('more'); if (scene && scene.about && scene.about.open) scene.about.open(); });
  el.addEventListener('click', (e) => { if (e.target === el) close('backdrop'); });
  document.addEventListener('keydown', onKey);
  if (onOpen) onOpen();
  // focus the primary action so Escape/Enter work at once
  setTimeout(() => { try { start.focus({ preventScroll: true }); } catch (e) { card.focus(); } }, 0);
  return { close, el };
}
