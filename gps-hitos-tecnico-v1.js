(()=>{
const GPS_API='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-gps-orden';
const REAS_API='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-reasignacion-orden';
const oldJobHtml=window.jobHtml;
if(typeof oldJobHtml!=='function')return;
function creds(){try{return JSON.parse(sessionStorage.getItem('disprotel_trabajos_test')||'null')||{}}catch{return{}}}
function tipoSoporte(o){return o?.tipo_trabajo==='SOPORTE_TECNICO'}
function puedeReasignar(o){return ['ACEPTADA','EN_CAMINO'].includes(String(o?.estado||'').toUpperCase())}
window.jobHtml=function(o,disp=false,hist=false){
  let html=oldJobHtml(o,disp,hist);
  if(disp||hist)return html;
  html=html.replace('<div class="job ','<div data-orden-id="'+o.id+'" class="job ');
  const estado=String(o?.estado||'').toUpperCase();
  if(estado==='PENDIENTE_REPROGRAMACION')return html;
  const start=tipoSoporte(o)?'':(estado==='ACEPTADA'?`<button type="button" class="gpsOpBtn gpsStart" onclick="registrarHitoGps('${o.id}','inicio-traslado',this)">🚗 INICIAR TRASLADO</button>`:'');
  const arrival=estado==='EN_CAMINO'?`<button type="button" class="gpsOpBtn gpsArrival" onclick="registrarHitoGps('${o.id}','llegada',this)">📍 LLEGADA AL CLIENTE</button>`:'';
  const reas=puedeReasignar(o)?`<button type="button" class="gpsOpBtn reasBtn" data-reas-btn="${o.id}" onclick="solicitarReasignacion('${o.id}',this)">↪ SOLICITAR REASIGNACIÓN</button>`:'';
  if(!start&&!arrival&&!reas)return html;
  const ops=`<div class="gpsOps" data-gps-ops="${o.id}"><div class="gpsOpsHead"><b>DESPLAZAMIENTO</b><span class="gpsOpsState">${estado.replaceAll('_',' ')}</span></div><div class="gpsOpsTimes"></div><div class="gpsOpsButtons">${start}${arrival}${reas}</div><div class="reasState" data-reas-state="${o.id}"></div></div>`;
  const pos=html.lastIndexOf('</div>');
  return pos>=0?html.slice(0,pos)+ops+html.slice(pos):html;
};
function css(){if(document.getElementById('gpsHitosCss'))return;const s=document.createElement('style');s.id='gpsHitosCss';s.textContent=`
.gpsOps{margin-top:12px!important;padding:11px;border:1px solid #cfdde5;border-radius:12px;background:#fff}.gpsOpsHead{display:flex;justify-content:space-between;gap:8px;align-items:center;margin:0!important}.gpsOpsHead b{font-size:11px;color:#60737c;letter-spacing:.4px}.gpsOpsState{font-size:11px;font-weight:900;padding:5px 8px;border-radius:999px;background:#eef3f6;color:#17313d}.gpsOpsTimes{font-size:11px;color:#60737c;line-height:1.45;margin-top:7px!important}.gpsOpsButtons{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:8px!important}.gpsOpsButtons button{margin:0!important;padding:11px 8px!important;font-size:13px!important}.gpsStart{background:#1769aa!important}.gpsArrival{background:#17824f!important}.reasBtn{background:#a76511!important}.reasBtn.pending{background:#f5e9cf!important;color:#79530b!important;border:1px solid #d9b46f!important}.gpsOpDone{background:#e8f6ed!important;color:#17643e!important;border:1px solid #9fd1b2!important}.gpsOpWarn{background:#fff3cd!important;color:#755e00!important}.gpsOpBtn:disabled{opacity:.7;cursor:default}.reasState{margin-top:8px!important}.reasNotice{padding:9px 10px;border-radius:10px;background:#fff4d7;border:1px solid #e4c275;color:#72520a;font-size:11px;line-height:1.45}@media(max-width:600px){.gpsOpsButtons{grid-template-columns:1fr}}
`;document.head.appendChild(s)}
async function gpsApi(orden,action,payload={}){const c=creds();const r=await fetch(GPS_API,{method:'POST',headers:{'Content-Type':'application/json','x-session':c.session_token||''},body:JSON.stringify({orden_id:orden,action,...payload})});const d=await r.json().catch(()=>({error:'Respuesta inválida'}));if(!r.ok)throw new Error(d.error||'Error GPS');return d}
async function reasApi(orden,action,payload={}){const c=creds();const r=await fetch(REAS_API,{method:'POST',headers:{'Content-Type':'application/json','x-session':c.session_token||''},body:JSON.stringify({orden_id:orden,action,...payload})});const d=await r.json().catch(()=>({error:'Respuesta inválida'}));if(!r.ok)throw new Error(d.error||'Error de reasignación');return d}
function geoErrorState(e){return e?.code===1?'PERMISO_DENEGADO':'NO_DISPONIBLE'}
function obtenerGps(){return new Promise((resolve,reject)=>{if(!navigator.geolocation)return reject({code:0,message:'GPS no disponible'});navigator.geolocation.getCurrentPosition(p=>resolve({latitud:p.coords.latitude,longitud:p.coords.longitude,precision_m:p.coords.accuracy,capturado_at:new Date().toISOString()}),reject,{enableHighAccuracy:true,timeout:15000,maximumAge:0})})}
window.registrarHitoGps=async function(orden,action,btn){
 const original=btn?.textContent||'';if(btn){btn.disabled=true;btn.textContent='📍 OBTENIENDO GPS...'}
 let payload={estado_gps:'NO_DISPONIBLE',detalle:null};
 try{const g=await obtenerGps();payload={...g,estado_gps:'REGISTRADO',detalle:null}}catch(e){payload={estado_gps:geoErrorState(e),detalle:String(e?.message||'GPS no disponible').slice(0,250)}}
 try{await gpsApi(orden,action,payload);const ok=payload.estado_gps==='REGISTRADO';if(typeof window.showMsg==='function')window.showMsg(ok?'Hito registrado con ubicación.':'Hito registrado; GPS no disponible.',true);await window.cargar?.()}catch(e){if(typeof window.showMsg==='function')window.showMsg('No se pudo registrar el hito: '+e.message)}finally{if(btn&&document.body.contains(btn)){btn.disabled=false;btn.textContent=original}}
};
window.solicitarReasignacion=async function(orden,btn){
 const motivo=prompt('Indica por qué no pueden continuar con este trabajo. Este motivo se enviará al Supervisor Técnico:');
 if(motivo===null)return;
 const limpio=String(motivo||'').trim();
 if(limpio.length<10){if(typeof window.showMsg==='function')window.showMsg('El motivo debe tener al menos 10 caracteres.');return}
 const original=btn?.textContent||'';if(btn){btn.disabled=true;btn.textContent='ENVIANDO...'}
 try{const d=await reasApi(orden,'request',{motivo:limpio});if(typeof window.showMsg==='function')window.showMsg(d.message||'Solicitud de reasignación enviada.',true);await refrescarReasignacion(orden)}catch(e){if(typeof window.showMsg==='function')window.showMsg(e.message)}finally{if(btn&&!btn.classList.contains('pending')){btn.disabled=false;btn.textContent=original}}
};
function hora(v){try{return new Date(v).toLocaleTimeString('es-EC',{hour:'2-digit',minute:'2-digit'})}catch{return '—'}}
async function refrescarHitos(orden){const box=document.querySelector(`[data-gps-ops="${orden}"]`);if(!box)return;try{const d=await gpsApi(orden,'hitos');const hs=d.hitos||[],map=Object.fromEntries(hs.map(x=>[x.tipo_evento,x]));const a=map.ACEPTACION,t=map.INICIO_TRASLADO,l=map.LLEGADA;const state=box.querySelector('.gpsOpsState'),times=box.querySelector('.gpsOpsTimes');if(l)state.textContent='📍 EN SITIO';else if(t)state.textContent='🚗 EN CAMINO';const line=[];if(a)line.push(`Aceptada ${hora(a.capturado_at)}`);if(t)line.push(`Traslado ${hora(t.capturado_at)}${t.estado_gps!=='REGISTRADO'?' · sin GPS':''}`);if(l)line.push(`Llegada ${hora(l.capturado_at)}${l.estado_gps!=='REGISTRADO'?' · sin GPS':''}`);times.textContent=line.join('  ·  ')||'Sin hitos registrados'}catch{}}
async function refrescarReasignacion(orden){const host=document.querySelector(`[data-reas-state="${orden}"]`),btn=document.querySelector(`[data-reas-btn="${orden}"]`);if(!host&&!btn)return;try{const d=await reasApi(orden,'status'),s=d.solicitud;if(s?.estado==='PENDIENTE'){if(host)host.innerHTML=`<div class="reasNotice"><b>⏳ REASIGNACIÓN SOLICITADA</b><br>${String(s.motivo||'').replace(/[<>&]/g,'')}<br>Enviada: ${new Date(s.created_at).toLocaleString('es-EC')}</div>`;if(btn){btn.disabled=true;btn.textContent='⏳ REASIGNACIÓN SOLICITADA';btn.classList.add('pending')}}else{if(host)host.innerHTML='';if(btn){btn.disabled=false;btn.classList.remove('pending');btn.textContent='↪ SOLICITAR REASIGNACIÓN'}}}catch{}}
async function refrescarTodos(){const ids=[...document.querySelectorAll('[data-gps-ops]')].map(x=>x.dataset.gpsOps).filter(Boolean);await Promise.allSettled(ids.flatMap(id=>[refrescarHitos(id),refrescarReasignacion(id)]))}
const oldCargar=window.cargar;if(typeof oldCargar==='function')window.cargar=async function(...args){const r=await oldCargar(...args);setTimeout(refrescarTodos,80);return r};
const oldCamino=window.marcarEnCamino;if(typeof oldCamino==='function')window.marcarEnCamino=async function(id){const r=await oldCamino(id);const fake={textContent:'🚗 MARCAR EN CAMINO',disabled:false};await window.registrarHitoGps(id,'inicio-traslado',fake);return r};
css();setTimeout(refrescarTodos,1000);
if(!document.getElementById('continuidadTecnicoLoader')){const s=document.createElement('script');s.id='continuidadTecnicoLoader';s.src='continuidad-tecnico-v1.js?v=20260901-1937';document.body.appendChild(s)}
})();