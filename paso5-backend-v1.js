(()=>{
  const API='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-catalogo-operativo';
  const SYSTEM=new Set(['inventario','compras','transferencias','area_tecnica','solicitudes','ip_remoto','admin_usuarios','admin_perfiles','admin_grupos','seguridad']);
  const META={
    inventario:['📦','Productos, seriales, stock, bodegas y minibodegas.'],
    compras:['🛒','Compras, ingresos y carga de equipos por lotes.'],
    transferencias:['🔄','Movimientos entre bodegas con aceptación del destino.'],
    area_tecnica:['🛠️','Supervisión, órdenes y ejecución del trabajo técnico.'],
    solicitudes:['🔔','Solicitudes administrativas y seguimiento operativo.'],
    ip_remoto:['🌐','Asignación de IP y control de acceso remoto.'],
    admin_usuarios:['👥','Creación, edición y seguridad de usuarios.'],
    admin_perfiles:['🧩','Perfiles, módulos y permisos individuales.'],
    admin_grupos:['🚚','Grupos técnicos, bodegas y minibodegas.'],
    seguridad:['🛡️','Auditoría, accesos y operaciones críticas.']
  };
  const session=(()=>{try{return JSON.parse((parent.sessionStorage||sessionStorage).getItem('disprotel_login_general_v2')||'null')}catch{return null}})();
  if(!session?.session_token){console.warn('Punto 5: sesión administrativa no disponible');return}
  let ready=false,timer=null,saving=false,lastSig='',workTypes=[];
  const status=(s,t,d='')=>{try{parent.disprotelSyncStatus?.(s,t,d)}catch{}};
  const headers=()=>({'Content-Type':'application/json','x-session':session.session_token,'x-user':session.usuario||''});
  async function call(body){
    const r=await fetch(API,{method:'POST',headers:headers(),body:JSON.stringify(body)});
    const d=await r.json().catch(()=>({error:'Respuesta inválida del servidor'}));
    if(!r.ok||d.error)throw new Error(d.error||'No se pudo guardar el catálogo');
    return d;
  }
  const slug=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80);
  function modulePayload(){return (state.modules||[]).map((m,i)=>({clave:m[4]||('custom-'+slug(m[0])),nombre:m[0],activo:m[3]!==false,orden:(i+1)*10}))}
  function typePayload(){
    const base=workTypes.filter(t=>t.es_sistema).map((t,i)=>({...t,orden:(i+1)*10}));
    const custom=(state.custom||[]).map((x,i)=>({clave:x.clave||('custom-'+slug(x.name)),nombre:x.name,familia:'Personalizados',descripcion:'Tipo de trabajo configurable',activo:x.active!==false,orden:1000+(i+1)*10}));
    return [...base,...custom];
  }
  function signature(){return JSON.stringify({m:modulePayload(),t:typePayload()})}
  async function syncNow(){
    if(!ready||saving)return;
    const sig=signature(); if(sig===lastSig)return;
    saving=true; status('saving','🟡 GUARDANDO PUNTO 5 EN LÍNEA…');
    try{
      await call({action:'sync_modules',modules:modulePayload()});
      await call({action:'sync_work_types',work_types:typePayload()});
      lastSig=signature();
      status('saved','✅ PUNTO 5 GUARDADO EN SUPABASE',new Date().toLocaleTimeString('es-EC'));
      toast('Guardado en línea','Módulos y catálogo técnico confirmados por Supabase.');
    }catch(e){
      status('error','🔴 PUNTO 5 PENDIENTE',e.message);
      toast('No se pudo guardar',e.message);
      console.warn('Punto 5 backend:',e);
    }finally{saving=false}
  }
  function schedule(){status('local','🟠 CAMBIO DEL PUNTO 5 PENDIENTE');clearTimeout(timer);timer=setTimeout(syncNow,350)}
  const localSave=save;
  save=function(){localSave();if(ready)schedule()};
  function applyModules(rows){
    state.modules=(rows||[]).map(r=>[r.nombre,META[r.clave]?.[0]||'🧩',META[r.clave]?.[1]||'Módulo configurable agregado por la empresa.',r.activo!==false,r.clave]);
    localSave();renderModules();
  }
  function familyArticles(){return [...document.querySelectorAll('.families .family')]}
  function renderFamilies(){
    const names=['Atención clientes','Infraestructura y red','Mantenimiento preventivo','Rutinas operativas'];
    familyArticles().forEach((article,i)=>{
      const box=article.querySelector('.familyList'); if(!box)return;
      const rows=workTypes.filter(t=>t.familia===names[i]);
      box.innerHTML=rows.map(t=>`<button class="work workToggle ${t.activo?'active':'inactive'}" onclick="toggleWorkType('${t.clave}')">${esc(t.nombre)} · ${t.activo?'ACTIVO':'INACTIVO'}</button>`).join('');
    });
  }
  window.toggleWorkType=function(key){
    const t=workTypes.find(x=>x.clave===key);if(!t)return;
    t.activo=!t.activo;renderFamilies();schedule();
  };
  window.deleteModule=function(i){
    const m=state.modules[i]; if(!m)return;
    const key=m[4]||'';
    if(SYSTEM.has(key)){toast('Módulo protegido','Los módulos base no se eliminan. Puedes desactivarlos con el interruptor.');return}
    if(confirm('¿Eliminar '+m[0]+'? Solo se permitirá si ningún perfil lo utiliza.')){state.modules.splice(i,1);localSave();renderModules();schedule()}
  };
  const oldAdd=addModule;
  addModule=function(){const before=state.modules.length;oldAdd();if(state.modules.length>before){const m=state.modules.at(-1);m[4]='custom-'+slug(m[0]);localSave();schedule()}};
  function decorate(){
    if(document.getElementById('p5BackendStyle'))return;
    const s=document.createElement('style');s.id='p5BackendStyle';s.textContent='.workToggle{cursor:pointer}.workToggle.active{background:#e9f8ef;border-color:#9ed5b5;color:#176c44}.workToggle.inactive{background:#fff0f2;border-color:#ecc2ca;color:#9d3043;opacity:.72}.backendLegend{margin:8px 0;padding:8px 10px;border-radius:10px;background:#eef8ff;border:1px solid #cce5f5;font-size:8px;color:#356579;font-weight:800}';document.head.appendChild(s);
    const sec=document.querySelector('.families')?.parentElement;
    if(sec){const d=document.createElement('div');d.className='backendLegend';d.textContent='Haz clic sobre un tipo de trabajo para activarlo o desactivarlo. Cada cambio se guarda en Supabase.';sec.insertBefore(d,sec.querySelector('.families'))}
  }
  async function init(){
    decorate();status('checking','🟡 CARGANDO PUNTO 5 DESDE SUPABASE…');
    try{
      const d=await call({action:'list'});
      workTypes=Array.isArray(d.work_types)?d.work_types:[];
      applyModules(d.modules||[]);
      state.custom=workTypes.filter(t=>!t.es_sistema&&t.activo).map(t=>({name:t.nombre,clave:t.clave,history:0,active:t.activo}));
      localSave();renderCustom();renderFamilies();
      ready=true;lastSig=signature();
      status('online','🟢 PUNTO 5 CONECTADO A SUPABASE',`${state.modules.length} módulos · ${workTypes.length} tipos`);
    }catch(e){status('error','🔴 PUNTO 5 SIN CONEXIÓN',e.message);console.warn(e)}
  }
  setTimeout(init,100);
})();