(()=>{
  if(window.__disprotelSupervisorZonasV1)return;
  window.__disprotelSupervisorZonasV1=true;

  const API='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-apoyo-interzonal';
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const session=(()=>{try{return JSON.parse(sessionStorage.getItem('disprotel_login_general_v2')||'{}')}catch{return{}}})();
  const token=String(session.session_token||'');
  if(!token)return;

  const params=new URLSearchParams(location.search);
  const isRubi=params.get('rubi')==='1'||norm(session.nombre).includes('RUBI');
  const isFernando=norm(session.rol)==='SUPERVISOR TECNICO'||norm(session.nombre).includes('FERNANDO');
  if(!isRubi&&!isFernando&&!session.es_admin_principal)return;

  let loading=false,last=[];

  function style(){
    if(document.getElementById('supervisorZonasStyle'))return;
    const s=document.createElement('style');s.id='supervisorZonasStyle';s.textContent=`
      .szWrap{margin:12px 0 14px}.szTitle{display:flex;align-items:end;gap:9px;margin:0 0 8px}.szTitle h2{margin:0;color:#0c3266;font-size:16px}.szTitle span{font-size:9px;color:#71848f}.szZones{display:grid;grid-template-columns:1fr 1fr;gap:9px}.szZone{position:relative;overflow:hidden;border-radius:16px;padding:13px;background:rgba(255,255,255,.96);border:1px solid #dce9f1;box-shadow:0 12px 28px rgba(11,42,92,.10)}.szZone:before{content:"";position:absolute;inset:0 auto 0 0;width:4px}.szZone.salcedo:before{background:linear-gradient(#0b2a5c,#2a85df)}.szZone.regional:before{background:linear-gradient(#1a8f73,#55c6a9)}.szZoneHead{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.szZone h3{margin:0;color:#123866;font-size:14px}.szZone p{margin:5px 0 0;font-size:9px;line-height:1.45;color:#71838d}.szPill{white-space:nowrap;border-radius:999px;padding:5px 8px;font-size:8px;font-weight:900;background:#eaf3fc;color:#245d91}.szZone.regional .szPill{background:#e9f8f3;color:#24725c}.szMeta{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.szMeta span{padding:5px 7px;border-radius:8px;background:#f2f7fa;border:1px solid #e0eaf0;color:#45606e;font-size:8px;font-weight:900}.szQueue{margin-top:9px;background:#fff;border:1px solid #dde8ef;border-radius:16px;padding:12px;box-shadow:0 12px 28px rgba(11,42,92,.09)}.szQueueHead{display:flex;align-items:center;gap:8px}.szQueueHead h3{margin:0;color:#123866;font-size:13px}.szCount{margin-left:auto;min-width:26px;text-align:center;padding:5px 8px;border-radius:999px;background:#eef5fb;color:#245d91;font-size:9px;font-weight:1000}.szCount.hot{background:#fff0d9;color:#965f00;animation:szPulse 1.2s ease-in-out infinite}.szRows{display:grid;gap:7px;margin-top:9px}.szRow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;border:1px solid #e1eaf0;background:#f9fbfd;border-radius:11px;padding:9px}.szRow b{font-size:10px;color:#143766}.szRow .meta{font-size:8px;color:#72848e;margin-top:3px;line-height:1.4}.szReason{margin-top:5px;padding:6px 8px;border-radius:8px;background:#fff8e8;border:1px solid #f0dfad;color:#805d13;font-size:8px}.szActions{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}.szActions button{border:0;border-radius:8px;padding:7px 8px;font-size:8px;font-weight:900;cursor:pointer;color:#fff;background:#0b2a5c}.szActions button:nth-child(2){background:#1966aa}.szActions button.reprogram{background:#8b6407}.szActions button:disabled{opacity:.48;cursor:not-allowed}.szEmpty{padding:9px 2px;color:#74858f;font-size:9px}.szRead{margin-top:8px;padding:7px 9px;border-radius:9px;background:#e9f7ef;color:#176b46;border:1px solid #bce5cd;font-size:8px;font-weight:900}.szToast{position:fixed;right:15px;bottom:15px;z-index:1200;background:#0d315f;color:#fff;border-radius:12px;padding:10px 12px;box-shadow:0 18px 42px #0004;font-size:9px;display:none}.szToast.show{display:block}.szToast.err{background:#8d2b2b}@keyframes szPulse{50%{box-shadow:0 0 0 6px rgba(222,150,23,.12)}}@media(max-width:760px){.szZones{grid-template-columns:1fr}.szRow{grid-template-columns:1fr}.szActions{justify-content:flex-start}}
    `;document.head.appendChild(s);
  }

  function mount(){
    style();
    if(document.getElementById('supervisorZonasInterzonales'))return true;
    const metrics=document.querySelector('.metrics');
    if(!metrics)return false;
    const box=document.createElement('section');
    box.id='supervisorZonasInterzonales';box.className='szWrap';
    box.innerHTML=`<div class="szTitle"><h2>Supervisión por zonas</h2><span>Salcedo como prioridad operativa y Saquisilí–Latacunga como zona regional supervisada.</span></div><div class="szZones"><article class="szZone salcedo"><div class="szZoneHead"><div><h3>📍 SALCEDO</h3><p>Zona prioritaria del Supervisor Técnico. Desde aquí se presta apoyo cuando la operación regional no tiene grupo disponible.</p></div><span class="szPill">PRIORIDAD FERNANDO</span></div><div class="szMeta"><span>🚙 CAMIONETA</span><span>🚐 FURGONETA</span><span>🏢 MATRIZ SALCEDO</span></div></article><article class="szZone regional"><div class="szZoneHead"><div><h3>🧭 SAQUISILÍ–LATACUNGA</h3><p>Zona regional bajo supervisión de Fernando. Mantiene su operación local y solicita apoyo de Salcedo solo cuando es necesario.</p></div><span class="szPill">SUPERVISIÓN REGIONAL</span></div><div class="szMeta"><span>📌 SAQUISILÍ</span><span>📌 LATACUNGA</span><span id="szRegionalPending">0 apoyos pendientes</span></div></article></div><div class="szQueue"><div class="szQueueHead"><h3>🤝 Solicitudes de apoyo interzonal</h3><span id="szQueueCount" class="szCount">0</span></div>${isRubi?'<div class="szRead">👁️ Vista de consulta para Rubí. Las decisiones operativas corresponden al Supervisor Técnico.</div>':''}<div id="szRows" class="szRows"><div class="szEmpty">Consultando solicitudes pendientes…</div></div></div><div id="szToast" class="szToast"></div>`;
    metrics.insertAdjacentElement('afterend',box);
    return true;
  }

  async function api(body){
    const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','x-session':token},body:JSON.stringify(body),cache:'no-store'});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||d.error)throw new Error(d.error||'No se pudo completar la operación');
    return d;
  }

  function ago(v){
    const t=new Date(v).getTime();if(!Number.isFinite(t))return '';
    const m=Math.max(0,Math.round((Date.now()-t)/60000));
    if(m<60)return `hace ${m} min`;
    const h=Math.floor(m/60);return h<24?`hace ${h} h`:`hace ${Math.floor(h/24)} d`;
  }

  function toast(text,err=false){const el=document.getElementById('szToast');if(!el)return;el.textContent=text;el.className='szToast show'+(err?' err':'');clearTimeout(toast.t);toast.t=setTimeout(()=>el.className='szToast',2600)}

  function render(arr){
    last=Array.isArray(arr)?arr:[];
    const rows=document.getElementById('szRows'),count=document.getElementById('szQueueCount'),regional=document.getElementById('szRegionalPending');if(!rows)return;
    const n=last.length;count.textContent=String(n);count.classList.toggle('hot',n>0);regional.textContent=`${n} apoyo${n===1?'':'s'} pendiente${n===1?'':'s'}`;
    if(!n){rows.innerHTML='<div class="szEmpty">✅ No hay solicitudes de apoyo interzonal pendientes.</div>';return}
    rows.innerHTML=last.map(x=>{const o=x.orden||{},sol=x.solicitado_por||{};return `<div class="szRow"><div><b>${esc(o.id_orden||'OT')} · ${esc(o.cliente_nombre_final||o.cliente_nombre||'Cliente')}</b><div class="meta">${esc(x.zona_origen||'SAQUISILÍ–LATACUNGA')} · ${esc(String(o.tipo_trabajo||'').replaceAll('_',' '))} · solicitado por ${esc(sol.nombre||'responsable local')} · ${esc(ago(x.created_at))}</div><div class="szReason">${esc(x.motivo||'Sin motivo registrado')}</div></div><div class="szActions">${isRubi?'<button disabled>Solo consulta</button>':`<button data-act="CAMIONETA" data-id="${esc(x.id)}">CAMIONETA</button><button data-act="FURGONETA" data-id="${esc(x.id)}">FURGONETA</button><button class="reprogram" data-act="REPROGRAMAR" data-id="${esc(x.id)}">REPROGRAMAR</button>`}</div></div>`}).join('');
    if(!isRubi)rows.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>resolve(b));
  }

  async function resolve(btn){
    if(loading)return;
    const id=btn.dataset.id,act=btn.dataset.act;
    const item=last.find(x=>String(x.id)===String(id));if(!item)return;
    const ot=item.orden?.id_orden||'la OT';
    const question=act==='REPROGRAMAR'?`¿Sugerir reprogramar ${ot}?`:`¿Asignar apoyo de ${act} de Salcedo a ${ot}?`;
    if(!confirm(question))return;
    loading=true;document.querySelectorAll('#szRows button').forEach(x=>x.disabled=true);
    try{
      if(act==='REPROGRAMAR')await api({action:'suggest-reprogram',solicitud_id:id,respuesta:'Reprogramar por disponibilidad operativa regional'});
      else await api({action:'assign-salcedo',solicitud_id:id,grupo_destino:act,respuesta:`Apoyo interzonal autorizado con ${act}`});
      toast(act==='REPROGRAMAR'?'Reprogramación sugerida y registrada.':`Apoyo ${act} asignado correctamente.`);
      await load();
    }catch(e){toast(e.message||'No se pudo resolver',true)}finally{loading=false}
  }

  async function load(){
    if(document.hidden)return;
    if(!mount())return;
    try{const d=await api({action:'pending'});render(d.solicitudes||[])}catch(e){const rows=document.getElementById('szRows');if(rows)rows.innerHTML=`<div class="szEmpty">⚠ ${esc(e.message)}</div>`}
  }

  let tries=0;const boot=setInterval(()=>{if(mount()||++tries>30){clearInterval(boot);load()}},150);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()});
  setInterval(load,15000);
})();