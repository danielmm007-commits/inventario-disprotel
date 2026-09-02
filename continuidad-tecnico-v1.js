(()=>{
const API='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-continuidad-orden';
const oldJobHtml=window.jobHtml;
if(typeof oldJobHtml!=='function')return;
function creds(){try{return JSON.parse(sessionStorage.getItem('disprotel_trabajos_test')||'null')||{}}catch{return{}}}
async function api(orden,action,payload={}){const c=creds();const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','x-session':c.session_token||''},body:JSON.stringify({orden_id:orden||'',action,...payload})});const d=await r.json().catch(()=>({error:'Respuesta inválida'}));if(!r.ok)throw new Error(d.error||'Error de continuidad');return d}
function inject(html,block){const pos=html.lastIndexOf('</div>');return pos>=0?html.slice(0,pos)+block+html.slice(pos):html}
function stripGps(html){return String(html).replace(/<div class="gpsOps"[\s\S]*?<\/div><\/div>/,'')}
window.jobHtml=function(o,disp=false,hist=false){let html=oldJobHtml(o,disp,hist);if(disp||hist)return html;const estado=String(o?.estado||'').toUpperCase();
 if(estado==='PENDIENTE_REPROGRAMACION'){
   html=stripGps(html);
   const box=`<div class="reprogBox"><div class="reprogTitle">⏸ TRABAJO REPROGRAMADO</div><div class="reprogText">La OT sigue asignada a tu grupo. Si Fernando no dispuso otro grupo, pueden retomarla directamente.</div><button type="button" class="resumeBtn" onclick="reanudarTrabajo('${o.id}',this)">▶ REANUDAR TRABAJO</button></div>`;
   return inject(html,box);
 }
 if(['ACEPTADA','EN_CAMINO','EN_PROCESO'].includes(estado)){
   const box=`<div class="reprogBox"><div class="reprogTitle">⏱ CONTINUIDAD DE JORNADA</div><div class="reprogText">Úsalo si el cliente pide volver más tarde, no está disponible o el trabajo debe continuar en otro momento.</div><button type="button" class="pauseBtn" onclick="pausarTrabajo('${o.id}',this)">⏸ PAUSAR / REPROGRAMAR</button></div>`;
   return inject(html,box);
 }
 return html;
};
window.pausarTrabajo=async function(orden,btn){
 const motivo=prompt('Motivo de la reprogramación. Ej.: cliente ausente, solicita volver más tarde, fin de jornada:');if(motivo===null)return;const limpio=String(motivo||'').trim();if(limpio.length<5){window.showMsg?.('Indica un motivo válido.');return}
 const cuando=prompt('Fecha/hora tentativa (opcional). Ej.: mañana 09:00. Puedes dejarlo vacío:','');if(cuando===null)return;
 const obs=prompt('Observación breve de lo ocurrido (opcional):','');if(obs===null)return;
 const original=btn?.textContent||'';if(btn){btn.disabled=true;btn.textContent='GUARDANDO...'}
 try{let iso=null;if(String(cuando||'').trim()){const d=new Date(cuando);if(!Number.isNaN(d.getTime()))iso=d.toISOString()}const r=await api(orden,'pause',{motivo:limpio,observacion:String(obs||'').trim(),reprogramada_para:iso});window.showMsg?.(r.message||'OT pausada y reprogramada.',true);await window.cargar?.()}catch(e){window.showMsg?.(e.message)}finally{if(btn){btn.disabled=false;btn.textContent=original}}
};
window.reanudarTrabajo=async function(orden,btn){if(!confirm('¿Reanudar esta OT con el mismo grupo?'))return;const original=btn?.textContent||'';if(btn){btn.disabled=true;btn.textContent='REANUDANDO...'}try{const r=await api(orden,'resume');window.showMsg?.(r.message||'OT reanudada.',true);await window.cargar?.()}catch(e){window.showMsg?.(e.message)}finally{if(btn){btn.disabled=false;btn.textContent=original}}};
async function cargarReprogramadas(){try{const d=await api('','my-reprogrammed');const rows=d.ordenes||[];if(typeof ACTIVE_JOBS!=='undefined'){const ids=new Set(rows.map(x=>x.id));ACTIVE_JOBS=[...(ACTIVE_JOBS||[]).filter(x=>!ids.has(x.id)),...rows];if(typeof renderBoards==='function')renderBoards()}}catch{}}
function css(){if(document.getElementById('continuidadTecnicoCss'))return;const s=document.createElement('style');s.id='continuidadTecnicoCss';s.textContent=`.reprogBox{margin-top:12px!important;padding:12px;border:1px solid #d7c285;border-radius:12px;background:#fff9e8}.reprogTitle{font-size:12px;font-weight:900;color:#6f5400}.reprogText{font-size:11px;color:#6d6552;line-height:1.45;margin-top:5px!important}.pauseBtn{background:#a76511!important;margin-top:9px!important}.resumeBtn{background:#17824f!important;margin-top:9px!important}`;document.head.appendChild(s)}
const oldCargar=window.cargar;if(typeof oldCargar==='function')window.cargar=async function(...args){const r=await oldCargar(...args);await cargarReprogramadas();return r};
css();setTimeout(cargarReprogramadas,900);
})();