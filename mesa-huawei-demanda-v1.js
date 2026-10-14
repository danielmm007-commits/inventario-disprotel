/* DISPROTEL: lectura Huawei individual compartida, solo Supervisor Fernando.
   NO inicia lecturas automáticamente. 1 Edge al abrir, 1 al pulsar y 1 al
   recibir evento privado (sin sondeos periódicos). */
(()=>{
'use strict';
if(window.__mesaHuaweiDemandaV1)return;window.__mesaHuaweiDemandaV1=true;
const FERNANDO='986f9610-5144-42d6-b467-cace9ea8983f',KEY='disprotel_login_general_v2';
let me={};try{me=JSON.parse(sessionStorage.getItem(KEY)||'{}')}catch{}
if(String(me.id||'')!==FERNANDO||!me.session_token)return;
const params=new URLSearchParams(location.search),uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
let ot=params.get('orden')||'';
if(!uuid.test(ot)){
 try{const focus=JSON.parse(sessionStorage.getItem('disprotel_mesa_focus_v1')||'{}');
 if(Date.now()-Number(focus.at||0)<30*60*1000)ot=String(focus.orden_id||'');}catch{}
}
if(!uuid.test(ot)||params.get('focus')!=='mesa-ot')return;
const URL='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-mesa-tecnica';
const app=document.getElementById('app');if(!app)return;
const card=document.createElement('section');card.className='card';card.id='mesaHuaweiDemanda';
card.style.cssText='border-left:4px solid #176eb7;margin:12px 0;max-width:900px';
const title=document.createElement('h3');title.textContent='📡 Lectura Huawei · una consulta para ambos';title.style.margin='0 0 8px';
const desc=document.createElement('div');desc.textContent='Lee solo si hay un requerimiento pendiente de potencia. La medición queda compartida con el técnico.';desc.style.cssText='font-size:12px;color:#55707c;margin-bottom:10px';
const last=document.createElement('div');last.style.cssText='font-size:12px;line-height:1.7;white-space:pre-line';
last.textContent='Cargando la última medición guardada…';
const btn=document.createElement('button');btn.type='button';btn.textContent='📡 Consultar potencia Huawei ahora';
btn.disabled=true;btn.style.marginTop='10px';
const note=document.createElement('div');note.style.cssText='font-size:12px;color:#476476;margin-top:8px';
const resetBtn=document.createElement('button');
resetBtn.type='button';
resetBtn.textContent='🧹 Borrar evidencia de prueba y reiniciar potencia';
resetBtn.style.cssText='display:none;margin-top:10px;background:#fff0f0;color:#982d2d;border:1px solid #d99';
card.append(title,desc,last,btn,note,resetBtn);app.prepend(card);
let busy=false,scheduled=null;
async function call(action,extra={}){
 const r=await fetch(URL,{method:'POST',headers:{'Content-Type':'application/json','x-session':me.session_token},
   body:JSON.stringify({action,orden_id:ot,...extra})});
 let d={};try{d=await r.json()}catch{}
 if(!r.ok||d.error)throw Error(String(d.error||'No se pudo consultar Mesa Técnica'));
 return d;
}
const stamp=v=>{if(!v)return 'Sin fecha';
 const d=new Date(v);return Number.isFinite(d.getTime())?
 d.toLocaleString('es-EC',{dateStyle:'short',timeStyle:'medium'}):String(v).slice(0,30)};
async function refresh(){
 if(busy)return;busy=true;btn.disabled=true;
 try{
  const d=await call('status'),o=d.optica||null,sol=d.lectura_huawei||null;
  const reqPrueba=ot==='e8ce09af-4a08-4b10-bf9e-459231b1f5cb'?
    (d.requerimientos||[]).find(r=>r.id==='f871587c-89bc-4aa9-9b68-601f9ac67d68'):null;
  resetBtn.style.display=reqPrueba?.estado==='ATENDIDO'&&
    (reqPrueba?.resultado?.evidencia_potencia?.storage_path||reqPrueba?.resultado?.verificacion_potencia)?
    'inline-block':'none';
  const hasPower=(d.requerimientos||[]).some(r=>r.estado==='PENDIENTE'&&
    Array.isArray(r.acciones)&&r.acciones.includes('VERIFICAR_POTENCIA'));
  last.textContent=o?[
    'Última lectura compartida: '+String(o.fuente||'—'),
    'RX ONU: '+(o.rx_onu_dbm??'—')+' dBm · RX OLT: '+(o.rx_olt_dbm??'—')+' dBm',
    'Tomada: '+stamp(o.leido_at)+(o.lectura_historica?' · HISTÓRICA':''),
    'OLT: '+String(o.olt||'—')+' · ONT '+String(o.ont_id??'—')
  ].join('\n'):'Sin medición almacenada para este servicio.';
  if(sol?.estado==='PENDIENTE'&&!sol.expirada){
    note.textContent='⏳ Solicitud en espera del agente Huawei. No vuelvas a enviarla.';
    btn.disabled=true;
  }else{
    note.textContent=sol?'Última solicitud: '+String(sol.estado)+(sol.expirada?' (vencida)':'')+
      ' · '+stamp(sol.respondido_at||sol.solicitado_at):'Todavía no hay solicitud Huawei de esta OT.';
    btn.disabled=!hasPower;
  }
  if(!hasPower)note.textContent+=' · Sin requerimiento de potencia pendiente para esta OT.';
 }catch(e){note.textContent='⚠️ '+String(e.message||e).slice(0,190);btn.disabled=true}
 finally{busy=false}
}
btn.onclick=async()=>{
 if(busy)return;busy=true;btn.disabled=true;
 note.textContent='Enviando UNA solicitud de lectura individual…';
 try{
  const d=await call('request-huawei-optical');
  note.textContent=d.reutilizada?
    '⏳ Ya había una lectura solicitada; reutilizamos la misma.':
    '✅ Solicitud enviada al agente Huawei. Esperando su respuesta.';
 }catch(e){note.textContent='⚠️ '+String(e.message||e).slice(0,190)}
 finally{busy=false;await refresh()}
};
resetBtn.onclick=async()=>{
 if(busy||!confirm('¿Eliminar la captura PNG de prueba y reiniciar SOLO la verificación de potencia de la OT-20261014-93344? El resto de la OT permanece intacto.'))return;
 busy=true;btn.disabled=true;resetBtn.disabled=true;
 note.textContent='Borrando captura de prueba en Storage y reiniciando el requerimiento…';
 try{
   await call('reset-test-power-evidence',{
     requerimiento_id:'f871587c-89bc-4aa9-9b68-601f9ac67d68',
     confirmacion:'RESETEAR PRUEBA'
   });
   note.textContent='✅ Evidencia de prueba eliminada y verificación de potencia nuevamente pendiente.';
 }catch(e){note.textContent='⚠️ No se completó el reinicio: '+String(e.message||e).slice(0,220)}
 finally{busy=false;resetBtn.disabled=false;await refresh()}
};
function onSignal(e){
 if(String(e?.detail?.orden_uuid||'')!==ot)return;
 clearTimeout(scheduled);scheduled=setTimeout(refresh,600);
}
window.addEventListener('disprotel:huawei-resultado',onSignal);
window.addEventListener('disprotel:mesa-dato',onSignal);
window.addEventListener('disprotel:mesa-hito',onSignal);
window.addEventListener('disprotel:ot-sincronizar',()=>{if(!document.hidden)refresh()});
refresh();
})();