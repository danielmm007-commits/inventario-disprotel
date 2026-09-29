(()=>{
  if(window.__disprotelSoporteResilienteV2)return;
  window.__disprotelSoporteResilienteV2=true;

  const nativeFetch=window.fetch.bind(window);
  const supportPath='/functions/v1/inventario-soporte';
  const optionsPath='/functions/v1/inventario-soporte-opciones';
  const EV_API='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-soporte-evidencias';
  const DB='disprotel_offline_v1',VER=1,KV='kv',EVID='evidence';
  let syncing=false,statusTimer=null;

  function urlOf(input){return typeof input==='string'?input:String(input?.url||'')}
  function openDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,VER);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains(KV))d.createObjectStore(KV,{keyPath:'key'});if(!d.objectStoreNames.contains(EVID)){const s=d.createObjectStore(EVID,{keyPath:'id'});s.createIndex('orden_id','orden_id',{unique:false})}};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
  async function put(store,value){const d=await openDb();return new Promise((resolve,reject)=>{const t=d.transaction(store,'readwrite'),s=t.objectStore(store);s.put(value);t.oncomplete=()=>{d.close();resolve(true)};t.onerror=()=>{d.close();reject(t.error)}})}
  async function get(store,key){const d=await openDb();return new Promise((resolve,reject)=>{const t=d.transaction(store,'readonly'),r=t.objectStore(store).get(key);r.onsuccess=()=>{d.close();resolve(r.result||null)};r.onerror=()=>{d.close();reject(r.error)}})}
  async function del(store,key){const d=await openDb();return new Promise((resolve,reject)=>{const t=d.transaction(store,'readwrite');t.objectStore(store).delete(key);t.oncomplete=()=>{d.close();resolve(true)};t.onerror=()=>{d.close();reject(t.error)}})}
  async function all(store){const d=await openDb();return new Promise((resolve,reject)=>{const t=d.transaction(store,'readonly'),r=t.objectStore(store).getAll();r.onsuccess=()=>{d.close();resolve(r.result||[])};r.onerror=()=>{d.close();reject(r.error)}})}
  const kvPut=(key,value)=>put(KV,{key,value,updated_at:new Date().toISOString()});
  async function kvGet(key){return (await get(KV,key))?.value??null}

  function ensureStatus(){
    if(document.getElementById('disprotelOfflineState'))return;
    const s=document.createElement('style');s.textContent=`
      #disprotelOfflineState{position:fixed;right:12px;bottom:12px;z-index:9999;padding:8px 11px;border-radius:999px;font:900 10px Arial,sans-serif;box-shadow:0 5px 18px #082b5c26;display:none}
      #disprotelOfflineState.off{display:block;background:#fff0df;color:#8a4b00;border:1px solid #efbe77}
      #disprotelOfflineState.sync{display:block;background:#e8f3ff;color:#0b5f9f;border:1px solid #9dc9ea}
      #disprotelOfflineState.ok{display:block;background:#eaf8ef;color:#17643e;border:1px solid #a9d7b9}
    `;document.head.appendChild(s);const e=document.createElement('div');e.id='disprotelOfflineState';document.body.appendChild(e)
  }
  function showStatus(mode,text,autoHide=false){ensureStatus();const e=document.getElementById('disprotelOfflineState');e.className=mode;e.textContent=text;clearTimeout(statusTimer);if(autoHide)statusTimer=setTimeout(()=>{e.style.display='none';e.className=''},2600);else e.style.display='block'}
  async function count(){return (await all(EVID)).length}
  async function refreshStatus(){
    const n=await count().catch(()=>0);
    if(!navigator.onLine){showStatus('off','📴 SIN CONEXIÓN · '+n+' pendiente'+(n===1?'':'s'));return}
    if(n)showStatus('off','⏳ '+n+' pendiente'+(n===1?'':'s')+' de sincronizar');
    else{const e=document.getElementById('disprotelOfflineState');if(e){e.style.display='none';e.className=''}}
  }
  async function reachable(){
    if(!navigator.onLine)return false;
    const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),5000);
    try{const r=await nativeFetch(EV_API,{method:'OPTIONS',cache:'no-store',signal:ctl.signal});return r.ok}catch{return false}finally{clearTimeout(tm)}
  }
  function session(){try{return JSON.parse(sessionStorage.getItem('disprotel_trabajos_test')||'{}')?.session_token||''}catch{return''}}

  async function queueEvidence(endpoint,payload){
    const id=String(payload.offline_sync_id||crypto.randomUUID());
    payload={...payload,offline_sync_id:id};
    await put(EVID,{id,orden_id:String(payload.orden_id||''),endpoint:endpoint||EV_API,payload,created_at:new Date().toISOString(),attempts:0});
    await refreshStatus();return id
  }
  async function syncEvidence(){
    if(syncing)return {ok:false,busy:true};const ses=session();if(!ses)return {ok:false,no_session:true};
    const items=await all(EVID);if(!items.length){await refreshStatus();return {ok:true,synced:0}}
    if(!(await reachable())){await refreshStatus();return {ok:false,offline:true}}
    syncing=true;showStatus('sync','🔄 SINCRONIZANDO '+items.length+' PENDIENTE'+(items.length===1?'':'S'));
    let synced=0;
    try{
      for(const item of items){
        try{
          const r=await nativeFetch(item.endpoint||EV_API,{method:'POST',headers:{'Content-Type':'application/json','x-session':ses},body:JSON.stringify({session_token:ses,...item.payload})});
          const d=await r.json().catch(()=>({}));
          if(!r.ok)throw new Error(d.error||'No se pudo sincronizar');
          await del(EVID,item.id);synced++;
          window.dispatchEvent(new CustomEvent('disprotel:offline-evidence-synced',{detail:{orden_id:item.orden_id,offline_sync_id:item.id,evidencia:d.evidencia||null}}));
        }catch(e){
          item.attempts=Number(item.attempts||0)+1;item.last_error=String(e?.message||e);await put(EVID,item);
          if(!(await reachable()))break;
        }
      }
    }finally{syncing=false}
    const left=await count();if(left)showStatus('off','⏳ '+left+' pendiente'+(left===1?'':'s')+' de sincronizar');else showStatus('ok','✅ TODO SINCRONIZADO',true);
    return {ok:left===0,synced,left}
  }

  window.DisprotelOffline={
    saveDraft:(orden,value)=>kvPut('draft:'+orden,value),
    loadDraft:orden=>kvGet('draft:'+orden),
    saveSupport:(orden,value)=>kvPut('support:'+orden,value),
    loadSupport:orden=>kvGet('support:'+orden),
    saveOptions:(orden,value)=>kvPut('options:'+orden,value),
    loadOptions:orden=>kvGet('options:'+orden),
    queueEvidence,
    syncEvidence,
    count,
    isReachable:reachable,
    refreshStatus
  };

  function inventoryFallback(){
    return new Response(JSON.stringify({cantidades:[],seriales:[],ubicacion:{codigo:'',ubicacion:'INVENTARIO TEMPORALMENTE NO DISPONIBLE'},degraded:true}),{status:200,headers:{'Content-Type':'application/json'}})
  }

  window.fetch=async function(input,init={}){
    const url=urlOf(input);
    if(!url.includes(supportPath)&&!url.includes(optionsPath))return nativeFetch(input,init);
    let lastError=null;
    for(let attempt=0;attempt<2;attempt++){
      const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
      try{
        const response=await nativeFetch(input,{...init,signal:controller.signal});
        if(response.status<500)return response;
        lastError=new Error('El servidor no respondió correctamente.');
        if(attempt===1)break;
      }catch(error){lastError=error;if(attempt===0)await new Promise(r=>setTimeout(r,450))}
      finally{clearTimeout(timeout)}
    }
    if(url.includes(optionsPath)){console.warn('Canasta temporalmente no disponible:',lastError);return inventoryFallback()}
    throw new Error('No se pudo conectar con el servicio de soporte.');
  };

  window.addEventListener('online',()=>setTimeout(()=>syncEvidence(),700));
  window.addEventListener('offline',refreshStatus);
  setInterval(()=>{refreshStatus();if(navigator.onLine)syncEvidence()},20000);
  setTimeout(refreshStatus,400);
})();