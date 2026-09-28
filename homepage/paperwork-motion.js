/* Scroll drives page geometry directly. No wheel interception, pin, or damping. */
(() => {
 'use strict';
 const host=document.querySelector('[data-paperwork-scene]');
 if(!host)return;
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 let reduced=preference.matches,near=false,scene=null,loading=false,failed=false,raf=0;
 const request=()=>{if(!raf&&!document.hidden)raf=requestAnimationFrame(draw)};
 async function load(){
  if(loading||scene||failed||reduced||!near)return;
  loading=true;
  try{
   const {createPaperworkScene}=await import('./paperwork-scene.js');
   if(reduced||!near){loading=false;return;}
   scene=createPaperworkScene(host);
   request();
  }catch(error){failed=true;host.dataset.paperworkState='fallback';console.warn('Paperwork illustration uses its still-image fallback.',error);}
  loading=false;
 }
 function draw(){
  raf=0;
  if(!scene||reduced||document.hidden)return;
  const rect=host.getBoundingClientRect();
  if(rect.bottom<=0||rect.top>=innerHeight)return;
  // A continuous reversible passage through the existing image, not extra scroll distance.
  const progress=Math.max(0,Math.min(1,(innerHeight*.93-rect.top)/(innerHeight*.79+rect.height*.8)));
  scene.render(progress);
 }
 function preferences(){
  reduced=preference.matches||!document.documentElement.classList.contains('motion-enabled');
  scene?.setEnabled(!reduced);
  if(!reduced){load();request();}
 }
 new IntersectionObserver(entries=>{
  near=entries[0].isIntersecting;
  if(near){load();request();}
 },{rootMargin:'450px 0px'}).observe(host);
 new ResizeObserver(()=>{scene?.resize();request()}).observe(host);
 addEventListener('scroll',request,{passive:true});
 addEventListener('resize',request,{passive:true});
 addEventListener('pageshow',preferences);
 document.addEventListener('visibilitychange',request);
 document.addEventListener('indem-motion-change',preferences);
 preference.addEventListener('change',preferences);
 preferences();
})();
