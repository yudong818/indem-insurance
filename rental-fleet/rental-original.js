/* Static copy of Indem's original Rental Fleet page. The original public motion
 * controllers are retained locally; the new logo replaces the original aperture without changing its scroll reveal. */
(() => {
  'use strict';
  if (window.indemHomepageStarted) return;
  window.indemHomepageStarted = true;
  async function load(file) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/rental-fleet/original-js/' + file + '?v=20261024i';
      script.onload = resolve; script.onerror = reject;
      document.body.append(script);
    });
  }
  (async () => {
    for (const file of ['lenis.min.js', 'review.js', 'heading-accents.js', 'motion.js', 'product-motion.js', 'narrative-scroll.js', 'paperwork-motion.js']) {
      if (file === 'lenis.min.js' && (matchMedia('(max-width:900px), (pointer:coarse)').matches || navigator.connection?.saveData)) continue;
      await load(file);
    }
    document.querySelector('.homepage-shell').dataset.ready = 'true';
  })().catch(error => {
    document.documentElement.classList.remove('motion-enabled');
    document.querySelectorAll('.reveal').forEach(element => element.classList.add('in-view'));
    console.warn('Rental Fleet motion uses the original static fallback.', error);
  });
})();
