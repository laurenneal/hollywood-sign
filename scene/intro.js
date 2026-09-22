// The first-visit card: a short "read me" in the center of the page, shown once per browser.
// It says what the page is and the three things to do, then gets out of the way. It never shows in story or
// bare (capture) modes, or when the page is embedded; ?intro=1 forces it (for recordings), ?intro=0 suppresses it.

const KEY = 'sign.intro.seen.v1';

function seen() {
  try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; }
}
function markSeen() {
  try { localStorage.setItem(KEY, '1'); } catch (e) { /* private window or blocked storage: show it again next time */ }
}

export function installIntro(scene, { force = false, suppress = false, onOpen, onClose } = {}) {
  if (typeof document === 'undefined') return null;
  const body = document.body;
  if (suppress || body.classList.contains('story') || body.classList.contains('bare')) return null;
  // §4: no blocking first-visit essay — inline masthead covers the two-sentence read.
  // Modal remains for recorder captures via ?intro=1.
  if (!force) {
    markSeen();
    return null;
  }
  if (window.self !== window.top) return null;

  const el = document.createElement('div');
  el.id = 'intro';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'intro-title');
  el.innerHTML = `
    <div class="card" tabindex="-1">
      <div class="eyebrow">Read me · 20 seconds</div>
      <h2 id="intro-title">The Hollywood SIGN</h2>
      <p class="lede">A drawn map of a fictional studio lot where <b>every crowd is one public number</b>: jobs, shoot days,
        weekend box office, streaming hours, layoffs, press tone. Nothing is generated. The picture moves when the data does.</p>
      <ul>
        <li><b>Tap or hover over anything</b> for the number and source — or open <b>#</b>.</li>
        <li><b>Opens on the full lot</b>. District chips / bar zoom into stops; pinch or +/− to zoom in.</li>
        <li><b>Drag the bar</b> at the bottom to replay any day since 2022. Try July 2023. The water tower holds the index.</li>
      </ul>
      <div class="row">
        <button type="button" class="start">Start</button>
        <button type="button" class="more">Full legend</button>
        <span class="fine">Shoot days · Income · Grosses · News. Built by Lauren Neal, <a href="https://www.instagram.com/thelaurenneal/" rel="me noopener" target="_blank">@thelaurenneal</a>.</span>
      </div>
    </div>`;
  body.appendChild(el);
  const card = el.querySelector('.card');
  const start = el.querySelector('.start');
  const more = el.querySelector('.more');

  function close(reason) {
    if (!el.isConnected) return;
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
  // focus the card so Escape works at once, without stealing focus from an active input
  setTimeout(() => { try { start.focus({ preventScroll: true }); } catch (e) { card.focus(); } }, 0);
  return { close, el };
}
