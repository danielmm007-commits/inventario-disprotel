(()=>{
  if(window.__supervisorGruposNovedadesV1)return;
  window.__supervisorGruposNovedadesV1=true;

  function groupIdFrom(card){
    if(card?.dataset?.grupoId)return card.dataset.grupoId;
    const raw=String(card?.getAttribute?.('onclick')||'');
    const m=raw.match(/openGroup\((['"])(.*?)\1\)/);
    return m?.[2]||'';
  }

  function restoreGroupNoveltyActions(){
    document.querySelectorAll('#groups .group').forEach(card=>{
      const id=groupIdFrom(card);
      if(!id)return;
      card.dataset.grupoId=id;
      if(card.dataset.novedadBound==='1')return;
      card.dataset.novedadBound='1';
      card.removeAttribute('onclick');
      card.title='Registrar novedad del grupo';
      card.addEventListener('click',()=>{
        try{
          if(typeof window.openGroup!=='function')throw new Error('openGroup no disponible');
          window.openGroup(id);
        }catch(e){
          console.error('DISPROTEL · novedad de grupo',e);
        }
      });
    });
  }

  const root=document.getElementById('groups')||document.body;
  const mo=new MutationObserver(()=>restoreGroupNoveltyActions());
  mo.observe(root,{childList:true,subtree:true});
  restoreGroupNoveltyActions();
  setInterval(restoreGroupNoveltyActions,1000);
})();