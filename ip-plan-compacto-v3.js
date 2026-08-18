(()=>{
 const $=id=>document.getElementById(id);
 const API_DOM='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-instalacion-domicilio';
 function limpiar(v){return up(String(v||'').replace(/\/[0-9]+$/,'').trim())}
 function fmt(v){if(!v)return '—';try{return new Date(v).toLocaleString('es-EC')}catch{return String(v)}}
 function mejor(cs){return Array.isArray(cs)&&cs.length?cs[0]:null}
 function actualizarPlan(c){
   const solicitado=limpiar(O?.plan_solicitado||'');
   const detectado=limpiar(c?.plan_detectado||c?.queue_parent||'');
   const d=$('planDetectadoVista'),cmp=$('planComparacionVista'),sel=$('planCatalogo');
   if(d)d.textContent=detectado||'SIN DETECCIÓN CONFIABLE';
   if(cmp){
     if(!detectado)cmp.innerHTML='⚪ El scanner todavía no identifica un plan confiable.';
     else if(solicitado&&detectado===solicitado)cmp.innerHTML='✅ <b>COINCIDE</b> con el plan solicitado.';
     else if(solicitado)cmp.innerHTML=`⚠️ <b>NO COINCIDE</b> · solicitado: ${esc(solicitado)} · detectado: ${esc(detectado)}`;
     else cmp.innerHTML='ℹ️ Plan detectado por scanner. Revisa el plan final antes de continuar.';
   }
   if(sel&&detectado&&!sel.dataset.manual){const opt=[...sel.options].find(o=>limpiar(o.value)===detectado||limpiar(o.textContent).includes(detectado));if(opt)sel.value=opt.value}
 }
 async function guardarPlanAntesDeSolicitar(){
   const sel=$('planCatalogo');
   const plan=String(sel?.value||O?.plan_final||O?.plan_solicitado||'').trim();
   if(!plan)return '';
   const d=await post(API_DOM,'service-plan',{orden_id:ordenId(),plan_final:plan,motivo:'PLAN FINAL AL SOLICITAR IP'});
   O.plan_final=d.plan_final||plan;sessionStorage.setItem(INSTKEY,JSON.stringify(O));return O.plan_final;
 }
 window.estadoIp=async function(){
   try{
     const d=await post(API_IP,'status',{orden_id:ordenId()}),q=d.solicitud,cs=d.candidatos||[],c=mejor(cs);
     if(d.orden){O.plan_final=d.orden.plan_final??O.plan_final;O.plan_solicitado=d.orden.plan_solicitado??O.plan_solicitado;O.tv_final=d.orden.tv_final??O.tv_final;sessionStorage.setItem(INSTKEY,JSON.stringify(O))}
     actualizarPlan(c);
     const estado=$('ipEstado'),cand=$('candidatos'),sol=$('solicitar'),act=$('actualizar');if(!estado||!cand)return;
     cand.innerHTML='';
     if(!q){
       estado.innerHTML=`<div style="font-size:16px;font-weight:900">🌐 IP DEL SERVICIO</div><span class="badge" style="margin-top:9px">IP AÚN NO SOLICITADA</span><div class="muted" style="margin-top:8px">El scanner ayudará a detectar una IP tentativa. La IP definitiva la confirma el responsable autorizado.</div>`;
       if(sol){sol.classList.remove('hidden');sol.textContent='📡 SOLICITAR IP'}if(act)act.classList.add('hidden');$('stIp').textContent='PENDIENTE';return;
     }
     if(sol)sol.classList.add('hidden');
     if(q.estado==='ASIGNADA'){
       if(act)act.classList.add('hidden');
       estado.innerHTML=`<div style="font-size:16px;font-weight:900">🌐 IP DEL SERVICIO</div><span class="badge okb" style="margin-top:9px">✅ IP DEFINITIVA</span><div class="ip">${esc(q.ip_asignada||'—')}</div><div class="muted" style="margin-top:8px">Confirmada: ${esc(fmt(q.asignada_at))}. Puede ser reasignada posteriormente por un responsable autorizado dejando motivo e historial.</div>`;
       $('stIp').textContent='✅ IP DEFINITIVA · '+String(q.ip_asignada||'');return;
     }
     if(act){act.classList.remove('hidden');act.textContent='🔄 ACTUALIZAR DETECCIÓN'}
     const agotado=q.detector_estado==='TIEMPO_AGOTADO'||q.detector_detalle?.motivo==='VENTANA_30_MINUTOS_FINALIZADA';
     estado.innerHTML=`<div style="font-size:16px;font-weight:900">🌐 IP DEL SERVICIO</div><span class="badge wait" style="margin-top:9px">${c?'⚠️ IP TENTATIVA DETECTADA':agotado?'⏱️ BÚSQUEDA FINALIZADA':'⏳ BUSCANDO IP'}</span><div class="muted" style="margin-top:8px">Solicitud: ${esc(fmt(q.solicitado_at))} · último escaneo: ${esc(fmt(q.detector_ultimo_scan))}</div>`;
     if(c){cand.innerHTML=`<div class="candidate"><div class="label">MEJOR COINCIDENCIA DEL SCANNER</div><div class="ip">${esc(c.address||'—')}</div><div class="muted">Queue: ${esc(up(c.queue_name||c.comentario||'—'))}</div><div class="muted" style="margin-top:5px">Confianza: ${esc(c.score??'—')}</div><div class="msg warn" style="margin-top:10px">⚠️ Esta IP es tentativa. El técnico no la confirma; espera al responsable de IP.</div></div>`}
     else cand.innerHTML=`<div class="msg warn">${agotado?'No se encontró una coincidencia confiable durante la ventana de búsqueda.':'Todavía no hay una coincidencia confiable en MikroTik.'} La IP definitiva debe resolverla el responsable autorizado.</div>`;
     $('stIp').textContent=c?'⚠️ IP TENTATIVA':agotado?'⏱️ SIN COINCIDENCIA':'⏳ ESPERANDO IP';
   }catch(e){show(e.message,'err')}
 };
 window.solicitarIp=async function(){
   const b=$('solicitar');try{if(b)b.disabled=true;const plan=await guardarPlanAntesDeSolicitar();await post(API_O,'request-ip',{orden_id:ordenId(),plan_final:plan,tv_final:Boolean(O.tv_final??O.tv_solicitada)});show('✅ Plan final guardado y solicitud de IP enviada.');await window.estadoIp()}catch(e){show(e.message,'err')}finally{if(b)b.disabled=false}
 };
 function enlazar(){const s=$('solicitar'),a=$('actualizar');if(s)s.onclick=window.solicitarIp;if(a)a.onclick=window.estadoIp;window.estadoIp()}
 window.addEventListener('plan-catalogo-listo',()=>window.estadoIp());
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(enlazar,0)):setTimeout(enlazar,0);
 setTimeout(enlazar,500);
})();