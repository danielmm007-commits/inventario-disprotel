(()=>{
  if(window.__disprotelOperacionBackendV1)return;
  window.__disprotelOperacionBackendV1=true;
  const API='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-operacion-config';
  const DB='disprotel_operacion_config_v2',DB_VERSION=2,STORE_LOC='ubicaciones',STORE_GRP='grupos';
  const session=(()=>{try{return JSON.parse(sessionStorage.getItem('disprotel_login_general_v2')||'null')}catch{return null}})();
  let ready=false,applying=false,syncing=false,timer=null,lastSig='';
  const clean=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const headers=()=>({'Content-Type':'application/json','x-user':session?.usuario||'','x-pin':session?.pin||'','x-session':session?.session_token||''});
  async function call(body){const r=await fetch(API,{method:'POST',headers:headers(),body:JSON.stringify(body)});const d=await r.json().catch(()=>({error:'Respuesta inválida'}));if(!r.ok||d?.error)throw new Error(d?.error||'No se pudo sincronizar Operación');return d}
  function openDB(){return new Promise((resolve,reject)=>{const q=indexedDB.open(DB,DB_VERSION);q.onupgradeneeded=()=>{const d=q.result;if(!d.objectStoreNames.contains(STORE_LOC))d.createObjectStore(STORE_LOC,{keyPath:'id'});if(!d.objectStoreNames.contains(STORE_GRP))d.createObjectStore(STORE_GRP,{keyPath:'id'})};q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})}
  async function replaceStore(store,rows){try{const d=await openDB();await new Promise((resolve,reject)=>{const tx=d.transaction(store,'readwrite'),os=tx.objectStore(store);os.clear();rows.forEach(x=>os.put(x));tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});d.close()}catch(e){console.warn('Persistencia Operación:',e)}}
  function uidMaps(){state.opsBackendUids=state.opsBackendUids&&typeof state.opsBackendUids==='object'?state.opsBackendUids:{groups:{},locations:{}};return state.opsBackendUids}
  async function applyBackend(d){
    applying=true;
    try{
      const groups=Array.isArray(d.groups)?d.groups:[],locs=Array.isArray(d.locations)?d.locations:[];
      const gm=new Map(groups.map(g=>[g.uid,g.name])),lm=new Map(locs.map(l=>[l.uid,l.name]));
      const maps=uidMaps();maps.groups={};maps.locations={};
      state.groups=groups.map(g=>{maps.groups[g.name]=g.uid;return g.name});
      state.warehouses=locs.filter(l=>l.kind==='BODEGA').map(l=>{maps.locations[l.name]=l.uid;return l.name});
      state.minis=locs.filter(l=>l.kind==='MINIBODEGA').map(l=>{maps.locations[l.name]=l.uid;return l.name});
      state.opsGroupMembers={};
      const groupRows=groups.map(g=>{state.opsGroupMembers[g.name]=[...(g.people||[])];return {id:'GRUPO::'+g.name,name:g.name,people:[...(g.people||[])],confirmed:true,updatedAt:new Date().toISOString()}});
      state.opsConfirmed={};state.opsMeta={warehouses:{},minis:{},groups:{}};
      const locRows=locs.map(l=>{const row={id:l.kind+'::'+l.name,kind:l.kind,name:l.name,group:gm.get(l.group_uid)||'',habitual:lm.get(l.supply_uid)||'',responsibility:l.responsibility||'',people:[...(l.people||[])],confirmed:true,updatedAt:new Date().toISOString()};state.opsConfirmed[row.id]=row;const bucket=l.kind==='BODEGA'?state.opsMeta.warehouses:state.opsMeta.minis;bucket[l.name]={group:row.group,habitual:row.habitual,responsibility:row.responsibility,people:[...row.people],historyCount:0,active:true};return row});
      groups.forEach(g=>state.opsMeta.groups[g.name]={people:[...(g.people||[])],historyCount:0,active:true});
      await Promise.all([replaceStore(STORE_LOC,locRows),replaceStore(STORE_GRP,groupRows)]);
      try{localStorage.setItem('disprotel_operacion_config_confirmada_v2',JSON.stringify(Object.fromEntries(locRows.map(x=>[x.id,x]))));localStorage.setItem('disprotel_grupos_responsables_v3',JSON.stringify(Object.fromEntries(groupRows.map(x=>[x.id,x]))))}catch(e){}
      try{window.save?.()}catch(e){}
    }finally{applying=false}
  }
  function payload(){
    const maps=uidMaps();
    const groups=(state.groups||[]).map(name=>({uid:maps.groups?.[name]||'grupo-'+clean(name),name,people:[...(state.opsGroupMembers?.[name]||[])]}));
    const groupUid=new Map(groups.map(x=>[x.name,x.uid]));
    const all=[...(state.warehouses||[]).map(name=>({kind:'BODEGA',name})),...(state.minis||[]).map(name=>({kind:'MINIBODEGA',name}))];
    const locUid=new Map(all.map(x=>[x.name,maps.locations?.[x.name]||(x.kind==='BODEGA'?'bodega-':'mini-')+clean(x.name)]));
    const locations=all.map(x=>{const r=state.opsConfirmed?.[x.kind+'::'+x.name]||state.opsMeta?.[x.kind==='BODEGA'?'warehouses':'minis']?.[x.name]||{};return {uid:locUid.get(x.name),name:x.name,kind:x.kind,group_uid:groupUid.get(r.group)||'',supply_uid:locUid.get(r.habitual)||'',responsibility:r.responsibility||'',people:[...(r.people||[])]}});
    return {groups,locations};
  }
  function signature(){return JSON.stringify(payload())}
  async function sync(){if(!ready||applying||syncing||!session?.usuario||(!session?.session_token&&!session?.pin))return;const sig=signature();if(sig===lastSig)return;syncing=true;try{const p=payload(),d=await call({action:'sync',...p});lastSig=sig;await applyBackend(d);lastSig=signature()}catch(e){console.error('Operación backend:',e)}finally{syncing=false}}
  function schedule(){clearTimeout(timer);timer=setTimeout(sync,650)}
  async function init(){
    if(!window.state||!session?.usuario||(!session?.session_token&&!session?.pin))return;
    try{const d=await call({action:'list'});await applyBackend(d);ready=true;lastSig=signature()}catch(e){ready=true;console.error('Operación backend:',e)}
  }
  const previous=window.save;if(typeof previous==='function')window.save=function(...args){const r=previous.apply(this,args);if(ready&&!applying)schedule();return r};
  window.operacionBackendReady=init();
})();
