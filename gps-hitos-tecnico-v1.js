(()=>{
const GPS_API='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-gps-orden';
const oldJobHtml=window.jobHtml;
if(typeof oldJobHtml!=='function')return;
function own(o){return !o?.aceptado_por?.nombre||String(o.aceptado_por.nombre).trim().toLocaleUpperCase('es-EC')===String(window.ME?.nombre||'').trim().toLocaleUpperCase('es-EC')}
function tipoSoporte(o){return o?.tipo_trabajo==='SOPORTE_TECNICO'}
window.jobHtml=function(o,disp=false,hist=false){
  let html=oldJobHtml(o,disp,hist);
  if(disp||hist||!own(o))return html;
  html=html.replace('<div class="job ','<div data-orden-id="'+o.id+'" class="job ');
  const start=tipoSoporte(o)?'':`<button type="button" class="gpsOpBtn gpsStart" onclick="registrarHitoGps('${o.id}','inicio-traslado',this)">🚗 INICIAR TRASLADO</button>`;
  const ops=`<div class="gpsOps" data-gps-ops="${o.id}"><div class="gpsOpsHead"><b>DESPLAZAMIENTO</b><span class="gpsOpsState">ACEPTADA</span></div><div class="gpsOpsTimes"></div><div class="gpsOpsButtons">${start}<button type="button" class="gpsOpBtn gpsArrival" onclick="registrarHitoGps('${o.id}','llegada',this)">📍 LLEGADA AL CLIENTE</button></div></div>`;
  const pos=html.lastIndexOf('</div>');
  return pos>=0?html.slice(0,pos)+ops+html.slice(pos):html;
};
function css(){if(document.getElementById('gpsHitosCss'))return;const s=document.createElement('style');s.id='gpsHitosCss';s.textContent=`
.gpsOps{margin-top:12px!important;padding:11px;border:1px solid #cfdde5;border-radius:12px;background:#fff}.gpsOpsHead{display:flex;justify-content:space-between;gap:8px;align-items:center;margin:0!important}.gpsOpsHead b{font-size:11px;color:#60737c;letter-spacing:.4px}.gpsOpsState{font-size:11px;font-weight:900;padding:5px 8px;border-radius:999px;background:#eef3f6;color:#17313d}.gpsOpsTimes{font-size:11px;color:#60737c;line-height:1.45;margin-top:7px!important}.gpsOpsButtons{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:8px!important}.gpsOpsButtons button{margin:0!important;padding:11px 8px!important;font-size:13px!important}.gpsStart{background:#1769aa!important}.gpsArrival{background:#17824f!important}.gpsOpDone{background:#e8f6ed!important;color:#17643e!important;border:1px solid #9fd1b2!important}.gpsOpWarn{background:#fff3cd!important;color:#755e00!important}.gpsOpBtn:disabled{opacity:.7;cursor:default}@media(max-width:600px){.gpsOpsButtons{grid-template-columns:1fr}}
`;document.head.appendChild(s)}
async function gpsApi(orden,action,payload={}){const r=await fetch(GPS_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({usuario:window.US,pin:window.PIN,orden_id:orden,action,...payload})});const d=await r.json().catch(()=>({error:'Respuesta inválida'}));if(!r.ok)throw new Error(d.error||'Error GPS');return d}
function geoErrorState(e){return e?.code===1?'PERMISO_DENEGADO':'NO_DISPONIBLE'}
function obtenerGps(){return new Promise((resolve,reject)=>{if(!navigator.geolocation)return reject({code:0,message:'GPS no disponible'});navigator.geolocation.getCurrentPosition(p=>resolve({latitud:p.coords.latitude,longitud:p.coords.longitude,precision_m:p.coords.accuracy,capturado_at:new Date().toISOString()}),reject,{enableHighAccuracy:true,timeout:15000,maximumAge:0})})}
window.registrarHitoGps=async function(orden,action,btn){
 const original=btn?.textContent||'';if(btn){btn.disabled=true;btn.textContent='📍 OBTENIENDO GPS...'}
 let payload={estado_gps:'NO_DISPONIBLE',detalle:null};
 try{const g=await obtenerGps();payload={...g,estado_gps:'REGISTRADO',detalle:null}}catch(e){payload={estado_gps:geoErrorState(e),detalle:String(e?.message||'GPS no disponible').slice(0,250)}}
 try{await gpsApi(orden,action,payload);const ok=payload.estado_gps==='REGISTRADO';if(typeof window.showMsg==='function')window.showMsg(ok?'Hito registrado con ubicación.':'Hito registrado; GPS no disponible.',true);await refrescarHitos(orden)}catch(e){if(typeof window.showMsg==='function')window.showMsg('No se pudo registrar el hito: '+e.message)}finally{if(btn){btn.disabled=false;btn.textContent=original}}
};
function hora(v){try{return new Date(v).toLocaleTimeString('es-EC',{hour:'2-digit',minute:'2-digit'})}catch{return '—'}}
async function refrescarHitos(orden){const box=document.querySelector(`[data-gps-ops="${orden}"]`);if(!box)return;try{const d=await gpsApi(orden,'hitos');const hs=d.hitos||[],map=Object.fromEntries(hs.map(x=>[x.tipo_evento,x]));const a=map.ACEPTACION,t=map.INICIO_TRASLADO,l=map.LLEGADA;const state=box.querySelector('.gpsOpsState'),times=box.querySelector('.gpsOpsTimes'),bStart=box.querySelector('.gpsStart'),bArrival=box.querySelector('.gpsArrival');if(l)state.textContent='📍 EN SITIO';else if(t)state.textContent='🚗 EN CAMINO';else state.textContent='ACEPTADA';const line=[];if(a)line.push(`Aceptada ${hora(a.capturado_at)}`);if(t)line.push(`Traslado ${hora(t.capturado_at)}${t.estado_gps!=='REGISTRADO'?' · sin GPS':''}`);if(l)line.push(`Llegada ${hora(l.capturado_at)}${l.estado_gps!=='REGISTRADO'?' · sin GPS':''}`);times.textContent=line.join('  ·  ')||'Sin hitos registrados';if(bStart&&t){bStart.textContent='✓ TRASLADO REGISTRADO';bStart.classList.add(t.estado_gps==='REGISTRADO'?'gpsOpDone':'gpsOpWarn')}if(bArrival&&l){bArrival.textContent='✓ LLEGADA REGISTRADA';bArrival.classList.add(l.estado_gps==='REGISTRADO'?'gpsOpDone':'gpsOpWarn')}}catch{}}
async function refrescarTodos(){const ids=[...document.querySelectorAll('[data-gps-ops]')].map(x=>x.dataset.gpsOps).filter(Boolean);await Promise.allSettled(ids.map(refrescarHitos))}
const oldCargar=window.cargar;if(typeof oldCargar==='function')window.cargar=async function(...args){const r=await oldCargar(...args);setTimeout(refrescarTodos,80);return r};
const oldCamino=window.marcarEnCamino;if(typeof oldCamino==='function')window.marcarEnCamino=async function(id){const r=await oldCamino(id);const fake={textContent:'🚗 MARCAR EN CAMINO',disabled:false};await window.registrarHitoGps(id,'inicio-traslado',fake);return r};
css();setTimeout(refrescarTodos,1000);
})();