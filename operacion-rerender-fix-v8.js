(()=>{
  const actions=['opAddWarehouse','opAddGroup','opAddMini','opSetMini','opDeleteWarehouse','opDeleteGroup','opDeleteMini'];
  function integratedRender(){
    setTimeout(()=>{
      try{ if(typeof window.renderOps==='function') window.renderOps(); }catch(e){ console.warn('Rerender operación:',e); }
    },35);
  }
  function wrap(name){
    const original=window[name];
    if(typeof original!=='function'||original.__integratedRerenderFix)return;
    const wrapped=function(...args){
      const result=original.apply(this,args);
      integratedRender();
      return result;
    };
    wrapped.__integratedRerenderFix=true;
    window[name]=wrapped;
  }
  function install(){actions.forEach(wrap)}
  install();
  setTimeout(install,120);
})();