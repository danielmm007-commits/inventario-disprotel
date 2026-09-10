(()=>{
if(window.__supervisorOtProgresoV1)return;window.__supervisorOtProgresoV1=true;
const KEY='disprotel_login_general_v2',API='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-panel-supervisor';
let me={};try{me=JSON.parse(sessionStorage.getItem(KEY)||'{}')}catch{}
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toUpperCase();
if(!norm(me.rol).includes('SUPERVISOR TECNICO')||!me.session_token)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>{try{return new Date(v).toLocaleTimeString('es-EC',{hour:'2-digit',minute:'2-digit'})}catch{return''}};
const terminal=s=>['COMPLETADA','FINALIZADA','CANCELADA','CANCELADA EN SITIO','CANCELADA_EN_SITIO','NO EJECUTADA CLIENTE','NO_EJECUTADA_CLIENTE'].includes(norm(s));
function stepsFor(o){const t=norm(o.tipo_trabajo),s=norm(o.estado);let labels=t.includes('INSTAL')?['Creada','Asignada','Tomada','Traslado','En sitio','IP','ONU','Remoto','Evidencias','Finalizada']:t.includes('SOPORTE')?['Creada','Asignada','Tomada','Traslado','En sitio','Diagnóstico','Solución','Pruebas','Evidencias','Finalizada']:['Creada','Asignada','Tomada','Traslado','En sitio','Ejecución','Validación','Finalizada'];let idx=0;
 if(/ASIGNAD/.test(s))idx=1;
 if(/TOMAD|ACEPTAD|RECIBID/.test(s))idx=2;
 if(/CAMINO|TRASLAD/.test(s))idx=3;
 if(/SITIO|LLEGAD/.test(s))idx=4;
 if(/PROCESO|EJECU/.test(s))idx=Math.max(idx,5);
 if(/REVISION|VALIDA/.test(s))idx=Math.max(idx,labels.length-2);
 if(terminal(s))idx=labels.length-1;
 const ev=(o.eventos||[]).map(x=>norm(x.evento)).join(' ');
 if(/TOMAD|ACEPTAD|RECIBID/.test(ev))idx=Math.max(idx,2);
 if(/CAMINO|TRASLAD/.test(ev))idx=Math.max(idx,3);
 if(/SITIO|LLEGAD/.test(ev))idx=Math.max(idx,4);
 if(t.includes('INSTAL')){
   if(/IP.*CONFIRM|CONFIRM.*IP/.test(ev))idx=Math.max(idx,5);
   if(/ONU/.test(ev))idx=Math.max(idx,6);
   if(o.acceso_remoto||/ACCESO REMOTO|REMOTO/.test(ev))idx=Math.max(idx,7);
   if(/EVIDEN/.test(ev))idx=Math.max(idx,8);
 }
 if(t.includes('SOPORTE')){
   if(/DIAGNOST/.test(ev))idx=Math.max(idx,5);
   if(/SOLUC/.test(ev))idx=Math.max(idx,6);
   if(/PRUEB|VALIDA/.test(ev))idx=Math.max(idx,7);
   if(/EVIDEN/.test(ev))idx=Math.max(idx,8);
 }
 return {labels,idx};
}
function css(){if(document.getElementById('supOtProgressCss'))return;const s=document.createElement('style');s.id='supOtProgressCss';s.textContent=`.otLivePanel{margin-top:10px}.otLiveHead{padding:12px 14px;border-bottom:1px solid #e0e8ed;display:flex;align-items:center;gap:9px}.otLiveHead b{color:#0e315f;font-size:13px}.otLiveHead small{color:#758893;font-size:8px}.otLiveHead .liveDot{width:8px;height:8px;border-radius:50%;background:#26a269;box-shadow:0 0 0 4px #26a26920}.otLiveList{padding:10px;display:grid;gap:9px}.otLiveCard{border:1px solid #dce7ed;border-radius:12px;background:#fbfdfe;padding:10px 11px}.otLiveTop{display:flex;align-items:flex-start;gap:9px}.otLiveId{font-size:10px;font-weight:1000;color:#0d5ead}.otLiveClient{font-size:10px;font-weight:900;color:#173a59}.otLiveMeta{font-size:8px;color:#758893;margin-top:2px}.otLiveState{margin-left:auto;border-radius:999px;padding:5px 7px;background:#e8f3ff;color:#155f9e;font-size:7px;font-weight:1000;white-space:nowrap}.otLiveState.pause{background:#fff1d8;color:#9b6200}.otTimeline{display:grid;grid-template-columns:repeat(var(--n),minmax(42px,1fr));margin-top:12px;overflow-x:auto;padding:2px 2px 4px}.otStep{position:relative;text-align:center;min-width:52px}.otStep:before{content:'';position:absolute;height:3px;left:0;right:0;top:9px;background:#d8e2e8}.otStep:first-child:before{left:50%}.otStep:last-child:before{right:50%}.otStep.done:before,.otStep.current:before{background:#279965}.otDot{position:relative;z-index:2;width:19px;height:19px;border-radius:50%;margin:auto;display:grid;place-items:center;background:#fff;border:2px solid #c7d5dd;color:#8ca0aa;font-size:8px;font-weight:1000}.otStep.done .otDot{background:#279965;border-color:#279965;color:#fff}.otStep.current .otDot{background:#0d6cbc;border-color:#0d6cbc;color:#fff;box-shadow:0 0 0 4px #0d6cbc20}.otStep label{display:block;margin-top:5px;font-size:7px;font-weight:900;color:#6b7f8a;white-space:nowrap}.otStep.current label{color:#0d5ead}.otUpdated{margin-top:7px;font-size:7px;color:#7c8d96;text-align:right}.otEmpty{padding:22px;text-align:center;color:#71838e;font-size:9px}@media(max-width:720px){.otLiveTop{flex-wrap:wrap}.otLiveState{margin-left:0}.otTimeline{grid-template-columns:repeat(var(--n),70px)}}`;document.head.appendChild(s)}
function ensure(){const app=document.querySelector('.scApp .scMain');if(!app)return null;let p=document.getElementById('otLivePanel');if(p)return p;p=document.createElement('article');p.id='otLivePanel';p.className='scPanel otLivePanel';p.innerHTML='<header class="otLiveHead"><span class="liveDot"></span><b>Órdenes en ejecución</b><small>avance desde creación hasta finalización</small></header><div class="otLiveList"><div class="otEmpty">Cargando órdenes activas…</div></div>';const k=app.querySelector('.scKpis');if(k?.nextSibling)app.insertBefore(p,k.nextSibling);else app.appendChild(p);return p}
function card(o){const {labels,idx}=stepsFor(o),paused=/PAUS|REPROGRAM/.test(norm(o.estado));return `<div class="otLiveCard"><div class="otLiveTop"><div><div class="otLiveId">${esc(o.id_orden||o.id)}</div><div class="otLiveClient">${esc(o.cliente_nombre||'Cliente')}</div><div class="otLiveMeta">${esc(o.tipo_trabajo||'OT')} · ${esc(o.grupo_asignado||o.grupo_destino||'Sin grupo')} · ${esc(o.zona||'')}</div></div><span class="otLiveState ${paused?'pause':''}">${esc(o.estado||'ACTIVA')}</span></div><div class="otTimeline" style="--n:${labels.length}">${labels.map((x,i)=>`<div class="otStep ${i<idx?'done':i===idx?'current':''}"><span class="otDot">${i<idx?'✓':i+1}</span><label>${esc(x)}</label></div>`).join('')}</div><div class="otUpdated">Última actualización: ${fmt(o.updated_at)}</div></div>`}
async function load(){const p=ensure();if(!p)return;try{const r=await fetch(API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','x-session':me.session_token},body:JSON.stringify({action:'dashboard'})}),d=await r.json().catch(()=>({}));if(!r.ok||d.error)throw new Error(d.error||'No se pudo cargar');const active=(d.orders||[]).filter(o=>!terminal(o.estado)&&!['CREADA','PENDIENTE','POR ASIGNAR'].includes(norm(o.estado)));const list=p.querySelector('.otLiveList');list.innerHTML=active.length?active.map(card).join(''):'<div class="otEmpty">No hay OTs en ejecución en este momento.</div>';const field=document.querySelector('.scKpi.teal strong');if(field)field.textContent=String(active.length)}catch(e){const list=p.querySelector('.otLiveList');if(list)list.innerHTML='<div class="otEmpty">No se pudo actualizar el avance de las OTs.</div>'}}
css();let tries=0;const boot=setInterval(()=>{if(ensure()){clearInterval(boot);load()}else if(++tries>40)clearInterval(boot)},150);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()});setInterval(()=>{if(!document.hidden)load()},15000);
})();