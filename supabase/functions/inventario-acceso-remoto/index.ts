import { createClient } from 'npm:@supabase/supabase-js@2.95.0';
const origin='https://danielmm007-commits.github.io';
const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'content-type,x-session','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json; charset=utf-8'};
const reply=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers});
async function sha256(text:string){const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return Array.from(new Uint8Array(h)).map(x=>x.toString(16).padStart(2,'0')).join('')}
function db(){const url=Deno.env.get('SUPABASE_URL')!;const raw=Deno.env.get('SUPABASE_SECRET_KEYS');const key=raw?JSON.parse(raw).default:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!key)throw new Error('Clave servidor no disponible');return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}
async function auth(s:any,sessionToken:string){const token=String(sessionToken||'').trim();if(!token)throw new Error('Debes iniciar sesión en el acceso principal');const {data:ses,error:sErr}=await s.from('app_auth_sessions').select('id,responsable_id').eq('token_hash',await sha256(token)).is('revoked_at',null).gt('expires_at',new Date().toISOString()).maybeSingle();if(sErr)throw sErr;if(!ses)throw new Error('Debes iniciar sesión en el acceso principal');const {data:person,error:pErr}=await s.from('responsables').select('id,usuario,nombre,rol,unidad_grupo,activo,puede_asignar_ip,es_admin_principal').eq('id',ses.responsable_id).eq('activo',true).maybeSingle();if(pErr)throw pErr;if(!person)throw new Error('Debes iniciar sesión en el acceso principal');await s.from('app_auth_sessions').update({last_used_at:new Date().toISOString()}).eq('id',ses.id);return person}
function norm(v:any){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase()}
async function alcance(s:any,me:any){const {data,error}=await s.from('responsable_alcances_operativos').select('routers_permitidos,grupo_operativo,alcance_global,activo').eq('responsable_id',me.id).eq('activo',true).maybeSingle();if(error)throw error;return data||null}
function visible(o:any,a:any){if(!a||a.alcance_global===true)return true;const routers=Array.isArray(a.routers_permitidos)?a.routers_permitidos:[];const g=norm(a.grupo_operativo);return (!!o?.router_cobertura_id&&routers.includes(o.router_cobertura_id))||(!!g&&[o?.grupo_asignado,o?.grupo_destino].some(x=>norm(x)===g))}
async function assertVisible(s:any,me:any,o:any){const a=await alcance(s,me);if(!visible(o,a))throw new Error('OT fuera de tu alcance operativo');return a}
function decodeBase64(input:string){const clean=input.includes(',')?input.split(',').pop()!:input;const bin=atob(clean);const out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out}
async function ctx(s:any,me:any,ordenId:string){const {data:o,error}=await s.from('ordenes_trabajo').select('id,id_orden,estado,grupo_asignado,grupo_destino,router_cobertura_id,aceptado_por_id,cliente_nombre,cliente_nombre_final,instalacion_id,tipo_trabajo').eq('id',ordenId).maybeSingle();if(error)throw error;if(!o)throw new Error('Orden no encontrada');const tecnico=me.rol==='TÉCNICO'&&o.grupo_asignado===me.unidad_grupo&&o.aceptado_por_id===me.id;const autorizado=me.puede_asignar_ip===true;const admin=me.rol==='ADMINISTRADOR'||me.es_admin_principal===true;if(!tecnico&&!autorizado&&!admin)throw new Error('No autorizado');if(!tecnico)await assertVisible(s,me,o);let instId=o.instalacion_id;if(!instId){const {data:i,error:iErr}=await s.from('instalaciones').select('id').eq('orden_id',o.id).order('created_at',{ascending:false}).limit(1).maybeSingle();if(iErr)throw iErr;instId=i?.id||null}return {o,tecnico,autorizado,admin,instId}}
async function ipActual(s:any,ordenId:string){const {data,error}=await s.from('orden_ip_solicitudes').select('ip_asignada,asignada_at').eq('orden_id',ordenId).not('ip_asignada','is',null).order('asignada_at',{ascending:false}).limit(1).maybeSingle();if(error)throw error;return data?.ip_asignada?String(data.ip_asignada):null}
async function evidenciaInstalacionById(s:any,id:string|null){if(!id)return null;const {data:e,error}=await s.from('instalacion_evidencias').select('id,tipo_foto,storage_path,created_at,registrado_por:responsables!instalacion_evidencias_registrado_por_id_fkey(nombre)').eq('id',id).maybeSingle();if(error)throw error;if(!e)return null;const {data:sg}=await s.storage.from('instalacion-evidencias').createSignedUrl(e.storage_path,900);return {id:e.id,tipo_foto:e.tipo_foto,url:sg?.signedUrl||null,created_at:e.created_at,registrado_por:e.registrado_por?.nombre||null,origen:'INSTALACION'}}
async function evidenciaSoporteById(s:any,id:string|null){if(!id)return null;const {data:e,error}=await s.from('soporte_evidencias').select('id,tipo_foto,storage_path_original,created_at,registrado_por:responsables!soporte_evidencias_registrado_por_id_fkey(nombre)').eq('id',id).maybeSingle();if(error)throw error;if(!e)return null;const {data:sg}=await s.storage.from('soporte-evidencias').createSignedUrl(e.storage_path_original,900);return {id:e.id,tipo_foto:e.tipo_foto,url:sg?.signedUrl||null,created_at:e.created_at,registrado_por:e.registrado_por?.nombre||null,origen:'SOPORTE'}}
async function evidenciaTipo(s:any,instId:string|null,tipo:string){if(!instId)return null;const {data:e,error}=await s.from('instalacion_evidencias').select('id,tipo_foto,storage_path,created_at,registrado_por:responsables!instalacion_evidencias_registrado_por_id_fkey(nombre)').eq('instalacion_id',instId).eq('tipo_foto',tipo).eq('es_actual',true).order('created_at',{ascending:false}).limit(1).maybeSingle();if(error)throw error;if(!e)return null;const {data:sg}=await s.storage.from('instalacion-evidencias').createSignedUrl(e.storage_path,900);return {id:e.id,tipo_foto:e.tipo_foto,url:sg?.signedUrl||null,created_at:e.created_at,registrado_por:e.registrado_por?.nombre||null}}
async function estado(s:any,ordenId:string){const {data:a,error}=await s.from('orden_acceso_remoto').select('id,estado,solicitado_at,confirmado_at,observacion,evidencia_id,soporte_evidencia_id,updated_at,solicitado_por:responsables!orden_acceso_remoto_solicitado_por_id_fkey(nombre),confirmado_por:responsables!orden_acceso_remoto_confirmado_por_id_fkey(nombre)').eq('orden_id',ordenId).maybeSingle();if(error)throw error;const ip=await ipActual(s,ordenId);let evidencia=null;if(a?.soporte_evidencia_id)evidencia=await evidenciaSoporteById(s,a.soporte_evidencia_id);else if(a?.evidencia_id)evidencia=await evidenciaInstalacionById(s,a.evidencia_id);return {acceso:a||{estado:'PENDIENTE'},evidencia,ip_asignada:ip,urls_acceso:ip?{http:`http://${ip}:5000`,https:`https://${ip}:5000`}:null}}
Deno.serve(async req=>{if(req.method==='OPTIONS')return new Response('ok',{headers});if(req.method!=='POST')return reply({error:'Método no permitido'},405);try{const body=await req.json().catch(()=>({})),s=db(),me=await auth(s,String(body.session_token||'')),ordenId=String(body.orden_id||'').trim(),action=String(body.action||'');
if(action==='pending'){if(!me.puede_asignar_ip&&!me.es_admin_principal&&me.rol!=='ADMINISTRADOR')return reply({error:'No autorizado'},403);const a=await alcance(s,me);const {data,error}=await s.from('orden_acceso_remoto').select('orden_id,estado,solicitado_at,confirmado_at,observacion,evidencia_id,soporte_evidencia_id,orden:ordenes_trabajo!orden_acceso_remoto_orden_id_fkey(id,id_orden,estado,cliente_nombre,cliente_nombre_final,grupo_asignado,grupo_destino,router_cobertura_id)').in('estado',['SOLICITADO','REQUIERE_CORRECCION']).order('updated_at',{ascending:false}).limit(80);if(error)throw error;const solicitudes=[];for(const x of data||[]){if(['COMPLETADA','CANCELADA'].includes(x.orden?.estado)||!visible(x.orden,a))continue;const ip=await ipActual(s,x.orden_id);solicitudes.push({orden_id:x.orden_id,estado:x.estado,solicitado_at:x.solicitado_at,confirmado_at:x.confirmado_at,observacion:x.observacion,evidencia:x.soporte_evidencia_id?await evidenciaSoporteById(s,x.soporte_evidencia_id):await evidenciaInstalacionById(s,x.evidencia_id||null),id_orden:x.orden?.id_orden,cliente_nombre:x.orden?.cliente_nombre_final||x.orden?.cliente_nombre,grupo_asignado:x.orden?.grupo_asignado,ip_asignada:ip,urls_acceso:ip?{http:`http://${ip}:5000`,https:`https://${ip}:5000`}:null})}return reply({ok:true,solicitudes})}
if(action==='workboard'){if(!me.puede_asignar_ip&&!me.es_admin_principal&&me.rol!=='ADMINISTRADOR')return reply({error:'No autorizado'},403);const a=await alcance(s,me);const {data:orders,error:oErr}=await s.from('ordenes_trabajo').select('id,id_orden,estado,grupo_asignado,grupo_destino,router_cobertura_id,cliente_nombre,cliente_nombre_final,instalacion_id,tipo_trabajo,updated_at').ilike('tipo_trabajo','INSTALACION%').not('estado','in','(\"COMPLETADA\",\"CANCELADA\")').order('updated_at',{ascending:false}).limit(80);if(oErr)throw oErr;const ordenes=[];for(const o of orders||[]){if(!visible(o,a))continue;let instId=o.instalacion_id;if(!instId){const {data:i}=await s.from('instalaciones').select('id').eq('orden_id',o.id).order('created_at',{ascending:false}).limit(1).maybeSingle();instId=i?.id||null}const st=await estado(s,o.id);ordenes.push({orden_id:o.id,id_orden:o.id_orden,estado:o.estado,grupo_asignado:o.grupo_asignado,cliente_nombre:o.cliente_nombre_final||o.cliente_nombre,ip_asignada:st.ip_asignada,onu_evidencia:await evidenciaTipo(s,instId,'ONU_ACTIVADA'),acceso:st.acceso})}return reply({ok:true,ordenes})}
if(!ordenId)return reply({error:'Orden obligatoria'},400);const c=await ctx(s,me,ordenId);
if(action==='status')return reply({ok:true,orden:{id:c.o.id,id_orden:c.o.id_orden,cliente_nombre:c.o.cliente_nombre_final||c.o.cliente_nombre,estado:c.o.estado},puede_confirmar:me.rol!=='TÉCNICO'&&(c.autorizado||c.admin),puede_solicitar:c.tecnico,...await estado(s,ordenId)});
if(action==='onu-status')return reply({ok:true,orden:{id:c.o.id,id_orden:c.o.id_orden,cliente_nombre:c.o.cliente_nombre_final||c.o.cliente_nombre,estado:c.o.estado},evidencia:await evidenciaTipo(s,c.instId,'ONU_ACTIVADA'),puede_cargar:c.autorizado||c.admin});
if(['COMPLETADA','CANCELADA'].includes(c.o.estado))return reply({error:'OT finalizada: solo lectura'},409);
if(action==='onu-upload'){if(!c.autorizado&&!c.admin)return reply({error:'Solo un responsable autorizado puede registrar la activación ONU'},403);if(!c.instId)return reply({error:'No existe instalación asociada a la OT'},400);const mime=String(body.mime_type||'image/jpeg').toLowerCase(),base64=String(body.base64||'');if(!base64)return reply({error:'Imagen obligatoria'},400);if(!['image/jpeg','image/png','image/webp'].includes(mime))return reply({error:'Formato no permitido'},400);const bytes=decodeBase64(base64);if(bytes.length<=0||bytes.length>5*1024*1024)return reply({error:'La imagen supera 5 MB'},400);const ext=mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg',path=`${me.id}/${c.instId}/onu-activada-${crypto.randomUUID()}.${ext}`;const {error:upErr}=await s.storage.from('instalacion-evidencias').upload(path,bytes,{contentType:mime,upsert:false});if(upErr)throw upErr;const {data:prev}=await s.from('instalacion_evidencias').select('id').eq('instalacion_id',c.instId).eq('tipo_foto','ONU_ACTIVADA').eq('es_actual',true).order('created_at',{ascending:false}).limit(1).maybeSingle();if(prev)await s.from('instalacion_evidencias').update({es_actual:false,reemplazada_at:new Date().toISOString()}).eq('id',prev.id);const {data:ev,error:eErr}=await s.from('instalacion_evidencias').insert({instalacion_id:c.instId,tipo_foto:'ONU_ACTIVADA',storage_path:path,formato_original:mime,formato_guardado:mime,fecha_hora_captura:new Date().toISOString(),tomada_por_id:me.id,registrado_por_id:me.id,es_actual:true,reemplaza_a_id:prev?.id||null,tamano_bytes:bytes.length,mime_type:mime,subida_at:new Date().toISOString()}).select('id').single();if(eErr){await s.storage.from('instalacion-evidencias').remove([path]);throw eErr}await s.from('orden_historial').insert({orden_id:ordenId,evento:'ONU_ACTIVADA_CONFIRMADA',detalle:{evidencia_id:ev.id},realizado_por_id:me.id});return reply({ok:true,evidencia:await evidenciaTipo(s,c.instId,'ONU_ACTIVADA')})}
if(action==='request'){if(!c.tecnico)return reply({error:'Solo el técnico asignado puede solicitar confirmación'},403);const prev=await estado(s,ordenId);if(prev.acceso?.estado==='CONFIRMADO')return reply({ok:true,acceso:prev.acceso,already:true});const {data,error}=await s.from('orden_acceso_remoto').upsert({orden_id:ordenId,estado:'SOLICITADO',solicitado_por_id:me.id,solicitado_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:'orden_id'}).select('id,estado,solicitado_at').single();if(error)throw error;await s.from('orden_historial').insert({orden_id:ordenId,evento:'ACCESO_REMOTO_SOLICITADO',detalle:{},realizado_por_id:me.id});return reply({ok:true,acceso:data})}
if(action==='confirm'){if(me.rol==='TÉCNICO'||(!c.autorizado&&!c.admin))return reply({error:'Solo Mesa Técnica puede confirmar el acceso remoto'},403);const st=await estado(s,ordenId);if(!st.evidencia?.id)return reply({error:'Primero guarda una evidencia del acceso remoto'},409);const obs=String(body.observacion||'').trim()||null;const {data,error}=await s.from('orden_acceso_remoto').upsert({orden_id:ordenId,estado:'CONFIRMADO',confirmado_por_id:me.id,confirmado_at:new Date().toISOString(),observacion:obs,updated_at:new Date().toISOString()},{onConflict:'orden_id'}).select('id,estado,confirmado_at,observacion').single();if(error)throw error;await s.from('orden_historial').insert({orden_id:ordenId,evento:'ACCESO_REMOTO_CONFIRMADO',detalle:{observacion:obs,evidencia_id:st.evidencia.id,evidencia_origen:st.evidencia.origen||null},realizado_por_id:me.id});return reply({ok:true,acceso:data,evidencia:st.evidencia})}
if(action==='correction'){if(me.rol==='TÉCNICO'||(!c.autorizado&&!c.admin))return reply({error:'Solo Mesa Técnica puede marcar corrección'},403);const obs=String(body.observacion||'').trim();if(!obs)return reply({error:'Indica qué debe corregirse'},400);const {data,error}=await s.from('orden_acceso_remoto').upsert({orden_id:ordenId,estado:'REQUIERE_CORRECCION',confirmado_por_id:me.id,confirmado_at:null,observacion:obs,updated_at:new Date().toISOString()},{onConflict:'orden_id'}).select('id,estado,observacion').single();if(error)throw error;await s.from('orden_historial').insert({orden_id:ordenId,evento:'ACCESO_REMOTO_REQUIERE_CORRECCION',detalle:{observacion:obs},realizado_por_id:me.id});return reply({ok:true,acceso:data})}
if(action==='replace-confirmed-evidence'){
 // Rectificación de captura confirmada de SOPORTE: conservar la imagen anterior y su auditoría.
 if(me.rol==='TÉCNICO'||(!c.autorizado&&!c.admin))return reply({error:'Solo Mesa Técnica puede rectificar evidencia remota'},403);
 if(String(c.o.tipo_trabajo||'').startsWith('INSTALACION'))
   return reply({error:'Esta corrección corresponde a las evidencias de soporte; las instalaciones usan su propio flujo'},409);
 const {data:prior,error:pErr}=await s.from('orden_acceso_remoto')
   .select('estado,soporte_evidencia_id,confirmado_at').eq('orden_id',ordenId).maybeSingle();
 if(pErr)throw pErr;
 if(prior?.estado!=='CONFIRMADO'||!prior.soporte_evidencia_id)
   return reply({error:'No existe una captura confirmada de soporte para rectificar'},409);
 const motivo=String(body.motivo||'').trim().slice(0,400);
 if(motivo.length<6)return reply({error:'Indica brevemente por qué reemplazas la captura'},400);
 const mime=String(body.mime_type||'image/jpeg').toLowerCase(),base64=String(body.base64||'');
 if(!['image/jpeg','image/png','image/webp'].includes(mime))return reply({error:'Formato de imagen no permitido'},400);
 if(!base64)return reply({error:'Selecciona una imagen para la rectificación'},400);
 const bytes=decodeBase64(base64);
 if(!bytes.length||bytes.length>5*1024*1024)return reply({error:'La imagen supera 5 MB'},400);
 const now=new Date().toISOString(),ext=mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg';
 const path=`${ordenId}/acceso-remoto-rectificacion-${crypto.randomUUID()}.${ext}`;
 const storage=await s.storage.from('soporte-evidencias').upload(path,bytes,{contentType:mime,upsert:false});
 if(storage.error)throw storage.error;
 const insert=await s.from('soporte_evidencias').insert({orden_id:ordenId,tipo_foto:'ACCESO_REMOTO',
   storage_path_original:path,storage_path_vista:null,mime_type:mime,tamano_bytes:bytes.length,
   fecha_hora_captura:now,tomada_por_id:me.id,registrado_por_id:me.id}).select('id').single();
 if(insert.error){await s.storage.from('soporte-evidencias').remove([path]);throw insert.error}
 const nuevoId=insert.data.id,anteriorId=prior.soporte_evidencia_id;
 const move=await s.from('orden_acceso_remoto').update({soporte_evidencia_id:nuevoId,updated_at:now})
   .eq('orden_id',ordenId).eq('estado','CONFIRMADO').eq('soporte_evidencia_id',anteriorId).select('id');
 if(move.error||!move.data?.length){
   await s.from('soporte_evidencias').delete().eq('id',nuevoId);
   await s.storage.from('soporte-evidencias').remove([path]);
   if(move.error)throw move.error;
   return reply({error:'La evidencia cambió mientras la corregías; recarga la pantalla'},409);
 }
 // Actualizar exclusivamente los requerimientos que se confirmaron con la imagen anterior.
 const reqs=await s.from('orden_mesa_requerimientos').select('id,estado,acciones,resultado')
   .eq('orden_id',ordenId).contains('acciones',['VERIFICAR_ACCESO_REMOTO']).limit(80);
 if(reqs.error)throw reqs.error;
 const affected=(reqs.data||[]).filter((x:any)=>x.estado==='ATENDIDO'&&
   String(x.resultado?.verificacion_acceso_remoto?.evidencia_id||'')===String(anteriorId));
 for(const row of affected){
   const prev=row.resultado||{},v=prev.verificacion_acceso_remoto||{};
   const changes=Array.isArray(prev.rectificaciones_acceso_remoto)?prev.rectificaciones_acceso_remoto:[];
   const resultado={...prev,verificacion_acceso_remoto:{...v,evidencia_id:nuevoId,
     rectificada_at:now,rectificada_por_id:me.id},
     rectificaciones_acceso_remoto:[...changes,{anterior_id:anteriorId,nueva_id:nuevoId,motivo,
       registrado_por_id:me.id,registrado_at:now}]};
   const up=await s.from('orden_mesa_requerimientos').update({resultado,updated_at:now}).eq('id',row.id);
   if(up.error)throw up.error;
 }
 const audit=await s.from('orden_historial').insert({orden_id:ordenId,
   evento:'EVIDENCIA_ACCESO_REMOTO_RECTIFICADA',
   detalle:{evidencia_anterior_id:anteriorId,evidencia_nueva_id:nuevoId,motivo,
     requerimientos_actualizados:affected.map((x:any)=>x.id)},realizado_por_id:me.id});
 if(audit.error)throw audit.error;
 return reply({ok:true,rectificada:true,...await estado(s,ordenId)});
}
if(action==='delete-evidence'){
 if(!c.autorizado&&!c.admin)return reply({error:'Solo un responsable autorizado puede eliminar la evidencia de acceso remoto'},403);
 const st=await estado(s,ordenId);if(st.acceso?.estado==='CONFIRMADO')return reply({error:'No se elimina evidencia confirmada. Usa rectificar y conserva el historial'},409);if(!st.evidencia?.id)return reply({ok:true,already:true,...st});
 if(st.evidencia.origen==='SOPORTE'){
   const {data:e,error:eErr}=await s.from('soporte_evidencias').select('id,storage_path_original').eq('id',st.evidencia.id).maybeSingle();if(eErr)throw eErr;
   if(e?.storage_path_original)await s.storage.from('soporte-evidencias').remove([e.storage_path_original]);
   if(e?.id){const {error:dErr}=await s.from('soporte_evidencias').delete().eq('id',e.id);if(dErr)throw dErr}
   const {error:aErr}=await s.from('orden_acceso_remoto').update({soporte_evidencia_id:null,updated_at:new Date().toISOString()}).eq('orden_id',ordenId);if(aErr)throw aErr;
 }else{
   const {data:e,error:eErr}=await s.from('instalacion_evidencias').select('id,storage_path').eq('id',st.evidencia.id).maybeSingle();if(eErr)throw eErr;
   if(e?.storage_path)await s.storage.from('instalacion-evidencias').remove([e.storage_path]);
   if(e?.id){const {error:dErr}=await s.from('instalacion_evidencias').delete().eq('id',e.id);if(dErr)throw dErr}
   const {error:aErr}=await s.from('orden_acceso_remoto').update({evidencia_id:null,updated_at:new Date().toISOString()}).eq('orden_id',ordenId);if(aErr)throw aErr;
 }
 await s.from('orden_historial').insert({orden_id:ordenId,evento:'EVIDENCIA_ACCESO_REMOTO_ELIMINADA',detalle:{evidencia_id:st.evidencia.id,origen:st.evidencia.origen||null},realizado_por_id:me.id});
 return reply({ok:true,...await estado(s,ordenId)})
}
if(action==='upload'){
 const current=await estado(s,ordenId);
 if(current.acceso?.estado==='CONFIRMADO')return reply({error:'La captura está confirmada; usa Rectificar evidencia para conservar el historial'},409);
 const mime=String(body.mime_type||'image/jpeg').toLowerCase(),base64=String(body.base64||'');
 if(!base64)return reply({error:'Imagen obligatoria'},400);
 if(!['image/jpeg','image/png','image/webp'].includes(mime))return reply({error:'Formato no permitido'},400);
 const bytes=decodeBase64(base64);if(bytes.length<=0||bytes.length>5*1024*1024)return reply({error:'La imagen supera 5 MB'},400);
 const now=new Date().toISOString(),ext=mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg';
 if(String(c.o.tipo_trabajo||'').startsWith('INSTALACION')){
   if(!c.instId)return reply({error:'No existe instalación asociada a la OT'},400);
   const path=`${me.id}/${c.instId}/acceso-remoto-${crypto.randomUUID()}.${ext}`;
   const {error:upErr}=await s.storage.from('instalacion-evidencias').upload(path,bytes,{contentType:mime,upsert:false});if(upErr)throw upErr;
   const {data:prev}=await s.from('instalacion_evidencias').select('id').eq('instalacion_id',c.instId).eq('tipo_foto','ACCESO_REMOTO').eq('es_actual',true).order('created_at',{ascending:false}).limit(1).maybeSingle();
   if(prev)await s.from('instalacion_evidencias').update({es_actual:false,reemplazada_at:now}).eq('id',prev.id);
   const {data:ev,error:eErr}=await s.from('instalacion_evidencias').insert({instalacion_id:c.instId,tipo_foto:'ACCESO_REMOTO',storage_path:path,formato_original:mime,formato_guardado:mime,fecha_hora_captura:now,tomada_por_id:me.id,registrado_por_id:me.id,es_actual:true,reemplaza_a_id:prev?.id||null,tamano_bytes:bytes.length,mime_type:mime,subida_at:now}).select('id').single();
   if(eErr){await s.storage.from('instalacion-evidencias').remove([path]);throw eErr}
   const {error:aErr}=await s.from('orden_acceso_remoto').upsert({orden_id:ordenId,evidencia_id:ev.id,soporte_evidencia_id:null,updated_at:now},{onConflict:'orden_id'});if(aErr)throw aErr;
   await s.from('orden_historial').insert({orden_id:ordenId,evento:'EVIDENCIA_ACCESO_REMOTO_GUARDADA',detalle:{evidencia_id:ev.id,origen:'INSTALACION'},realizado_por_id:me.id});
 }else{
   const path=`${ordenId}/acceso-remoto-${crypto.randomUUID()}.${ext}`;
   const {error:upErr}=await s.storage.from('soporte-evidencias').upload(path,bytes,{contentType:mime,upsert:false});if(upErr)throw upErr;
   const {data:ev,error:eErr}=await s.from('soporte_evidencias').insert({orden_id:ordenId,tipo_foto:'ACCESO_REMOTO',storage_path_original:path,storage_path_vista:null,mime_type:mime,tamano_bytes:bytes.length,fecha_hora_captura:now,tomada_por_id:me.id,registrado_por_id:me.id}).select('id').single();
   if(eErr){await s.storage.from('soporte-evidencias').remove([path]);throw eErr}
   const {error:aErr}=await s.from('orden_acceso_remoto').upsert({orden_id:ordenId,evidencia_id:null,soporte_evidencia_id:ev.id,updated_at:now},{onConflict:'orden_id'});if(aErr)throw aErr;
   await s.from('orden_historial').insert({orden_id:ordenId,evento:'EVIDENCIA_ACCESO_REMOTO_GUARDADA',detalle:{evidencia_id:ev.id,origen:'SOPORTE'},realizado_por_id:me.id});
 }
 return reply({ok:true,...await estado(s,ordenId)})
}

return reply({error:'Acción no válida'},400)}catch(e){console.error(e);const m=String((e as any)?.message||e);return reply({error:m},m==='Debes iniciar sesión en el acceso principal'?401:m==='No autorizado'||m.includes('fuera de tu alcance')?403:500)}});