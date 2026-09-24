// Viewer-visible as-of / stale rule (Phase 5 · 10A).
 // When the run was partial or any painted signal is past its cadence, keep showing last known values
 // but label them — never silent cache, never claim ~2h freshness while feeds failed.

export function freshnessBadge(meta, signals) {
  const builtRaw = meta && meta.built_at ? String(meta.built_at) : '';
  const built = builtRaw
    ? builtRaw.replace('T', ' ').slice(0, 16) + ' UTC'
    : (meta && meta.today ? String(meta.today) : '—');
  const ok = meta && meta.feeds_ok != null ? Number(meta.feeds_ok) : null;
  const total = meta && meta.feeds_total != null ? Number(meta.feeds_total) : null;
  const known = meta && meta.feeds_known != null ? Number(meta.feeds_known) : null;
  const partial = ok != null && total != null && total > 0 && ok < total;
  let staleN = 0;
  if (signals) {
    for (const s of Object.values(signals)) {
      if (s && s.stale) staleN++;
    }
  }
  const subset = !partial && ok != null && total != null && known != null && known > total;

  const bits = [];
  if (partial) bits.push(`partial ${ok}/${total} feeds`);
  else if (ok != null && total != null) bits.push(`${ok}/${total} feeds ok`);
  if (subset) bits.push(`${known} known`);
  bits.push('Site data built ' + built);
  if (staleN) bits.push(staleN === 1 ? '1 signal stale' : `${staleN} signals stale`);
  const statusLine = bits.join(' · ');

  let noteHtml;
  let tone = 'live'; // live | warn (partial/stale)
  if (partial || staleN) {
    tone = 'warn';
    const why = [];
    if (partial) why.push(`only ${ok} of ${total} feeds succeeded this run`);
    if (staleN) why.push(staleN === 1 ? '1 signal older than its cadence' : `${staleN} signals older than cadence`);
    noteHtml = `<span class="dot stale">●</span> Site data built ${esc(built)} · last known` +
      ` <span class="badge-stale">stale</span>` +
      (partial ? ` <span class="badge-partial">partial ${esc(String(ok))}/${esc(String(total))}</span>` : '') +
      ` · ${esc(why.join('; '))} · not a fresh ~2h refresh`;
  } else {
    // Healthy run: still name the feed count so a quiet partial never hides behind "live".
    const feedBit = (ok != null && total != null)
      ? ` · ${esc(String(ok))}/${esc(String(total))} feeds ok`
      : '';
    const cadenceBit = subset
      ? ` · refreshed ${esc(String(total))} of ${esc(String(known))} known feeds`
      : ' · ~every 2 hours when feeds succeed';
    noteHtml = `<span class="dot">●</span> Site data built ${esc(built)} · live${feedBit}${cadenceBit}`;
  }
  return { statusLine, noteHtml, partial, staleN, subset, tone, ok, total, known, built };
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
