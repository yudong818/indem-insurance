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
      await load(`/homepage/${file}?v=20260928-v4`);
    }
    document.querySelector('.homepage-shell').dataset.ready = 'true';
  }
  start().catch(() => {
    document.documentElement.classList.remove('motion-enabled');
    document.querySelectorAll('.reveal').forEach(element => element.classList.add('in-view'));
  });
})();
