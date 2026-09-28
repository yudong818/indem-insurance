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
