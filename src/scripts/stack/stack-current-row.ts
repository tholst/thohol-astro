type FoldElement = HTMLElement & {
  __setOpen?: (nextOpen: boolean, animate?: boolean) => void;
};

function initStackRows() {
  const rows = Array.from(
    document.querySelectorAll<HTMLElement>('[data-stack-row]')
  );

  for (const row of rows) {
    if (row.dataset.bound === 'true') continue;
    row.dataset.bound = 'true';

    const btn = row.querySelector<HTMLButtonElement>('[data-row-toggle]');
    const panel = row.querySelector<HTMLElement>('[data-row-panel]');
    const fold = row.querySelector<FoldElement>('[data-tech-fold]');
    const summary = row.querySelector<HTMLElement>('.row-summary');
    if (!btn || !panel) continue;

    const hasDetails = row.getAttribute('data-has-details') === 'true';
    const prefersReduced = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    )?.matches;
    let frameToken = 0;
    let panelAnimation: Animation | null = null;

    const cancelPanelAnimation = () => {
      if (!panelAnimation) return;
      panelAnimation.cancel();
      panelAnimation = null;
    };

    const finishPanelStyles = () => {
      panel.style.height = '';
      panel.style.overflow = '';
    };

    const captureSummaryRects = () => {
      const targets = [
        summary?.querySelector<HTMLElement>('.row-left'),
        summary?.querySelector<HTMLElement>('.row-peek'),
      ].filter((el): el is HTMLElement => Boolean(el));
      const rects = new Map<HTMLElement, DOMRect>();
      for (const el of targets) {
        rects.set(el, el.getBoundingClientRect());
      }
      return rects;
    };

    const animateSummaryFlip = (beforeRects: Map<HTMLElement, DOMRect>) => {
      if (prefersReduced) return;
      for (const [el, before] of beforeRects.entries()) {
        el.getAnimations().forEach((animation) => animation.cancel());
        const after = el.getBoundingClientRect();
        const dx = before.left - after.left;
        const dy = before.top - after.top;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
        el.animate(
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

    const animatePanel = (nextOpen: boolean, animate = true) => {
      const showPanel = nextOpen && hasDetails;
      cancelPanelAnimation();

      if (!showPanel) {
        if (!animate || prefersReduced) {
          panel.hidden = true;
          panel.setAttribute('aria-hidden', 'true');
          panel.style.display = 'none';
          finishPanelStyles();
          return;
        }

        const fromHeight =
          panel.getBoundingClientRect().height || panel.scrollHeight;
        if (fromHeight <= 0) {
          panel.hidden = true;
          panel.setAttribute('aria-hidden', 'true');
          panel.style.display = 'none';
          finishPanelStyles();
          return;
        }

        panel.hidden = false;
        panel.setAttribute('aria-hidden', 'false');
        panel.style.display = 'grid';
        panel.style.overflow = 'hidden';
        panel.style.height = `${fromHeight}px`;

        panelAnimation = panel.animate(
          [{ height: `${fromHeight}px` }, { height: '0px' }],
          {
            duration: 360,
            easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
            fill: 'forwards',
          }
        );
        panelAnimation.onfinish = () => {
          panel.hidden = true;
          panel.setAttribute('aria-hidden', 'true');
          panel.style.display = 'none';
          finishPanelStyles();
          panelAnimation = null;
        };
        panelAnimation.oncancel = () => {
          panelAnimation = null;
        };
        return;
      }

      panel.hidden = false;
      panel.setAttribute('aria-hidden', 'false');
      panel.style.display = 'grid';

      if (!animate || prefersReduced) {
        finishPanelStyles();
        return;
      }

      panel.style.overflow = 'hidden';
      const fromHeight = panel.getBoundingClientRect().height;
      panel.style.height = 'auto';
      const toHeight = panel.scrollHeight;
      panel.style.height = `${fromHeight || 0}px`;

      panelAnimation = panel.animate(
        [{ height: `${fromHeight || 0}px` }, { height: `${toHeight}px` }],
        {
          duration: 380,
          easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
          fill: 'forwards',
        }
      );
      panelAnimation.onfinish = () => {
        finishPanelStyles();
        panelAnimation = null;
      };
      panelAnimation.oncancel = () => {
        panelAnimation = null;
      };
    };

    const setOpen = (nextOpen: boolean, animate = true) => {
      const token = ++frameToken;
      const shouldAnimate = animate && !prefersReduced;
      const beforeRects = shouldAnimate ? captureSummaryRects() : undefined;

      row.setAttribute('data-open', nextOpen ? 'true' : 'false');
      btn.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
      animatePanel(nextOpen, shouldAnimate);

      if (fold && typeof fold.__setOpen === 'function') {
        fold.__setOpen(nextOpen, animate);
      } else if (fold) {
        fold.setAttribute('data-open', nextOpen ? 'true' : 'false');
      }

      if (beforeRects && shouldAnimate) {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (token !== frameToken) return;
            animateSummaryFlip(beforeRects);
          })
        );
      }
    };

    btn.addEventListener('click', () => {
      const isOpen = row.getAttribute('data-open') === 'true';
      setOpen(!isOpen, true);
    });

    const mediaDialog = row.querySelector<HTMLDialogElement>(
      '[data-media-dialog]'
    );
    const mediaImage = row.querySelector<HTMLImageElement>(
      '[data-media-dialog-image]'
    );
    const mediaCaption = row.querySelector<HTMLElement>(
      '[data-media-dialog-caption]'
    );
    const mediaClose =
      row.querySelector<HTMLButtonElement>('[data-media-close]');
    const mediaOpenButtons = Array.from(
      row.querySelectorAll<HTMLButtonElement>('[data-media-open]')
    );

    if (mediaDialog && mediaImage && mediaCaption && mediaOpenButtons.length) {
      const openMedia = (src: string, alt: string, caption = '') => {
        mediaImage.setAttribute('src', src);
        mediaImage.setAttribute('alt', alt);
        if (caption) {
          mediaCaption.textContent = caption;
          mediaCaption.hidden = false;
        } else {
          mediaCaption.textContent = '';
          mediaCaption.hidden = true;
        }
        if (typeof mediaDialog.showModal === 'function') {
          mediaDialog.showModal();
        } else {
          mediaDialog.setAttribute('open', 'true');
        }
      };

      const closeMedia = () => {
        if (typeof mediaDialog.close === 'function') mediaDialog.close();
        else mediaDialog.removeAttribute('open');
      };

      for (const button of mediaOpenButtons) {
        button.addEventListener('click', () => {
          const src = button.getAttribute('data-media-src') || '';
          const alt = button.getAttribute('data-media-alt') || '';
          const caption = button.getAttribute('data-media-caption') || '';
          if (!src) return;
          openMedia(src, alt, caption);
        });
      }

      mediaClose?.addEventListener('click', closeMedia);
      mediaDialog.addEventListener('click', (event) => {
        if (event.target === mediaDialog) closeMedia();
      });
      mediaDialog.addEventListener('cancel', () => {
        mediaImage.setAttribute('src', '');
      });
      mediaDialog.addEventListener('close', () => {
        mediaImage.setAttribute('src', '');
      });
    }

    if (summary) {
      summary.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest('button')) return;
        if (target.closest('a')) return;
        if (target.closest('[data-tech-fold]')) return;
        if (!target.closest('.row-left')) return;
        const isOpen = row.getAttribute('data-open') === 'true';
        setOpen(!isOpen, true);
      });
    }

    // Defensive initialization: start collapsed on first paint.
    setOpen(false, false);
  }
}

initStackRows();
