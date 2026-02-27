import { setMessage } from './shared';

export const initCssGradientBuilder = () => {
  const form = document.getElementById('gradient-form');
  if (!form) return;

  const preview = document.getElementById('gradient-preview');
  const output = document.getElementById('gradient-output');
  const message = document.getElementById('gradient-message');
  const copyButton = document.getElementById('copy-gradient');
  const angleField = document.getElementById('angle-field');
  const angleValue = document.getElementById('angle-value');
  const stop1Value = document.getElementById('stop1-value');
  const stop2Value = document.getElementById('stop2-value');
  const stop3Value = document.getElementById('stop3-value');

  const angleInput = form.elements.namedItem('angle');
  const stop1Input = form.elements.namedItem('stop1');
  const stop2Input = form.elements.namedItem('stop2');
  const stop3Input = form.elements.namedItem('stop3');

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const inputValue = (input, fallback) => {
    if (!(input instanceof HTMLInputElement)) return fallback;
    return Number.isFinite(Number(input.value))
      ? Number(input.value)
      : fallback;
  };

  const syncStops = (changedField = '') => {
    if (
      !(stop1Input instanceof HTMLInputElement) ||
      !(stop2Input instanceof HTMLInputElement) ||
      !(stop3Input instanceof HTMLInputElement)
    ) {
      return { stop1: 0, stop2: 50, stop3: 100 };
    }

    let stop1 = clamp(inputValue(stop1Input, 0), 0, 100);
    let stop2 = clamp(inputValue(stop2Input, 50), 0, 100);
    let stop3 = clamp(inputValue(stop3Input, 100), 0, 100);

    if (changedField === 'stop1') {
      stop2 = Math.max(stop2, stop1);
      stop3 = Math.max(stop3, stop2);
    } else if (changedField === 'stop3') {
      stop2 = Math.min(stop2, stop3);
      stop1 = Math.min(stop1, stop2);
    } else {
      stop1 = Math.min(stop1, stop2);
      stop3 = Math.max(stop3, stop2);
    }

    stop1 = clamp(stop1, 0, 100);
    stop2 = clamp(stop2, stop1, 100);
    stop3 = clamp(stop3, stop2, 100);

    stop1Input.value = String(stop1);
    stop2Input.value = String(stop2);
    stop3Input.value = String(stop3);

    stop1Input.max = String(stop2);
    stop2Input.min = String(stop1);
    stop2Input.max = String(stop3);
    stop3Input.min = String(stop2);

    if (stop1Value) stop1Value.textContent = `${stop1}%`;
    if (stop2Value) stop2Value.textContent = `${stop2}%`;
    if (stop3Value) stop3Value.textContent = `${stop3}%`;

    return { stop1, stop2, stop3 };
  };

  const buildValue = (changedField = '') => {
    const data = new FormData(form);
    const type = String(data.get('gradientType') || 'linear');
    const angle = clamp(
      inputValue(angleInput, Number(data.get('angle') || 0)),
      0,
      360
    );
    const color1 = String(data.get('color1') || '#000000');
    const color2 = String(data.get('color2') || '#888888');
    const color3 = String(data.get('color3') || '#ffffff');
    const { stop1, stop2, stop3 } = syncStops(changedField);

    if (angleInput instanceof HTMLInputElement) {
      angleInput.value = String(angle);
    }
    if (angleValue) {
      angleValue.textContent = `${angle}deg`;
    }

    if (type === 'radial') {
      return `radial-gradient(circle at center, ${color1} ${stop1}%, ${color2} ${stop2}%, ${color3} ${stop3}%)`;
    }
    return `linear-gradient(${angle}deg, ${color1} ${stop1}%, ${color2} ${stop2}%, ${color3} ${stop3}%)`;
  };

  const render = (changedField = '') => {
    const data = new FormData(form);
    const type = String(data.get('gradientType') || 'linear');
    const gradient = buildValue(changedField);

    if (angleField) {
      angleField.style.display = type === 'radial' ? 'none' : '';
    }
    if (preview) {
      preview.style.backgroundImage = gradient;
    }

    if (output) {
      output.textContent = `background-image: ${gradient};`;
    }

    setMessage(message, 'Gradient preview updated.');
  };

  form.addEventListener('input', (event) => {
    const target = event.target;
    const changedField =
      target instanceof HTMLInputElement || target instanceof HTMLSelectElement
        ? target.name
        : '';
    render(changedField);
  });
  copyButton?.addEventListener('click', async () => {
    const line = output?.textContent?.trim();
    if (!line) {
      setMessage(message, 'Nothing to copy yet.', true);
      return;
    }
    try {
      await navigator.clipboard.writeText(line);
      setMessage(message, 'Copied CSS declaration.');
    } catch {
      setMessage(message, 'Copy failed. Clipboard access was blocked.', true);
    }
  });

  render();
};
