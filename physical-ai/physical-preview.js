/* Original Indem standalone interactions, copied for the logo-only preview. */

/* Original Indem intake fields, destination and campaign metadata are retained. */
const PilotIntake = (() => {
  'use strict';
  const page = document.querySelector('.physical-ai-approved');
  if (!page) return;
  const recipient = String.fromCharCode(121,117,100,111,110,103,64,105,110,100,101,109,105,110,115,117,114,101,46,99,111,109);
  const endpoint = 'https://formsubmit.co/ajax/' + recipient;
  async function send(data, request = fetch, signal) {
    const response = await request(endpoint, { method: 'POST', headers: { Accept: 'application/json' }, body: data, signal });
    if (!response.ok) throw new Error('Submission failed');
    const result = await response.json();
    if (result.success !== true && result.success !== 'true') throw new Error('Submission not accepted');
    return result;
  }
  if (typeof document !== 'undefined') {
    const form = page.querySelector('#pilot-form');
    const success = page.querySelector('.pilotSuccess');
    if (form && success) {
      const button = form.querySelector('.submitButton');
      const error = form.querySelector('.formError');
      const label = button.innerHTML;
      let sending = false;
      const system = form.elements.namedItem('Physical AI system');
      const dataCenterFields = form.querySelector('.dataCenterFields');
      function syncProjectFields() {
        const isDataCenter = system.value === 'Data center / AI infrastructure';
        dataCenterFields.hidden = !isDataCenter;
        dataCenterFields.disabled = !isDataCenter;
      }
      system.addEventListener('change', syncProjectFields);
      form.addEventListener('reset', () => queueMicrotask(syncProjectFields));
      page.querySelectorAll('[data-pilot-system]').forEach(link => {
        link.addEventListener('click', () => {
          if (sending) return;
          form.hidden = false;
          success.hidden = true;
          system.value = link.dataset.pilotSystem;
          syncProjectFields();
        });
      });
      syncProjectFields();
      form.addEventListener('submit', async event => {
        event.preventDefault();
        if (sending || !form.reportValidity()) return;
        const data = new FormData(form);
        if (data.get('_honey')) return;
        data.set('Campaign', 'Indem Physical AI + AI infrastructure design-partner pilot');
        if (system.value === 'Data center / AI infrastructure') {
          data.set('_subject', 'New Indem data center pilot inquiry');
        }
        data.set('Source URL', window.location.href);
        data.set('Referrer', document.referrer || 'Direct');
        const params = new URLSearchParams(window.location.search);
        for (const key of ['utm_source','utm_medium','utm_campaign','utm_content']) if (params.get(key)) data.set(key, params.get(key));
        sending = true; button.disabled = true; button.textContent = 'Sending...';
        form.setAttribute('aria-busy', 'true'); error.hidden = true;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        try {
          await send(data, fetch, controller.signal);
          form.reset(); form.hidden = true; success.hidden = false; success.focus({ preventScroll: true });
        } catch {
          error.hidden = false;
        } finally {
          clearTimeout(timeout); sending = false; button.disabled = false;
          button.innerHTML = label; form.removeAttribute('aria-busy');
        }
      });
      success.querySelector('.sendAnother').addEventListener('click', () => {
        success.hidden = true; form.hidden = false;
        form.querySelector('input[name="Full name"]').focus({ preventScroll: true });
      });
    }
  }
  return { send, endpoint };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = PilotIntake;


/* Original design.js */
(() => {
  'use strict';
  const page = document.querySelector('.physical-ai-approved');
  if (!page) return;
  const root=document.documentElement, header=page.querySelector('.header');
  const hero=page.querySelector('.hero'), heroFilm=page.querySelector('.heroFilm');
  const scenes=[...page.querySelectorAll('[data-scene]')], active=new Set();
  const progress=page.querySelector('.readingProgress');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const control=page.querySelector('.motionControl');
  const menu=page.querySelector('.menuButton');
  const records=[...page.querySelectorAll('.recordRail article')];
  const films=[...page.querySelectorAll('.scrollFilm')].map(video=>({video,scene:video.closest('[data-scene]'),target:0,loaded:false,near:false,failed:false}));
  let paused=reduced.matches, heroVisible=true, blocked=false, frame=0;
  const clamp=x=>Math.max(0,Math.min(1,x));
  const ease=(a,b,x)=>{const p=clamp((x-a)/(b-a));return p*p*(3-2*p);};

  function updateControl(){
    page.classList.toggle('motionOff',paused);
    if(!control)return;
    const off=paused||blocked;
    control.setAttribute('aria-pressed',String(off));
    control.setAttribute('aria-label',off?'Play motion':'Pause motion');
    control.querySelector('.motionLabel').textContent=off?'Play motion':'Pause motion';
  }
  async function syncHero(){
    if(paused||document.hidden||!heroVisible){heroFilm.pause();return;}
    heroFilm.muted=true;
    try{await heroFilm.play();blocked=false;}catch(error){if(error.name==='NotAllowedError')blocked=true;}
    updateControl();
  }
  function requestFrame(){if(!frame)frame=requestAnimationFrame(render);}
  function loadFilm(item){
    if(item.loaded||paused||reduced.matches||item.failed)return;
    const source=innerWidth<=760?item.video.dataset.src.replace('-scroll.mp4','-scroll-mobile.mp4'):item.video.dataset.src;
    item.loaded=true;item.video.preload='auto';item.video.src=source;item.video.load();
  }
  // Short keyframe intervals and one outstanding seek avoid building up a queue.
  // The scroll wheel remains native; we never preventDefault or add inertia.
  function seek(item){
    const v=item.video;
    if(paused||document.hidden||!item.near||item.failed||!item.loaded||v.readyState<2||v.seeking)return;
    const target=Math.min(Math.max(0,v.duration-.05),item.target);
    if(Number.isFinite(target)&&Math.abs(v.currentTime-target)>1/30)v.currentTime=target;
  }
  for(const item of films){
    item.video.addEventListener('loadeddata',()=>{item.video.classList.add('isReady');requestFrame();});
    item.video.addEventListener('seeked',()=>seek(item));
    item.video.addEventListener('error',()=>{item.failed=true;item.video.classList.remove('isReady');});
  }
  function render(){
    frame=0;
    const viewport=innerHeight,heroRect=hero.getBoundingClientRect();
    header.classList.toggle('isOnHero',heroRect.bottom>120);
    const length=root.scrollHeight-viewport;
    progress.style.transform=`scaleX(${length>0?clamp(scrollY/length):0})`;
    if(paused)return;
    for(const scene of active){
      const rect=scene.getBoundingClientRect(),type=scene.dataset.scene;
      const pinned=type==='road'||type==='passport';
      const p=pinned?clamp(-rect.top/Math.max(1,rect.height-viewport)):clamp((viewport*.85-rect.top)/(rect.height+viewport*.5));
      scene.style.setProperty('--p',p.toFixed(4));
      if(type==='road'){
        scene.style.setProperty('--open',ease(.015,.48,p).toFixed(4));
        scene.style.setProperty('--copy',ease(.27,.59,p).toFixed(4));
      }
      if(type==='passport')records.forEach((record,i)=>record.classList.toggle('isCurrent',i<=Math.min(3,Math.floor(p*4))));
      const item=films.find(f=>f.scene===scene);
      if(item){
        item.near=rect.bottom>0&&rect.top<viewport;
        item.target=p*(Number.isFinite(item.video.duration)?item.video.duration-.08:9.9);
        seek(item);
      }
    }
  }
  const sceneObserver=new IntersectionObserver(entries=>{
    for(const entry of entries){
      if(entry.isIntersecting)active.add(entry.target);else active.delete(entry.target);
      if(entry.target===hero){heroVisible=entry.isIntersecting;syncHero();}
      if(!entry.isIntersecting){const item=films.find(f=>f.scene===entry.target);if(item)item.near=false;}
    }
    requestFrame();
  },{rootMargin:'100px 0px'});
  scenes.forEach(scene=>sceneObserver.observe(scene));
  const preloader=new IntersectionObserver(entries=>{
    for(const entry of entries)if(entry.isIntersecting){const item=films.find(f=>f.scene===entry.target);if(item)loadFilm(item);}
  },{rootMargin:'900px 0px'});
  films.forEach(item=>preloader.observe(item.scene));
  control?.addEventListener('click',()=>{
    paused=blocked?false:!paused;blocked=false;updateControl();syncHero();
    if(!paused)films.forEach(item=>{const r=item.scene.getBoundingClientRect();if(r.top<innerHeight+900&&r.bottom>-900)loadFilm(item);});
    requestFrame();
  });
  function closeMenu(){header.classList.remove('menuOpen');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open navigation');}
  menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';header.classList.toggle('menuOpen',open);menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close navigation':'Open navigation');});
  header.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',closeMenu));
  addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu();});
  addEventListener('resize',()=>{if(innerWidth>760)closeMenu();requestFrame();},{passive:true});
  addEventListener('scroll',requestFrame,{passive:true});
  reduced.addEventListener('change',()=>{paused=reduced.matches;updateControl();syncHero();requestFrame();});
  document.addEventListener('visibilitychange',()=>{syncHero();requestFrame();});
  addEventListener('pageshow',()=>{syncHero();requestFrame();});
  addEventListener('pagehide',()=>heroFilm.pause());
  document.addEventListener('pointerdown',()=>{if(blocked&&!paused)syncHero();},{passive:true});
  ['loadeddata','canplay','ended'].forEach(event=>heroFilm.addEventListener(event,syncHero));
  let last=-1,stalled=0;
  setInterval(()=>{
    if(paused||document.hidden||!heroVisible){stalled=0;return;}
    if(heroFilm.paused)syncHero();
    else if(Math.abs(heroFilm.currentTime-last)<.01){if(++stalled>2){heroFilm.pause();syncHero();stalled=0;}}else stalled=0;
    last=heroFilm.currentTime;
  },2000);
  document.fonts.ready.then(requestFrame);updateControl();syncHero();requestFrame();
})();


