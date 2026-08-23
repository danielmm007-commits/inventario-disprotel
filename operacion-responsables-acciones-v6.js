(()=>{
  function clean(){
    document.querySelectorAll('.cfgBox .respManageActions').forEach(x=>x.remove());
  }
  clean();
  new MutationObserver(()=>setTimeout(clean,0)).observe(document.documentElement,{childList:true,subtree:true});
})();