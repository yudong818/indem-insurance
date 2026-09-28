/* Brand film and progressive scroll effects. No form or submission side effects. */
(() => {
  const root = document.documentElement;
  const story = document.querySelector('.cinema-story');
  const stage = document.querySelector('.cinema-stage');
  const aperture = document.querySelector('#aperture-transform');
  const photo = document.querySelector('.cinema-photo');
  const mobileMask = document.querySelector('.cinema-mobile-mask');
  const lite = matchMedia('(max-width: 900px), (pointer: coarse)').matches || Boolean(navigator.connection?.saveData);
  root.classList.toggle('cinema-lite', lite);
  photo.dataset.playback = lite ? 'single-mobile' : 'desktop-crossfade';
  const firstFilm = photo.querySelector('video');
  const films=[firstFilm];
  if(!lite){
    const standbyFilm=firstFilm.cloneNode(true);
    standbyFilm.dataset.active='false';
    standbyFilm.setAttribute('aria-hidden','true');
    photo.append(standbyFilm);
    films.push(standbyFilm);
  }
  const serviceCue=document.querySelector('.cinema-service-cue');
  const intro = document.querySelector('.cinema-intro');
  const caption = document.querySelector('.cinema-caption');
  const lifecycle = [...document.querySelectorAll('.cinema-caption .continuum li')];
  const progressLine = document.querySelector('.cinema-progress span');
  const heroPhoto = document.querySelector('.hero-fleet-viewport');
  const hero = document.querySelector('.hero');
  const heroCopy = document.querySelector('.hero-content');
  const toggle = document.querySelector('.motion-toggle');
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = preference.matches;
  let lenis = null;
  let frame = 0;
  let previousTime = 0;
  let progress = 0;
  let storyTop = 0;
  let storyRange = 1;
  let narrow = false;
  let filmVisible=false,filmNear=false,sourceLoaded=false,paintedProgress=-1,paintedHero=-1;
  let activeFilm=0, filmFrame=0, blending=false, blendTimer=0, blendVersion=0;
  let retryAfter=0, lastFilm=null, lastFilmTime=-1, lastProgressAt=0, pageActive=true;
  const pendingPlay = new Set();
  const clamp = (n, a=0, b=1) => Math.min(b, Math.max(a, n));
  const smooth = n => n*n*(3-2*n);
  // The foreground film runs continuously through the aperture and full-screen view.
  // Native looping is a fallback when the preloaded crossfade buffer is not ready.
  films.forEach(film=>{
    film.muted=true;film.defaultMuted=true;film.playsInline=true;
    film.loop=true;film.preload='none';film.autoplay=false;
  });
  const filmMayPlay=()=>sourceLoaded&&filmVisible&&!reduced&&!document.hidden&&pageActive;
  function loadFilm(){
    if(sourceLoaded||reduced||!filmNear)return;
    sourceLoaded=true;
    for(const film of films){
      film.src=lite?firstFilm.dataset.mobileSrc:firstFilm.dataset.desktopSrc;
      film.preload='auto';film.load();
    }
  }
  function queueFilmFrame(){
    if(!lite&&filmMayPlay()&&!filmFrame)filmFrame=requestAnimationFrame(watchFilm);
  }
  function stopFilm(){
    blendVersion++;
    clearTimeout(blendTimer);blendTimer=0;blending=false;
    films.forEach((film,index)=>{film.pause();film.dataset.active=String(index===activeFilm);});
    if(filmFrame){cancelAnimationFrame(filmFrame);filmFrame=0;}
  }
  function resumeFilm(force=false){
    const film=films[activeFilm];
    if(!filmMayPlay()||pendingPlay.has(film)||performance.now()<retryAfter||(!force&&!film.paused&&!film.ended))return;
    pendingPlay.add(film);
    film.muted=true;
    try{
      Promise.resolve(film.play()).then(()=>{
        if(!filmMayPlay()||film!==films[activeFilm])film.pause();
        else{retryAfter=0;queueFilmFrame();}
      }).catch(()=>{retryAfter=performance.now()+400;}).finally(()=>pendingPlay.delete(film));
    }catch{pendingPlay.delete(film);retryAfter=performance.now()+400;}
  }
  function syncFilm(){
    loadFilm();
    if(!filmMayPlay()){stopFilm();return;}
    resumeFilm();
    queueFilmFrame();
  }
  function blendFilm(){
    const previous=films[activeFilm],nextIndex=1-activeFilm,next=films[nextIndex];
    if(blending||next.readyState<2||performance.now()<retryAfter)return;
    const version=++blendVersion;
    blending=true;
    const abandon=()=>{
      if(version!==blendVersion)return;
      blendVersion++;clearTimeout(blendTimer);blendTimer=0;blending=false;
      if(next!==films[activeFilm])next.pause();
      retryAfter=performance.now()+400;
      queueFilmFrame();
    };
    // A delayed play promise must never leave the transition permanently locked.
    blendTimer=setTimeout(abandon,1500);
    try{
      next.currentTime=0;next.muted=true;
      Promise.resolve(next.play()).then(()=>{
        if(version!==blendVersion||!filmMayPlay()){
          if(next!==films[activeFilm])next.pause();
          return;
        }
        clearTimeout(blendTimer);
        activeFilm=nextIndex;
        next.dataset.active='true';previous.dataset.active='false';
        photo.dataset.loops=String(Number(photo.dataset.loops)+1);
        blendTimer=setTimeout(()=>{
          if(version!==blendVersion)return;
          previous.pause();previous.currentTime=0;
          blendTimer=0;blending=false;syncFilm();
        },200);
      }).catch(abandon);
    }catch{abandon();}
  }
  function watchFilm(time){
    filmFrame=0;
    if(!filmMayPlay())return;
    const current=films[activeFilm];
    serviceCue.dataset.active=String(current.currentTime>=1.6&&current.currentTime<=4.8);
    if(current!==lastFilm||Math.abs(current.currentTime-lastFilmTime)>.001){
      lastFilm=current;lastFilmTime=current.currentTime;lastProgressAt=time;
    }else if(time-lastProgressAt>2500&&!current.seeking&&current.readyState>=2){
      lastProgressAt=time;resumeFilm(true);
    }
    if(current.paused||current.ended)resumeFilm();
    if(Number.isFinite(current.duration)&&current.duration>0&&current.duration-current.currentTime<.22)blendFilm();
    queueFilmFrame();
  }
  films.forEach(film=>{
    ['loadeddata','canplay','playing'].forEach(event=>film.addEventListener(event,syncFilm));
    film.addEventListener('pause',()=>{if(film===films[activeFilm]&&filmMayPlay())queueFilmFrame();});
    film.addEventListener('ended',()=>{
      if(film===films[activeFilm]&&filmMayPlay()){film.currentTime=0;syncFilm();}
    });
    if(lite)film.addEventListener('timeupdate',()=>{
      const active=String(film.currentTime>=1.6&&film.currentTime<=4.8);
      if(serviceCue.dataset.active!==active)serviceCue.dataset.active=active;
    });
  });
  new IntersectionObserver(entries=>{
    filmNear=entries[0].isIntersecting;
    if(filmNear)loadFilm();
  },{rootMargin:'300px 0px'}).observe(stage);
  new IntersectionObserver(entries=>{
    filmVisible=entries[0].isIntersecting;
    photo.dataset.visible=String(filmVisible);
    syncFilm();
  }).observe(stage);
  document.addEventListener('visibilitychange',()=>{retryAfter=0;syncFilm();});
  window.addEventListener('pageshow',()=>{pageActive=true;retryAfter=0;syncFilm();});
  window.addEventListener('pagehide',()=>{pageActive=false;stopFilm();});
  window.addEventListener('focus',()=>{retryAfter=0;syncFilm();});
  ['pointerdown','keydown'].forEach(event=>document.addEventListener(event,()=>{retryAfter=0;syncFilm();},{passive:true}));
  // Recover browser suspension even when it does not emit a new intersection event.
  if(!lite)setInterval(()=>{if(filmMayPlay())syncFilm();},1000);

  const revealElements = document.querySelectorAll('.section-heading,.fleet-type,.approach-copy,.steps,.editorial-note,.principles article,.resource,.start-layout,[data-scroll-reveal]');
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if(entry.isIntersecting){entry.target.classList.add('in-view');observer.unobserve(entry.target);}
  }),{threshold:.12});
  revealElements.forEach(element=>{element.classList.add('reveal');observer.observe(element);});

  function measure(){
    storyTop = story.getBoundingClientRect().top + window.scrollY;
    storyRange = Math.max(1,story.offsetHeight - stage.offsetHeight);
    narrow = window.innerWidth < 680;
    paintedProgress=-1;paintedHero=-1;
    requestFrame();
  }

  function paint(value){
    const heroProgress=clamp(window.scrollY/Math.max(1,hero.offsetHeight));
    if(!lite&&heroProgress!==paintedHero){
      heroPhoto.style.setProperty('--hero-scroll-y',`${heroProgress*65}px`);
      heroCopy.style.setProperty('--hero-copy-y',`${heroProgress*-22}px`);
      paintedHero=heroProgress;
    }
    if(value===paintedProgress)return;
    paintedProgress=value;
    const zoomProgress = smooth(clamp((value-.1)/.58));
    const startingScale = narrow ? .65 : 1.07;
    // The supplied wordmark's capital I occupies x=1254..1277, y=569..690 in the original JPEG.
    // Map its center into the SVG image coordinates; keep this point fixed throughout the reveal.
    const pivotX = 70 + 1300 * 1265.5 / 2532;
    const pivotY = 133 + 600 * 629.5 / 1170;
    const scale = startingScale * Math.pow(145/startingScale,zoomProgress);
    if(lite){
      // A pre-baked cutout stays on one composited layer; no huge SVG filter surface.
      const reveal=smooth(clamp((value-.1)/.5));
      mobileMask.style.transform=`translateZ(0) scale(${(1+reveal*.8).toFixed(4)})`;
      mobileMask.style.opacity=String(1-smooth(clamp((value-.24)/.3)));
    }else{
      aperture.setAttribute('transform',`translate(720 450) scale(${scale.toFixed(4)}) translate(${-pivotX.toFixed(4)} ${-pivotY.toFixed(4)})`);
      photo.style.transform = `scale(${(1.13-.13*value).toFixed(4)}) translateX(${((value-.5)*.65).toFixed(3)}%)`;
    }
    const introProgress = 1-smooth(clamp((value-.03)/.22));
    intro.style.opacity = String(introProgress);
    intro.style.transform = `translateY(${-value*42}px)`;
    intro.setAttribute('aria-hidden',String(introProgress<.05));
    const captionProgress = smooth(clamp((value-.63)/.17));
    caption.style.opacity = String(captionProgress);
    caption.style.transform = `translateY(${(1-captionProgress)*28}px)`;
    progressLine.style.transform = `scaleX(${value})`;
    // Invisible headings are removed from keyboard/assistive navigation during the transition.
    caption.setAttribute('aria-hidden',String(captionProgress < .05));
    lifecycle.forEach((item,index)=>item.style.setProperty('--phase',smooth(clamp((value-.7-index*.038)/.11)).toFixed(4)));
  }

  function requestFrame(){if(!frame&&!reduced)frame=requestAnimationFrame(tick);}
  function tick(time){
    frame=0;
    if(reduced)return;
    const elapsed=previousTime ? Math.min(50,time-previousTime) : 16.7;
    previousTime=time;
    const target=clamp((window.scrollY-storyTop)/storyRange);
    // A short optical lag on top of native/Lenis movement; reversible and frame-rate independent.
    progress += (target-progress)*(1-Math.exp(-elapsed/40));
    if(Math.abs(target-progress)<.0001)progress=target;
    paint(progress);
    if(Math.abs(target-progress)>.0001)requestFrame();
  }

  function setMode(nextReduced){
    reduced=nextReduced;
    if(lenis){lenis.destroy();lenis=null;}
    if(frame){cancelAnimationFrame(frame);frame=0;}
    root.classList.toggle('motion-enabled',!reduced);
    syncFilm();
    document.dispatchEvent(new CustomEvent('indem-motion-change',{detail:{reduced}}));
    toggle.setAttribute('aria-pressed',String(reduced));
    toggle.querySelector('span').textContent=reduced?'Enable motion':'Reduce motion';
    toggle.setAttribute('aria-label',reduced?'Enable motion':'Reduce motion');
    toggle.setAttribute('title',reduced?'Enable motion':'Reduce motion');
    if(reduced){
      [photo,mobileMask,intro,caption,heroPhoto,heroCopy,progressLine].forEach(element=>element.removeAttribute('style'));
      caption.removeAttribute('aria-hidden');
      intro.removeAttribute('aria-hidden');
      lifecycle.forEach(item=>item.style.removeProperty('--phase'));
      revealElements.forEach(element=>element.classList.add('in-view'));
    }else{
      if(!lite&&typeof Lenis==='function'){
        lenis=new Lenis({autoRaf:true,lerp:.14,wheelMultiplier:.95,smoothWheel:true,syncTouch:false,anchors:true,allowNestedScroll:true});
        lenis.on('scroll',requestFrame);
      }
      previousTime=0;
      measure();
      progress=clamp((window.scrollY-storyTop)/storyRange);
      paint(progress);
    }
  }
  toggle.addEventListener('click',()=>setMode(!reduced));
  preference.addEventListener('change',event=>setMode(event.matches));
  window.addEventListener('scroll',requestFrame,{passive:true});
  window.addEventListener('resize',measure,{passive:true});
  window.addEventListener('load',measure,{once:true});
  document.fonts?.ready.then(measure);
  setMode(reduced);
})();
