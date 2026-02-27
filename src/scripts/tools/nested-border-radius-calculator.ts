import { setMessage } from './shared';

export const initNestedBorderRadiusCalculator = () => {
  const form = document.getElementById('radius-form');
  if (!form) return;

  const outerInput = document.getElementById('radius-outer');
  const insetInput = document.getElementById('radius-inset');
  const innerInput = document.getElementById('radius-inner');
  const outerValue = document.getElementById('radius-outer-value');
  const insetValue = document.getElementById('radius-inset-value');
  const innerValue = document.getElementById('radius-inner-value');
  const cssOutput = document.getElementById('radius-css');
  const message = document.getElementById('radius-message');

  const cardOuters = Array.from(document.querySelectorAll('.demo-card-outer'));
  const cardInners = Array.from(document.querySelectorAll('.demo-card-inner'));

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const readNumber = (input, fallback) => {
    if (!(input instanceof HTMLInputElement)) return fallback;
    const next = Number(input.value);
    return Number.isFinite(next) ? next : fallback;
  };

  let driver = 'outer';

  const render = (changed = 'outer') => {
    if (changed === 'outer' || changed === 'inner') driver = changed;

    let outer = clamp(readNumber(outerInput, 24), 0, 180);
    const inset = clamp(readNumber(insetInput, 8), 0, 80);
    let inner = clamp(readNumber(innerInput, 16), 0, 180);

    if (changed === 'outer') {
      inner = outer <= inset ? 0 : outer - inset;
    } else if (changed === 'inner') {
      outer = inner + inset;
    } else if (changed === 'inset') {
      if (driver === 'inner') {
        outer = inner + inset;
      } else {
        inner = outer <= inset ? 0 : outer - inset;
      }
    } else if (driver === 'inner') {
      outer = inner + inset;
    } else {
      inner = outer <= inset ? 0 : outer - inset;
    }

    outer = clamp(outer, 0, 180);
    inner = clamp(inner, 0, 180);

    if (outerInput instanceof HTMLInputElement)
      outerInput.value = String(outer);
    if (insetInput instanceof HTMLInputElement)
      insetInput.value = String(inset);
    if (innerInput instanceof HTMLInputElement)
      innerInput.value = String(inner);
    if (outerValue) outerValue.textContent = `${outer}px`;
    if (insetValue) insetValue.textContent = `${inset}px`;
    if (innerValue) innerValue.textContent = `${inner}px`;

    const cardSize = clamp(Math.round((outer + inset + 24) * 8), 720, 2200);

    for (const cardOuter of cardOuters) {
      cardOuter.style.borderRadius = `${outer}px`;
      cardOuter.style.setProperty('--card-inset', `${inset}px`);
      cardOuter.style.setProperty('--card-size', `${cardSize}px`);
      const preview = cardOuter.closest('.radius-zoom');
      const scale = Number(preview?.getAttribute('data-scale') || '1');
      const safeScale = Number.isFinite(scale) ? scale : 1;
      cardOuter.style.setProperty('--card-scale', String(safeScale));
    }

    for (const cardInner of cardInners) {
      cardInner.style.borderRadius = `${inner}px`;
    }

    if (cssOutput) {
      cssOutput.textContent =
        `/* Formula */\n` +
        `innerRadius = max(outerRadius - inset, 0);\n` +
        `outerRadius = innerRadius + inset;\n\n` +
        `/* Corner-matched nested card */\n` +
        `.outer { border-radius: ${outer}px; padding: ${inset}px; }\n` +
        `.inner { border-radius: ${inner}px; }`;
    }

    setMessage(
      message,
      `Computed inner radius ${inner}px from outer ${outer}px with ${inset}px inset.`
    );
  };

  form.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.name === 'outerRadius') render('outer');
    else if (target.name === 'innerRadius') render('inner');
    else if (target.name === 'inset') render('inset');
    else render(driver);
  });
  window.addEventListener('resize', () => render(driver));
  render('outer');
};
