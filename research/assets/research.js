const catalog = JSON.parse(document.getElementById('research-catalog').textContent);
catalog.records.forEach(record => { record.words = new Set(tokens(record.search)); });
const byId = new Map(catalog.records.map(record => [record.id, record]));
const form = document.querySelector('.search');
const query = document.getElementById('q');
const status = document.getElementById('status');
const cards = [...document.querySelectorAll('.record')];
const topicButtons = [...document.querySelectorAll('[data-topic]')];
const selected = new Set();
let topic = '';

function tokens(value) {
  return value.toLowerCase().split(/[^a-z0-9]+/).filter(token => token.length > 1);
}
function show(element, on) {
  element.hidden = !on;
}
function explain(record, words) {
  if (!words.length) return 'Shown with the other reviewed records.';
  const hit = words.filter(word => record.words.has(word));
  return `Matched ${record.title} on ${hit.join(', ')}.`;
}
function render() {
  const words = tokens(query.value);
  let shown = 0;
  cards.forEach(card => {
    const record = byId.get(card.dataset.id);
    const topicOk = !topic || record.topics.includes(topic);
    const wordOk = words.every(word => record.words.has(word));
    const on = topicOk && wordOk;
    show(card, on);
    if (on) {
      shown += 1;
      card.querySelector('[data-why]').textContent = explain(record, words);
    }
  });
  status.textContent = shown
    ? `${shown} reviewed record${shown === 1 ? '' : 's'}.`
    : 'No reviewed evidence yet for that question. The notes below say what this desk does not cover.';
}
function packetIds() {
  return [...selected].filter(id => byId.has(id));
}
function syncPacket() {
  const ids = packetIds();
  document.getElementById('packet-count').textContent = ids.length
    ? `${ids.length} record${ids.length === 1 ? '' : 's'} selected: ${ids.map(id => byId.get(id).title).join(', ')}.`
    : 'No records selected.';
  const url = new URL(location.href);
  if (ids.length) url.searchParams.set('packet', ids.join(','));
  else url.searchParams.delete('packet');
  if (topic) url.searchParams.set('topic', topic);
  else url.searchParams.delete('topic');
  if (query.value.trim()) url.searchParams.set('q', query.value.trim());
  else url.searchParams.delete('q');
  history.replaceState(null, '', url);
}
async function copy(text, success) {
  const feedback = document.getElementById('packet-feedback');
  const fallback = document.getElementById('packet-fallback');
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

document.querySelectorAll('[data-enhance]').forEach(element => { element.hidden = false; });
form.hidden = false;
const initial = new URL(location.href);
query.value = initial.searchParams.get('q') || '';
topic = initial.searchParams.get('topic') || '';
if (topic && !topicButtons.some(button => button.dataset.topic === topic)) topic = '';
(initial.searchParams.get('packet') || '').split(',').filter(Boolean).forEach(id => {
  if (byId.has(id)) selected.add(id);
});
cards.forEach(card => {
  const box = card.querySelector('[data-packet]');
  box.checked = selected.has(card.dataset.id);
  box.addEventListener('change', () => {
    if (box.checked) selected.add(card.dataset.id);
    else selected.delete(card.dataset.id);
    syncPacket();
  });
});
topicButtons.forEach(button => {
  const on = button.dataset.topic === topic;
  button.setAttribute('aria-pressed', String(on));
  button.addEventListener('click', () => {
    topic = button.dataset.topic;
    topicButtons.forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    render();
    syncPacket();
  });
});
query.addEventListener('input', () => { render(); syncPacket(); });
document.getElementById('copy-packet').addEventListener('click', () => {
  const ids = packetIds();
  if (!ids.length) {
    document.getElementById('packet-feedback').textContent = 'Select a record first.';
    return;
  }
  copy(ids.map(id => byId.get(id).citation).join('\n\n'), 'Citations copied.');
});
document.getElementById('copy-link').addEventListener('click', () => copy(location.href, 'Packet link copied.'));
render();
syncPacket();
const unknown = (initial.searchParams.get('packet') || '').split(',').filter(id => id && !byId.has(id));
if (unknown.length) document.getElementById('packet-feedback').textContent = 'Some packet ids are not in the reviewed catalog, so they were left out.';
