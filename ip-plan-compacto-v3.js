(()=>{
 const $=id=>document.getElementById(id);
 const API_ROUTER=B+'inventario-router-cobertura';
 let ROUTERS=[],ROUTER_ACTUAL=null,actualizando=false,ultimaVista='',routersCargados=false;
 function routerKey(){return 'disprotel_router_cobertura_'+ordenId()}
 function recordarRouter(id){if(!id)return;ROUTER_ACTUAL=id;const r=ROUTERS.find(x=>x.id===id);if(r){O.router_cobertura_id=id;O.router=r;try{sessionStorage.setItem(INSTKEY,JSON.stringify(O))}catch{}}try{localStorage.setItem(routerKey(),id)}catch{}try{document.dispatchEvent(new CustomEvent('disprotel:router-cambiado'))}catch{}}
  function routerLocal(){try{return localStorage.getItem(routerKey())||''}catch{return ''}}
 function textoCobertura(){return limpiar([O?.cliente_zona_final,O?.cliente_zona,O?.cliente_sector,O?.cliente_referencia_final,O?.cliente_referencia,O?.cliente_direccion_final,O?.cliente_direccion,O?.cliente_parroquia_final,O?.cliente_parroquia,O?.cliente_canton_final,O?.cliente_canton].filter(Boolean).join(' '))}
 function routerSugerido(){
   const t=textoCobertura();
   const aliases=['TOALINI','GALPON','GALPÓN','LLIMBE','CHAMBAPONGO','ESPINO BLANCO'];
   if(!aliases.some(a=>t.includes(a)))return null;
   return ROUTERS.find(r=>limpiar(r.nombre).includes('CHAMBAPONGO'))||null;
 }
 function limpiar(v){return up(String(v||'').replace(/\/[0-9]+$/,'').trim())}
 function fmt(v){if(!v)return '—';try{return new Date(v).toLocaleString('es-EC')}catch{return String(v)}}
 function mejor(cs){return Array.isArray(cs)&&cs.length?cs[0]:null}
 function avisoPlan(c){
   const solicitado=limpiar(O?.plan_solicitado||O?.plan_final||'');
   const detectado=limpiar(c?.plan_detectado||c?.queue_parent||'');
   if(!solicitado||!detectado||solicitado===detectado)return '';
   return `<div class="msg warn" style="margin-top:10px">⚠️ El plan detectado en el router parece diferente al solicitado. Esto es solo informativo y no impide continuar con la instalación.</div>`;
 }
 function detalleAsignacion(q){
   const d=q?.detector_detalle||{};
   const origen=String(d.origen||q?.observacion||'').toLocaleUpperCase('es-EC');
   const etiqueta=origen.includes('REASIGNACION')||origen.includes('MODIFICADA')?'🔁 IP REASIGNADA':origen.includes('MANUAL')||origen.includes('CORREGIDA')?'✏️ IP ASIGNADA MANUALMENTE':'✅ IP CONFIRMADA POR SCANNER';
   const fecha=q?.asignada_at?` · ${esc(fmt(q.asignada_at))}`:'';
   const anterior=d.ip_anterior?`<div class="muted" style="margin-top:6px">Cambio: <b>${esc(d.ip_anterior)}</b> → <b>${esc(q.ip_asignada||d.ip_definitiva||'')}</b></div>`:'';
   const obs=q?.observacion?`<div class="muted" style="margin-top:6px">${esc(q.observacion)}</div>`:'';
   return `<div class="msg ok" style="margin-top:10px"><b>${etiqueta}</b><div class="muted" style="margin-top:5px">Registrada por Fernando/responsable autorizado${fecha}</div>${anterior}${obs}</div>`;
 }
 async function cargarRouters(){
   try{
     const [lr,go]=await Promise.all([post(API_ROUTER,'list'),post(API_ROUTER,'get-order',{orden_id:ordenId()})]);
     ROUTERS=lr.routers||[];
     const sugerido=routerSugerido();
     ROUTER_ACTUAL=ROUTER_ACTUAL||routerLocal()||go.router_id||O?.router_cobertura_id||sugerido?.id||null;
     if(go.router_id&&!routerLocal())recordarRouter(go.router_id);
     routersCargados=true;
     return true;
   }catch(e){show(e.message,'err');return false}
 }
 function selectorRouter(){
   const sugerido=routerSugerido();
   const ops=ROUTERS.map(r=>`<option value="${esc(r.id)}" ${r.id===ROUTER_ACTUAL?'selected':''}>${esc(up(r.nombre))}</option>`).join('');
   const nota=sugerido?`<div class="msg ok" style="margin-top:8px">✅ Router sugerido por comunidad/sector: <b>${esc(up(sugerido.nombre))}</b>. Puedes cambiarlo si no corresponde.</div>`:'';
   return `<div class="pickBox" style="margin-top:12px"><b>📡 ROUTER DE COBERTURA</b><div class="muted" style="margin-top:5px">Elige el router que atiende esta instalación. Este dato indica al scanner qué MikroTik debe revisar.</div>${nota}<select id="routerCoberturaIp" style="width:100%;padding:12px;border:1px solid #cbd8de;border-radius:10px;font-size:16px;background:#fff;margin-top:9px"><option value="">-- ELIGE ROUTER DE COBERTURA --</option>${ops}</select></div>`;
 }
 const compactEstado=async function(){
   if(actualizando)return;
   actualizando=true;
   try{
     const d=await post(API_IP,'status',{orden_id:ordenId()}),q=d.solicitud,cs=d.candidatos||[],c=mejor(cs);
     if(d.orden){O.plan_final=d.orden.plan_final??O.plan_final;O.plan_solicitado=d.orden.plan_solicitado??O.plan_solicitado;O.tv_final=d.orden.tv_final??O.tv_final;sessionStorage.setItem(INSTKEY,JSON.stringify(O))}
     const estado=$('ipEstado'),cand=$('candidatos'),sol=$('solicitar'),act=$('actualizar');if(!estado||!cand)return;
     const firma=JSON.stringify({q:q?{id:q.id,estado:q.estado,ip:q.ip_asignada,fecha:q.solicitado_at}:null,c:c?{id:c.id,address:c.address,plan:c.plan_detectado,parent:c.queue_parent}:null,router:ROUTER_ACTUAL,routers:ROUTERS.length});
     if(firma===ultimaVista)return;
     ultimaVista=firma;
     const viejo=$('planCatalogoBox');if(viejo)viejo.remove();
     cand.innerHTML='';
     if(!q){
       if(!routersCargados)await cargarRouters();
       estado.innerHTML=`<div style="font-size:16px;font-weight:900">🌐 ASIGNACIÓN DE IP</div><div class="muted" style="margin-top:8px">Selecciona el router de cobertura y luego solicita la asignación de IP.</div>${selectorRouter()}`;
       const sel=$('routerCoberturaIp');if(sel)sel.onchange=()=>recordarRouter(String(sel.value||'').trim());
       if(sol){sol.classList.remove('hidden');sol.textContent='📡 SOLICITAR ASIGNACIÓN DE IP'}
       if(act)act.classList.add('hidden');
       $('stIp').textContent='PENDIENTE';return;
     }
     if(sol)sol.classList.add('hidden');
     if(q.estado==='ASIGNADA'){
       if(act)act.classList.add('hidden');
       estado.innerHTML=`<div style="font-size:16px;font-weight:900">🌐 ASIGNACIÓN DE IP</div><span class="badge okb" style="margin-top:9px">✅ IP DEFINITIVA</span><div class="ip">${esc(q.ip_asignada||'—')}</div>${detalleAsignacion(q)}${avisoPlan(c)}`;
       $('stIp').textContent='✅ IP DEFINITIVA · '+String(q.ip_asignada||'');return;
     }
     if(act){act.classList.remove('hidden');act.textContent='🔄 ACTUALIZAR ESTADO'}
     if(c?.address){
       estado.innerHTML=`<div style="font-size:16px;font-weight:900">🌐 ASIGNACIÓN DE IP</div><span class="badge wait" style="margin-top:9px">🟡 IP TENTATIVA DETECTADA</span><div class="ip">${esc(c.address)}</div><div class="muted" style="margin-top:8px"><b>Puedes adelantar la configuración del equipo con esta IP.</b> Todavía está pendiente de confirmación por Fernando y puede cambiar antes de quedar definitiva.</div><div class="muted" style="margin-top:7px">Solicitud enviada: ${esc(fmt(q.solicitado_at))}</div>${avisoPlan(c)}`;
       $('stIp').textContent='🟡 IP TENTATIVA · '+String(c.address||'');
     }else{
       estado.innerHTML=`<div style="font-size:16px;font-weight:900">🌐 ASIGNACIÓN DE IP</div><span class="badge wait" style="margin-top:9px">⏳ SOLICITUD ENVIADA</span><div class="muted" style="margin-top:8px">Solicitud: ${esc(fmt(q.solicitado_at))}. El scanner está buscando una IP tentativa. Pendiente de confirmación por Fernando.</div>${avisoPlan(c)}`;
       $('stIp').textContent='⏳ ESPERANDO IP';
     }
   }catch(e){show(e.message,'err')}
   finally{actualizando=false}
 };
 const compactSolicitar=async function(){
   const b=$('solicitar'),sel=$('routerCoberturaIp');
   try{
     const routerId=String(sel?.value||'').trim();
     if(!routerId){show('⚠️ Elige primero el router de cobertura.','warn');sel?.focus();return}
     if(b)b.disabled=true;
     recordarRouter(routerId);
     const guardado=await post(API_ROUTER,'set-order',{orden_id:ordenId(),router_id:routerId});
     recordarRouter(guardado.router?.id||routerId);
     O.router_cobertura_id=ROUTER_ACTUAL;O.router=guardado.router||O.router;sessionStorage.setItem(INSTKEY,JSON.stringify(O));
     await post(API_O,'request-ip',{orden_id:ordenId(),plan_final:'',tv_final:Boolean(O.tv_final??O.tv_solicitada)});
     show('✅ Router de cobertura guardado y solicitud de IP enviada.');
     await compactEstado();
   }catch(e){show(e.message,'err')}
   finally{if(b)b.disabled=false}
 };
 function tomarControl(){
   window.estadoIp=compactEstado;
   window.solicitarIp=compactSolicitar;
   const s=$('solicitar'),a=$('actualizar');
   if(s)s.onclick=compactSolicitar;
   if(a)a.onclick=compactEstado;
   const viejo=$('planCatalogoBox');if(viejo)viejo.remove();
 }
 function enlazar(){tomarControl();compactEstado()}
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(enlazar,0)):setTimeout(enlazar,0);
 [100,300,700,1200,2200,4000].forEach(ms=>setTimeout(()=>{tomarControl();compactEstado()},ms));
 setInterval(()=>{if(window.estadoIp!==compactEstado||window.solicitarIp!==compactSolicitar)tomarControl();const viejo=$('planCatalogoBox');if(viejo)viejo.remove()},1000);
 setInterval(()=>{if(document.visibilityState==='visible')compactEstado()},6000);
})();
