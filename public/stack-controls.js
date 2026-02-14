/* eslint-env browser */
/* global document */
(() => {
  function initStackControls() {
    const root = document.querySelector('[data-tech-view]');
    if (!root) return;

    const viewButtons = Array.from(
      root.querySelectorAll('[data-tech-view-btn]')
    );

    const applyView = (view) => {
      root.setAttribute('data-tech-view', view);
      for (const b of viewButtons) {
        b.setAttribute(
          'data-active',
          b.getAttribute('data-tech-view-btn') === view ? 'true' : 'false'
        );
      }
    };

    for (const b of viewButtons) {
      b.addEventListener('click', () =>
        applyView(b.getAttribute('data-tech-view-btn'))
      );
    }

    applyView(root.getAttribute('data-tech-view') || 'flat');
  }

  initStackControls();
})();
