/* DISPROTEL | Encabezado ejecutivo de instalaciones: sólo presentación.
   Reutiliza la OT, el usuario y los indicadores del flujo existente. */
(()=>{
'use strict';
if(window.__disprotelHeaderEjecutivoV2)return;
window.__disprotelHeaderEjecutivoV2=true;
const $=s=>document.querySelector(s);
const txt=id=>String(document.getElementById(id)?.textContent||'').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const upper=v=>String(v??'').toLocaleUpperCase('es-EC');
const pick=(...vs)=>vs.find(v=>String(v??'').trim())||'';
const PASOS=['Datos del cliente y servicio','Documento de identidad','Equipos y materiales','Activación del servicio · ONU e IP','Evidencias y cierre','Acceso remoto, reporte y finalización'];
let signature='',watching=false;
function style(){
 if(document.getElementById('execExecutiveStyle'))return;
 const s=document.createElement('style');s.id='execExecutiveStyle';
 s.textContent=[
 '.techHero.execExec{padding:13px 16px!important;background:linear-gradient(145deg,#fff,#f8fcff)!important;border:1px solid #dbe8f0!important;border-radius:16px!important;box-shadow:0 7px 21px rgba(12,55,94,.08)!important}',
 '.techHero.execExec h1{text-align:left!important;font-size:21px!important;margin:0!important;color:#163e68!important;line-height:1.2!important;letter-spacing:0!important}',
 '.techHero.execExec .techType{text-align:left!important;margin:3px 0 4px!important;font-size:12px!important;font-weight:800!important;letter-spacing:0!important;color:#2673b8!important}',
 '.techHero.execExec .techType:before,.techHero.execExec .techType:after{display:none!important}',
 '.techHero.execExec .techGrid{display:block!important;max-width:none!important;margin:0!important}',
 '.execEyebrow{font-size:9px;color:#73889b;letter-spacing:.04em;font-weight:900;text-transform:uppercase}',
 '.execTop{display:flex;gap:8px;justify-content:space-between;align-items:center;margin:7px 0 4px}',
 '.execStatus{background:#e8f3ff;border:1px solid #b9d6f0;color:#145d9b;border-radius:999px;padding:5px 9px;font-size:10px;font-weight:900;white-space:nowrap}',
 '.execStatus.fin{color:#16714b;background:#e9f8ef;border-color:#afe0c1}',
 '.execSep{border:0;border-top:1px solid #e0e9ef;margin:10px 0}',
 '.execOrder{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}',
 '.execLabel{display:block;font-size:9px;color:#73889b;font-weight:850;margin-bottom:3px}',
 '.execOrderId{font-weight:950;font-size:17px;color:#123e72;overflow-wrap:anywhere}',
 '.execIp{font-size:11px;color:#15764c;font-weight:850}.execIp.wait{color:#966619}',
 '.execCliente{background:#f5f8fb;border:1px solid #e1e9ef;border-radius:12px;padding:10px 12px;margin-top:10px}',
 '.execName{font-size:15px;line-height:1.3;font-weight:900;color:#203c50;overflow-wrap:anywhere}',
 '.execDetail{display:flex;gap:8px;align-items:flex-start;font-size:12px;line-height:1.4;color:#3d5b6e;margin-top:8px;overflow-wrap:anywhere}',
 '.execDetail .ico{flex:0 0 18px;text-align:center}',
 '.execStaff{display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-top:11px}',
 '.execStaff b{display:block;font-size:12px;line-height:1.35;color:#284a61;overflow-wrap:anywhere}',
 '.execProgressHead{display:flex;justify-content:space-between;gap:8px;align-items:center;font-size:12px;font-weight:800;color:#214c72}',
 '.execProgressHead span{font-size:11px;color:#688498}',
 '.execSteps{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:5px;margin-top:9px}',
 '.execStep{height:29px;border-radius:7px;border:1px solid #dce5ec;background:#f2f6f9;display:grid;place-items:center;font-weight:900;font-size:11px;color:#688092}',
 '.execStep.done{background:#e8f7ed;border-color:#bce3c9;color:#147b4c}',
 '.execStep.current{background:#e9f3ff;border-color:#91c0ef;color:#156cb5}',
 '.execNext{display:flex;align-items:center;gap:8px;margin-top:10px}',
 '.execNext strong{display:block;font-size:12px;color:#204970}',
 '.execNext small{display:block;font-size:10px;color:#74899b;margin-top:2px}',
 '@media(max-width:620px){.techHero.execExec{padding:12px!important}.techHero.execExec h1{font-size:18px!important}.techHero.execExec .techType{font-size:11px!important}.execOrderId{font-size:15px}.execName{font-size:14px}.execDetail{font-size:11px}.execStaff b{font-size:11px}.execCliente{padding:9px}.execSep{margin:8px 0}.execStep{height:27px;font-size:10px}}',
 '@media(max-width:370px){.execStaff{grid-template-columns:1fr;gap:7px}.execStatus{font-size:9px}}'
 ].join('');
 document.head.appendChild(s);
}
function labelTipo(tipo){
 const t=upper(tipo);
 if(t.includes('INTERNET_TV'))return '📶 Instalación de internet y TV';
 if(t.startsWith('INSTALACION'))return '📶 Instalación de internet';
 if(t==='CAMBIO_EQUIPOS')return '🔄 Cambio de equipos';
 if(t==='REUBICACION')return '📍 Reubicación';
 return '🛠️ '+String(tipo||'Trabajo técnico').replaceAll('_',' ');
}
function estadoGeneral(est){
 const t=upper(est);
 if(/COMPLETADA|FINALIZADA/.test(t))return ['Finalizada',true];
 if(/CANCELAD|NO_EJECUTADA/.test(t))return ['No ejecutada',false];
 if(/EN_CAMINO|TRASLADO/.test(t))return ['En camino',false];
 if(t==='PENDIENTE'||t==='CREADA')return ['Pendiente',false];
 if(t==='ACEPTADA'||t==='TOMADA')return ['Asignada',false];
 return ['En ejecución',false];
}
function avance(){
 const status=id=>upper(txt(id));
 const estado=typeof O==='undefined'?'':upper(O?.estado);
 // El sexto paso NO equivale a acceso remoto confirmado. Sólo se completa
 // cuando la función de cierre valida la OT y devuelve estado COMPLETADA,
 // o cuando el resumen oficial de cierre confirma el resultado.
 const final=estado==='COMPLETADA'||estado==='FINALIZADA'||/^✅\s*COMPLETO$/.test(status('stFinalizarReporte'));
 const data=/CONFIRMAD|COMPLET/.test(status('stDatos'));
 const doc=/COMPLETO|DISPONIBLE/.test(status('stDoc'));
 const material=/GUARDADO/.test(status('stTrabajo'));
 const ip=/IP CONFIRMADA/.test(status('ipEstado'))||(/✅/.test(txt('stIp'))&&!/ESPERANDO|PENDIENTE|TENTATIVA/.test(status('stIp')))||estado==='IP_ASIGNADA';
 const evid=/^✅\s*COMPLETO$/.test(status('stEvidencias'));
 const flags=[data,doc,material,ip,evid,final];
 const current=final?5:evid?5:ip?4:material?3:doc?2:data?1:0;
 return {flags,current,ip,final,evid};
}
function render(){
 try{
  if(typeof O==='undefined'||!O)return false;
  const hero=$('.techHero'),ctx=$('[data-contexto-ejecucion]'),type=$('#tipoTrabajoHero');
  if(!hero||!ctx)return false;
  const s={};try{Object.assign(s,JSON.parse(sessionStorage.getItem('disprotel_trabajos_test')||'{}'))}catch{}
  const name=pick(O.cliente_nombre_final,O.cliente_nombre,'Cliente por confirmar');
  const direccion=pick(O.cliente_direccion_final,O.cliente_direccion,'Dirección no registrada');
  const sector=pick(O.cliente_zona_final,O.cliente_zona,'');
  const ref=pick(O.cliente_referencia_final,O.cliente_referencia,'');
  const address=[sector,direccion,ref].filter((v,i,a)=>v&&a.indexOf(v)===i).join(' · ');
  const tel=pick(O.cliente_telefono_final,O.cliente_telefono,'Sin teléfono');
  const tech=pick(s.nombre,s.usuario,'Técnico no indicado');
  const group=pick(s.unidad_grupo,s.grupo,O.grupo_asignado,'Grupo no indicado');
  const ot=pick(O.id_orden,O.id,'OT');
  const p=avance(),st=p.final?['Finalizada',true]:estadoGeneral(O.estado);
  const key=JSON.stringify([ot,O.tipo_trabajo,O.estado,name,address,tel,tech,group,p]);
  if(key===signature)return true;
  style();hero.classList.add('execExec');
  const title=hero.querySelector('h1');if(title)title.textContent='Ejecución del trabajo';
  if(type)type.textContent=labelTipo(O.tipo_trabajo);
  const steps=PASOS.map((label,i)=>'<div class="execStep '+(p.flags[i]?'done':i===p.current?'current':'')+'" title="'+esc(label)+'" aria-label="'+esc(label+(p.flags[i]?' completado':i===p.current?' actual':''))+'">'+(p.flags[i]?'✓':i+1)+'</div>').join('');
  const current=p.final?'Trabajo finalizado':PASOS[p.current];
  ctx.dataset.compacto='1';
  ctx.innerHTML=
   '<div class="execTop"><span class="execEyebrow">DISPROTEL · ÁREA TÉCNICA</span><span class="execStatus '+(st[1]?'fin':'')+'">'+esc(st[0])+'</span></div>'+
   '<hr class="execSep"/>'+
   '<div class="execOrder"><div><span class="execLabel">ORDEN DE TRABAJO</span><div class="execOrderId">'+esc(ot)+'</div></div><div class="execIp '+(p.ip?'':'wait')+'">'+(p.ip?'✓ IP asignada':'IP por confirmar')+'</div></div>'+
   '<div class="execCliente"><span class="execLabel">CLIENTE</span><div class="execName">'+esc(name)+'</div>'+
    '<div class="execDetail"><span class="ico">📍</span><span>'+esc(address)+'</span></div>'+
    '<div class="execDetail"><span class="ico">☎</span><span>'+esc(tel)+'</span></div></div>'+
   '<div class="execStaff"><div><span class="execLabel">TÉCNICO RESPONSABLE</span><b>'+esc(tech)+'</b></div>'+
    '<div><span class="execLabel">GRUPO OPERATIVO</span><b>'+esc(group)+'</b></div></div>'+
   '<hr class="execSep"/>'+
   '<div class="execProgressHead"><b>Avance de instalación</b><span>Paso '+(p.current+1)+' de '+PASOS.length+'</span></div>'+
   '<div class="execSteps" role="img" aria-label="Avance de la OT: '+esc(current)+'">'+steps+'</div>'+
   '<div class="execNext"><span style="font-size:18px">'+(p.final?'✅':p.current===5?'🔐':p.current===4?'📷':'🛠️')+'</span><div><strong>'+esc(current)+'</strong><small>'+(p.final?'Instalación finalizada':'Continuar desde la actividad pendiente')+'</small></div></div>';
  signature=key;return true;
 }catch(e){console.warn('Encabezado ejecutivo DISPROTEL',e);return false}
}
function watch(){
 if(watching)return;watching=true;
 let timer=0;const later=()=>{clearTimeout(timer);timer=setTimeout(render,80)};
 const obs=new MutationObserver(later);
 ['stDatos','stDoc','stTrabajo','stIp','stEvidencias','stFinalizarReporte','ipEstado'].forEach(id=>{
  const el=document.getElementById(id);if(el)obs.observe(el,{childList:true,subtree:true,characterData:true});
 });
 document.addEventListener('disprotel:router-cambiado',later);
 window.addEventListener('disprotel:ot-sincronizar',later);
 window.addEventListener('disprotel:instalacion-finalizada',later);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)later()});
 setInterval(()=>{if(!document.hidden)render()},12000);
}
let attempt=0;const task=setInterval(()=>{attempt++;if(render()){clearInterval(task);watch()}else if(attempt>80)clearInterval(task)},250);
})();