/* Color follows reading position. No wheel handler, layout changes, pinning or media. */
(() => {
 'use strict';
 const blocks=[...document.querySelectorAll('[data-scroll-narrative]')].map(element=>({element,steps:[...element.querySelectorAll('[data-narrative-step]')],active:-1}));
 if(!blocks.length)return;
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 let frame=0;
 const request=()=>{if(!frame&&!document.hidden)frame=requestAnimationFrame(render)};
 function render(){
  frame=0;
  const reduced=preference.matches||!document.documentElement.classList.contains('motion-enabled');
  const readingLine=innerHeight*.44;
  for(const block of blocks){
   const rect=block.element.getBoundingClientRect();
   if(!reduced&&(rect.bottom<0||rect.top>innerHeight))continue;
   let active=0,nearest=Infinity;
   if(!reduced)block.steps.forEach((step,i)=>{
    const box=step.getBoundingClientRect(),distance=Math.abs(box.top+box.height/2-readingLine);
    if(distance<nearest){nearest=distance;active=i;}
   });
   if(active===block.active)continue;
   block.active=active;
   block.steps.forEach((step,i)=>step.classList.toggle('is-reading',i===active));
  }
 }
 addEventListener('scroll',request,{passive:true});
 addEventListener('resize',request,{passive:true});
 addEventListener('pageshow',request);
 document.addEventListener('visibilitychange',request);
 document.addEventListener('indem-motion-change',request);
 preference.addEventListener('change',request);
 document.fonts.ready.then(request);
 request();
})();
