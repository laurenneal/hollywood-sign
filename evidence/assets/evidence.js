// Progressive enhancement over a complete static article. Data is local to its immutable edition.
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const label = (p) => p.includes('Q') ? `Q${p.at(-1)} ${p.slice(0, 4)}`
  : new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${p}-01T00:00:00Z`));
const index = (p) => p.includes('Q') ? Number(p.slice(0, 4)) * 4 + Number(p.at(-1))
  : Number(p.slice(0, 4)) * 12 + Number(p.slice(5));
const change = (pct) => pct === null ? 'Percentage change unavailable (starting value is zero)'
  : Math.abs(pct) < .05 ? 'Less than 0.1% change' : `${Math.abs(pct).toFixed(1)}% ${pct < 0 ? 'lower' : 'higher'}`;
const xml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

async function copy(section, text, success) {
  const feedback = section.querySelector('[data-feedback]');
  const fallback = section.querySelector('.copy-fallback');
  fallback.hidden = true;
  try {
    await navigator.clipboard.writeText(text);
    feedback.textContent = success;
  } catch {
    fallback.value = text;
    fallback.hidden = false;
    fallback.focus();
    fallback.select();
    feedback.textContent = 'Automatic copying is unavailable. Copy the selected text below.';
  }
}

function download(text, filename, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function init() {
  const response = await fetch('./edition.json');
  if (!response.ok) throw new Error(`Edition unavailable: ${response.status}`);
  const data = await response.json();
  if (data.schema_version !== 1 || data.method_version !== 'comparison-1') throw new Error('Unsupported edition');
  const sections = [];

  function currentUrl(anchor = '') {
    const url = new URL(location.href);
    url.search = '';
    for (const item of sections) {
      for (const role of ['from', 'to']) url.searchParams.set(`${item.metric.id}_${role}`, item[role].value);
    }
    url.hash = anchor;
    return url;
  }

  for (const metric of data.metrics) {
    const section = document.querySelector(`[data-metric="${metric.id}"]`);
    const from = section.querySelector('[data-period="from"]');
    const to = section.querySelector('[data-period="to"]');
    const points = new Map(metric.points.map((p) => [p.period, p]));
    const warning = section.querySelector('[data-warning]');
    const item = { metric, section, from, to, update: null };
    sections.push(item);

    function selected() {
      const a = points.get(from.value), b = points.get(to.value);
      const pct = a.value === 0 ? null : (b.value - a.value) / a.value * 100;
      return { a, b, pct };
    }

    function update(message = '') {
      const { a, b, pct } = selected();
      const value = section.querySelector('[data-value]');
      value.replaceChildren(document.createTextNode(`${number.format(b.value)} `));
      const unit = document.createElement('span'); unit.textContent = metric.unit; value.append(unit);
      section.querySelector('[data-result]').textContent = `${change(pct)} than ${label(a.period)}`;
      section.querySelector('[data-period-note]').textContent = `${label(b.period)} · source vintage ${b.vintage}${b.preliminary ? ' · preliminary' : ''}`;
      const notes = message ? [message] : [];
      if (a.period.slice(4) !== b.period.slice(4)) notes.push('Different months or quarters can include seasonal effects. This series is not seasonally adjusted.');
      if (a.preliminary) notes.push('The starting observation is also preliminary.');
      warning.textContent = notes.join(' '); warning.hidden = !notes.length;
      const svg = section.querySelector('[data-chart]');
      const ymax = Number(svg.dataset.ymax);
      const first = index(metric.points[0].period), last = index(metric.points.at(-1).period);
      for (const [role, p] of [['from', a], ['to', b]]) {
        const mark = svg.querySelector(`[data-mark="${role}"]`);
        mark.setAttribute('cx', String(64 + (index(p.period) - first) / Math.max(1, last - first) * 690));
        mark.setAttribute('cy', String(230 - p.value / ymax * 192));
      }
      svg.querySelector('title').textContent = `${metric.title}: ${number.format(a.value)} ${metric.unit} in ${label(a.period)} to ${number.format(b.value)} in ${label(b.period)}. ${change(pct)}. Complete observations in the table below.`;
      section.querySelector('[data-feedback]').textContent = '';
      section.querySelector('.copy-fallback').hidden = true;
    }
    item.update = update;

    for (const control of [from, to]) control.addEventListener('change', () => {
      if (from.value >= to.value) {
        from.value = metric.default_from; to.value = metric.default_to;
        update('Choose an ending period after the starting period. The default comparison has been restored.');
      } else update();
      history.replaceState(null, '', currentUrl(metric.id));
    });
    section.querySelector('[data-reset]').addEventListener('click', () => {
      from.value = metric.default_from; to.value = metric.default_to;
      update(); history.replaceState(null, '', currentUrl(metric.id));
    });
    section.querySelector('[data-copy]').addEventListener('click', () => copy(section, currentUrl(metric.id).href, 'Comparison link copied.'));
    section.querySelector('[data-cite]').addEventListener('click', () => {
      const { a, b, pct } = selected();
      const refs = [...new Set([a.source_id, b.source_id])].map((id) => `${data.sources[id].name}: ${data.sources[id].url}`).join('; ');
      const citation = `${data.author}, “${data.title}” The Hollywood SIGN, evidence edition ${data.edition}. ${metric.title}: ${number.format(b.value)} ${metric.unit} (${label(b.period)}) versus ${number.format(a.value)} (${label(a.period)}); ${change(pct)}. Geography: ${metric.geography}. Population: ${metric.population}. ${a.preliminary || b.preliminary ? 'Includes preliminary observations. ' : ''}Source vintages: ${a.vintage} and ${b.vintage}. ${refs}. Method ${data.method_version}. ${currentUrl(metric.id).href}`;
      copy(section, citation, 'Citation copied.');
    });
    section.querySelector('[data-export]').addEventListener('click', () => {
      const { a, b, pct } = selected();
      const chart = section.querySelector('[data-chart]').cloneNode(true);
      chart.removeAttribute('data-chart'); chart.setAttribute('x', '35'); chart.setAttribute('y', '178');
      chart.setAttribute('width', '930'); chart.setAttribute('height', '320');
      const sources = [...new Set([a.source_id, b.source_id].map((id) => data.sources[id].name))].join(' / ');
      // Wrap long geographic/population text as real SVG lines, not clipped foreignObject HTML.
      const wrap = (text, max = 103) => {
        const lines = [''];
        for (const word of text.split(' ')) {
          if (lines.at(-1).length + word.length > max) lines.push('');
          lines[lines.length - 1] += (lines.at(-1) ? ' ' : '') + word;
        }
        return lines;
      };
      const lines = [
        ...wrap(metric.geography), ...wrap(metric.population),
        `${label(a.period)}: ${number.format(a.value)} → ${label(b.period)}: ${number.format(b.value)} ${metric.unit}`,
        `Source: ${sources}. Vintages: ${a.vintage} / ${b.vintage}.${a.preliminary || b.preliminary ? ' Includes preliminary data.' : ''}`,
        ...wrap(metric.limitation),
      ];
      const link = `${location.origin}${location.pathname}${currentUrl(metric.id).search}#${metric.id}`;
      const height = 610 + lines.length * 22;
      const text = lines.map((line, i) => `<text x="50" y="${515 + i * 22}" font-size="14">${xml(line)}</text>`).join('');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="${height}" viewBox="0 0 1000 ${height}"><style>text{font-family:Arial,sans-serif;fill:#202b29}.grid-line{stroke:#c7caba;stroke-width:1}.series-line{fill:none;stroke:#245e51;stroke-width:3}.mark{stroke:#245e51;stroke-width:3;fill:#fffdf5}.mark.to{fill:#a8412b;stroke:#fffdf5}</style><rect width="100%" height="100%" fill="#f4efdf"/><text x="50" y="40" font-size="16">THE HOLLYWOOD SIGN · Lauren Neal</text><text x="50" y="91" font-size="37">${xml(metric.title)}</text><text x="50" y="131" font-size="24">${xml(change(pct))} · ${xml(label(a.period))} to ${xml(label(b.period))}</text><text x="50" y="160" font-size="14">Evidence edition ${xml(data.edition)} · ${xml(data.method_version)} · full series; zero baseline; k = 1,000</text>${new XMLSerializer().serializeToString(chart)}${text}<a href="${xml(link)}"><text x="50" y="${height - 52}" font-size="16" text-decoration="underline">Open this comparison and its original sources ↗</text></a><text x="50" y="${height - 27}" font-size="12">${xml(location.host + location.pathname)}</text></svg>`;
      download(svg, `sign-${metric.id}-${a.period}-${b.period}-${data.edition}.svg`, 'image/svg+xml;charset=utf-8');
      section.querySelector('[data-feedback]').textContent = 'SVG downloaded with sources and a link to this comparison.';
    });
  }

  function restore() {
    const params = new URL(location.href).searchParams;
    for (const { metric, from, to, update } of sections) {
      const a = params.get(`${metric.id}_from`) ?? metric.default_from;
      const b = params.get(`${metric.id}_to`) ?? metric.default_to;
      const valid = metric.points.some((p) => p.period === a) && metric.points.some((p) => p.period === b) && a < b;
      from.value = valid ? a : metric.default_from;
      to.value = valid ? b : metric.default_to;
      update(valid ? '' : 'This link requested unavailable or out-of-order periods. Showing the default comparison.');
    }
  }
  restore();
  window.addEventListener('popstate', restore);
  document.querySelectorAll('[data-enhance]').forEach((el) => { el.hidden = false; });
  document.documentElement.dataset.evidenceReady = 'true';
}

init().catch(() => {
  const note = document.createElement('p');
  note.className = 'notice'; note.setAttribute('role', 'status');
  note.textContent = 'Interactive comparisons could not load. The published findings, source tables, and observation downloads are still available below.';
  document.querySelector('.edition-note').after(note);
});
