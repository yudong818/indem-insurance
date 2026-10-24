
'use strict';

// Two real films overlap on their media clocks. The outgoing film stays opaque
// until a decoded frame from the incoming film is safely on top of it.
class HeroPlaylist {
 constructor({slots,playlist,button,scene,label='opening',mobile=false,interval=5,fadeDuration=.6,reduced=false,
  document:doc=globalThis.document,raf=globalThis.requestAnimationFrame.bind(globalThis),
  cancelRaf=globalThis.cancelAnimationFrame.bind(globalThis),now=()=>performance.now()}) {
  this.slots=slots;this.playlist=playlist;this.button=button;this.scene=scene;this.label=label;
  this.doc=doc;this.raf=raf;this.cancelRaf=cancelRaf;this.now=now;
  this.mobile=mobile;this.interval=interval;this.fadeDuration=fadeDuration;
  this.reduced=reduced;this.visible=false;this.manualPaused=false;this.explicitMotion=false;
  this.active=0;this.index=0;this.revealed=false;this.waiting=null;this.transition=null;
  this.frame=0;this.destroyed=false;this.epoch=0;
  this.versions=[0,0];this.presentations=[null,null];this.pending=[null,null];
  this.retryAt=[0,0];this.failed=[false,false];this.listeners=[];
  slots.forEach((v,slot)=>{
   v.muted=true;v.defaultMuted=true;v.playsInline=true;v.autoplay=false;v.loop=false;
   v.preload='auto';v.style.opacity='0';v.style.zIndex='1';
   this.listen(v,'playing',()=>this.onPlaying(slot));
   this.listen(v,'pause',()=>this.updateButton());
   this.listen(v,'ended',()=>{this.schedule();this.updateButton();});
   this.listen(v,'loadeddata',()=>{this.failed[slot]=false;this.retryAt[slot]=0;this.sync();});
   this.listen(v,'canplay',()=>this.sync());
   this.listen(v,'error',()=>this.onError(slot));
  });
  this.listen(button,'click',()=>this.isPlaying()?this.pause():this.play());
  this.load(0,0);this.load(1,1%playlist.length);
  this.scene.dataset.film=playlist[0].kind;
  this.scene.dataset.heroTransition='initial';
  this.scene.dataset.sceneInterval=String(interval);
  this.scene.dataset.fadeDuration=String(fadeDuration);
  this.updateButton();
 }
 listen(target,event,callback){target.addEventListener(event,callback);this.listeners.push([target,event,callback]);}
 canRun(){return !this.destroyed&&this.visible&&!this.doc.hidden&&!this.manualPaused&&(!this.reduced||this.explicitMotion);}
 isPlaying(){return this.canRun()&&this.slots.some((v,slot)=>this.needed(slot)&&!v.paused&&!v.ended);}
 needed(slot){return slot===this.active||slot===this.waiting?.slot||slot===this.transition?.to;}
 updateButton(){const playing=this.isPlaying();this.button.textContent=playing?'Pause film':'Play film';this.button.setAttribute('aria-label',(playing?'Pause':'Play')+' '+this.label+' film');}
 setVisible(visible){this.visible=visible;this.sync();}
 setReduced(reduced){this.reduced=reduced;this.explicitMotion=false;this.sync();}
 play(){this.manualPaused=false;this.explicitMotion=this.reduced;this.retryAt=[0,0];
  this.slots.forEach((v,slot)=>{if(this.failed[slot]&&this.needed(slot)){this.failed[slot]=false;v.load();}});
  this.sync();
 }
 pause(){this.manualPaused=true;this.sync();}
 cancelPresentation(slot){const p=this.presentations[slot];if(!p)return;
  if(p.videoFrame!==undefined)this.slots[slot].cancelVideoFrameCallback?.(p.videoFrame);
  if(p.animationFrame)this.cancelRaf(p.animationFrame);
  this.presentations[slot]=null;
 }
 load(slot,index){const v=this.slots[slot],item=this.playlist[index];
  this.cancelPresentation(slot);this.versions[slot]++;this.pending[slot]=null;
  this.failed[slot]=false;this.retryAt[slot]=0;
  v.pause();v.style.opacity='0';v.style.zIndex='1';
  v.src=this.mobile&&item.mobile?item.mobile:item.src;v.load();
 }
 playSlot(slot){const v=this.slots[slot];
  if(!this.canRun()||!this.needed(slot)||this.failed[slot]||v.ended||this.pending[slot]||this.now()<this.retryAt[slot])return;
  if(!v.paused){this.onPlaying(slot);return;}
  const version=this.versions[slot],pending={};this.pending[slot]=pending;
  try {Promise.resolve(v.play()).then(()=>{
   if(version!==this.versions[slot])return;
   if(!this.canRun()||!this.needed(slot))v.pause();else this.onPlaying(slot);
  }).catch(()=>{if(version===this.versions[slot])this.retryAt[slot]=this.now()+1000;this.updateButton();})
   .finally(()=>{if(this.pending[slot]===pending)this.pending[slot]=null;});
  }catch{this.pending[slot]=null;this.retryAt[slot]=this.now()+1000;this.updateButton();}
 }
 afterPresented(slot,callback){
  if(this.presentations[slot])return;
  const v=this.slots[slot],token={version:this.versions[slot],epoch:this.epoch};
  this.presentations[slot]=token;
  const reveal=()=>{token.animationFrame=this.raf(()=>{
   if(this.presentations[slot]!==token)return;
   this.presentations[slot]=null;
   if(token.version===this.versions[slot]&&token.epoch===this.epoch&&this.canRun()&&!v.paused&&v.readyState>=2)callback();
  });};
  if(typeof v.requestVideoFrameCallback==='function')token.videoFrame=v.requestVideoFrameCallback(reveal);
  else token.animationFrame=this.raf(reveal);
 }
 onPlaying(slot){const v=this.slots[slot];
  if(!this.canRun()||!this.needed(slot)){v.pause();return;}
  if(slot===this.active&&!this.revealed)this.afterPresented(slot,()=>{
   if(slot!==this.active||this.revealed)return;
   this.revealed=true;v.style.opacity='1';this.scene.dataset.heroTransition='idle';this.schedule();
  });
  if(slot===this.waiting?.slot&&!this.transition){const waiting=this.waiting;
   this.afterPresented(slot,()=>{
    if(this.waiting!==waiting||this.transition)return;
    const outgoing=this.slots[this.active];
    outgoing.style.opacity='1';outgoing.style.zIndex='1';v.style.opacity='0';v.style.zIndex='2';
    this.transition={from:this.active,to:slot,nextIndex:waiting.index,startTime:v.currentTime};
    this.waiting=null;this.scene.dataset.heroTransition='fading';this.schedule();
   });
  }
  this.updateButton();this.schedule();
 }
 onError(slot){this.failed[slot]=true;this.cancelPresentation(slot);
  if(this.transition?.to===slot){const t=this.transition;
   this.slots[slot].style.opacity='0';this.slots[t.from].style.opacity='1';
   this.waiting={slot,index:t.nextIndex};this.transition=null;
  }
  if(slot===this.waiting?.slot)this.scene.dataset.heroTransition='waiting';
  this.updateButton();
 }
 sync(){
  if(!this.canRun()){
   this.epoch++;if(this.frame){this.cancelRaf(this.frame);this.frame=0;}
   this.slots.forEach((v,slot)=>{this.cancelPresentation(slot);v.pause();});
  }else{
   this.playSlot(this.active);
   if(this.transition)this.playSlot(this.transition.to);
   else if(this.waiting&&this.slots[this.waiting.slot].readyState>=2)this.playSlot(this.waiting.slot);
   this.schedule();
  }
  this.updateButton();
 }
 schedule(){if(!this.frame&&this.canRun())this.frame=this.raf(()=>this.tick());}
 tick(){this.frame=0;if(!this.canRun())return;
  const active=this.slots[this.active];
  if(this.transition){const t=this.transition,incoming=this.slots[t.to];
   const amount=Math.max(0,Math.min(1,(incoming.currentTime-t.startTime)/this.fadeDuration));
   incoming.style.opacity=String(amount*amount*(3-2*amount));
   if(amount>=1){
    this.slots[t.from].pause();this.slots[t.from].style.opacity='0';
    this.active=t.to;this.index=t.nextIndex;this.transition=null;
    incoming.style.opacity='1';incoming.style.zIndex='1';
    this.scene.dataset.film=this.playlist[this.index].kind;this.scene.dataset.heroTransition='idle';
    this.load(t.from,(this.index+1)%this.playlist.length);
   }
  }else if(this.waiting){if(this.slots[this.waiting.slot].readyState>=2)this.playSlot(this.waiting.slot);}
  else if(this.revealed&&(active.currentTime>=this.interval||active.ended)){
   this.waiting={slot:1-this.active,index:(this.index+1)%this.playlist.length};
   this.scene.dataset.heroTransition='waiting';
   if(this.slots[this.waiting.slot].readyState>=2)this.playSlot(this.waiting.slot);
  }
  if(!this.transition&&!this.waiting&&active.paused&&!active.ended)this.playSlot(this.active);
  this.updateButton();this.schedule();
 }
 destroy(){this.destroyed=true;this.sync();this.listeners.forEach(([target,event,callback])=>target.removeEventListener(event,callback));}
}

