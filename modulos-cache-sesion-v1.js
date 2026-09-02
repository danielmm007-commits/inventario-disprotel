(()=>{
  if(window.__disprotelModuleCacheCleanupV2)return;
  window.__disprotelModuleCacheCleanupV2=true;

  function limpiar(){
    const frames=[...document.querySelectorAll('.menuStage iframe.menuFrame')];
    frames.slice(1).forEach(frame=>{
      try{frame.src='about:blank'}catch{}
      frame.remove();
    });

    const frame=frames[0];
    if(frame){
      frame.classList.remove('moduleCachedFrame','moduleCacheActive');
      delete frame.dataset.moduleKey;
    }

    try{delete window.disprotelModuleCache}catch{window.disprotelModuleCache=undefined}
  }

  limpiar();
  const observer=new MutationObserver(limpiar);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),10000);
})();
