type FoldElement = HTMLElement & {
  __setOpen?: (nextOpen: boolean, animate?: boolean) => void;
};

function initTechFolds() {
  const prefersReduced = window.matchMedia?.(
    '(prefers-reduced-motion: reduce)'
  )?.matches;

  const folds = Array.from(
    document.querySelectorAll<FoldElement>('[data-tech-fold]')
  );

  for (const fold of folds) {
    if (fold.dataset.bound === 'true') continue;
    fold.dataset.bound = 'true';

    const content = fold.querySelector<HTMLElement>('.tech-fold__content');
    const btn = fold.querySelector<HTMLButtonElement>('.tech-fold__toggle');
    if (!content) continue;

    let before = new Map<string, DOMRect>();
    let frameToken = 0;

    const captureRects = () => {
      const rects = new Map<string, DOMRect>();
      const badges = content.querySelectorAll<HTMLElement>('[data-tech-key]');
      for (const badge of badges) {
        const key = badge.getAttribute('data-tech-key') || '';
        if (!key) continue;
        rects.set(key, badge.getBoundingClientRect());
      }
      return rects;
    };

    const animateFlip = (after: Map<string, DOMRect>) => {
      if (prefersReduced) return;
      const badges = content.querySelectorAll<HTMLElement>('[data-tech-key]');
      for (const badge of badges) {
        badge.getAnimations().forEach((animation) => animation.cancel());
        const key = badge.getAttribute('data-tech-key') || '';
        if (!key) continue;
        const nextRect = after.get(key);
        const prevRect = before.get(key);
        if (!nextRect || !prevRect) continue;
        const dx = prevRect.left - nextRect.left;
        const dy = prevRect.top - nextRect.top;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
        badge.animate(
          [
            { transform: `translate(${dx}px, ${dy}px)` },
            { transform: 'translate(0px, 0px)' },
          ],
          {
            duration: 420,
            easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
            fill: 'both',
          }
        );
      }
    };

    const setOpen = (nextOpen: boolean) => {
      fold.setAttribute('data-open', nextOpen ? 'true' : 'false');
      btn?.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
    };

    const setOpenAnimated = (nextOpen: boolean, animate = true) => {
      const isOpen = fold.getAttribute('data-open') === 'true';
      if (isOpen === nextOpen) return;
      const token = ++frameToken;

      if (animate) before = captureRects();
      setOpen(nextOpen);
      if (!animate) return;

      // Wait for layout to settle before animating to final positions.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (token !== frameToken) return;
          const after = captureRects();
          animateFlip(after);
        })
      );
    };

    const toggle = () => {
      const nextOpen = fold.getAttribute('data-open') !== 'true';
      setOpenAnimated(nextOpen, true);
    };

    btn?.addEventListener('click', toggle);

    // Make tag area clickable only when this fold owns a toggle.
    if (btn) {
      content.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest('a')) return;
        if (target.closest('button')) return;
        toggle();
      });
    }

    // Runtime hook for parent-driven state (used by StackCurrentRow).
    fold.__setOpen = (nextOpen: boolean, animate = true) => {
      const shouldAnimate = prefersReduced ? false : Boolean(animate);
      setOpenAnimated(Boolean(nextOpen), shouldAnimate);
    };
  }
}

initTechFolds();
