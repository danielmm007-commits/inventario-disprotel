import { createClient } from 'npm:@supabase/supabase-js@2.95.0';
const origin='https://danielmm007-commits.github.io';
const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'content-type,x-session','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json; charset=utf-8'};
function reply(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers})}
async function sha256(text:string){const b=new TextEncoder().encode(text);const h=await crypto.subtle.digest('SHA-256',b);return Array.from(new Uint8Array(h)).map(x=>x.toString(16).padStart(2,'0')).join('')}
function decodeBase64(input:string){const clean=input.includes(',')?input.split(',').pop()!:input;const bin=atob(clean);const out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out}
function extMime(m:string){return m==='image/png'?'png':m==='image/webp'?'webp':'jpg'}
function db(){const url=Deno.env.get('SUPABASE_URL')!;const raw=Deno.env.get('SUPABASE_SECRET_KEYS');const key=raw?JSON.parse(raw).default:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!key)throw new Error('Clave servidor no disponible');return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}
async function auth(s:any,sessionToken:string){const token=String(sessionToken||'').trim();if(!token)throw new Error('Debes iniciar sesión en el acceso principal');const {data:ses,error:sErr}=await s.from('app_auth_sessions').select('id,responsable_id').eq('token_hash',await sha256(token)).is('revoked_at',null).gt('expires_at',new Date().toISOString()).maybeSingle();if(sErr)throw sErr;if(!ses)throw new Error('Debes iniciar sesión en el acceso principal');const {data:person,error:pErr}=await s.from('responsables').select('id,usuario,nombre,rol,unidad_grupo,activo,puede_solicitar_trabajo').eq('id',ses.responsable_id).eq('activo',true).maybeSingle();if(pErr)throw pErr;if(!person)throw new Error('Debes iniciar sesión en el acceso principal');await s.from('app_auth_sessions').update({last_used_at:new Date().toISOString()}).eq('id',ses.id);return person}
async function locationForGroup(s:any,grupo:string){const {data:g,error:gErr}=await s.from('grupos_operativos').select('id').eq('nombre',grupo).eq('activo',true).maybeSingle();if(gErr)throw gErr;if(!g)throw new Error(`El grupo operativo no está configurado: ${grupo}`);const {data:c,error:cErr}=await s.from('ubicaciones_operativas_config').select('ubicacion_stock_id').eq('grupo_id',g.id).eq('activo',true).maybeSingle();if(cErr)throw cErr;if(!c?.ubicacion_stock_id)throw new Error(`El grupo no tiene minibodega asociada: ${grupo}`);const {data:u,error:uErr}=await s.from('ubicaciones').select('id,ubicacion,codigo').eq('id',c.ubicacion_stock_id).eq('activo',true).maybeSingle();if(uErr)throw uErr;if(!u)throw new Error(`La minibodega configurada para ${grupo} no está activa`);return u}
function telValido(v:string){const t=v.replace(/\D/g,'');return /^09\d{8}$/.test(t)||/^0[2-7]\d{7}$/.test(t)}
function orderId(){return 'OT-'+new Date().toISOString().slice(0,10).replaceAll('-','')+'-'+Math.floor(Math.random()*90000+10000)}
function grupoCodigo(v:string){const n=String(v||'').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');if(n.includes('CAMIONETA'))return 'CAMIONETA';if(n.includes('FURGONETA'))return 'FURGONETA';if(n.includes('SAQUISILI'))return 'SAQUISILÍ';return n}
async function resolveRouterId(s:any,routerId:any,legacy:any){
 if(routerId)return routerId;
 const raw=String(legacy||'').toUpperCase().replace(/[-_]+/g,' ').replace(/\s+/g,' ').trim();
 if(!raw)return null;
 const alias=raw.includes('SANTANA')?'ROUTER SALCEDO':raw;
 const q=await s.from('routers_cobertura').select('id,nombre').eq('activo',true).ilike('nombre',alias).limit(1).maybeSingle();
 if(q.error)throw q.error;return q.data?.id||null;
}
async function lanzarVerificacionIpCreacion(s:any,ordenId:string,sv:any,solicitadoPorId:string){
 const ip=sv?.ip_cliente||null,routerId=await resolveRouterId(s,sv?.router_cobertura_id,sv?.router_legacy);
 const base={ip_creacion_registrada:ip,ip_creacion_router_id:routerId,ip_creacion_estado:(ip&&routerId)?'PENDIENTE_RB':'SIN_DATOS'};
 const u=await s.from('ordenes_trabajo').update(base).eq('id',ordenId);if(u.error)throw u.error;
 if(!ip||!routerId)return {estado:'SIN_DATOS',consulta_id:null};
 try{
   const q=await s.from('consulta_red_solicitudes').insert({
     orden_id:ordenId,servicio_id:sv.id,solicitado_por_id:solicitadoPorId,router_id:routerId,ip_cliente:ip,
     mikrotik_estado:'PENDIENTE',smartolt_estado:'NO_APLICA',olt_estado:'NO_APLICA'
   }).select('id').single();
   if(q.error)throw q.error;
   const up=await s.from('ordenes_trabajo').update({ip_creacion_consulta_id:q.data.id}).eq('id',ordenId);if(up.error)throw up.error;
   return {estado:'PENDIENTE_RB',consulta_id:q.data.id};
 }catch(e){
   await s.from('ordenes_trabajo').update({ip_creacion_estado:'ERROR_SOLICITUD',ip_creacion_resultado:{error:String((e as any)?.message||e)}}).eq('id',ordenId);
   return {estado:'ERROR_SOLICITUD',consulta_id:null};
 }
}
async function puedeTrabajar(_s:any,o:any,me:any){
  return o?.grupo_asignado===me?.unidad_grupo;
}
function uniq(v:any[]){return [...new Set(v.filter(Boolean).map(x=>String(x)))]}
async function resolverAutomatismosSoporte(s:any,hallazgos:string[],soluciones:string[],accionesAdicionales:string[]=[]){
  const hs=uniq(hallazgos.map(x=>String(x||'').trim().toUpperCase())),ss=uniq(soluciones.map(x=>String(x||'').trim().toUpperCase())),aa=uniq(accionesAdicionales.map(x=>String(x||'').trim().toUpperCase()));
  const out:any={mesa:[],verificacion:[],evidencias:[],inventario:false,retiro:false,serial_nuevo:false};
  if(hs.length&&ss.length){
    const hq=await s.from('soporte_hallazgos_catalogo').select('id,codigo').in('codigo',hs).eq('activo',true);if(hq.error)throw hq.error;
    const sq=await s.from('soporte_soluciones_catalogo').select('id,codigo').in('codigo',ss).eq('activo',true);if(sq.error)throw sq.error;
    const hids=(hq.data||[]).map((x:any)=>x.id),sids=(sq.data||[]).map((x:any)=>x.id);
    if(hids.length&&sids.length){
      const rq=await s.from('soporte_hallazgo_soluciones').select('hallazgo_id,solucion_id,automatismos').in('hallazgo_id',hids).in('solucion_id',sids).eq('activo',true);if(rq.error)throw rq.error;
      for(const r of rq.data||[]){const a=r.automatismos||{};out.mesa.push(...(Array.isArray(a.mesa)?a.mesa:[]));out.verificacion.push(...(Array.isArray(a.verificacion)?a.verificacion:[]));out.evidencias.push(...(Array.isArray(a.evidencias)?a.evidencias:[]));out.inventario=out.inventario||a.inventario===true;out.retiro=out.retiro||a.retiro===true;out.serial_nuevo=out.serial_nuevo||a.serial_nuevo===true}
    }
  }
  if(aa.length){
    const aq=await s.from('soporte_acciones_adicionales_catalogo').select('codigo,automatismos').in('codigo',aa).eq('activo',true);if(aq.error)throw aq.error;
    for(const r of aq.data||[]){const a=r.automatismos||{};out.mesa.push(...(Array.isArray(a.mesa)?a.mesa:[]));out.verificacion.push(...(Array.isArray(a.verificacion)?a.verificacion:[]));out.evidencias.push(...(Array.isArray(a.evidencias)?a.evidencias:[]));out.inventario=out.inventario||a.inventario===true;out.retiro=out.retiro||a.retiro===true;out.serial_nuevo=out.serial_nuevo||a.serial_nuevo===true}
  }
  out.mesa=uniq(out.mesa);out.verificacion=uniq(out.verificacion);out.evidencias=uniq(out.evidencias);return out;
}

async function recomputarHallazgosReporte(s:any,reporte:any){
  const q=await s.from('soporte_reporte_hallazgos').select('id,hallazgo_codigo,solucion_codigo,hallazgo_nombre,solucion_nombre,automatismos,created_at').eq('reporte_id',reporte.id).order('created_at');
  if(q.error)throw q.error;
  const rows=q.data||[],acciones=Array.isArray(reporte.acciones_adicionales_codigos)?reporte.acciones_adicionales_codigos:[];
  const autoBase=rows.map((x:any)=>x.automatismos||{});
  const aq=acciones.length?await s.from('soporte_acciones_adicionales_catalogo').select('codigo,automatismos').in('codigo',acciones).eq('activo',true):{data:[],error:null};
  if((aq as any).error)throw (aq as any).error;
  const out:any={mesa:[],verificacion:[],evidencias:[],inventario:false,retiro:false,serial_nuevo:false};
  for(const a of [...autoBase,...(((aq as any).data||[]).map((x:any)=>x.automatismos||{}))]){
    out.mesa.push(...(Array.isArray(a.mesa)?a.mesa:[]));out.verificacion.push(...(Array.isArray(a.verificacion)?a.verificacion:[]));out.evidencias.push(...(Array.isArray(a.evidencias)?a.evidencias:[]));
    out.inventario=out.inventario||a.inventario===true;out.retiro=out.retiro||a.retiro===true;out.serial_nuevo=out.serial_nuevo||a.serial_nuevo===true;
  }
  out.mesa=uniq(out.mesa);out.verificacion=uniq(out.verificacion);out.evidencias=uniq(out.evidencias);
  const hallazgos=rows.map((x:any)=>x.hallazgo_codigo),soluciones=rows.map((x:any)=>x.solucion_codigo);
  const diagnostico=rows.map((x:any)=>x.hallazgo_nombre).join(' · ')||null,solucion=rows.map((x:any)=>x.solucion_nombre).join(' · ')||null;
  const u=await s.from('soporte_reportes').update({hallazgos_codigos:hallazgos,soluciones_codigos:soluciones,diagnostico,solucion,automatismos:out,updated_at:new Date().toISOString()}).eq('id',reporte.id);if(u.error)throw u.error;
  return {rows,hallazgos,soluciones,diagnostico,solucion,automatismos:out};
}
Deno.serve(async req=>{if(req.method==='OPTIONS')return new Response('ok',{headers});if(req.method!=='POST')return reply({error:'Método no permitido'},405);try{const body=await req.json().catch(()=>({}));const sessionToken=String(body.session_token||'').trim();if(!sessionToken)return reply({error:'Debes iniciar sesión en el acceso principal'},401);const s=db();const me=await auth(s,sessionToken);const action=String(body.action||'');
if(action==='create-support'){
if(!me.puede_solicitar_trabajo&&me.rol!=='ADMINISTRADOR')return reply({error:'Usuario no autorizado para solicitar trabajos'},403);const servicioId=String(body.servicio_id||'').trim(),problema=String(body.problema||'').trim(),contactoNombre=String(body.contacto_nombre||'').trim(),contactoTel=String(body.contacto_telefono||'').trim(),grupo=String(body.grupo_destino||'').trim();if(!servicioId)return reply({error:'Seleccione un servicio'},400);if(!problema)return reply({error:'Escriba el problema reportado'},400);if(contactoTel&&!telValido(contactoTel))return reply({error:'El teléfono de contacto no tiene un formato válido'},400);const {data:sv,error:sErr}=await s.from('servicios_cliente').select('id,cliente_id,empresa,codigo_servicio_legacy,plan_codigo,router_cobertura_id,router_legacy,tipo_conexion,ip_cliente,direccion,estado,activo,cliente:clientes(id,identificacion,nombre_completo,telefono,correo,activo)').eq('id',servicioId).maybeSingle();if(sErr)throw sErr;if(!sv||!sv.activo||!sv.cliente||!sv.cliente.activo)return reply({error:'Servicio no encontrado o inactivo'},404);const {data:abierta,error:aErr}=await s.from('ordenes_trabajo').select('id,id_orden,estado,fecha_solicitud').eq('tipo_trabajo','SOPORTE_TECNICO').eq('servicio_cliente_id',servicioId).in('estado',['PENDIENTE','ACEPTADA','EN_CAMINO','EN_PROCESO','ESPERANDO_IP','IP_ASIGNADA']).order('fecha_solicitud',{ascending:false}).limit(1).maybeSingle();if(aErr)throw aErr;if(abierta)return reply({error:`Este servicio ya tiene un soporte abierto: ${abierta.id_orden} · Estado: ${abierta.estado}`,soporte_abierto:abierta},409);const detalle=`Servicio: ${sv.codigo_servicio_legacy||'SIN CODIGO'} | Router: ${sv.router_legacy||'SIN DATO'} | IP registrada: ${sv.ip_cliente||'SIN DATO'} | ${problema}`;const resolvedRouterId=await resolveRouterId(s,sv.router_cobertura_id,sv.router_legacy);const payload={id_orden:orderId(),solicitado_por_id:me.id,tipo_trabajo:'SOPORTE_TECNICO',cliente_id:sv.cliente_id||sv.cliente.id,cliente_nombre:sv.cliente.nombre_completo,cliente_identificacion:sv.cliente.identificacion||null,cliente_telefono:sv.cliente.telefono||null,cliente_correo:sv.cliente.correo||null,cliente_direccion:sv.direccion||null,cliente_referencia:null,router_cobertura_id:resolvedRouterId||null,plan_solicitado:sv.plan_codigo||null,tv_solicitada:false,observacion_solicitud:detalle,grupo_destino:grupo||null,servicio_cliente_id:sv.id,contacto_visita_nombre:contactoNombre||null,contacto_visita_telefono:contactoTel||null,ip_creacion_registrada:sv.ip_cliente||null,ip_creacion_router_id:resolvedRouterId||null,ip_creacion_estado:(sv.ip_cliente&&resolvedRouterId)?'PENDIENTE_RB':'SIN_DATOS'};const {data,error}=await s.from('ordenes_trabajo').insert(payload).select('id,id_orden,estado').single();if(error){if((error as any).code==='23505')return reply({error:'Este servicio ya tiene un soporte abierto. Actualice la búsqueda para ver la orden existente.'},409);throw error}await s.from('orden_historial').insert({orden_id:data.id,evento:'SOPORTE_CREADO',detalle:{servicio_id:sv.id,codigo_servicio:sv.codigo_servicio_legacy,correo:payload.cliente_correo,contacto_visita_nombre:contactoNombre||null,contacto_visita_telefono:contactoTel||null},realizado_por_id:me.id});const ipVerificacion=await lanzarVerificacionIpCreacion(s,data.id,sv,me.id);return reply({ok:true,orden:data,ip_verificacion:ipVerificacion})}
if(action==='my-supports'){if(!me.puede_solicitar_trabajo&&me.rol!=='ADMINISTRADOR')return reply({error:'Usuario no autorizado para consultar soportes'},403);const {data,error}=await s.from('ordenes_trabajo').select('id,id_orden,estado,fecha_solicitud,cliente_nombre,cliente_correo,cliente_referencia,grupo_destino,grupo_asignado,servicio:servicios_cliente(codigo_servicio_legacy)').eq('tipo_trabajo','SOPORTE_TECNICO').eq('solicitado_por_id',me.id).order('fecha_solicitud',{ascending:false}).limit(20);if(error)throw error;return reply({ok:true,soportes:data||[]})}
if(action==='mark-en-route'){if(me.rol!=='TÉCNICO')return reply({error:'Solo técnicos'},403);const ordenId=String(body.orden_id||'').trim();const {data:o,error:oErr}=await s.from('ordenes_trabajo').select('id,id_orden,tipo_trabajo,grupo_asignado,estado').eq('id',ordenId).maybeSingle();if(oErr)throw oErr;if(!o||!['SOPORTE_TECNICO','REPARACION_TRONCAL','INTERVENCION_NODO','CAMBIO_EQUIPOS','REUBICACION'].includes(o.tipo_trabajo))return reply({error:'Trabajo técnico no encontrado'},404);if(!(await puedeTrabajar(s,o,me)))return reply({error:'Este trabajo pertenece a otro grupo'},403);if(o.estado!=='ACEPTADA')return reply({error:`El soporte debe estar ACEPTADA para marcar EN CAMINO. Estado actual: ${o.estado}`},400);const {error:uErr}=await s.from('ordenes_trabajo').update({estado:'EN_CAMINO'}).eq('id',o.id);if(uErr)throw uErr;await s.from('orden_historial').insert({orden_id:o.id,evento:'SOPORTE_EN_CAMINO',detalle:{},realizado_por_id:me.id});return reply({ok:true,estado:'EN_CAMINO'})}
if(action==='mark-in-progress'){if(me.rol!=='TÉCNICO')return reply({error:'Solo técnicos'},403);const ordenId=String(body.orden_id||'').trim();const {data:o,error:oErr}=await s.from('ordenes_trabajo').select('id,id_orden,tipo_trabajo,grupo_asignado,estado').eq('id',ordenId).maybeSingle();if(oErr)throw oErr;if(!o||!['SOPORTE_TECNICO','REPARACION_TRONCAL','INTERVENCION_NODO','CAMBIO_EQUIPOS','REUBICACION'].includes(o.tipo_trabajo))return reply({error:'Trabajo técnico no encontrado'},404);if(!(await puedeTrabajar(s,o,me)))return reply({error:'Este trabajo pertenece a otro grupo'},403);if(o.estado!=='EN_CAMINO')return reply({error:`El soporte debe estar EN_CAMINO para iniciar. Estado actual: ${o.estado}`},400);const now=new Date().toISOString();const {error:uErr}=await s.from('ordenes_trabajo').update({estado:'EN_PROCESO'}).eq('id',o.id);if(uErr)throw uErr;const {data:exist,error:xErr}=await s.from('soporte_reportes').select('id').eq('orden_id',o.id).maybeSingle();if(xErr)throw xErr;if(exist){const {error:rErr}=await s.from('soporte_reportes').update({estado_reporte:'EN_PROCESO',iniciado_at:now,updated_at:now,tecnico_id:me.id}).eq('id',exist.id);if(rErr)throw rErr}else{const {error:rErr}=await s.from('soporte_reportes').insert({orden_id:o.id,tecnico_id:me.id,estado_reporte:'EN_PROCESO',iniciado_at:now,updated_at:now});if(rErr)throw rErr}await s.from('orden_historial').insert({orden_id:o.id,evento:'SOPORTE_EN_PROCESO',detalle:{},realizado_por_id:me.id});return reply({ok:true,estado:'EN_PROCESO'})}
if(action==='get-support'){if(me.rol!=='TÉCNICO')return reply({error:'Solo técnicos'},403);const ordenId=String(body.orden_id||'').trim();const [{data:o,error:oErr},{data:ubicacion,error:uErr}]=await Promise.all([s.from('ordenes_trabajo').select('id,id_orden,estado,tipo_trabajo,fecha_solicitud,cliente_id,cliente_nombre,cliente_identificacion,cliente_telefono,cliente_correo,cliente_direccion,cliente_referencia,contacto_visita_nombre,contacto_visita_telefono,observacion_solicitud,plan_solicitado,grupo_asignado,servicio_cliente_id,ip_creacion_registrada,ip_creacion_estado,ip_creacion_verificada_at,ip_creacion_resultado,router:routers_cobertura!ordenes_trabajo_router_cobertura_id_fkey(nombre),servicio:servicios_cliente(id,codigo_servicio_legacy,plan_codigo,router_legacy,tipo_conexion,ip_cliente,direccion,estado)').eq('id',ordenId).maybeSingle(),s.rpc('ultima_ubicacion_cliente_orden',{p_orden_id:ordenId})]);if(oErr)throw oErr;if(uErr)throw uErr;if(!o||!['SOPORTE_TECNICO','REPARACION_TRONCAL','INTERVENCION_NODO','CAMBIO_EQUIPOS','REUBICACION'].includes(o.tipo_trabajo))return reply({error:'Trabajo técnico no encontrado'},404);if(!(await puedeTrabajar(s,o,me)))return reply({error:'Este trabajo pertenece a otro grupo'},403);const {data:r,error:rErr}=await s.from('soporte_reportes').select('id,diagnostico,solucion,observacion,hallazgos_codigos,soluciones_codigos,acciones_adicionales_codigos,automatismos,estado_reporte,iniciado_at,resuelto_at,updated_at,registro_tecnico_guardado_at,canasta_borrador,canasta_actualizada_at,canasta_confirmada_at').eq('orden_id',o.id).maybeSingle();if(rErr)throw rErr;const {data:ev}=await s.from('soporte_evidencias').select('id,tipo_foto,fecha_hora_captura,latitud,longitud,gps_precision_m,gps_capturado_at').eq('orden_id',o.id).eq('es_actual',true).order('created_at');let hallazgos_detalle:any[]=[];if(r?.id){const hq=await s.from('soporte_reporte_hallazgos').select('id,hallazgo_codigo,solucion_codigo,hallazgo_nombre,solucion_nombre,automatismos,created_at').eq('reporte_id',r.id).order('created_at');if(hq.error)throw hq.error;hallazgos_detalle=hq.data||[]}return reply({ok:true,orden:o,reporte:r,hallazgos_detalle,evidencias:ev||[],ultima_ubicacion:ubicacion||{ok:true,encontrada:false}})}
if(action==='support-options'){if(me.rol!=='TÉCNICO')return reply({error:'Solo técnicos'},403);const ordenId=String(body.orden_id||'').trim();const {data:o,error:oErr}=await s.from('ordenes_trabajo').select('id,tipo_trabajo,grupo_asignado,estado').eq('id',ordenId).maybeSingle();if(oErr)throw oErr;if(!o||!['SOPORTE_TECNICO','REPARACION_TRONCAL','INTERVENCION_NODO','CAMBIO_EQUIPOS','REUBICACION'].includes(o.tipo_trabajo))return reply({error:'Trabajo técnico no encontrado'},404);if(!(await puedeTrabajar(s,o,me)))return reply({error:'Este trabajo pertenece a otro grupo'},403);const u=await locationForGroup(s,me.unidad_grupo);const [{data:prods,error:pErr},{data:serials,error:sErr},{data:movs,error:mErr}]=await Promise.all([s.from('productos').select('id,codigo,producto,categoria,marca,modelo,requiere_serial').eq('activo',true).order('producto'),s.from('seriales').select('id,serial,estado_actual,producto:productos(id,codigo,producto,categoria,marca,modelo)').eq('ubicacion_actual_id',u.id).order('serial'),s.from('movimientos').select('producto_id,origen_id,destino_id,cantidad').is('serial_id',null).or(`origen_id.eq.${u.id},destino_id.eq.${u.id}`)]);if(pErr)throw pErr;if(sErr)throw sErr;if(mErr)throw mErr;const stock=new Map<string,number>();for(const m of movs||[]){const k=m.producto_id;stock.set(k,(stock.get(k)||0)+(m.destino_id===u.id?Number(m.cantidad):0)-(m.origen_id===u.id?Number(m.cantidad):0))}const cantidades=(prods||[]).filter((p:any)=>!p.requiere_serial&&(stock.get(p.id)||0)>0).map((p:any)=>({...p,stock:stock.get(p.id)||0}));return reply({ok:true,ubicacion:u,cantidades,seriales:serials||[]})}
if(action==='upload-evidence'){if(me.rol!=='TÉCNICO')return reply({error:'Solo técnicos'},403);const ordenId=String(body.orden_id||'').trim(),tipo=String(body.tipo_foto||'OTRA').toUpperCase(),mime=String(body.mime_type||'image/jpeg').toLowerCase(),b64=String(body.base64_original||''),vista=String(body.base64_vista||'');if(!['SERIAL','EQUIPO','TRABAJO','OTRA'].includes(tipo))return reply({error:'Tipo de evidencia no válido'},400);if(!['image/jpeg','image/png','image/webp'].includes(mime))return reply({error:'Formato de imagen no permitido'},400);if(!b64)return reply({error:'Imagen requerida'},400);const {data:o,error:oErr}=await s.from('ordenes_trabajo').select('id,tipo_trabajo,grupo_asignado,estado').eq('id',ordenId).maybeSingle();if(oErr)throw oErr;if(!o||!['SOPORTE_TECNICO','REPARACION_TRONCAL','INTERVENCION_NODO','CAMBIO_EQUIPOS','REUBICACION'].includes(o.tipo_trabajo))return reply({error:'Trabajo técnico no encontrado'},404);if(!(await puedeTrabajar(s,o,me)))return reply({error:'Este trabajo pertenece a otro grupo'},403);if(!['EN_PROCESO','COMPLETADA'].includes(o.estado))return reply({error:'La evidencia solo puede cargarse durante o al finalizar el soporte'},400);const bytes=decodeBase64(b64);if(bytes.length>5*1024*1024)return reply({error:'La imagen original supera 5 MB'},400);const ext=extMime(mime),base=`${ordenId}/${tipo.toLowerCase()}-${crypto.randomUUID()}`,pathO=`${base}-original.${ext}`;const {error:upErr}=await s.storage.from('soporte-evidencias').upload(pathO,bytes,{contentType:mime,upsert:false});if(upErr)throw upErr;let pathV:string|null=null;if(vista){const vb=decodeBase64(vista);if(vb.length>5*1024*1024){await s.storage.from('soporte-evidencias').remove([pathO]);return reply({error:'La vista encuadrada supera 5 MB'},400)}pathV=`${base}-vista.${ext}`;const {error:vErr}=await s.storage.from('soporte-evidencias').upload(pathV,vb,{contentType:mime,upsert:false});if(vErr){await s.storage.from('soporte-evidencias').remove([pathO]);throw vErr}}const payload={orden_id:ordenId,tipo_foto:tipo,storage_path_original:pathO,storage_path_vista:pathV,mime_type:mime,tamano_bytes:bytes.length,fecha_hora_captura:body.fecha_hora_captura||new Date().toISOString(),latitud:body.latitud??null,longitud:body.longitud??null,gps_precision_m:body.gps_precision_m??null,gps_capturado_at:body.gps_capturado_at??null,tomada_por_id:me.id,registrado_por_id:me.id};const {data:e,error:eErr}=await s.from('soporte_evidencias').insert(payload).select('id,tipo_foto,fecha_hora_captura').single();if(eErr){await s.storage.from('soporte-evidencias').remove([pathO,...(pathV?[pathV]:[])]);throw eErr}return reply({ok:true,evidencia:e})}
if(action==='finalize-support'){
 if(me.rol!=='TÉCNICO')return reply({error:'Solo técnicos'},403);
 const ordenId=String(body.orden_id||'').trim();
 const {data:reporte,error:rErr}=await s.from('soporte_reportes')
   .select('registro_tecnico_guardado_at,canasta_borrador,canasta_confirmada_at')
   .eq('orden_id',ordenId).maybeSingle();
 if(rErr)throw rErr;
 // El numeral 2 alimenta diagnóstico y solución; el 4 solo permite notas opcionales.
 if(!reporte?.canasta_confirmada_at||!Array.isArray(reporte?.canasta_borrador))
   return reply({error:'Primero guarda y confirma la canasta del numeral 5'},409);
 const items=Array.isArray(body.items)?body.items:[];
 const forma=(list:any[])=>list.map((x:any)=>x.tipo_control==='SERIAL'
   ?{tipo_control:'SERIAL',serial:String(x.serial||'').trim()}
   :{tipo_control:String(x.tipo_control||''),producto_id:String(x.producto_id||''),
     cantidad:Number(x.cantidad)}).sort((a:any,b:any)=>
       JSON.stringify(a).localeCompare(JSON.stringify(b)));
 const actual=forma(items),guardada=forma(reporte.canasta_borrador);
 if(JSON.stringify(actual)!==JSON.stringify(guardada))
   return reply({error:'La canasta cambió desde la última confirmación. Vuelve al numeral 5 y guarda de nuevo.'},409);
 // Solo la versión confirmada en Supabase llega a la transacción que descuenta stock.
 const {data,error}=await s.rpc('finalizar_soporte',{
   p_orden_id:ordenId,p_tecnico_id:me.id,p_diagnostico:String(body.diagnostico||''),
   p_solucion:String(body.solucion||''),p_observacion:String(body.observacion||''),
   p_resultado:String(body.resultado||'RESUELTO'),p_items:guardada
 });
 if(error)throw error;
 return reply(data);
}
if(action==='support-summary'){const ordenId=String(body.orden_id||'').trim();const [{data:o,error:oErr},{data:ubicacion,error:uErr}]=await Promise.all([s.from('ordenes_trabajo').select('id,id_orden,estado,tipo_trabajo,fecha_solicitud,solicitado_por_id,cliente_nombre,cliente_identificacion,cliente_telefono,cliente_correo,cliente_direccion,cliente_referencia,contacto_visita_nombre,contacto_visita_telefono,observacion_solicitud,plan_solicitado,grupo_destino,grupo_asignado,aceptado_at,aceptado_por:responsables!ordenes_trabajo_aceptado_por_id_fkey(id,nombre),solicitado_por:responsables!ordenes_trabajo_solicitado_por_id_fkey(id,nombre),servicio:servicios_cliente(id,codigo_servicio_legacy,plan_codigo,router_legacy,tipo_conexion,ip_cliente,direccion)').eq('id',ordenId).maybeSingle(),s.rpc('ultima_ubicacion_cliente_orden',{p_orden_id:ordenId})]);if(oErr)throw oErr;if(uErr)throw uErr;if(!o||!['SOPORTE_TECNICO','REPARACION_TRONCAL','INTERVENCION_NODO','CAMBIO_EQUIPOS','REUBICACION'].includes(o.tipo_trabajo))return reply({error:'Trabajo técnico no encontrado'},404);const puede=me.rol==='ADMINISTRADOR'||o.solicitado_por_id===me.id||(me.rol==='TÉCNICO'&&o.grupo_asignado===me.unidad_grupo);if(!puede)return reply({error:'No autorizado para ver esta hoja'},403);const [{data:r,error:rErr},{data:items,error:iErr},{data:ev,error:eErr}]=await Promise.all([s.from('soporte_reportes').select('diagnostico,solucion,observacion,registro_tecnico_guardado_at,canasta_borrador,canasta_actualizada_at,canasta_confirmada_at,estado_reporte,iniciado_at,resuelto_at,tecnico:responsables(nombre)').eq('orden_id',ordenId).maybeSingle(),s.from('soporte_items').select('tipo_control,cantidad,unidad,producto:productos(codigo,producto,marca,modelo),serial:seriales(serial)').eq('orden_id',ordenId).order('created_at'),s.from('soporte_evidencias').select('id,tipo_foto,storage_path_original,storage_path_vista,fecha_hora_captura,latitud,longitud').eq('orden_id',ordenId).eq('es_actual',true).order('created_at')]);if(rErr)throw rErr;if(iErr)throw iErr;if(eErr)throw eErr;const evidencias=[];for(const x of ev||[]){const path=x.storage_path_vista||x.storage_path_original;const {data:sg}=await s.storage.from('soporte-evidencias').createSignedUrl(path,3600);evidencias.push({id:x.id,tipo_foto:x.tipo_foto,fecha_hora_captura:x.fecha_hora_captura,latitud:x.latitud,longitud:x.longitud,url:sg?.signedUrl||null})}return reply({ok:true,orden:o,reporte:r,items:items||[],evidencias,ultima_ubicacion:ubicacion||{ok:true,encontrada:false}})}
if(action==='add-support-finding'){if(me.rol!=='TÉCNICO')return reply({error:'Solo técnicos'},403);const ordenId=String(body.orden_id||'').trim(),hc=String(body.hallazgo_codigo||'').trim().toUpperCase(),sc=String(body.solucion_codigo||'').trim().toUpperCase();const {data:o,error:oErr}=await s.from('ordenes_trabajo').select('id,tipo_trabajo,grupo_asignado,estado').eq('id',ordenId).maybeSingle();if(oErr)throw oErr;if(!o||o.tipo_trabajo!=='SOPORTE_TECNICO')return reply({error:'Soporte no encontrado'},404);if(!(await puedeTrabajar(s,o,me)))return reply({error:'Este trabajo pertenece a otro grupo'},403);if(o.estado!=='EN_PROCESO')return reply({error:'El soporte debe estar EN PROCESO'},400);const {data:r,error:rErr}=await s.from('soporte_reportes').select('id,acciones_adicionales_codigos').eq('orden_id',ordenId).maybeSingle();if(rErr)throw rErr;if(!r)return reply({error:'Reporte de soporte no disponible'},400);const h=await s.from('soporte_hallazgos_catalogo').select('id,codigo,nombre').eq('codigo',hc).eq('activo',true).maybeSingle();if(h.error)throw h.error;const so=await s.from('soporte_soluciones_catalogo').select('id,codigo,nombre').eq('codigo',sc).eq('activo',true).maybeSingle();if(so.error)throw so.error;if(!h.data||!so.data)return reply({error:'Hallazgo o solución no válidos'},400);const rel=await s.from('soporte_hallazgo_soluciones').select('automatismos').eq('hallazgo_id',h.data.id).eq('solucion_id',so.data.id).eq('activo',true).maybeSingle();if(rel.error)throw rel.error;if(!rel.data)return reply({error:'La solución no corresponde a ese hallazgo'},400);const ins=await s.from('soporte_reporte_hallazgos').upsert({reporte_id:r.id,orden_id:ordenId,hallazgo_codigo:hc,solucion_codigo:sc,hallazgo_nombre:h.data.nombre,solucion_nombre:so.data.nombre,automatismos:rel.data.automatismos||{},creado_por_id:me.id},{onConflict:'reporte_id,hallazgo_codigo,solucion_codigo'});if(ins.error)throw ins.error;const agg=await recomputarHallazgosReporte(s,r);return reply({ok:true,...agg})}
if(action==='remove-support-finding'){if(me.rol!=='TÉCNICO')return reply({error:'Solo técnicos'},403);const ordenId=String(body.orden_id||'').trim(),findingId=String(body.finding_id||'').trim();const {data:o,error:oErr}=await s.from('ordenes_trabajo').select('id,tipo_trabajo,grupo_asignado,estado').eq('id',ordenId).maybeSingle();if(oErr)throw oErr;if(!o||o.tipo_trabajo!=='SOPORTE_TECNICO')return reply({error:'Soporte no encontrado'},404);if(!(await puedeTrabajar(s,o,me)))return reply({error:'Este trabajo pertenece a otro grupo'},403);const {data:r,error:rErr}=await s.from('soporte_reportes').select('id,acciones_adicionales_codigos').eq('orden_id',ordenId).maybeSingle();if(rErr)throw rErr;if(!r)return reply({error:'Reporte no disponible'},400);const del=await s.from('soporte_reporte_hallazgos').delete().eq('id',findingId).eq('reporte_id',r.id);if(del.error)throw del.error;const agg=await recomputarHallazgosReporte(s,r);return reply({ok:true,...agg})}
if(action==='save-report'){if(me.rol!=='TÉCNICO')return reply({error:'Solo técnicos'},403);const ordenId=String(body.orden_id||'').trim(),diagnostico=String(body.diagnostico||'').trim(),solucion=String(body.solucion||'').trim(),observacion=String(body.observacion||'').trim(),hallazgos=Array.isArray(body.hallazgos_codigos)?uniq(body.hallazgos_codigos.map((x:any)=>String(x||'').trim().toUpperCase())):[],soluciones=Array.isArray(body.soluciones_codigos)?uniq(body.soluciones_codigos.map((x:any)=>String(x||'').trim().toUpperCase())):[],accionesAdicionales=Array.isArray(body.acciones_adicionales_codigos)?uniq(body.acciones_adicionales_codigos.map((x:any)=>String(x||'').trim().toUpperCase())):[];const {data:o,error:oErr}=await s.from('ordenes_trabajo').select('id,id_orden,tipo_trabajo,grupo_asignado,estado').eq('id',ordenId).maybeSingle();if(oErr)throw oErr;if(!o||!['SOPORTE_TECNICO','REPARACION_TRONCAL','INTERVENCION_NODO','CAMBIO_EQUIPOS','REUBICACION'].includes(o.tipo_trabajo))return reply({error:'Trabajo técnico no encontrado'},404);if(!(await puedeTrabajar(s,o,me)))return reply({error:'Este trabajo pertenece a otro grupo'},403);if(!['ACEPTADA','EN_CAMINO','EN_PROCESO'].includes(o.estado))return reply({error:'Este soporte no está disponible para editar en su estado actual'},400);const now=new Date().toISOString(),automatismos=await resolverAutomatismosSoporte(s,hallazgos,soluciones,accionesAdicionales);const payload:any={orden_id:o.id,tecnico_id:me.id,diagnostico:diagnostico||null,solucion:solucion||null,observacion:observacion||null,hallazgos_codigos:hallazgos,soluciones_codigos:soluciones,acciones_adicionales_codigos:accionesAdicionales,automatismos,estado_reporte:'EN_PROCESO',updated_at:now};if(body.confirmar_registro_tecnico===true)payload.registro_tecnico_guardado_at=now;const {data:exist,error:xErr}=await s.from('soporte_reportes').select('id,diagnostico,solucion,observacion,registro_tecnico_guardado_at').eq('orden_id',o.id).maybeSingle();if(xErr)throw xErr;if(exist){const {error}=await s.from('soporte_reportes').update(payload).eq('id',exist.id);if(error)throw error}else{const {error}=await s.from('soporte_reportes').insert(payload);if(error)throw error}if(o.estado!=='EN_PROCESO'){const {error:uErr}=await s.from('ordenes_trabajo').update({estado:'EN_PROCESO'}).eq('id',o.id);if(uErr)throw uErr}if(body.confirmar_registro_tecnico===true){const h=await s.from('orden_historial').insert({orden_id:o.id,evento:'SOPORTE_REGISTRO_TECNICO_GUARDADO',detalle:{diagnostico,solucion,observacion,guardado_at:now},realizado_por_id:me.id});if(h.error)console.warn('Historial registro técnico',h.error.message)}return reply({ok:true,estado:'EN_PROCESO',registro_tecnico_guardado_at:body.confirmar_registro_tecnico===true?now:exist?.registro_tecnico_guardado_at||null,hallazgos_codigos:hallazgos,soluciones_codigos:soluciones,acciones_adicionales_codigos:accionesAdicionales,automatismos})}
if(action==='save-observations'){
 if(me.rol!=='TÉCNICO')return reply({error:'Solo técnicos'},403);
 const ordenId=String(body.orden_id||'').trim();
 const observaciones=body.observaciones;
 if(!Array.isArray(observaciones)||observaciones.length>40)
   return reply({error:'Máximo 40 observaciones adicionales'},400);
 const notas=observaciones.map((x:any)=>String(x||'').trim());
 if(notas.some((x:string)=>!x||x.length>2000))return reply({error:'Cada observación debe contener entre 1 y 2000 caracteres'},400);
 const {data:o,error:oErr}=await s.from('ordenes_trabajo')
   .select('id,grupo_asignado,tipo_trabajo,estado').eq('id',ordenId).maybeSingle();
 if(oErr)throw oErr;
 if(!o||!['SOPORTE_TECNICO','REPARACION_TRONCAL','INTERVENCION_NODO','CAMBIO_EQUIPOS','REUBICACION'].includes(o.tipo_trabajo))
   return reply({error:'Orden de soporte no encontrada'},404);
 if(!(await puedeTrabajar(s,o,me)))return reply({error:'Orden no asignada al técnico'},403);
 if(o.estado!=='EN_PROCESO')return reply({error:'La orden debe estar EN PROCESO'},409);
 const {data:r,error:rErr}=await s.from('soporte_reportes').select('id')
   .eq('orden_id',ordenId).eq('estado_reporte','EN_PROCESO').maybeSingle();
 if(rErr)throw rErr;
 if(!r)return reply({error:'Primero registra un hallazgo en el numeral 2'},409);
 const now=new Date().toISOString(),observacion=notas.length?notas.map((x:string)=>'• '+x).join('\n'):null;
 const {error:uErr}=await s.from('soporte_reportes').update({
   observacion,registro_tecnico_guardado_at:now,updated_at:now
 }).eq('id',r.id);
 if(uErr)throw uErr;
 return reply({ok:true,observacion,registro_tecnico_guardado_at:now});
}
if(action==='save-basket'){
 if(me.rol!=='TÉCNICO')return reply({error:'Solo técnicos'},403);
 const ordenId=String(body.orden_id||'').trim(),confirmar=body.confirmar===true;
 const input=body.items;
 if(!Array.isArray(input)||input.length>100)return reply({error:'La canasta debe contener como máximo 100 artículos'},400);
 const {data:o,error:oErr}=await s.from('ordenes_trabajo')
   .select('id,grupo_asignado,estado,tipo_trabajo').eq('id',ordenId).maybeSingle();
 if(oErr)throw oErr;
 if(!o||!['SOPORTE_TECNICO','REPARACION_TRONCAL','INTERVENCION_NODO','CAMBIO_EQUIPOS','REUBICACION'].includes(o.tipo_trabajo))
   return reply({error:'Orden de soporte no encontrada'},404);
 if(!(await puedeTrabajar(s,o,me)))return reply({error:'La orden pertenece a otro técnico o grupo'},403);
 if(o.estado!=='EN_PROCESO')return reply({error:'La OT debe estar EN PROCESO'},409);
 const inventario=new Map<string,any>();
 for(const raw of input){
   const tipo=String(raw?.tipo_control||'').toUpperCase();
   if(!['METROS','CANTIDAD','SERIAL'].includes(tipo))
     return reply({error:'Tipo de artículo inválido'},400);
   if(tipo==='SERIAL'){
     const sn=String(raw?.serial||'').trim();
     if(!sn||sn.length>100)return reply({error:'Serial inválido'},400);
     const k='S:'+sn.toUpperCase();
     if(inventario.has(k))return reply({error:'El mismo serial no puede repetirse'},409);
     inventario.set(k,{tipo_control:'SERIAL',serial:sn,nombre:String(raw.nombre||'EQUIPO').slice(0,180)});
   }else{
     const id=String(raw?.producto_id||'').trim();
     const n=Number(raw?.cantidad);
     if(!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)||!Number.isSafeInteger(n)||n<=0||n>100000)
       return reply({error:'Producto o cantidad inválidos'},400);
     const k='P:'+id;
     const prev=inventario.get(k);
     if(prev&&prev.tipo_control!==tipo)
       return reply({error:'El mismo producto está registrado en dos unidades distintas'},409);
     if(prev){prev.cantidad+=n;if(prev.cantidad>100000)return reply({error:'Cantidad total inválida'},400)}
     else inventario.set(k,{tipo_control:tipo,producto_id:id,cantidad:n,
       nombre:String(raw.nombre||'PRODUCTO').slice(0,180),unidad_medida:String(raw.unidad_medida||'').slice(0,40)});
   }
 }
 const items=[...inventario.values()],now=new Date().toISOString();
 const {data:reporte,error:rErr}=await s.from('soporte_reportes')
   .select('id').eq('orden_id',o.id).eq('estado_reporte','EN_PROCESO').maybeSingle();
 if(rErr)throw rErr;
 if(!reporte)return reply({error:'Primero inicia el reporte técnico'},409);
 const {error:uErr}=await s.from('soporte_reportes')
   .update({canasta_borrador:items,canasta_actualizada_at:now,
     canasta_confirmada_at:confirmar?now:null,updated_at:now}).eq('id',reporte.id);
 if(uErr)throw uErr;
 if(confirmar){
   const h=await s.from('orden_historial').insert({orden_id:o.id,
     evento:'SOPORTE_CANASTA_CONFIRMADA',
     detalle:{items:items.map(x=>x.tipo_control==='SERIAL'
       ?{tipo_control:'SERIAL',serial:x.serial}
       :{tipo_control:x.tipo_control,producto_id:x.producto_id,cantidad:x.cantidad}),confirmada_at:now},
     realizado_por_id:me.id});
   if(h.error)console.warn('Historial de canasta',h.error.message);
 }
 return reply({ok:true,items,confirmada:confirmar,
   canasta_actualizada_at:now,canasta_confirmada_at:confirmar?now:null});
}
return reply({error:'Acción no válida'},400)}catch(e){console.error(e);const m=String((e as any)?.message||e);return reply({error:m},m==='Debes iniciar sesión en el acceso principal'?401:m.includes('Solo técnicos')||m.includes('otro grupo')||m.includes('No autorizado')||m.includes('no autorizado')?403:500)}});