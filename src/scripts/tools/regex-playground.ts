import { setMessage } from './shared';

export const initRegexPlayground = () => {
  const form = document.getElementById('regex-form');
  if (!form) return;

  const message = document.getElementById('regex-message');
  const highlight = document.getElementById('regex-highlight');
  const matches = document.getElementById('regex-matches');

  const patternInput = form.elements.namedItem('pattern');
  const flagsInput = form.elements.namedItem('flags');
  const sampleInput = form.elements.namedItem('sample');

  const escapeHtml = (value) =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');

  const normalizeFlags = (value) => {
    const allowed = new Set(['d', 'g', 'i', 'm', 's', 'u', 'v', 'y']);
    const unique = [];
    for (const flag of String(value || '')) {
      if (allowed.has(flag) && !unique.includes(flag)) unique.push(flag);
    }
    return unique.join('');
  };

  const render = () => {
    const pattern = String(patternInput?.value || '');
    const flags = normalizeFlags(flagsInput?.value || '');
    const sample = String(sampleInput?.value || '');

    if (flagsInput) flagsInput.value = flags;
    if (!pattern) {
      setMessage(message, 'Enter a regex pattern to start.', true);
      if (highlight) highlight.textContent = sample;
      if (matches) matches.innerHTML = '';
      return;
    }

    try {
      new RegExp(pattern, flags);
    } catch (error) {
      setMessage(
        message,
        `Invalid regex: ${error instanceof Error ? error.message : 'unknown error'}`,
        true
      );
      if (highlight) highlight.textContent = sample;
      if (matches) matches.innerHTML = '';
      return;
    }

    const matchFlags = flags.includes('g') ? flags : `${flags}g`;
    const globalRegex = new RegExp(pattern, matchFlags);
    const found = Array.from(sample.matchAll(globalRegex)).slice(0, 120);

    if (matches) {
      if (found.length === 0) {
        matches.innerHTML = '<li>No matches in sample text.</li>';
      } else {
        matches.innerHTML = found
          .map((hit, index) => {
            const groups =
              hit.length > 1
                ? ` | groups: ${hit
                    .slice(1)
                    .map((group) => (group === undefined ? '∅' : group))
                    .join(', ')}`
                : '';
            const label = `${index + 1}. "${escapeHtml(hit[0])}" at index ${hit.index}${groups}`;
            return `<li>${label}</li>`;
          })
          .join('');
      }
    }

    if (highlight) {
      if (found.length === 0) {
        highlight.textContent = sample;
      } else {
        let cursor = 0;
        const parts = [];
        for (const hit of found) {
          const start = hit.index ?? 0;
          const value = hit[0] || '';
          const end = start + value.length;
          if (end <= cursor) continue;
          parts.push(escapeHtml(sample.slice(cursor, start)));
          parts.push(`<mark>${escapeHtml(sample.slice(start, end))}</mark>`);
          cursor = end;
        }
        parts.push(escapeHtml(sample.slice(cursor)));
        highlight.innerHTML = parts.join('');
      }
    }

    const inspectedRegex = new RegExp(pattern, flags);
    const firstHit = inspectedRegex.exec(sample);
    const summary = firstHit
      ? `Found ${found.length} match(es).`
      : 'Compiled successfully, no matches found.';
    setMessage(message, summary);
  };

  form.addEventListener('input', render);
  render();
};
