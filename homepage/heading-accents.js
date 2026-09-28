/* Align editable script by its ink bounds, including left-reaching f and p strokes. */
(() => {
  const words=[...document.querySelectorAll('.heading-accent')];
  const context=document.createElement('canvas').getContext('2d');
  if(!context)return;
  function alignAccents(){
    words.forEach(word=>{
      const style=getComputedStyle(word);
      context.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const bounds=context.measureText(word.textContent);
      word.style.setProperty('--script-overhang',`${Math.ceil(Math.max(0,bounds.actualBoundingBoxLeft||0))}px`);
      word.classList.remove('accent-line-start');
    });
    words.forEach(word=>{
      const heading=word.closest('h1,h2,.hero-fleet-ambition,.continuum-label');
      const lineStart=word.getBoundingClientRect().left-heading.getBoundingClientRect().left<parseFloat(getComputedStyle(word).fontSize)*.4;
      word.classList.toggle('accent-line-start',lineStart);
    });
  }
  document.fonts.ready.then(alignAccents);
  window.addEventListener('resize',alignAccents,{passive:true});
})();
