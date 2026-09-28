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
