// Run the approved motion controllers after React has hydrated the homepage.
(() => {
  if (window.indemHomepageStarted) return;
  window.indemHomepageStarted = true;
  async function load(src) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.body.append(script);
    });
  }
  async function start() {
    for (const file of ['assets/lenis.min.js', 'review.js', 'heading-accents.js', 'motion.js', 'product-motion.js', 'narrative-scroll.js', 'paperwork-motion.js']) {
      if (file === 'assets/lenis.min.js' && (matchMedia('(max-width: 900px), (pointer: coarse)').matches || navigator.connection?.saveData)) continue;
      await load(`/homepage/${file}?v=${file === 'review.js' ? '20261002-products' : '20260928-mobile-film'}`);
    }
    document.querySelector('.homepage-shell').dataset.ready = 'true';
  }
  start().catch(() => {
    document.documentElement.classList.remove('motion-enabled');
    document.querySelectorAll('.reveal').forEach(element => element.classList.add('in-view'));
  });
})();
