(()=>{
  const drafts=new Map();
  let focusKey='';
  let selStart=null,selEnd=null;

  function keyFor(el){
    if(!el?.id)return '';
    if(el.id.startsWith('manual-')||el.id.startsWith('obs-'))return el.id;
    return '';
  }

  function guardar(el){
    const k=keyFor(el);if(!k)return;
    drafts.set(k,el.value);
    focusKey=k;
    try{selStart=el.selectionStart;selEnd=el.selectionEnd}catch{selStart=selEnd=null}
  }

  function restaurar(){
    for(const [k,v] of drafts){
      const el=document.getElementById(k);
      if(el&&el.value!==v)el.value=v;
    }
    if(focusKey){
      const el=document.getElementById(focusKey);
      if(el&&document.activeElement!==el){
        el.focus({preventScroll:true});
        try{if(selStart!=null)el.setSelectionRange(selStart,selEnd??selStart)}catch{}
      }
    }
  }

  document.addEventListener('input',e=>guardar(e.target),true);
  document.addEventListener('focusin',e=>{const k=keyFor(e.target);if(k){focusKey=k;guardar(e.target)}},true);
  document.addEventListener('focusout',e=>{const k=keyFor(e.target);if(k)guardar(e.target)},true);

  const obs=new MutationObserver(()=>requestAnimationFrame(restaurar));
  const iniciar=()=>{
    const lista=document.getElementById('lista');
    if(lista)obs.observe(lista,{childList:true,subtree:true});
    restaurar();
  };
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',iniciar):iniciar();

  window.addEventListener('beforeunload',()=>drafts.clear());
})();