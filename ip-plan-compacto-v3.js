(()=>{
 const $=id=>document.getElementById(id);
 function limpiar(v){return up(String(v||'').replace(/\/[0-9]+$/,'').trim())}
 function fmt(v){if(!v)return '—';try{return new Date(v).toLocaleString('es-EC')}catch{return String(v)}}
 function mejor(cs){return Array.isArray(cs)&&cs.length?cs[0]:null}
 function avisoPlan(c){
   const solicitado=limpiar(O?.plan_solicitado||O?.plan_final||'');
   const detectado=limpiar(c?.plan_detectado||c?.queue_parent||'');
   if(!solicitado||!detectado||solicitado===detectado)return '';
   return `<div class="msg warn" style="margin-top:10px">⚠️ El plan detectado en el router parece diferente al solicitado. Esto es solo informativo y no impide continuar con la instalación.</div>`;
 }
 window.estadoIp=async function(){
   try{
     const d=await post(API_IP,'status',{orden_id:ordenId()}),q=d.solicitud,cs=d.candidatos||[],c=mejor(cs);
     if(d.orden){O.plan_final=d.orden.plan_final??O.plan_final;O.plan_solicitado=d.orden.plan_solicitado??O.plan_solicitado;O.tv_final=d.orden.tv_final??O.tv_final;sessionStorage.setItem(INSTKEY,JSON.stringify(O))}
     const estado=$('ipEstado'),cand=$('candidatos'),sol=$('solicitar'),act=$('actualizar');if(!estado||!cand)return;
     cand.innerHTML='';
     if(!q){
       estado.innerHTML=`<div style="font-size:16px;font-weight:900">🌐 ASIGNACIÓN DE IP</div><div class="muted" style="margin-top:8px">Cuando la instalación esté lista, solicita la asignación de IP. El sistema realizará las verificaciones internas automáticamente.</div>`;
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
 window.solicitarIp=async function(){
   const b=$('solicitar');
   try{
     if(b)b.disabled=true;
     await post(API_O,'request-ip',{orden_id:ordenId(),plan_final:'',tv_final:Boolean(O.tv_final??O.tv_solicitada)});
     show('✅ Solicitud de asignación de IP enviada.');
     await window.estadoIp();
   }catch(e){show(e.message,'err')}
   finally{if(b)b.disabled=false}
 };
 function enlazar(){const s=$('solicitar'),a=$('actualizar');if(s)s.onclick=window.solicitarIp;if(a)a.onclick=window.estadoIp;window.estadoIp()}
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(enlazar,0)):setTimeout(enlazar,0);
 setTimeout(enlazar,500);
})();