if(typeof module==='object'&&module.exports)module.exports={HeroPlaylist};
else {
 const fronts=[...document.querySelectorAll('video[data-playlist-film][data-playlist]')];
 for(const front of fronts){
  const back=document.createElement('video');back.id=front.id+'-buffer';back.dataset.playlistFilm='';back.setAttribute('aria-hidden','true');front.after(back);
  let reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  try{const saved=localStorage.getItem('indem-motion');if(saved!==null)reduced=saved==='reduced';}catch{}
  const controller=new HeroPlaylist({slots:[front,back],playlist:JSON.parse(front.dataset.playlist),
   button:document.querySelector('[data-playlist-toggle][data-video-toggle="'+front.id+'"]'),scene:front.closest('.scene'),label:front.dataset.filmLabel||'opening',
   mobile:matchMedia('(max-width: 600px)').matches,reduced});
  let lastVisible=false;
  new IntersectionObserver(entries=>{lastVisible=entries[0].isIntersecting;controller.setVisible(lastVisible);},{threshold:.28}).observe(front.closest('.scene'));
  document.addEventListener('visibilitychange',()=>controller.sync());
  document.addEventListener('indem-motion-change',event=>controller.setReduced(event.detail.reduced));
  window.addEventListener('pagehide',()=>{controller.setVisible(false);});
  window.addEventListener('pageshow',()=>{controller.setVisible(lastVisible);});
 }
}

