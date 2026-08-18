(()=>{
 const $=id=>document.getElementById(id);
 const API_ROUTER=B+'inventario-router-cobertura';
 let ROUTERS=[],ROUTER_ACTUAL=null;
 function limpiar(v){return up(String(v||'').replace(/\/[0-9]+$/,'').trim())}
 function fmt(v){if(!v)return '—';try{return new Date(v).toLocaleString('es-EC')}catch{return String(v)}}
 function mejor(cs){return Array.isArray(cs)&&cs.length?cs[0]:null}
 function avisoPlan(c){
   const solicitado=limpiar(O?.plan_solicitado||O?.plan_final||'');
   const detectado=limpiar(c?.plan_detectado||c?.queue_parent||'');
   if(!solicitado||!detectado||solicitado===detectado)return '';
   return `<div class="msg warn" style="margin-top:10px">⚠️ El plan detectado en el router parece diferente al solicitado. Esto es solo informativo y no impide continuar con la instalación.</div>`;
 }
 async function cargarRouters(){
   try{
     const [lr,go]=await Promise.all([post(API_ROUTER,'list'),post(API_ROUTER,'get-order',{orden_id:ordenId()})]);
     ROUTERS=lr.routers||[];ROUTER_ACTUAL=go.router_id||null;
     return true;
   }catch(e){show(e.message,'err');return false}
 }
 function selectorRouter(){
   const ops=ROUTERS.map(r=>`<option value="${esc(r.id)}" ${r.id===ROUTER_ACTUAL?'selected':''}>${esc(up(r.nombre))}</option>`).join('');
   return `<div class="pickBox" style="margin-top:12px"><b>📡 ROUTER DE COBERTURA</b><div class="muted" style="margin-top:5px">Elige el router que atiende esta instalación. Este dato indica al scanner qué MikroTik debe revisar.</div><select id="routerCoberturaIp" style="width:100%;padding:12px;border:1px solid #cbd8de;border-radius:10px;font-size:16px;background:#fff;margin-top:9px"><option value="">-- ELIGE ROUTER DE COBERTURA --</option>${ops}</select></div>`;
 }
 const compactEstado=async function(){
   try{
     const d=await post(API_IP,'status',{orden_id:ordenId()}),q=d.solicitud,cs=d.candidatos||[],c=mejor(cs);
     if(d.orden){O.plan_final=d.orden.plan_final??O.plan_final;O.plan_solicitado=d.orden.plan_solicitado??O.plan_solicitado;O.tv_final=d.orden.tv_final??O.tv_final;sessionStorage.setItem(INSTKEY,JSON.stringify(O))}
     const estado=$('ipEstado'),cand=$('candidatos'),sol=$('solicitar'),act=$('actualizar');if(!estado||!cand)return;
     const viejo=$('planCatalogoBox');if(viejo)viejo.remove();
     cand.innerHTML='';
     if(!q){
       await cargarRouters();
       estado.innerHTML=`<div style="font-size:16px;font-weight:900">🌐 ASIGNACIÓN DE IP</div><div class="muted" style="margin-top:8px">Selecciona el router de cobertura y luego solicita la asignación de IP.</div>${selectorRouter()}`;
       if(sol){sol.classList.remove('hidden');sol.textContent='📡 SOLICITAR ASIGNACIÓN DE IP'}
       if(act)act.classList.add('hidden');
       $('stIp').textContent='PENDIENTE';return;
     }
     if(sol)sol.classList.add('hidden');
     if(q.estado==='ASIGNADA'){
       if(act)act.classList.add('hidden');
       estado.innerHTML=`<div style="font-size:16px;font-weight:900">🌐 ASIGNACIÓN DE IP</div><span class="badge okb" style="margin-top:9px">✅ IP DEFINITIVA</span><div class="ip">${esc(q.ip_asignada||'—')}</div><div class="muted" style="margin-top:8px">Asignada por el responsable autorizado.</div>${avisoPlan(c)}`;
       $('stIp').textContent='✅ IP DEFINITIVA · '+String(q.ip_asignada||'');return;
     }
     if(act){act.classList.remove('hidden');act.textContent='🔄 ACTUALIZAR ESTADO'}
     estado.innerHTML=`<div style="font-size:16px;font-weight:900">🌐 ASIGNACIÓN DE IP</div><span class="badge wait" style="margin-top:9px">⏳ SOLICITUD ENVIADA</span><div class="muted" style="margin-top:8px">Solicitud: ${esc(fmt(q.solicitado_at))}. Pendiente de asignación por el responsable de IP.</div>${avisoPlan(c)}`;
     $('stIp').textContent='⏳ ESPERANDO IP';
   }catch(e){show(e.message,'err')}
 };
 const compactSolicitar=async function(){
   const b=$('solicitar'),sel=$('routerCoberturaIp');
   try{
     const routerId=String(sel?.value||'').trim();
     if(!routerId){show('⚠️ Elige primero el router de cobertura.','warn');sel?.focus();return}
     if(b)b.disabled=true;
     const guardado=await post(API_ROUTER,'set-order',{orden_id:ordenId(),router_id:routerId});
     ROUTER_ACTUAL=guardado.router?.id||routerId;
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
})();