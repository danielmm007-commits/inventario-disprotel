(()=>{
  if(!window.state||typeof window.renderOps!=='function')return;

  const DB='disprotel_operacion_config_v2';
  const DB_VERSION=2;
  const STORE_LOC='ubicaciones';
  const STORE_GRP='grupos';
  const FALLBACK_LOC='disprotel_operacion_config_confirmada_v2';
  const FALLBACK_GRP='disprotel_grupos_responsables_v3';
  const editingLoc=new Set();
  const editingGrp=new Set();
  let savedLoc={};
  let savedGrp={};

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const key=(kind,name)=>kind+'::'+name;

  function users(){
    return (state.users||[]).map((u,i)=>{
      if(Array.isArray(u)){
        const meta=u[3]&&typeof u[3]==='object'?u[3]:{};
        return {id:String(meta.id||meta.userId||meta.usuario||u[0]||i),name:String(u[0]||''),role:String(u[1]||''),group:String(u[2]||''),raw:u,index:i};
      }
      return {id:String(u.id||u.user_id||u.usuario||u.nombre||u.name||i),name:String(u.nombre||u.name||u.usuario||''),role:String(u.rol||u.role||''),group:String(u.grupo_operativo||u.group||u.grupo||''),raw:u,index:i};
    }).filter(x=>x.name);
  }

  function userNameMap(){return new Map(users().map(u=>[String(u.id),u.name]));}
  function names(ids){const m=userNameMap();return (ids||[]).map(id=>m.get(String(id))).filter(Boolean);}

  function locations(){
    return [
      ...(state.warehouses||[]).map(name=>({kind:'BODEGA',name})),
      ...(state.minis||[]).map(name=>({kind:'MINIBODEGA',name}))
    ];
  }

  function emptyLoc(loc){return {id:key(loc.kind,loc.name),kind:loc.kind,name:loc.name,group:'',habitual:'',responsibility:'',people:[],confirmed:false};}
  function currentLoc(loc){return savedLoc[key(loc.kind,loc.name)]||state.opsConfirmed?.[key(loc.kind,loc.name)]||emptyLoc(loc);}

  function inferredGroup(group){
    const ids=users().filter(u=>u.group===group).map(u=>u.id);
    return {id:'GRUPO::'+group,name:group,people:ids,confirmed:false,inferred:ids.length>0};
  }
  function currentGroup(group){return savedGrp['GRUPO::'+group]||inferredGroup(group);}

  function openDB(){
    return new Promise((resolve,reject)=>{
      if(!('indexedDB' in window))return reject(new Error('indexeddb'));
      const r=indexedDB.open(DB,DB_VERSION);
      r.onupgradeneeded=()=>{
        const db=r.result;
        if(!db.objectStoreNames.contains(STORE_LOC))db.createObjectStore(STORE_LOC,{keyPath:'id'});
        if(!db.objectStoreNames.contains(STORE_GRP))db.createObjectStore(STORE_GRP,{keyPath:'id'});
      };
      r.onsuccess=()=>resolve(r.result);
      r.onerror=()=>reject(r.error||new Error('db'));
    });
  }

  async function readStore(store,fallback){
    try{
      const db=await openDB();
      const rows=await new Promise((resolve,reject)=>{const tx=db.transaction(store,'readonly');const r=tx.objectStore(store).getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error);});
      db.close();
      return Object.fromEntries(rows.map(r=>[r.id,r]));
    }catch(e){try{return JSON.parse(localStorage.getItem(fallback)||'{}')}catch{return {}}}
  }

  async function writeStore(store,fallback,row){
    let ok=false;
    try{
      const db=await openDB();
      await new Promise((resolve,reject)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(row);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
      db.close();ok=true;
    }catch(e){}
    try{const all=JSON.parse(localStorage.getItem(fallback)||'{}');all[row.id]=row;localStorage.setItem(fallback,JSON.stringify(all));ok=true}catch(e){}
    return ok;
  }

  async function persistLoc(row){
    const ok=await writeStore(STORE_LOC,FALLBACK_LOC,row);
    savedLoc[row.id]=row;
    state.opsConfirmed=state.opsConfirmed&&typeof state.opsConfirmed==='object'?state.opsConfirmed:{};
    state.opsConfirmed[row.id]=row;
    state.opsMeta=state.opsMeta&&typeof state.opsMeta==='object'?state.opsMeta:{};
    state.opsMeta.minis=state.opsMeta.minis&&typeof state.opsMeta.minis==='object'?state.opsMeta.minis:{};
    state.opsMeta.warehouses=state.opsMeta.warehouses&&typeof state.opsMeta.warehouses==='object'?state.opsMeta.warehouses:{};
    const bucket=row.kind==='MINIBODEGA'?state.opsMeta.minis:state.opsMeta.warehouses;
    bucket[row.name]=bucket[row.name]||{historyCount:0,active:true};
    Object.assign(bucket[row.name],{group:row.group||'',habitual:row.habitual||'',responsibility:row.responsibility||'',people:[...(row.people||[])]});
    try{save()}catch(e){}
    return ok;
  }

  async function persistGroup(row){
    const ok=await writeStore(STORE_GRP,FALLBACK_GRP,row);
    savedGrp[row.id]=row;
    state.opsGroupMembers=state.opsGroupMembers&&typeof state.opsGroupMembers==='object'?state.opsGroupMembers:{};
    state.opsGroupMembers[row.name]=[...(row.people||[])];

    const selected=new Set((row.people||[]).map(String));
    for(const u of users()){
      if(Array.isArray(u.raw)){
        if(selected.has(String(u.id)))u.raw[2]=row.name;
        else if(String(u.raw[2]||'')===row.name)u.raw[2]='';
      }else if(u.raw&&typeof u.raw==='object'){
        if(selected.has(String(u.id)))u.raw.grupo_operativo=row.name;
        else if(String(u.raw.grupo_operativo||'')===row.name)u.raw.grupo_operativo='';
      }
    }

    for(const other of (state.groups||[])){
      if(other===row.name)continue;
      const oid='GRUPO::'+other;
      const orow=savedGrp[oid];
      if(!orow)continue;
      const next=(orow.people||[]).filter(id=>!selected.has(String(id)));
      if(next.length!==(orow.people||[]).length){
        const upd={...orow,people:next,updatedAt:new Date().toISOString()};
        savedGrp[oid]=upd;
        await writeStore(STORE_GRP,FALLBACK_GRP,upd);
      }
    }
    try{save()}catch(e){}
    return ok;
  }

  function injectStyle(){
    if(document.getElementById('op-total-v3-style'))return;
    const st=document.createElement('style');st.id='op-total-v3-style';
    st.textContent=`.opLegacyHidden{display:none!important}.cfgBox,.grpCfg{position:relative;z-index:4;margin-top:9px;padding:9px;border-radius:11px;border:1px solid #d6e5ee;background:#f9fcfe}.cfgBox.editing,.grpCfg.editing{background:#eef8ff;border-color:#77b9e6;box-shadow:0 0 0 3px rgba(31,117,216,.08)}.cfgTop{display:flex;align-items:center;justify-content:space-between;gap:8px}.cfgStatus{font-size:7px;font-weight:900;padding:5px 7px;border-radius:999px;border:1px solid}.cfgStatus.ok{background:#eaf8ef;border-color:#cbead7;color:#23734e}.cfgStatus.warn{background:#fff8e9;border-color:#efd9aa;color:#8b5b15}.cfgRead{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}.cfgField{padding:6px 7px;border-radius:8px;background:#fff;border:1px solid #e0eaf0}.cfgField span{display:block;font-size:6px;font-weight:900;color:#70838e;margin-bottom:2px}.cfgField b{font-size:8px;color:#244f70}.cfgActions{display:flex;gap:6px;justify-content:flex-end;margin-top:8px}.cfgBtn{border:1px solid #bdd8e8;background:#fff;color:#185f99;border-radius:8px;padding:7px 9px;font-size:7px;font-weight:900;cursor:pointer;transition:.15s}.cfgBtn:hover{transform:translateY(-2px);box-shadow:0 5px 12px rgba(11,42,92,.12)}.cfgBtn.save{background:linear-gradient(135deg,#0e67b4,#2189da);border-color:#0e67b4;color:#fff}.cfgEditGrid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px}.cfgEditField label,.cfgPeopleLabel{display:block;font-size:6px;font-weight:900;color:#607786;margin-bottom:3px}.cfgEditField select{width:100%;padding:7px;border-radius:8px;border:1px solid #bfd5e3;background:#fff;font-size:8px}.cfgPeople{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;margin-top:5px;max-height:165px;overflow:auto}.cfgPerson{display:flex;align-items:center;gap:6px;padding:6px;border-radius:8px;border:1px solid #dce8ef;background:#fff;font-size:7px;cursor:pointer}.cfgPerson.on{background:#eaf6ff;border-color:#69afe2}.cfgPerson input{accent-color:#1f75d8}.cfgHint{font-size:7px;color:#6f8491;margin-top:6px}.cfgNames{margin-top:6px;padding:7px;border-radius:8px;background:#fff;border:1px solid #e0eaf0;font-size:8px;color:#244f70}.cfgNames strong{display:block;font-size:6px;color:#70838e;margin-bottom:3px}.cfgEmpty{color:#8b5b15}.grpCfg{margin-top:8px}.grpCfg .cfgRead{grid-template-columns:1fr}.opCard .opActions{position:relative;z-index:3}@media(max-width:800px){.cfgRead,.cfgEditGrid,.cfgPeople{grid-template-columns:1fr}}`;
    document.head.appendChild(st);
  }

  function opts(arr,current,exclude=''){
    const vals=['',...arr].filter((v,i,a)=>a.indexOf(v)===i&&(!exclude||v!==exclude));
    return vals.map(v=>`<option value="${esc(v)}" ${v===current?'selected':''}>${v?esc(v):'Por definir'}</option>`).join('');
  }

  function peopleEditor(prefix,row){
    const us=users();
    if(!us.length)return '<div class="cfgHint">Primero crea usuarios en el Paso 3.</div>';
    return `<div class="cfgPeople">${us.map(u=>{const on=(row.people||[]).map(String).includes(String(u.id));return `<label class="cfgPerson ${on?'on':''}"><input type="checkbox" data-person="${esc(prefix)}" value="${esc(u.id)}" ${on?'checked':''}><span><b>${esc(u.name)}</b>${u.role?` · ${esc(u.role)}`:''}</span></label>`}).join('')}</div>`;
  }

  function locateCard(loc){
    return [...document.querySelectorAll('.opCard')].find(c=>{
      const title=c.querySelector('.opHead b')?.textContent?.trim()||'';
      const small=c.querySelector('.opHead small')?.textContent||'';
      if(title!==String(loc.name).trim())return false;
      return loc.kind==='MINIBODEGA'?/Minibodega|unidad operativa/i.test(small):/Bodega física/i.test(small);
    });
  }

  function locateGroupCard(group){
    return [...document.querySelectorAll('.opCard')].find(c=>{
      const title=c.querySelector('.opHead b')?.textContent?.trim()||'';
      const small=c.querySelector('.opHead small')?.textContent||'';
      return title===String(group).trim()&&/usuario\(s\) asignado/i.test(small);
    });
  }

  function locView(loc,row){
    const ps=names(row.people);
    const supply=row.habitual||(loc.kind==='BODEGA'?'No aplica / origen principal':'Por definir');
    return `<div class="cfgRead"><div class="cfgField"><span>GRUPO RESPONSABLE</span><b>${esc(row.group||'Por definir')}</b></div><div class="cfgField"><span>ABASTECIMIENTO HABITUAL</span><b>${esc(supply)}</b></div><div class="cfgField"><span>RESPONSABILIDAD</span><b>${esc(row.responsibility||'Por definir')}</b></div><div class="cfgField"><span>PERSONAS RESPONSABLES</span><b>${esc(ps.length?ps.join(' + '):'Por definir')}</b></div></div><div class="cfgActions"><button class="cfgBtn" data-loc-edit="${esc(row.id)}">✏️ EDITAR TODO</button></div>`;
  }

  function locEdit(loc,row){
    const warehouses=(state.warehouses||[]).filter(x=>x!==loc.name);
    return `<div class="cfgEditGrid"><div class="cfgEditField"><label>GRUPO RESPONSABLE${loc.kind==='BODEGA'?' (OPCIONAL)':''}</label><select data-loc-group>${opts(state.groups||[],row.group)}</select></div><div class="cfgEditField"><label>BODEGA DE ABASTECIMIENTO HABITUAL${loc.kind==='BODEGA'?' (OPCIONAL)':''}</label><select data-loc-habitual>${opts(warehouses,row.habitual,loc.name)}</select></div><div class="cfgEditField"><label>TIPO DE RESPONSABILIDAD</label><select data-loc-resp><option value="" ${!row.responsibility?'selected':''}>Por definir</option><option value="INDIVIDUAL" ${row.responsibility==='INDIVIDUAL'?'selected':''}>Individual</option><option value="COMPARTIDA" ${row.responsibility==='COMPARTIDA'?'selected':''}>Compartida</option></select></div></div><div class="cfgPeopleLabel" style="margin-top:8px">PERSONAS RESPONSABLES DE ESTA UBICACIÓN</div>${peopleEditor(row.id,row)}<div class="cfgHint">Para una Bodega Matriz puedes dejar el abastecimiento vacío. Los cambios solo se aplican al guardar.</div><div class="cfgActions"><button class="cfgBtn" data-loc-cancel="${esc(row.id)}">CANCELAR</button><button class="cfgBtn save" data-loc-save="${esc(row.id)}">💾 GUARDAR CAMBIOS</button></div>`;
  }

  function groupView(group,row){
    const ps=names(row.people);
    return `<div class="cfgNames"><strong>INTEGRANTES HABITUALES</strong><span class="${ps.length?'':'cfgEmpty'}">${esc(ps.length?ps.join(' + '):'Ninguna persona asignada')}</span></div><div class="cfgActions"><button class="cfgBtn" data-grp-edit="${esc(group)}">✏️ EDITAR INTEGRANTES</button></div>`;
  }

  function groupEdit(group,row){
    return `<div class="cfgPeopleLabel">SELECCIONA LOS INTEGRANTES DEL GRUPO</div>${peopleEditor('GRUPO::'+group,row)}<div class="cfgHint">Un usuario queda asociado habitualmente a un solo grupo. Las rotaciones del día se manejarán después desde Inicio de Jornada.</div><div class="cfgActions"><button class="cfgBtn" data-grp-cancel="${esc(group)}">CANCELAR</button><button class="cfgBtn save" data-grp-save="${esc(group)}">💾 GUARDAR INTEGRANTES</button></div>`;
  }

  function decorate(){
    injectStyle();
    for(const loc of locations()){
      const card=locateCard(loc);if(!card)continue;
      card.querySelectorAll('.opSelect').forEach(x=>x.classList.add('opLegacyHidden'));
      card.querySelector('.cfgBox')?.remove();
      const row=currentLoc(loc);const edit=editingLoc.has(row.id);
      const box=document.createElement('div');box.className='cfgBox'+(edit?' editing':'');
      box.innerHTML=`<div class="cfgTop"><b style="font-size:8px;color:#16436f">CONFIGURACIÓN DE RESPONSABILIDAD</b><span class="cfgStatus ${row.confirmed?'ok':'warn'}">${row.confirmed?'✓ CONFIGURACIÓN GUARDADA':'POR DEFINIR'}</span></div>${edit?locEdit(loc,row):locView(loc,row)}`;
      const actions=card.querySelector('.opActions');actions?card.insertBefore(box,actions):card.appendChild(box);
    }

    for(const group of (state.groups||[])){
      const card=locateGroupCard(group);if(!card)continue;
      card.querySelector('.grpCfg')?.remove();
      const row=currentGroup(group);const edit=editingGrp.has(group);
      const box=document.createElement('div');box.className='grpCfg'+(edit?' editing':'');
      box.innerHTML=`<div class="cfgTop"><b style="font-size:8px;color:#16436f">PERSONAS DEL GRUPO</b><span class="cfgStatus ${row.confirmed?'ok':'warn'}">${row.confirmed?'✓ GUARDADO':row.inferred?'DETECTADO DEL PASO 3':'POR DEFINIR'}</span></div>${edit?groupEdit(group,row):groupView(group,row)}`;
      const actions=card.querySelector('.opActions');actions?card.insertBefore(box,actions):card.appendChild(box);
    }
    bind();
  }

  function bind(){
    document.querySelectorAll('[data-loc-edit]').forEach(b=>b.onclick=()=>{editingLoc.add(b.dataset.locEdit);decorate();});
    document.querySelectorAll('[data-loc-cancel]').forEach(b=>b.onclick=()=>{editingLoc.delete(b.dataset.locCancel);decorate();});
    document.querySelectorAll('[data-grp-edit]').forEach(b=>b.onclick=()=>{editingGrp.add(b.dataset.grpEdit);decorate();});
    document.querySelectorAll('[data-grp-cancel]').forEach(b=>b.onclick=()=>{editingGrp.delete(b.dataset.grpCancel);decorate();});
    document.querySelectorAll('.cfgPerson input').forEach(ch=>ch.onchange=()=>ch.closest('.cfgPerson')?.classList.toggle('on',ch.checked));

    document.querySelectorAll('[data-grp-save]').forEach(b=>b.onclick=async()=>{
      const group=b.dataset.grpSave;
      const box=b.closest('.grpCfg');
      const people=[...box.querySelectorAll('[data-person]:checked')].map(x=>x.value);
      if(!people.length)return toast('⚠️ FALTAN INTEGRANTES','Selecciona al menos una persona para el grupo.');
      const row={id:'GRUPO::'+group,name:group,people,confirmed:true,updatedAt:new Date().toISOString()};
      const ok=await persistGroup(row);editingGrp.delete(group);decorate();toast(ok?'✅ GRUPO GUARDADO':'⚠️ GUARDADO PARCIAL',ok?'Ya se muestran los responsables reales del grupo.':'El navegador no confirmó la persistencia.');
    });

    document.querySelectorAll('[data-loc-save]').forEach(b=>b.onclick=async()=>{
      const id=b.dataset.locSave;const loc=locations().find(x=>key(x.kind,x.name)===id);if(!loc)return;
      const box=b.closest('.cfgBox');
      const group=box.querySelector('[data-loc-group]')?.value||'';
      const habitual=box.querySelector('[data-loc-habitual]')?.value||'';
      const responsibility=box.querySelector('[data-loc-resp]')?.value||'';
      const people=[...box.querySelectorAll('[data-person]:checked')].map(x=>x.value);
      if(loc.kind==='MINIBODEGA'&&!group)return toast('⚠️ FALTA GRUPO','Selecciona el grupo responsable de la minibodega.');
      if(loc.kind==='MINIBODEGA'&&!habitual)return toast('⚠️ FALTA ABASTECIMIENTO','Selecciona la bodega de abastecimiento habitual.');
      if(!responsibility)return toast('⚠️ FALTA RESPONSABILIDAD','Define si es individual o compartida.');
      if(!people.length)return toast('⚠️ FALTAN PERSONAS','Selecciona al menos una persona responsable.');
      if(responsibility==='INDIVIDUAL'&&people.length!==1)return toast('⚠️ RESPONSABILIDAD INDIVIDUAL','Selecciona exactamente una persona.');
      if(responsibility==='COMPARTIDA'&&people.length<2)return toast('⚠️ RESPONSABILIDAD COMPARTIDA','Selecciona al menos dos personas.');
      const row={id,kind:loc.kind,name:loc.name,group,habitual,responsibility,people,confirmed:true,updatedAt:new Date().toISOString()};
      const ok=await persistLoc(row);editingLoc.delete(id);decorate();toast(ok?'✅ CONFIGURACIÓN GUARDADA':'⚠️ GUARDADO PARCIAL',ok?'La tarjeta muestra ahora los valores realmente confirmados.':'El navegador no confirmó la persistencia.');
    });
  }

  const originalRender=window.renderOps;
  window.renderOps=function(...args){const r=originalRender(...args);setTimeout(decorate,0);return r;};

  (async()=>{
    if(window.operacionBackendReady){
      try{await window.operacionBackendReady}catch(e){console.warn('Operación backend:',e)}
    }
    [savedLoc,savedGrp]=await Promise.all([readStore(STORE_LOC,FALLBACK_LOC),readStore(STORE_GRP,FALLBACK_GRP)]);
    decorate();
  })();
})();