/* Original vision.js */
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


/* Original system-hover.js */
(() => {
  'use strict';
  const page = document.querySelector('.physical-ai-approved');
  if (!page) return;
  const photos = [...page.querySelectorAll('.riskStrip .systemPhoto')];
  if (!photos.length) return;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const moving = new Set();
  let enabled = false, frame = 0, lastTime = 0;
  const spring = () => ({value:0, velocity:0, target:0});
  const items = photos.map(photo => ({photo, rect:null, inside:false,
    x:spring(), y:spring(), lift:spring(), press:spring()}));
  const clamp = n => Math.max(-1, Math.min(1, n));

  function wake(item) {
    moving.add(item);
    item.photo.classList.add('isInteracting');
    if (!frame) { lastTime = 0; frame = requestAnimationFrame(tick); }
  }
  function integrate(axis, dt, stiffness, damping) {
    axis.velocity += ((axis.target-axis.value)*stiffness-axis.velocity*damping)*dt;
    axis.value += axis.velocity*dt;
    if (Math.abs(axis.target-axis.value)<.0007 && Math.abs(axis.velocity)<.006) {
      axis.value=axis.target; axis.velocity=0; return false;
    }
    return true;
  }
  function paint(item) {
    const style=item.photo.style;
    style.setProperty('--touch-x',item.x.value.toFixed(4));
    style.setProperty('--touch-y',item.y.value.toFixed(4));
    style.setProperty('--touch-lift',item.lift.value.toFixed(4));
    style.setProperty('--touch-press',item.press.value.toFixed(4));
  }
  function tick(now) {
    frame=0;
    const dt=lastTime?Math.min((now-lastTime)/1000,1/30):1/60;
    lastTime=now;
    for (const item of moving) {
      // A short, nearly damped spring follows the pointer; a softer spring
      // returns to rest. No scroll interception or persistent idle render loop.
      const stiffness=item.inside?205:150, damping=item.inside?24:20;
      const x=integrate(item.x,dt,stiffness,damping);
      const y=integrate(item.y,dt,stiffness,damping);
      const lift=integrate(item.lift,dt,155,21);
      const press=integrate(item.press,dt,300,29);
      paint(item);
      if (!(x||y||lift||press)) {
        moving.delete(item);
        if (!item.inside) item.photo.classList.remove('isInteracting');
      }
    }
    if (moving.size) frame=requestAnimationFrame(tick);
    else lastTime=0;
  }
  function release(item) {
    item.inside=false; item.rect=null;
    item.x.target=item.y.target=item.lift.target=item.press.target=0;
    wake(item);
  }
  function track(item, event) {
    if (!enabled || event.pointerType==='touch') return;
    const r=item.rect || (item.rect=item.photo.getBoundingClientRect());
    if (!r.width || !r.height) return;
    item.inside=true;
    item.x.target=clamp((event.clientX-r.left)/r.width*2-1);
    item.y.target=clamp((event.clientY-r.top)/r.height*2-1);
    item.lift.target=1;
    wake(item);
  }
  for (const item of items) {
    item.photo.addEventListener('pointerenter',event=>{item.rect=null;track(item,event);},{passive:true});
    item.photo.addEventListener('pointermove',event=>track(item,event),{passive:true});
    item.photo.addEventListener('pointerleave',()=>{if(enabled)release(item);},{passive:true});
    item.photo.addEventListener('pointercancel',()=>{if(enabled)release(item);},{passive:true});
    item.photo.addEventListener('pointerdown',event=>{
      if (!enabled || event.pointerType==='touch' || event.button!==0) return;
      item.press.target=1;wake(item);
    },{passive:true});
  }
  function stopAll() {
    if(frame)cancelAnimationFrame(frame);
    frame=0;lastTime=0;moving.clear();
    for(const item of items) {
      item.inside=false;item.rect=null;
      for(const key of ['x','y','lift','press']) Object.assign(item[key],{value:0,velocity:0,target:0});
      item.photo.classList.remove('isInteracting');paint(item);
    }
  }
  function availability() {
    enabled=finePointer.matches&&!reduced.matches&&!page.classList.contains('motionOff');
    if(!enabled)stopAll();
    items.forEach(item=>item.photo.classList.toggle('isTactile',enabled));
  }
  document.addEventListener('pointerup',()=>{
    for(const item of items)if(item.press.target){item.press.target=0;wake(item);}
  },{passive:true});
  addEventListener('scroll',()=>{
    for(const item of items)if(item.inside)release(item);
  },{passive:true});
  addEventListener('resize',()=>{for(const item of items)item.rect=null;},{passive:true});
  addEventListener('blur',stopAll);
  addEventListener('pagehide',stopAll);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAll();});
  finePointer.addEventListener('change',availability);
  reduced.addEventListener('change',availability);
  new MutationObserver(availability).observe(page,{attributes:true,attributeFilter:['class']});
  availability();
})();


(() => { const page = document.querySelector('.physical-ai-approved'); if (page) { page.dataset.initialized = 'true'; page.dataset.ready = 'true'; } })();
