import { setMessage } from './shared';

export const initColorContrastChecker = () => {
  const form = document.getElementById('contrast-form');
  if (!form) return;

  const preview = document.getElementById('contrast-preview');
  const message = document.getElementById('contrast-message');
  const list = document.getElementById('contrast-results');
  const swap = document.getElementById('swap-contrast');

  const fgText = form.elements.namedItem('foregroundHex');
  const bgText = form.elements.namedItem('backgroundHex');
  const fgPicker = form.elements.namedItem('foregroundPicker');
  const bgPicker = form.elements.namedItem('backgroundPicker');

  const normalizeHex = (value) => {
    const raw = String(value || '').trim();
    const hex = raw.startsWith('#') ? raw.slice(1) : raw;
    if (/^[0-9a-f]{3}$/i.test(hex)) {
      return `#${hex
        .split('')
        .map((part) => part + part)
        .join('')
        .toLowerCase()}`;
    }
    if (/^[0-9a-f]{6}$/i.test(hex)) return `#${hex.toLowerCase()}`;
    return null;
  };

  const hexToRgb = (hex) => {
    const normalized = normalizeHex(hex);
    if (!normalized) return null;
    const value = normalized.slice(1);
    return {
      r: Number.parseInt(value.slice(0, 2), 16),
      g: Number.parseInt(value.slice(2, 4), 16),
      b: Number.parseInt(value.slice(4, 6), 16),
    };
  };

  const channelToLinear = (channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  const luminance = (rgb) =>
    0.2126 * channelToLinear(rgb.r) +
    0.7152 * channelToLinear(rgb.g) +
    0.0722 * channelToLinear(rgb.b);

  const ratioFrom = (fg, bg) => {
    const light = Math.max(fg, bg);
    const dark = Math.min(fg, bg);
    return (light + 0.05) / (dark + 0.05);
  };

  const statusLine = (label, ratio, min) => {
    const ok = ratio >= min;
    return `${label}: ${ok ? 'pass' : 'fail'} (needs ${min.toFixed(1)}:1)`;
  };

  const render = () => {
    const fg = normalizeHex(fgText?.value);
    const bg = normalizeHex(bgText?.value);
    if (!fg || !bg) {
      setMessage(message, 'Enter valid HEX values like #0f172a or #fff.', true);
      if (list) list.innerHTML = '';
      return;
    }

    if (fgPicker) fgPicker.value = fg;
    if (bgPicker) bgPicker.value = bg;

    const fgRgb = hexToRgb(fg);
    const bgRgb = hexToRgb(bg);
    if (!fgRgb || !bgRgb) return;

    const ratio = ratioFrom(luminance(fgRgb), luminance(bgRgb));
    const roundedRatio = Math.round(ratio * 100) / 100;

    if (preview) {
      preview.style.color = fg;
      preview.style.background = bg;
      preview.style.borderColor = fg;
    }

    if (list) {
      const lines = [
        `Contrast ratio: ${roundedRatio.toFixed(2)}:1`,
        statusLine('WCAG AA normal text', ratio, 4.5),
        statusLine('WCAG AA large text', ratio, 3),
        statusLine('WCAG AAA normal text', ratio, 7),
        statusLine('WCAG AAA large text', ratio, 4.5),
      ];
      list.innerHTML = lines.map((line) => `<li>${line}</li>`).join('');
    }

    setMessage(message, 'Updated accessibility results.');
  };

  form.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    if (target.name === 'foregroundPicker' && fgText) {
      fgText.value = target.value;
    }
    if (target.name === 'backgroundPicker' && bgText) {
      bgText.value = target.value;
    }
    if (target.name === 'foregroundHex' && fgPicker) {
      const normalized = normalizeHex(target.value);
      if (normalized) fgPicker.value = normalized;
    }
    if (target.name === 'backgroundHex' && bgPicker) {
      const normalized = normalizeHex(target.value);
      if (normalized) bgPicker.value = normalized;
    }

    render();
  });

  swap?.addEventListener('click', () => {
    if (!fgText || !bgText) return;
    const nextFg = bgText.value;
    const nextBg = fgText.value;
    fgText.value = nextFg;
    bgText.value = nextBg;
    if (fgPicker) fgPicker.value = normalizeHex(nextFg) || '#000000';
    if (bgPicker) bgPicker.value = normalizeHex(nextBg) || '#ffffff';
    render();
  });

  render();
};
