(()=>{
  if(!window.state||typeof window.renderOps!=='function')return;

  const DB_NAME='disprotel_config_operacion_v1';
  const STORE='responsables_ubicaciones';
  const FALLBACK='disprotel_responsables_ubicaciones_v1';
  const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function users(){
    return (state.users||[]).map((u,i)=>{
      if(Array.isArray(u))return {id:u[3]?.id||u[3]?.userId||u[0],name:u[0],role:u[1]||'',index:i};
      return {id:u.id||u.user_id||u.nombre||u.name||String(i),name:u.nombre||u.name||u.usuario||String(i),role:u.rol||u.role||'',index:i};
    }).filter(u=>u.name);
  }

  function findNames(list){
    const all=users();
    return list.map(n=>all.find(u=>normalize(u.name)===normalize(n) || (normalize(n)==='bryan'&&normalize(u.name)==='brian') || (normalize(n)==='brian'&&normalize(u.name)==='bryan'))).filter(Boolean);
  }

  const defaults={
    'Camioneta Toyota':{type:'COMPARTIDA',people:['Luis','Bryan']},
    'Furgoneta':{type:'COMPARTIDA',people:['Franklin','Jonathan']},
    'Camioneta Mazda':{type:'COMPARTIDA',people:['Stalin Vilca','Stalin Molina']}
  };

  function defaultFor(name){
    const d=defaults[name];
    if(!d)return {location:name,type:'INDIVIDUAL',people:[],source:'CONFIGURABLE'};
    const found=findNames(d.people);
    return {location:name,type:d.type,people:found.map(u=>String(u.id)),source:'PRECONFIGURADO'};
  }

  function openDB(){
    return new Promise((resolve,reject)=>{
      if(!('indexedDB' in window))return reject(new Error('IndexedDB no disponible'));
      const req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=()=>{
        const db=req.result;
        if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'location'});
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||new Error('No se pudo abrir IndexedDB'));
    });
  }

  async function readAll(){
    try{
      const db=await openDB();
      const rows=await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,'readonly');
        const r=tx.objectStore(STORE).getAll();
        r.onsuccess=()=>resolve(r.result||[]);
        r.onerror=()=>reject(r.error);
      });
      db.close();
      return Object.fromEntries(rows.map(r=>[r.location,r]));
    }catch(e){
      try{return JSON.parse(localStorage.getItem(FALLBACK)||'{}')}catch{return {}}
    }
  }

  async function writeOne(row){
    let ok=false;
    try{
      const db=await openDB();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,'readwrite');
        tx.objectStore(STORE).put(row);
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error);
      });
      db.close();
      ok=true;
    }catch(e){}
    try{
      const all=JSON.parse(localStorage.getItem(FALLBACK)||'{}');
      all[row.location]=row;
      localStorage.setItem(FALLBACK,JSON.stringify(all));
      ok=true;
    }catch(e){}
    state.opsResponsibilities=state.opsResponsibilities&&typeof state.opsResponsibilities==='object'?state.opsResponsibilities:{};
    state.opsResponsibilities[row.location]=row;
    try{save()}catch(e){}
    return ok;
  }

  let saved={};
  let ready=false;

  function allLocations(){
    return [...(state.warehouses||[]).map(n=>({name:n,kind:'BODEGA'})),...(state.minis||[]).map(n=>({name:n,kind:'MINIBODEGA'}))];
  }

  function current(name){
    return saved[name]||state.opsResponsibilities?.[name]||defaultFor(name);
  }

  function groupFor(name){
    return state.opsMeta?.minis?.[name]?.group||'';
  }

  function peopleHtml(name,row){
    const list=users();
    if(!list.length)return '<div class="respEmpty">Primero crea usuarios en el Paso 3.</div>';
    return list.map(u=>{
      const checked=(row.people||[]).map(String).includes(String(u.id));
      return `<label class="respPerson ${checked?'on':''}"><input type="checkbox" data-resp-person="${esc(name)}" value="${esc(u.id)}" ${checked?'checked':''}><span class="respAvatar">${esc(String(u.name).trim().charAt(0).toUpperCase())}</span><span><b>${esc(u.name)}</b><small>${esc(u.role||'Usuario')}</small></span></label>`;
    }).join('');
  }

  function card(loc){
    const row=current(loc.name);
    const grp=groupFor(loc.name);
    const habitual=state.opsMeta?.minis?.[loc.name]?.habitual||'';
    const people=users().filter(u=>(row.people||[]).map(String).includes(String(u.id))).map(u=>u.name);
    return `<div class="respCard" data-resp-card="${esc(loc.name)}">
      <div class="respHead"><div class="respIcon">${loc.kind==='BODEGA'?'🏢':'🚐'}</div><div><b>${esc(loc.name)}</b><small>${loc.kind}${grp?' · '+esc(grp):''}</small></div><span class="respState ${people.length?'ok':'warn'}">${people.length?people.length+' RESPONSABLE(S)':'POR DEFINIR'}</span></div>
      ${habitual?`<div class="respSupply">📦 Abastecimiento habitual: <b>${esc(habitual)}</b></div>`:''}
      <div class="respType"><label>TIPO DE RESPONSABILIDAD</label><select data-resp-type="${esc(loc.name)}"><option value="INDIVIDUAL" ${row.type==='INDIVIDUAL'?'selected':''}>Individual</option><option value="COMPARTIDA" ${row.type==='COMPARTIDA'?'selected':''}>Compartida</option></select></div>
      <div class="respLabel">PERSONAS RESPONSABLES</div><div class="respPeople">${peopleHtml(loc.name,row)}</div>
      <div class="respFooter"><span>${people.length?'Actualmente: '+esc(people.join(' + ')):'Selecciona quién custodia esta ubicación.'}</span><button class="btn respSave" data-resp-save="${esc(loc.name)}">💾 GUARDAR RESPONSABILIDAD</button></div>
    </div>`;
  }

  function injectStyle(){
    if(document.getElementById('resp-ubicaciones-style'))return;
    const st=document.createElement('style');
    st.id='resp-ubicaciones-style';
    st.textContent=`.respWrap{margin-top:14px;border:1px solid #cfe1ec;border-radius:16px;background:linear-gradient(180deg,#fafdff,#edf7fd);padding:12px}.respTitle{display:flex;align-items:center;gap:9px;margin-bottom:9px}.respTitle strong{font-size:11px;color:#16436f}.respTitle small{display:block;font-size:8px;color:#6f8491;margin-top:2px}.respGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.respCard{background:#fff;border:1px solid #d7e5ed;border-radius:14px;padding:10px;box-shadow:0 6px 16px rgba(11,42,92,.06);transition:.17s}.respCard:hover{transform:translateY(-2px);border-color:#78b8e8;box-shadow:0 12px 25px rgba(11,42,92,.12)}.respHead{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center}.respIcon{width:35px;height:35px;border-radius:10px;background:linear-gradient(135deg,#e4f3ff,#cbe9ff);display:grid;place-items:center}.respHead b{font-size:10px;color:#16436f}.respHead small{display:block;font-size:7px;color:#718692;margin-top:2px}.respState{font-size:6px;font-weight:900;padding:4px 6px;border-radius:999px;border:1px solid}.respState.ok{background:#eaf8ef;border-color:#cbead7;color:#23734e}.respState.warn{background:#fff8e9;border-color:#f0d9a8;color:#8b5b15}.respSupply{font-size:7px;color:#587586;margin-top:7px;padding:6px 7px;border-radius:8px;background:#f3f9fd}.respType{margin-top:8px}.respType label,.respLabel{display:block;font-size:7px;font-weight:900;color:#607786;margin-bottom:4px}.respType select{width:100%;padding:7px;border-radius:8px;border:1px solid #cbdde8;background:#fff;font-size:8px}.respPeople{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;max-height:150px;overflow:auto}.respPerson{display:grid;grid-template-columns:auto auto 1fr;align-items:center;gap:6px;padding:6px;border:1px solid #dce8ef;border-radius:9px;background:#fbfdfe;cursor:pointer;transition:.14s}.respPerson:hover{transform:translateX(2px);border-color:#8ec2e6;background:#eef8ff}.respPerson.on{background:#eaf6ff;border-color:#69afe2}.respPerson input{accent-color:#1f75d8}.respAvatar{width:23px;height:23px;border-radius:50%;display:grid;place-items:center;background:#dceeff;color:#14588f;font-size:8px;font-weight:900}.respPerson b{font-size:8px;color:#264f6d}.respPerson small{display:block;font-size:6px;color:#7a8d98}.respFooter{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;padding-top:8px;border-top:1px solid #edf1f4}.respFooter span{font-size:7px;color:#677d89}.respSave{padding:7px 9px!important;font-size:7px!important;white-space:nowrap}.respEmpty{font-size:8px;color:#8a6570;padding:8px;background:#fff5f6;border:1px solid #f0d0d6;border-radius:8px}@media(max-width:850px){.respGrid{grid-template-columns:1fr}.respPeople{grid-template-columns:1fr}}`;
    document.head.appendChild(st);
  }

  function renderResponsibilities(){
    injectStyle();
    const panel=document.querySelector('.panel[data-step="3"]');
    if(!panel)return;
    panel.querySelector('.respWrap')?.remove();
    const flow=panel.querySelector('.opFlow');
    const wrap=document.createElement('div');
    wrap.className='respWrap';
    wrap.innerHTML=`<div class="respTitle"><div class="opPulse">👤</div><div><strong>RESPONSABILIDAD HABITUAL DE BODEGAS Y MINIBODEGAS</strong><small>Selecciona personas reales del Paso 3. La responsabilidad puede ser individual o compartida; las rotaciones del día se manejarán después desde Inicio de Jornada.</small></div></div><div class="respGrid">${allLocations().map(card).join('')}</div>`;
    if(flow)panel.insertBefore(wrap,flow);else panel.appendChild(wrap);
    wrap.querySelectorAll('.respPerson input').forEach(ch=>ch.addEventListener('change',()=>ch.closest('.respPerson')?.classList.toggle('on',ch.checked)));
    wrap.querySelectorAll('[data-resp-save]').forEach(btn=>btn.addEventListener('click',async()=>{
      const name=btn.dataset.respSave;
      const box=wrap.querySelector(`[data-resp-card="${CSS.escape(name)}"]`);
      const type=box.querySelector('[data-resp-type]').value;
      const people=[...box.querySelectorAll('[data-resp-person]:checked')].map(x=>x.value);
      if(type==='INDIVIDUAL'&&people.length>1){toast('⚠️ RESPONSABILIDAD INDIVIDUAL','Selecciona una sola persona o cambia a responsabilidad compartida.');return}
      if(!people.length){toast('⚠️ FALTA RESPONSABLE','Selecciona al menos una persona responsable.');return}
      const row={location:name,type,people,updatedAt:new Date().toISOString(),source:'CONFIGURADO'};
      const ok=await writeOne(row);
      saved[name]=row;
      renderResponsibilities();
      toast(ok?'✅ RESPONSABILIDAD GUARDADA':'⚠️ NO SE PUDO GUARDAR',ok?'La asignación queda lista para enlazarla con el backend.':'No fue posible persistir esta asignación en el navegador.');
    }));
  }

  const original=window.renderOps;
  window.renderOps=function(...args){const r=original(...args);setTimeout(renderResponsibilities,0);return r};

  (async()=>{
    saved=await readAll();
    for(const loc of allLocations()){
      if(!saved[loc.name]&&defaults[loc.name]){
        const row=defaultFor(loc.name);
        saved[loc.name]=row;
        await writeOne(row);
      }
    }
    ready=true;
    renderResponsibilities();
  })();
})();