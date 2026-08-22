(()=>{
  if(!window.state||typeof window.renderOps!=='function')return;

  const DB='disprotel_operacion_config_v2';
  const STORE='ubicaciones';
  const FALLBACK='disprotel_operacion_config_confirmada_v2';
  const editing=new Set();
  let saved={};

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const key=(kind,name)=>kind+'::'+name;

  function userRows(){
    return (state.users||[]).map((u,i)=>{
      if(Array.isArray(u)){
        const meta=u[3]&&typeof u[3]==='object'?u[3]:{};
        return {id:String(meta.id||meta.userId||meta.usuario||u[0]||i),name:String(u[0]||''),role:String(u[1]||'')};
      }
      return {id:String(u.id||u.user_id||u.usuario||u.nombre||u.name||i),name:String(u.nombre||u.name||u.usuario||''),role:String(u.rol||u.role||'')};
    }).filter(x=>x.name);
  }

  function locations(){
    return [
      ...(state.warehouses||[]).map(name=>({kind:'BODEGA',name})),
      ...(state.minis||[]).map(name=>({kind:'MINIBODEGA',name}))
    ];
  }

  function emptyRow(loc){
    return {id:key(loc.kind,loc.name),kind:loc.kind,name:loc.name,group:'',habitual:'',responsibility:'',people:[],confirmed:false};
  }

  function current(loc){
    return saved[key(loc.kind,loc.name)]||emptyRow(loc);
  }

  function openDB(){
    return new Promise((resolve,reject)=>{
      if(!('indexedDB' in window))return reject(new Error('indexeddb'));
      const r=indexedDB.open(DB,1);
      r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'});};
      r.onsuccess=()=>resolve(r.result);
      r.onerror=()=>reject(r.error||new Error('db'));
    });
  }

  async function readAll(){
    try{
      const db=await openDB();
      const rows=await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const r=tx.objectStore(STORE).getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error);});
      db.close();
      return Object.fromEntries(rows.map(r=>[r.id,r]));
    }catch(e){
      try{return JSON.parse(localStorage.getItem(FALLBACK)||'{}')}catch{return {}}
    }
  }

  async function persist(row){
    let ok=false;
    try{
      const db=await openDB();
      await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(row);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
      db.close();ok=true;
    }catch(e){}
    try{const all=JSON.parse(localStorage.getItem(FALLBACK)||'{}');all[row.id]=row;localStorage.setItem(FALLBACK,JSON.stringify(all));ok=true}catch(e){}
    saved[row.id]=row;
    state.opsConfirmed=state.opsConfirmed&&typeof state.opsConfirmed==='object'?state.opsConfirmed:{};
    state.opsConfirmed[row.id]=row;
    state.opsMeta=state.opsMeta&&typeof state.opsMeta==='object'?state.opsMeta:{};
    state.opsMeta.minis=state.opsMeta.minis&&typeof state.opsMeta.minis==='object'?state.opsMeta.minis:{};
    state.opsMeta.warehouses=state.opsMeta.warehouses&&typeof state.opsMeta.warehouses==='object'?state.opsMeta.warehouses:{};
    const bucket=row.kind==='MINIBODEGA'?state.opsMeta.minis:state.opsMeta.warehouses;
    bucket[row.name]=bucket[row.name]||{historyCount:0,active:true};
    bucket[row.name].group=row.group||'';
    bucket[row.name].habitual=row.habitual||'';
    bucket[row.name].responsibility=row.responsibility||'';
    bucket[row.name].people=[...(row.people||[])];
    try{save()}catch(e){}
    return ok;
  }

  function injectStyle(){
    if(document.getElementById('op-confirmed-v2-style'))return;
    const st=document.createElement('style');st.id='op-confirmed-v2-style';
    st.textContent=`.opLegacyHidden{display:none!important}.cfgBox{position:relative;z-index:3;margin-top:9px;padding:9px;border-radius:11px;border:1px solid #d6e5ee;background:#f9fcfe}.cfgBox.editing{background:#eef8ff;border-color:#77b9e6;box-shadow:0 0 0 3px rgba(31,117,216,.08)}.cfgTop{display:flex;align-items:center;justify-content:space-between;gap:8px}.cfgStatus{font-size:7px;font-weight:900;padding:5px 7px;border-radius:999px;border:1px solid}.cfgStatus.ok{background:#eaf8ef;border-color:#cbead7;color:#23734e}.cfgStatus.warn{background:#fff8e9;border-color:#efd9aa;color:#8b5b15}.cfgRead{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}.cfgField{padding:6px 7px;border-radius:8px;background:#fff;border:1px solid #e0eaf0}.cfgField span{display:block;font-size:6px;font-weight:900;color:#70838e;margin-bottom:2px}.cfgField b{font-size:8px;color:#244f70}.cfgActions{display:flex;gap:6px;justify-content:flex-end;margin-top:8px}.cfgBtn{border:1px solid #bdd8e8;background:#fff;color:#185f99;border-radius:8px;padding:7px 9px;font-size:7px;font-weight:900;cursor:pointer;transition:.15s}.cfgBtn:hover{transform:translateY(-2px);box-shadow:0 5px 12px rgba(11,42,92,.12)}.cfgBtn.save{background:linear-gradient(135deg,#0e67b4,#2189da);border-color:#0e67b4;color:#fff}.cfgEditGrid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px}.cfgEditField label,.cfgPeopleLabel{display:block;font-size:6px;font-weight:900;color:#607786;margin-bottom:3px}.cfgEditField select{width:100%;padding:7px;border-radius:8px;border:1px solid #bfd5e3;background:#fff;font-size:8px}.cfgPeople{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;margin-top:5px;max-height:150px;overflow:auto}.cfgPerson{display:flex;align-items:center;gap:6px;padding:6px;border-radius:8px;border:1px solid #dce8ef;background:#fff;font-size:7px;cursor:pointer}.cfgPerson.on{background:#eaf6ff;border-color:#69afe2}.cfgPerson input{accent-color:#1f75d8}.cfgHint{font-size:7px;color:#6f8491;margin-top:6px}.opSectionNote{font-size:7px;color:#627b8b;margin:-3px 0 7px}.opCard .opActions{position:relative;z-index:3}@media(max-width:800px){.cfgRead,.cfgEditGrid,.cfgPeople{grid-template-columns:1fr}}`;
    document.head.appendChild(st);
  }

  function opts(arr,current,exclude=''){
    const vals=['',...arr].filter((v,i,a)=>a.indexOf(v)===i && (!exclude||v!==exclude));
    return vals.map(v=>`<option value="${esc(v)}" ${v===current?'selected':''}>${v?esc(v):'Por definir'}</option>`).join('');
  }

  function names(ids){
    const map=new Map(userRows().map(u=>[String(u.id),u.name]));
    return (ids||[]).map(id=>map.get(String(id))).filter(Boolean);
  }

  function peopleEditor(loc,row){
    const us=userRows();
    if(!us.length)return '<div class="cfgHint">Primero crea usuarios en el Paso 3.</div>';
    return `<div class="cfgPeople">${us.map(u=>{const on=(row.people||[]).map(String).includes(String(u.id));return `<label class="cfgPerson ${on?'on':''}"><input type="checkbox" data-cfg-person="${esc(key(loc.kind,loc.name))}" value="${esc(u.id)}" ${on?'checked':''}><span><b>${esc(u.name)}</b>${u.role?` · ${esc(u.role)}`:''}</span></label>`}).join('')}</div>`;
  }

  function viewHtml(loc,row){
    const ps=names(row.people);
    return `<div class="cfgRead">
      <div class="cfgField"><span>GRUPO RESPONSABLE</span><b>${esc(row.group||'Por definir')}</b></div>
      <div class="cfgField"><span>ABASTECIMIENTO HABITUAL</span><b>${esc(row.habitual||'Por definir')}</b></div>
      <div class="cfgField"><span>RESPONSABILIDAD</span><b>${esc(row.responsibility||'Por definir')}</b></div>
      <div class="cfgField"><span>PERSONAS RESPONSABLES</span><b>${esc(ps.length?ps.join(' + '):'Por definir')}</b></div>
    </div><div class="cfgActions"><button class="cfgBtn" data-cfg-edit="${esc(key(loc.kind,loc.name))}">✏️ EDITAR</button></div>`;
  }

  function editHtml(loc,row){
    const warehouses=(state.warehouses||[]).filter(x=>x!==loc.name);
    return `<div class="cfgEditGrid">
      <div class="cfgEditField"><label>GRUPO RESPONSABLE${loc.kind==='BODEGA'?' (OPCIONAL)':''}</label><select data-cfg-group>${opts(state.groups||[],row.group)}</select></div>
      <div class="cfgEditField"><label>BODEGA DE ABASTECIMIENTO HABITUAL</label><select data-cfg-habitual>${opts(warehouses,row.habitual,loc.name)}</select></div>
      <div class="cfgEditField"><label>TIPO DE RESPONSABILIDAD</label><select data-cfg-resp><option value="" ${!row.responsibility?'selected':''}>Por definir</option><option value="INDIVIDUAL" ${row.responsibility==='INDIVIDUAL'?'selected':''}>Individual</option><option value="COMPARTIDA" ${row.responsibility==='COMPARTIDA'?'selected':''}>Compartida</option></select></div>
    </div><div class="cfgPeopleLabel" style="margin-top:8px">PERSONAS RESPONSABLES</div>${peopleEditor(loc,row)}<div class="cfgHint">Los cambios no se aplican hasta pulsar GUARDAR CAMBIOS.</div><div class="cfgActions"><button class="cfgBtn" data-cfg-cancel="${esc(key(loc.kind,loc.name))}">CANCELAR</button><button class="cfgBtn save" data-cfg-save="${esc(key(loc.kind,loc.name))}">💾 GUARDAR CAMBIOS</button></div>`;
  }

  function locateCard(loc){
    const cards=[...document.querySelectorAll('.opCard')];
    return cards.find(c=>{
      const small=c.querySelector('.opHead small')?.textContent||'';
      const title=c.querySelector('.opHead b')?.textContent||'';
      if(title.trim()!==String(loc.name).trim())return false;
      return loc.kind==='MINIBODEGA'?/Minibodega|unidad operativa/i.test(small):/Bodega física/i.test(small);
    });
  }

  function decorate(){
    injectStyle();
    for(const loc of locations()){
      const card=locateCard(loc);if(!card)continue;
      card.querySelectorAll('.opSelect').forEach(x=>x.classList.add('opLegacyHidden'));
      card.querySelector('.cfgBox')?.remove();
      const row=current(loc);const isEdit=editing.has(key(loc.kind,loc.name));
      const box=document.createElement('div');box.className='cfgBox'+(isEdit?' editing':'');
      box.innerHTML=`<div class="cfgTop"><b style="font-size:8px;color:#16436f">CONFIGURACIÓN DE RESPONSABILIDAD</b><span class="cfgStatus ${row.confirmed?'ok':'warn'}">${row.confirmed?'✓ CONFIGURACIÓN GUARDADA':'POR DEFINIR'}</span></div>${isEdit?editHtml(loc,row):viewHtml(loc,row)}`;
      const actions=card.querySelector('.opActions');actions?card.insertBefore(box,actions):card.appendChild(box);
    }
    bind();
  }

  function bind(){
    document.querySelectorAll('[data-cfg-edit]').forEach(b=>b.onclick=()=>{editing.add(b.dataset.cfgEdit);decorate();});
    document.querySelectorAll('[data-cfg-cancel]').forEach(b=>b.onclick=()=>{editing.delete(b.dataset.cfgCancel);decorate();});
    document.querySelectorAll('.cfgPerson input').forEach(ch=>ch.onchange=()=>ch.closest('.cfgPerson')?.classList.toggle('on',ch.checked));
    document.querySelectorAll('[data-cfg-save]').forEach(b=>b.onclick=async()=>{
      const id=b.dataset.cfgSave;const loc=locations().find(x=>key(x.kind,x.name)===id);if(!loc)return;
      const box=b.closest('.cfgBox');
      const group=box.querySelector('[data-cfg-group]')?.value||'';
      const habitual=box.querySelector('[data-cfg-habitual]')?.value||'';
      const responsibility=box.querySelector('[data-cfg-resp]')?.value||'';
      const people=[...box.querySelectorAll('[data-cfg-person]:checked')].map(x=>x.value);
      if(!group&&loc.kind==='MINIBODEGA')return toast('⚠️ FALTA GRUPO','Selecciona el grupo responsable de la minibodega.');
      if(!habitual)return toast('⚠️ FALTA ABASTECIMIENTO','Selecciona la bodega de abastecimiento habitual.');
      if(!responsibility)return toast('⚠️ FALTA RESPONSABILIDAD','Define si la responsabilidad es individual o compartida.');
      if(!people.length)return toast('⚠️ FALTAN PERSONAS','Selecciona al menos una persona responsable.');
      if(responsibility==='INDIVIDUAL'&&people.length!==1)return toast('⚠️ RESPONSABILIDAD INDIVIDUAL','Selecciona exactamente una persona.');
      if(responsibility==='COMPARTIDA'&&people.length<2)return toast('⚠️ RESPONSABILIDAD COMPARTIDA','Selecciona al menos dos personas.');
      const row={id,kind:loc.kind,name:loc.name,group,habitual,responsibility,people,confirmed:true,updatedAt:new Date().toISOString()};
      const ok=await persist(row);editing.delete(id);decorate();toast(ok?'✅ CONFIGURACIÓN GUARDADA':'⚠️ GUARDADO PARCIAL',ok?'Ahora la tarjeta muestra únicamente los valores confirmados.':'Quedó en memoria de esta sesión, pero el navegador rechazó la persistencia.');
    });
  }

  const originalRender=window.renderOps;
  window.renderOps=function(...args){const r=originalRender(...args);setTimeout(decorate,0);return r;};

  (async()=>{saved=await readAll();decorate();})();
})();