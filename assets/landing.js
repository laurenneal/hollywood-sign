"use strict";
const TOPICS = {
    overview: { district: 'full', title: 'What the lot shows', kicker: 'Reading the lot', description: 'Crew groups, shooting lamps, and lit windows reflect employment, location filming, and Netflix viewing. Select a view for its figure and source. Enter the lot to inspect individual signals or replay earlier dates.', source: 'Read the source notes', href: './SOURCES.md' },
    work: { district: 'stages', signal: 'la_jobs', title: 'How much work is there?', kicker: 'Work / the crews', unit: 'payroll jobs · motion picture & sound recording', multiplier: 1000, description: 'The crews reflect payroll employment in the LA–Long Beach–Glendale metro division. Jobs, not unique workers; includes sound recording and roles beyond actors. Not seasonally adjusted.', source: 'U.S. Bureau of Labor Statistics', href: 'https://data.bls.gov/timeseries/SMU06310845051200001' },
    production: { district: 'stages', signal: 'filmla_shoot_days', title: 'On-location filming in LA', kicker: 'Production / the shooting lamps', unit: 'permitted on-location shoot days', description: 'Shooting lamps reflect FilmLA’s reported on-location shoot days in the jurisdictions it serves. They measure permitted location activity, not unique productions, jobs, or the amount of filming on studio lots.', source: 'FilmLA production research', href: 'https://filmla.com/research/' },
    audience: { district: 'block', signal: 'netflix_hours', title: 'Netflix Top 10 viewing', kicker: 'Audiences / the apartment windows', unit: 'hours viewed · Netflix global weekly Top 10', description: 'Lit windows reflect combined viewing hours across Netflix’s four global Top 10 lists. The figure counts hours watched, not all Netflix viewing, unique viewers, or audience satisfaction.', source: 'Netflix Top 10', href: 'https://www.netflix.com/tudum/top10' },
};
const SOURCE_UNITS = { la_jobs: 'thousand jobs', filmla_shoot_days: 'shoot days', netflix_hours: 'hours' };
const LEGACY_KEYS = ['replay', 'district', 'signal', 'story', 'bare', 't', 'hour', 'date', 'intro', 'debug', 'tour'];
const initial = new URL(location.href);
// Shared scene/recorder URLs existed at the root before the landing page.
if (LEGACY_KEYS.some(key => initial.searchParams.has(key))) {
    const target = new URL('./scene/', location.href);
    target.search = initial.search;
    target.hash = initial.hash;
    location.replace(target);
}
else {
    initLanding();
}
function element(id) {
    const el = document.getElementById(id);
    if (!el)
        throw new Error(`Missing landing element: ${id}`);
    return el;
}
function isView(value) {
    return typeof value === 'string' && Object.hasOwn(TOPICS, value);
}
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function readSignal(value, id) {
    if (!SOURCE_UNITS[id] || !record(value) || value.unit !== SOURCE_UNITS[id] || (value.value !== null && (typeof value.value !== 'number' || !Number.isFinite(value.value) || value.value < 0)) || typeof value.period !== 'string' || typeof value.as_of !== 'string' || typeof value.preliminary !== 'boolean' || typeof value.stale !== 'boolean')
        return;
    return { value: value.value, period: value.period, as_of: value.as_of, preliminary: value.preliminary, stale: value.stale, error: typeof value.error === 'string' ? value.error : null };
}
function prettyPeriod(period) {
    if (/^\d{4}Q[1-4]$/.test(period))
        return `Q${period[5]} ${period.slice(0, 4)}`;
    if (/^\d{4}-\d{2}(-\d{2})?$/.test(period)) {
        const date = new Date(`${period.length === 7 ? period + '-01' : period}T12:00:00Z`);
        if (!Number.isNaN(date.getTime()))
            return date.toLocaleDateString('en-US', { month: 'short', ...(period.length > 7 ? { day: 'numeric' } : {}), year: 'numeric', timeZone: 'UTC' });
    }
    return period;
}
function initLanding() {
    const frame = element('lot');
    const motion = element('motion');
    const lotStatus = element('lot-status');
    const tabs = [...document.querySelectorAll('[data-view]')];
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let paused = media.matches;
    let inView = true;
    let ready = false;
    let signals = {};
    let dataStatus = 'loading';
    let view = 'overview';
    let shareRequest = 0;
    const loadTimeout = window.setTimeout(() => {
        if (!ready)
            lotStatus.textContent = 'The illustration is taking longer to load. You can still read the numbers below or enter the full lot.';
    }, 15000);
    document.querySelector('.topic-picker').hidden = false;
    document.querySelector('.view-share').hidden = false;
    motion.hidden = false;
    function syncScene() {
        if (!ready)
            return;
        frame.contentWindow?.postMessage({ channel: 'sign-landing-v1', type: 'view', district: TOPICS[view].district, paused: paused || !inView || document.hidden }, location.origin);
    }
    function render() {
        const topic = TOPICS[view];
        tabs.forEach(tab => {
            const selected = tab.dataset.view === view;
            tab.setAttribute('aria-selected', String(selected));
            tab.tabIndex = selected ? 0 : -1;
        });
        element('signal-panel').setAttribute('aria-labelledby', `tab-${view}`);
        element('signal-kicker').textContent = topic.kicker;
        element('signal-title').textContent = topic.title;
        element('signal-description').textContent = topic.description;
        const source = element('signal-source');
        source.href = topic.href;
        source.textContent = `${topic.source} ↗`;
        const explore = new URL('./scene/?intro=0', location.href);
        explore.searchParams.set('district', topic.district);
        if (topic.signal)
            explore.searchParams.set('signal', topic.signal);
        element('signal-explore').href = explore.href;
        const signal = topic.signal ? readSignal(signals[topic.signal], topic.signal) : undefined;
        const value = element('signal-value');
        value.hidden = !topic.signal;
        const available = signal && signal.value !== null;
        value.textContent = available ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(signal.value * (topic.multiplier ?? 1)) : dataStatus === 'loading' ? 'Loading…' : 'Unavailable';
        element('signal-unit').hidden = !topic.signal;
        element('signal-unit').textContent = topic.unit ?? '';
        element('signal-period').textContent = signal ? `${view === 'audience' ? 'Week ending ' : ''}${prettyPeriod(signal.period)}` : '';
        const quality = [];
        if (signal) {
            if (signal.preliminary)
                quality.push('Preliminary');
            if (signal.stale)
                quality.push('Past expected update');
            if (signal.error)
                quality.push('Source update failed; last available observation shown');
            quality.push(`Source vintage ${prettyPeriod(signal.as_of)}`);
        }
        else if (topic.signal && dataStatus !== 'loading')
            quality.push('This observation could not be loaded. Follow the original source or read a published edition.');
        element('signal-quality').hidden = quality.length === 0;
        element('signal-quality').textContent = quality.join(' · ');
        motion.textContent = paused ? 'Play motion' : 'Pause motion';
        motion.setAttribute('aria-pressed', String(paused));
        syncScene();
    }
    function select(next, push = false) {
        view = next;
        if (push) {
            const url = new URL(location.href);
            if (view === 'overview')
                url.searchParams.delete('view');
            else
                url.searchParams.set('view', view);
            if (url.href !== location.href)
                history.pushState(null, '', url);
        }
        shareRequest++;
        element('share-fallback').hidden = true;
        element('share-status').textContent = 'These figures can change. Cite a dated report to preserve your comparison.';
        render();
    }
    function restore() {
        const param = new URL(location.href).searchParams.get('view');
        select(isView(param) ? param : 'overview');
    }
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => { if (isView(tab.dataset.view))
            select(tab.dataset.view, true); });
        tab.addEventListener('keydown', event => {
            const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : ['ArrowRight', 'ArrowDown'].includes(event.key) ? (index + 1) % tabs.length : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? (index + tabs.length - 1) % tabs.length : -1;
            const next = tabs[nextIndex];
            if (!next || !isView(next.dataset.view))
                return;
            event.preventDefault();
            next.focus();
            select(next.dataset.view, true);
        });
    });
    window.addEventListener('popstate', restore);
    motion.addEventListener('click', () => { paused = !paused; render(); });
    media.addEventListener('change', () => { paused = media.matches; render(); });
    document.addEventListener('visibilitychange', syncScene);
    new IntersectionObserver(entries => { inView = entries[0]?.isIntersecting ?? true; syncScene(); }).observe(frame);
    new ResizeObserver(syncScene).observe(frame);
    window.addEventListener('message', event => {
        if (event.origin !== location.origin || event.source !== frame.contentWindow || !record(event.data) || event.data.channel !== 'sign-scene-v1')
            return;
        if (event.data.type === 'ready') {
            ready = true;
            clearTimeout(loadTimeout);
            lotStatus.hidden = true;
            syncScene();
        }
        else if (event.data.type === 'signals' && record(event.data.signals)) {
            signals = event.data.signals;
            dataStatus = 'ready';
            render();
        }
    });
    // The textual evidence remains useful when the heavier illustration fails to load.
    fetch(new URL('./data/signals.json', location.href), { signal: AbortSignal.timeout(12000) }).then(async (response) => {
        if (!response.ok)
            throw new Error('Data unavailable');
        const payload = await response.json();
        if (!record(payload) || !record(payload.signals))
            throw new Error('Invalid data');
        if (dataStatus === 'loading') {
            signals = payload.signals;
            dataStatus = 'ready';
            render();
        }
    }).catch(() => { if (dataStatus === 'loading') {
        dataStatus = 'error';
        render();
    } });
    element('share-view').addEventListener('click', async () => {
        const request = ++shareRequest;
        const url = new URL(location.href);
        url.hash = '';
        const status = element('share-status');
        try {
            await navigator.clipboard.writeText(url.href);
            if (request === shareRequest)
                status.textContent = 'Link copied. These figures can change; dated reports keep the numbers used in each comparison.';
        }
        catch {
            if (request !== shareRequest)
                return;
            const fallback = element('share-fallback');
            fallback.hidden = false;
            fallback.value = url.href;
            fallback.focus();
            fallback.select();
            status.textContent = 'Select and copy the link below.';
        }
    });
    restore();
    frame.src = frame.dataset.src;
}
