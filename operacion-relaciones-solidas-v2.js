(()=>{
  if(!window.state || typeof window.opSetMini!=='function' || typeof window.renderOps!=='function') return;

  const DB_NAME='disprotel_configuracion_operativa_v1';
  const STORE='relaciones_minibodegas';
  const openDB=()=>new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE,{keyPath:'mini'});
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
  const getAll=async()=>{
    const db=await openDB();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readonly');
      const req=tx.objectStore(STORE).getAll();
      req.onsuccess=()=>resolve(req.result||[]);
      req.onerror=()=>reject(req.error);
    });
  };
  const putOne=async(mini)=>{
    const meta=state.opsMeta?.minis?.[mini]||{};
    const row={mini,group:meta.group||'',habitual:meta.habitual||'',savedAt:new Date().toISOString()};
    const db=await openDB();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).put(row);
      tx.oncomplete=()=>resolve(row);
      tx.onerror=()=>reject(tx.error);
    });
  };
  const delOne=async(mini)=>{
    const db=await openDB();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).delete(mini);
      tx.oncomplete=resolve;
      tx.onerror=()=>reject(tx.error);
    });
  };

  const style=document.createElement('style');
  style.textContent=`
    .opPersistBadge{display:inline-flex;align-items:center;gap:4px;margin-top:6px;padding:5px 8px;border-radius:999px;background:#e9f8ef;border:1px solid #bfe4cf;color:#20704b;font-size:7px;font-weight:900;box-shadow:0 4px 10px rgba(32,112,75,.08)}
    .opPersistBadge.pending{background:#fff8e9;border-color:#f0d9a8;color:#8b5b15}
    .opPersistBtn{margin-top:7px;width:100%;border:0;border-radius:9px;padding:8px 9px;font-size:8px;font-weight:900;cursor:pointer;color:#fff;background:linear-gradient(135deg,#0b2a5c,#1f75d8);box-shadow:0 7px 15px rgba(11,42,92,.17);transition:.16s}
    .opPersistBtn:hover{transform:translateY(-2px) scale(1.01);box-shadow:0 10px 20px rgba(11,42,92,.23)}
    .opPersistBtn:active{transform:translateY(1px) scale(.98)}
  `;
  document.head.appendChild(style);

  const persisted=new Set();
  const dirty=new Set();

  function decorate(){
    document.querySelectorAll('.opCard').forEach(card=>{
      const title=card.querySelector('.opHead b')?.textContent?.trim();
      if(!title || !state.minis?.includes(title)) return;
      const selects=card.querySelectorAll('.opSelect');
      if(!selects.length) return;
      let badge=card.querySelector('.opPersistBadge');
      if(!badge){
        badge=document.createElement('div');
        badge.className='opPersistBadge';
        card.querySelector('.opActions')?.before(badge);
      }
      const isDirty=dirty.has(title);
      badge.className='opPersistBadge'+(isDirty?' pending':'');
      badge.textContent=isDirty?'● CAMBIO PENDIENTE':'✓ CONFIGURACIÓN PERSISTENTE';
      let btn=card.querySelector('.opPersistBtn');
      if(!btn){
        btn=document.createElement('button');
        btn.type='button';
        btn.className='opPersistBtn';
        btn.textContent='💾 GUARDAR RELACIÓN';
        btn.onclick=async()=>{
          btn.disabled=true; btn.textContent='GUARDANDO…';
          try{
            await putOne(title);
            persisted.add(title); dirty.delete(title);
            btn.textContent='✓ GUARDADO';
            decorate();
            if(typeof window.toast==='function') window.toast('✅ RELACIÓN GUARDADA','Grupo responsable y bodega habitual quedaron almacenados de forma persistente.');
            setTimeout(()=>{btn.disabled=false;btn.textContent='💾 GUARDAR RELACIÓN'},900);
          }catch(e){
            btn.disabled=false;btn.textContent='💾 GUARDAR RELACIÓN';
            if(typeof window.toast==='function') window.toast('⚠️ NO SE PUDO GUARDAR','El navegador no permitió guardar esta relación.');
          }
        };
        badge.after(btn);
      }
    });
  }

  const baseRender=window.renderOps;
  window.renderOps=function(...args){
    const out=baseRender(...args);
    setTimeout(decorate,0);
    return out;
  };

  const baseSet=window.opSetMini;
  window.opSetMini=function(n,k,v){
    const out=baseSet(n,k,v);
    dirty.add(n);
    setTimeout(decorate,0);
    return out;
  };

  const baseDelete=window.opDeleteMini;
  if(typeof baseDelete==='function'){
    window.opDeleteMini=function(i){
      const n=state.minis?.[i];
      const before=state.minis?.length||0;
      const out=baseDelete(i);
      setTimeout(async()=>{
        if(n && (state.minis?.length||0)<before){try{await delOne(n)}catch{} persisted.delete(n);dirty.delete(n)}
      },0);
      return out;
    };
  }

  (async()=>{
    try{
      const rows=await getAll();
      state.opsMeta=state.opsMeta&&typeof state.opsMeta==='object'?state.opsMeta:{};
      state.opsMeta.minis=state.opsMeta.minis&&typeof state.opsMeta.minis==='object'?state.opsMeta.minis:{};
      rows.forEach(r=>{
        if(!r?.mini || !state.minis?.includes(r.mini)) return;
        const m=state.opsMeta.minis[r.mini]||(state.opsMeta.minis[r.mini]={historyCount:0,active:true});
        m.group=r.group||'';
        m.habitual=r.habitual||'';
        persisted.add(r.mini);
      });
      window.renderOps();
    }catch(e){
      window.renderOps();
      if(typeof window.toast==='function') window.toast('⚠️ ALMACENAMIENTO NO DISPONIBLE','No fue posible abrir el almacenamiento persistente de relaciones.');
    }
  })();
})();