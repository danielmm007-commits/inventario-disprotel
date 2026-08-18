(()=>{
 const escLocal=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const upLocal=v=>String(v??'').toLocaleUpperCase('es-EC');
 function estilos(){if(document.getElementById('ejecucionResumenCss'))return;const s=document.createElement('style');s.id='ejecucionResumenCss';s.textContent='.execQuick{display:grid;gap:8px;margin-top:12px}.execQuickMain,.execQuickSub{padding:11px 13px;border-radius:12px;font-weight:900}.execQuickMain{background:#eef6ff;border:1px solid #d7e6f7}.execOt{font-size:15px;font-weight:900;line-height:1.2}.execCliente{font-size:16px;font-weight:900;line-height:1.25;margin-top:5px}.execQuickSub{background:#f7fafb;border:1px solid #dde6ea;color:#425b67;font-size:13px}.datosOperativos{display:grid;grid-template-columns:1fr 1fr;gap:9px}.datosOperativos .opItem{background:#fff;border:1px solid #e1e8ec;border-radius:11px;padding:10px}.datosOperativos .opItem.full{grid-column:1/-1}.datosOperativos .opLabel{font-size:11px;color:#60737c;font-weight:800;text-transform:uppercase}.datosOperativos .opValue{font-weight:800;margin-top:3px;overflow-wrap:anywhere}@media(max-width:620px){.datosOperativos{grid-template-columns:1fr}.datosOperativos .opItem.full{grid-column:auto}.execOt{font-size:13px}.execCliente{font-size:14px}.execQuickSub{font-size:12px}}';document.head.appendChild(s)}
 function modalidad(){return Boolean(O?.tv_final??O?.tv_solicitada)?'INTERNET + TV':'INTERNET'}
 function aplicar(){
   try{
     if(typeof O==='undefined'||!O)return false;
     estilos();
     let ses={};try{ses=JSON.parse(sessionStorage.getItem('disprotel_trabajos_test')||'{}')}catch{}
     const nombre=upLocal(O.cliente_nombre_final||O.cliente_nombre||'CLIENTE');
     const ident=String(O.cliente_identificacion_final||O.cliente_identificacion||'').trim();
     const ot=upLocal(O.id_orden||'OT');
     const grupo=upLocal(ses.unidad_grupo||ses.grupo||'—');
     const tecnico=upLocal(ses.nombre||ses.usuario||'—');
     const ctx=document.querySelector('[data-contexto-ejecucion]');
     if(ctx&&!ctx.dataset.compacto){ctx.dataset.compacto='1';ctx.innerHTML=`<div class="execQuick"><div class="execQuickMain"><div class="execOt">📋 ${escLocal(ot)}</div><div class="execCliente">👤 ${escLocal(nombre)}${ident?' · '+escLocal(ident):''}</div></div><div class="execQuickSub">🚐 ${escLocal(grupo)} · 👷 ${escLocal(tecnico)}</div></div>`}
     const titulo=document.querySelector('#accDatos summary');if(titulo&&!titulo.dataset.renombrado){titulo.dataset.renombrado='1';const st=document.getElementById('stDatos');titulo.childNodes[0].nodeValue='1. Datos del cliente y servicio ';if(st)st.textContent='✅ CONFIRMADOS'}
     const datos=document.getElementById('datos');
     if(datos){
       const tel=String(O.cliente_telefono_final||O.cliente_telefono||'').trim()||'DATO FALTANTE';
       const sinCorreo=Boolean(O.cliente_sin_correo);
       const correo=sinCorreo?'NO DISPONE DE CORREO':String(O.cliente_correo_final||O.cliente_correo||'').trim()||'DATO FALTANTE';
       const dir=upLocal(O.cliente_direccion_final||O.cliente_direccion||'DATO FALTANTE');
       const canton=upLocal(O.cliente_canton_final||O.cliente_canton||'DATO FALTANTE');
       const parroquia=upLocal(O.cliente_parroquia_final||O.cliente_parroquia||'DATO FALTANTE');
       const sector=upLocal(O.cliente_zona_final||O.cliente_zona||'DATO FALTANTE');
       const referencia=upLocal(O.cliente_referencia_final||O.cliente_referencia||'DATO FALTANTE');
       const plan=upLocal(O.plan_final||O.plan_solicitado||'DATO FALTANTE');
       const contactoNombre=upLocal(O.contacto_visita_nombre_final||O.contacto_visita_nombre||'');
       const contactoTel=String(O.contacto_visita_telefono_final||O.contacto_visita_telefono||'').trim();
       const mostrarContacto=contactoNombre&&contactoNombre!==nombre||contactoTel&&contactoTel!==tel;
       datos.innerHTML=`<div class="box datosOperativos"><div class="opItem"><div class="opLabel">📞 Teléfono principal</div><div class="opValue">${escLocal(tel)}</div></div><div class="opItem"><div class="opLabel">✉️ Correo</div><div class="opValue">${escLocal(correo)}</div></div><div class="opItem full"><div class="opLabel">📍 Dirección</div><div class="opValue">${escLocal(dir)}</div></div><div class="opItem"><div class="opLabel">🗺️ Cantón / parroquia</div><div class="opValue">${escLocal(canton)} · ${escLocal(parroquia)}</div></div><div class="opItem"><div class="opLabel">📌 Sector</div><div class="opValue">${escLocal(sector)}</div></div><div class="opItem full"><div class="opLabel">Referencia</div><div class="opValue">${escLocal(referencia)}</div></div>${mostrarContacto?`<div class="opItem full"><div class="opLabel">👤 Persona de contacto</div><div class="opValue">${escLocal(contactoNombre||'—')}${contactoTel?' · '+escLocal(contactoTel):''}</div></div>`:''}<div class="opItem"><div class="opLabel">📶 Plan</div><div class="opValue">${escLocal(plan)}</div></div><div class="opItem"><div class="opLabel">Servicio final</div><div class="opValue">${escLocal(modalidad())}</div></div></div>`;
     }
     return true;
   }catch{return false}
 }
 function boot(){let n=0;const t=setInterval(()=>{n++;if(aplicar()&&n>15)clearInterval(t);if(n>60)clearInterval(t)},200)}
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();