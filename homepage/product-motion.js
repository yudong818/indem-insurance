/* Continuity inspection motion only; the fleet chapter remains static. */
(() => {
 'use strict';
 const sections=[...document.querySelectorAll('[data-product-scene="inspection"]')];
 if(!sections.length)return;
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 const desktop=matchMedia('(min-width:1001px) and (min-height:680px)');
 const clamp=n=>Math.max(0,Math.min(1,n));
 const scenes=sections.map(section=>({section,pin:section.querySelector('.product-pin'),video:section.querySelector('.product-scroll-film'),loupe:section.querySelector('.inspection-loupe'),records:[...section.querySelectorAll('[data-record]')],points:[...section.querySelectorAll('.claims-points>div')],near:false,visible:false,loaded:false,failed:false,target:0}));
 let reduced=preference.matches||!document.documentElement.classList.contains('motion-enabled'),raf=0;
 const request=()=>{if(!raf&&!document.hidden)raf=requestAnimationFrame(render)};
 function load(scene){
  if(!scene.video||scene.loaded||scene.failed||reduced)return;
  scene.loaded=true;
  scene.video.src=innerWidth<=700?scene.video.dataset.mobileSrc:scene.video.dataset.src;
  scene.video.preload='auto';scene.video.load();
 }
 function seek(scene){
  const v=scene.video;
  if(!v||reduced||document.hidden||!scene.visible||v.readyState<2||v.seeking||scene.failed)return;
  const t=scene.target*Math.max(0,v.duration-.06);
  if(Number.isFinite(t)&&Math.abs(v.currentTime-t)>1/32)v.currentTime=t;
 }
 function measure(){
  reduced=preference.matches||!document.documentElement.classList.contains('motion-enabled');
  for(const scene of scenes){
   scene.section.classList.remove('product-scroll-ready');
   if(!reduced&&desktop.matches&&scene.pin.getBoundingClientRect().height<=innerHeight+2)scene.section.classList.add('product-scroll-ready');
   if(reduced){
    scene.video?.classList.remove('is-ready');
    if(scene.loupe)scene.loupe.style.opacity='0';
    scene.records.forEach(el=>el.classList.remove('is-current'));
    scene.points.forEach(el=>el.classList.add('is-current'));
   }
   else if(scene.video?.readyState>=2)scene.video.classList.add('is-ready');
   if(scene.near)load(scene);
  }
  request();
 }
 function render(){
  raf=0;if(document.hidden)return;
  for(const scene of scenes){
   const rect=scene.section.getBoundingClientRect();
   scene.visible=rect.bottom>0&&rect.top<innerHeight;
   if(!scene.visible)continue;
   let p;
   if(scene.section.classList.contains('product-scroll-ready'))p=clamp(-rect.top/Math.max(1,rect.height-scene.pin.offsetHeight));
   else {
    const anchor=(scene.video?.closest('figure')||scene.loupe?.closest('figure')||scene.section).getBoundingClientRect();
    p=clamp((innerHeight*.86-anchor.top)/(innerHeight*.65+anchor.height));
   }
   if(reduced)p=0;
   scene.section.style.setProperty('--scene-p',p.toFixed(4));
   scene.target=clamp((p-.03)/.91);
   scene.records.forEach((el,i)=>el.classList.toggle('is-current',!reduced&&i===Math.min(scene.records.length-1,Math.floor(p*scene.records.length))));
   scene.points.forEach((el,i)=>el.classList.toggle('is-current',reduced||p>=i*.28));
   if(scene.loupe){
    const reveal=reduced?0:clamp((p-.12)/.24);
    scene.loupe.style.opacity=String(reveal);
    scene.loupe.style.transform=`translate(calc(-50% + ${(p-.5)*34}px),calc(-50% + ${(p-.5)*-14}px)) scale(${.86+.14*reveal})`;
   }
   seek(scene);
  }
 }
 const observer=new IntersectionObserver(entries=>{
  for(const entry of entries){const scene=scenes.find(s=>s.section===entry.target);scene.near=entry.isIntersecting;if(scene.near)load(scene);}
  request();
 },{rootMargin:'650px 0px'});
 for(const scene of scenes){
  observer.observe(scene.section);
  if(scene.video){
   scene.video.addEventListener('loadeddata',()=>{if(!reduced)scene.video.classList.add('is-ready');request();});
   scene.video.addEventListener('seeked',()=>seek(scene));
   scene.video.addEventListener('error',()=>{scene.failed=true;scene.video.classList.remove('is-ready')});
  }
 }
 addEventListener('scroll',request,{passive:true});
 addEventListener('resize',measure,{passive:true});
 addEventListener('pageshow',()=>{measure();request()});
 document.addEventListener('visibilitychange',request);
 document.addEventListener('indem-motion-change',measure);
 preference.addEventListener('change',measure);
 document.fonts.ready.then(measure);
 measure();
})();
