(()=>{
const API='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-cambios-titular';
const KEY='disprotel_login_general_v2';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const up=v=>String(v??'').toLocaleUpperCase('es-EC');
function ses(){try{return JSON.parse(sessionStorage.getItem(KEY)||'{}')}catch{return{}}}
async function post(payload){
 const s=ses();
 const r=await fetch(API+'?t='+Date.now(),{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','x-session':s.session_token||''},body:JSON.stringify({session_token:s.session_token||'',...payload})});
 const d=await r.json().catch(()=>({error:'Respuesta inválida'}));
 if(!r.ok)throw new Error(d.error||'Error');
 return d;
}
async function guardarCodigo(id){
 const input=document.getElementById('codigoNuevo_'+id);
 if(!input)return;
 const codigo=up(input.value.trim());
 if(!codigo){alert('Ingresa el nuevo código de servicio.');return}
 const btn=document.getElementById('guardarCodigo_'+id);
 if(btn){btn.disabled=true;btn.textContent='GUARDANDO…'}
 try{
   await post({action:'set-new-code',id,codigo_servicio_nuevo_confirmado:codigo});
   await cargarPendientesManual();
 }catch(e){alert(e.message||'No se pudo guardar el código')}
 finally{if(btn){btn.disabled=false;btn.textContent='GUARDAR CÓDIGO'}}
}
async function cancelarManual(id){
 const motivo=prompt('Motivo de cancelación (opcional):')||'';
 try{await post({action:'cancel',id,motivo:up(motivo)});await cargarPendientesManual()}
 catch(e){alert(e.message||'No se pudo cancelar')}
}
async function cargarPendientesManual(){
 const box=document.getElementById('pendientes');if(!box)return;
 try{
   const d=await post({action:'list',estado:'PENDIENTE'}),xs=d.items||[];
   box.innerHTML=xs.length?xs.map(x=>{
     const cod=x.codigo_servicio_nuevo_confirmado||'';
     const origen=x.codigo_nuevo_origen==='MANUAL'?'INGRESADO MANUALMENTE':'PENDIENTE DE INGRESO';
     return '<div class="pending">'+
       '<div><span class="pill ok">PENDIENTE</span> <b>CAMBIO DE TITULAR</b></div>'+
       '<div style="margin-top:8px"><b>ANTES:</b> '+esc(up(x.titular_anterior_nombre))+' '+(x.titular_anterior_identificacion?'· '+esc(x.titular_anterior_identificacion):'')+'</div>'+
       '<div><b>DESPUÉS:</b> '+esc(up(x.titular_nuevo_nombre))+' '+(x.titular_nuevo_identificacion?'· '+esc(x.titular_nuevo_identificacion):'')+'</div>'+
       '<div class="muted" style="margin-top:7px"><b>Código anterior:</b> '+esc(x.codigo_servicio_snapshot||'—')+'<br>Beneficio: '+esc(x.beneficiario_nuevo||'NO_APLICA')+' · IP: '+esc(x.ip_snapshot||'—')+' · Router: '+esc(x.router_snapshot||'—')+'<br>Dirección: '+esc(up(x.direccion_snapshot||'—'))+'</div>'+
       '<div style="margin-top:12px;padding:12px;border:1px solid #cfe0e8;border-radius:12px;background:#f6fafc">'+
         '<label style="margin-top:0">Nuevo código de servicio</label>'+
         '<div style="display:grid;grid-template-columns:1fr auto;gap:8px">'+
           '<input id="codigoNuevo_'+esc(x.id)+'" value="'+esc(cod)+'" placeholder="Ej. DSPR00000987" autocomplete="off">'+
           '<button id="guardarCodigo_'+esc(x.id)+'" type="button" onclick="guardarCodigoNuevo(\''+esc(x.id)+'\')">GUARDAR CÓDIGO</button>'+
         '</div>'+
         '<div class="muted" style="margin-top:6px">'+esc(origen)+(x.codigo_nuevo_editado_at?' · '+esc(new Date(x.codigo_nuevo_editado_at).toLocaleString('es-EC')):'')+'</div>'+
       '</div>'+
       '<div class="actions"><button class="secondary" disabled>COMPLETAR CAMBIO · BLOQUEADO HASTA CONCILIACIÓN</button><button class="secondary" type="button" onclick="cancelarCambioManual(\''+esc(x.id)+'\')">CANCELAR REGISTRO</button></div>'+
     '</div>';
   }).join(''):'<div class="muted" style="margin-top:10px">No hay cambios de titular pendientes.</div>';
 }catch(e){box.innerHTML='<div class="msg err">'+esc(e.message||'No se pudieron cargar los cambios')+'</div>'}
}
window.guardarCodigoNuevo=guardarCodigo;
window.cancelarCambioManual=cancelarManual;
window.cargarPendientes=cargarPendientesManual;
const btn=document.getElementById('recargar');if(btn)btn.onclick=cargarPendientesManual;
cargarPendientesManual();
})();