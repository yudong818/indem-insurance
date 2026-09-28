// Initialize the imported page only after its server-rendered markup is hydrated.
(() => {
  const page = document.querySelector('.physical-ai-approved');
  if (!page || page.dataset.initialized) return;
  page.dataset.initialized = 'true';
  async function start() {
    for (const file of ['pilot.js', 'design.js', 'vision.js', 'system-hover.js']) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `/physical-ai-design/${file}?v=20260928-datacenter`;
        script.onload = resolve;
        script.onerror = reject;
        page.append(script);
      });
    }
    page.dataset.ready = 'true';
  }
  start().catch(() => {
    page.classList.add('motionOff');
    page.dataset.motionFallback = 'true';
  });
})();
