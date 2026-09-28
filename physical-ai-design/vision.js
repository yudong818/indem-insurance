(() => {
  'use strict';
  const page = document.querySelector('.physical-ai-approved');
  if (!page) return;
  const section = page.querySelector('.economyVision');
  if (!section) return;
  const film = section.querySelector('.visionFilm');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const control = page.querySelector('.motionControl');
  let near = false, visible = false, failed = false, playAttempt = false;
  const motionOff = () => page.classList.contains('motionOff');
  const stop = () => film.pause();
  const load = () => {
    if (film.getAttribute('src') || motionOff() || failed) return;
    film.src = innerWidth <= 760 ? film.dataset.mobile : film.dataset.desktop;
    film.preload = 'auto';
    film.load();
  };
  async function sync() {
    if (motionOff() || document.hidden || !visible || failed) { stop(); return; }
    if (!film.getAttribute('src')) load();
    if (playAttempt || !film.paused) return;
    playAttempt = true;
    film.muted = true;
    try {
      await film.play();
      if (motionOff() || document.hidden || !visible) stop();
    } catch {
      // Keep the photograph visible if the browser requires an interaction.
    } finally { playAttempt = false; }
  }
  new IntersectionObserver(entries => {
    near = entries[0].isIntersecting;
    if (near) load();
  }, {rootMargin:'450px 0px'}).observe(section);
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    sync();
  }, {threshold:0}).observe(section.querySelector('.visionCinema'));
  film.addEventListener('playing', () => film.classList.add('isPlaying'));
  film.addEventListener('loadeddata', sync);
  film.addEventListener('canplay', sync);
  film.addEventListener('error', () => { failed = true; film.classList.remove('isPlaying'); });
  document.addEventListener('visibilitychange', sync);
  addEventListener('pageshow', sync);
  addEventListener('pagehide', stop);
  document.addEventListener('pointerdown', () => { if (visible && film.paused) sync(); }, {passive:true});
  control?.addEventListener('click', () => { if (near) load(); sync(); });
  reduced.addEventListener('change', sync);
  new MutationObserver(() => { if (near) load(); sync(); })
    .observe(page, {attributes:true, attributeFilter:['class']});
})();
