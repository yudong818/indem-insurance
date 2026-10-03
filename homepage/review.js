/* Homepage navigation, slideshow, and illustrative workflow. Application submission is handled by React. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const menu = document.querySelector('.menu-button');
  const nav = document.querySelector('.site-nav');
  const products = nav.querySelector('.products-nav');
  const closeProducts = () => { products.open = false; };
  const closeMenu = () => {
    closeProducts();
    nav.classList.remove('is-open');
    document.body.classList.remove('menu-open');
    menu.setAttribute('aria-expanded','false');
    menu.setAttribute('aria-label','Open navigation');
  };
  menu.addEventListener('click', () => {
    const open = !nav.classList.contains('is-open');
    closeProducts();
    nav.classList.toggle('is-open',open); document.body.classList.toggle('menu-open',open); menu.setAttribute('aria-expanded',String(open));
    menu.setAttribute('aria-label',open?'Close navigation':'Open navigation');
  });
  nav.addEventListener('click',event=>{if(event.target.closest('a'))closeMenu();});
  products.addEventListener('focusout',event=>{
    if(!products.contains(event.relatedTarget))closeProducts();
  });
  document.addEventListener('pointerdown',event=>{
    if(!products.contains(event.target))closeProducts();
  });
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    if(products.open){
      closeProducts();
      products.querySelector('summary').focus();
      event.preventDefault();
    } else if(nav.classList.contains('is-open')){
      closeMenu();
      menu.focus();
      event.preventDefault();
    }
  });
  matchMedia('(max-width: 820px)').addEventListener('change',closeMenu);

  const gallery = document.querySelector('.hero-fleet-gallery');
  const slides = [...gallery.querySelectorAll('.hero-fleet-slide')];
  const hero = document.querySelector('.hero');
  const pauseIcon = '<path d="M8 5v14M16 5v14"/>';
  const playIcon = '<path d="m8 5 11 7-11 7Z"/>';
  let scene = 0, playing = false, motionReduced = reduced.matches, timer;
  const sceneDwell = ()=>scene===0 ? 7600 : 6800;
  function showScene(index){
    const previousScene=scene;
    const previousPhoto=slides[previousScene].querySelector('img');
    if(previousPhoto)previousPhoto.style.setProperty('--held-transform',getComputedStyle(previousPhoto).transform);
    scene = (index+slides.length)%slides.length;
    if(previousScene!==scene)hero.dataset.transitioned='true';
    slides.forEach((slide,i)=>{slide.dataset.leaving=String(i===previousScene&&i!==scene);slide.dataset.active=String(i===scene);slide.setAttribute('aria-hidden',String(i!==scene));});
    hero.dataset.fleet=slides[scene].dataset.fleet;
    gallery.style.setProperty('--scene-duration',sceneDwell()+'ms');
    slides.forEach((slide,i)=>slide.setAttribute('aria-label',`${i+1} of ${slides.length}`));
  }
  function scheduleScene(){
    clearTimeout(timer);
    if(!playing||document.hidden)return;
    timer=setTimeout(()=>{
      if(hero.getBoundingClientRect().bottom>0)showScene(scene+1);
      scheduleScene();
    },sceneDwell());
  }
  function syncPlaying(){
    playing=!motionReduced;
    gallery.dataset.playing=String(playing); gallery.dataset.motion=String(!motionReduced);
    scheduleScene();
  }
  document.addEventListener('visibilitychange',scheduleScene);
  new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting))scheduleScene();},{threshold:.2}).observe(hero);
  showScene(0);
  syncPlaying();
  // Begin the opening once its photograph has decoded, keeping the content usable throughout.
  const openingPhoto=slides[0].querySelector('img');
  const beginOpening=()=>{
    hero.dataset.ready='true';
    hero.dataset.opening='true';
    scheduleScene();
    setTimeout(()=>hero.dataset.opening='false',2400);
  };
  if(openingPhoto.decode)openingPhoto.decode().then(beginOpening).catch(beginOpening);
  else if(openingPhoto.complete)beginOpening();
  else openingPhoto.addEventListener('load',beginOpening,{once:true});
  const marquee=document.querySelector('.partner-marquee');
  const partnerPause=document.querySelector('.partner-motion-button');
  partnerPause.addEventListener('click',()=>{
    const paused=marquee.dataset.paused!=='true';marquee.dataset.paused=String(paused);
    partnerPause.setAttribute('aria-pressed',String(paused));
    partnerPause.setAttribute('aria-label',paused?'Play scrolling':'Pause scrolling');
    partnerPause.title=paused?'Play scrolling':'Pause scrolling';
    partnerPause.querySelector('svg').innerHTML=paused?playIcon:pauseIcon;
  });
  if(reduced.matches){marquee.dataset.paused='true';partnerPause.setAttribute('aria-pressed','true');partnerPause.setAttribute('aria-label','Play scrolling');partnerPause.querySelector('svg').innerHTML=playIcon;}

  // These states and strings are copied from the original homepage's public interaction data.
  const states=[
    {metrics:[['Vehicle state','Ready'],['Records','18 linked'],['Open items','2']],title:'Submission queue',items:[['Vehicle schedule','14 records verified','Ready'],['Loss history','Two details requested','Review'],['Market submission','Licensed approval required','Queued']]},
    {metrics:[['Policy state','Active'],['Vehicles','14'],['Open items','1']],title:'Service queue',items:[['Vehicle addition','Supporting records linked','Review'],['Certificate request','Recipient details verified','Ready'],['Renewal preparation','118 days remaining','Tracking']]},
    {metrics:[['Claim state','Evidence'],['Sources','11 linked'],['Open items','3']],title:'Evidence queue',items:[['Damage timeline','Trip and photos aligned','Ready'],['Repair estimate','Supplement expected','Open'],['Loss package','Licensed review required','Review']]}
  ];
  const tabs=[...document.querySelectorAll('.segmented-control button')];
  tabs.forEach((button,index)=>button.addEventListener('click',()=>{
    tabs.forEach((tab,i)=>tab.setAttribute('aria-pressed',String(index===i)));
    document.querySelectorAll('.risk-summary>div').forEach((metric,i)=>{metric.querySelector('span').textContent=states[index].metrics[i][0];metric.querySelector('strong').textContent=states[index].metrics[i][1];});
    document.querySelector('.risk-queue-title span').textContent=states[index].title;
    document.querySelectorAll('.risk-event').forEach((item,i)=>{
      item.querySelector('strong').textContent=states[index].items[i][0];item.querySelector('small').textContent=states[index].items[i][1];item.querySelector('.event-state').textContent=states[index].items[i][2];
      if(!reduced.matches)item.animate([{opacity:.35,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:380,delay:i*45,easing:'cubic-bezier(.16,1,.3,1)'});
    });
  }));

  // One coherent scroll rhythm: generous workflow spacing, a steady account panel, and quiet image depth.
  const steps=[...document.querySelectorAll('.workflow-steps li')];
  const pictures=[...document.querySelectorAll('.trucking-gallery figure,.claims-image-wrap,.problem-evidence-image')];
  let pending=false;
  function updateDepth(){
    pending=false;
    if(reduced.matches||!document.documentElement.classList.contains('motion-enabled'))return;
    const vh=window.innerHeight;
    let current=null,nearest=Infinity;
    steps.forEach(step=>{const box=step.getBoundingClientRect();const distance=Math.abs(box.top+box.height/2-vh*.47);if(box.bottom>0&&box.top<vh&&distance<nearest){nearest=distance;current=step;}});
    steps.forEach(step=>step.classList.toggle('is-current',step===current));
    pictures.forEach(figure=>{const box=figure.getBoundingClientRect();if(box.bottom<0||box.top>vh)return;const position=Math.max(-1,Math.min(1,(box.top+box.height/2-vh/2)/vh));figure.style.setProperty('--image-depth',`${position*-26}px`);});
  }
  addEventListener('scroll',()=>{if(!pending){pending=true;requestAnimationFrame(updateDepth);}},{passive:true});
  reduced.addEventListener('change',event=>{motionReduced=event.matches;syncPlaying();if(event.matches)pictures.forEach(figure=>figure.style.removeProperty('--image-depth'));});
  document.addEventListener('indem-motion-change',event=>{
    motionReduced=event.detail.reduced;syncPlaying();
    marquee.dataset.paused=String(motionReduced);partnerPause.setAttribute('aria-pressed',String(motionReduced));
    partnerPause.setAttribute('aria-label',motionReduced?'Play scrolling':'Pause scrolling');partnerPause.querySelector('svg').innerHTML=motionReduced?playIcon:pauseIcon;
    if(motionReduced)pictures.forEach(figure=>figure.style.removeProperty('--image-depth'));
  });
  updateDepth();
})();
