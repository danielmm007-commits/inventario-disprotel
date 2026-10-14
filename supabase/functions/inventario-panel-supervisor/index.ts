import { createClient } from 'npm:@supabase/supabase-js@2.95.0';
const origin='https://danielmm007-commits.github.io';
const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'content-type,x-session','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json; charset=utf-8'};
const reply=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers});
const norm=(v:any)=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toUpperCase();
async function sha256(text:string){const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function db(){const raw=Deno.env.get('SUPABASE_SECRET_KEYS');const key=raw?JSON.parse(raw).default:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!key)throw new Error('Clave servidor no disponible');return createClient(Deno.env.get('SUPABASE_URL')!,key,{auth:{persistSession:false,autoRefreshToken:false}})}
async function auth(s:any,req:Request){const token=String(req.headers.get('x-session')||'').trim();if(!token)return null;const q=await s.from('app_auth_sessions').select('id,responsable_id').eq('token_hash',await sha256(token)).is('revoked_at',null).gt('expires_at',new Date().toISOString()).maybeSingle();if(q.error||!q.data)return null;const p=await s.from('responsables').select('id,nombre,rol,unidad_grupo,sucursal,puede_asignar_ip,es_admin_principal,activo').eq('id',q.data.responsable_id).eq('activo',true).maybeSingle();if(p.error||!p.data)return null;await s.from('app_auth_sessions').update({last_used_at:new Date().toISOString()}).eq('id',q.data.id);return p.data}
function canSee(u:any){const r=norm(u?.rol);return Boolean(u?.es_admin_principal)||u?.puede_asignar_ip===true||r.includes('SUPERVISOR TECNICO')||r.includes('ADMINISTRADOR')}
function zonaGrupo(nombre:any){const n=norm(nombre);if(n.includes('SAQUISILI')||n.includes('LATACUNGA'))return 'SAQUISILI-LATACUNGA';return 'SALCEDO'}
function ecuadorRange(){const d=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Guayaquil',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());return {date:d,from:new Date(`${d}T00:00:00-05:00`).toISOString(),to:new Date(`${d}T23:59:59.999-05:00`).toISOString()}}
Deno.serve(async req=>{if(req.method==='OPTIONS')return new Response('ok',{headers});if(req.method!=='POST')return reply({error:'Método no permitido'},405);try{const s=db(),me=await auth(s,req);if(!me)return reply({error:'Sesión no válida'},401);if(!canSee(me))return reply({error:'No autorizado'},403);const body=await req.json().catch(()=>({}));
if(String(body.action||'')==='order-detail'){
 const ordenId=String(body.orden_id||'').trim();if(!ordenId)return reply({error:'OT obligatoria'},400);
 const {data:o,error:oErr}=await s.from('ordenes_trabajo').select('*,solicitado_por:responsables!ordenes_trabajo_solicitado_por_id_fkey(nombre),aceptado_por:responsables!ordenes_trabajo_aceptado_por_id_fkey(nombre),router:routers_cobertura!ordenes_trabajo_router_cobertura_id_fkey(nombre)').eq('id',ordenId).maybeSingle();if(oErr)throw oErr;if(!o)return reply({error:'OT no encontrada'},404);
 const [hq,rq,dq]=await Promise.all([
  s.from('orden_historial').select('id,evento,detalle,created_at,realizado_por:responsables(nombre)').eq('orden_id',ordenId).order('created_at',{ascending:false}).limit(15),
  s.from('orden_reasignacion_solicitudes').select('id,grupo_actual,motivo,estado,created_at,respuesta,resolved_at,resuelto_por:responsables!orden_reasignacion_solicitudes_resuelto_por_id_fkey(nombre)').eq('orden_id',ordenId).order('created_at',{ascending:false}).limit(5),
  s.from('orden_documentos').select('id,tipo_documento,mime_type,tamano_bytes,created_at').eq('orden_id',ordenId).eq('es_actual',true).order('created_at',{ascending:true})
 ]);if(hq.error)throw hq.error;if(rq.error)throw rq.error;if(dq.error)throw dq.error;
 return reply({ok:true,orden:o,historial:hq.data||[],reasignaciones:rq.data||[],documentos:dq.data||[]});
}
const {date,from,to}=ecuadorRange();const [gq,mq,uq,oq,hq,nq,arq,onuq,ipq,unitq,unitnq,reqq,mesaq]=await Promise.all([
 s.from('grupos_operativos').select('id,nombre,activo').eq('activo',true).order('nombre'),
 s.from('grupo_miembros').select('grupo_id,responsable_id,habitual').eq('habitual',true),
 s.from('responsables').select('id,nombre,unidad_grupo,bodega_asociada').eq('activo',true),
 s.from('ordenes_trabajo').select('id,id_orden,estado,tipo_trabajo,grupo_destino,grupo_asignado,cliente_nombre,cliente_nombre_final,created_at,updated_at,reasignacion_pendiente,reprogramacion_pendiente,accion_operativa_permitida,estado_participacion_operativa').order('updated_at',{ascending:false}).limit(300),
 s.from('orden_historial').select('orden_id,evento,created_at').gte('created_at',from).lte('created_at',to).order('created_at',{ascending:false}).limit(400),
 s.from('novedades_personal_operativas').select('id,tipo,modalidad,responsable_id,reemplazo_id,grupo_habitual_id,grupo_operativo_id,inicio,fin,motivo,estado').neq('estado','CANCELADA').lt('inicio',to).gt('fin',from).order('inicio'),
 s.from('orden_acceso_remoto').select('id,orden_id,estado,updated_at').in('estado',['SOLICITADO','REQUIERE_CORRECCION']).order('updated_at',{ascending:false}).limit(80),
 s.from('orden_onu_solicitudes').select('id,orden_id,estado,updated_at').in('estado',['SOLICITADO','REQUIERE_CORRECCION']).order('updated_at',{ascending:false}).limit(120),
 s.from('orden_ip_solicitudes').select('id,orden_id,estado,ip_asignada,created_at').eq('estado','PENDIENTE').order('created_at',{ascending:false}).limit(120),
 s.from('ubicaciones_operativas_config').select('id,nombre,grupo_id,ubicacion_stock_id').eq('activo',true).eq('tipo','MINIBODEGA').order('nombre'),
 s.from('novedades_unidades_operativas').select('id,ubicacion_config_id,tipo,inicio,fin,motivo,estado').in('estado',['ACTIVA','PROGRAMADA']).order('updated_at',{ascending:false}),
 s.from('orden_reasignacion_solicitudes').select('id,orden_id,grupo_actual,motivo,estado,created_at,solicitado_por_id').eq('estado','PENDIENTE').order('created_at',{ascending:false}).limit(80),
 s.from('orden_mesa_requerimientos').select('id,orden_id,acciones,estado,solicitado_at,created_at').eq('estado','PENDIENTE').order('solicitado_at',{ascending:false}).limit(160)
]);for(const q of [gq,mq,uq,oq,hq,nq,arq,onuq,ipq,unitq,unitnq,reqq,mesaq])if(q.error)throw q.error;const users=new Map((uq.data||[]).map((u:any)=>[u.id,u]));const hist=new Map<string,any[]>();for(const h of hq.data||[]){const a=hist.get(h.orden_id)||[];if(a.length<2){a.push({evento:h.evento,created_at:h.created_at});hist.set(h.orden_id,a)}}const remote=new Map((arq.data||[]).map((x:any)=>[x.orden_id,x]));
const onuPending=new Map((onuq.data||[]).map((x:any)=>[x.orden_id,x]));
const ipPending=new Map<string,any>();for(const x of ipq.data||[]){if(!ipPending.has(x.orden_id))ipPending.set(x.orden_id,x)}
const mesaGrouped=new Map<string,any[]>();for(const x of mesaq.data||[]){const a=mesaGrouped.get(x.orden_id)||[];a.push(x);mesaGrouped.set(x.orden_id,a)}
const unitNews=new Map();for(const x of unitnq.data||[]){if(!unitNews.has(x.ubicacion_config_id))unitNews.set(x.ubicacion_config_id,x)}const terminal=(v:any)=>['COMPLETADA','FINALIZADA','CANCELADA','CANCELADA EN SITIO','CANCELADA_EN_SITIO','NO EJECUTADA CLIENTE','NO_EJECUTADA_CLIENTE'].includes(norm(v));const visibleOrders=(oq.data||[]).filter((o:any)=>!terminal(o.estado)||(o.created_at>=from&&o.created_at<=to)||(o.updated_at>=from&&o.updated_at<=to));const orders=visibleOrders.map((o:any)=>({id:o.id,id_orden:o.id_orden,estado:o.estado,tipo_trabajo:o.tipo_trabajo,grupo_destino:o.grupo_destino,grupo_asignado:o.grupo_asignado,cliente_nombre:o.cliente_nombre_final||o.cliente_nombre,zona:zonaGrupo(o.grupo_destino||o.grupo_asignado),created_at:o.created_at,updated_at:o.updated_at,reasignacion_pendiente:o.reasignacion_pendiente===true,reprogramacion_pendiente:o.reprogramacion_pendiente===true,accion_operativa_permitida:o.accion_operativa_permitida||null,estado_participacion_operativa:o.estado_participacion_operativa||null,eventos:hist.get(o.id)||[],acceso_remoto:remote.get(o.id)||null,onu_solicitud:onuPending.get(o.id)||null,ip_solicitud:ipPending.get(o.id)||null,mesa_requerimientos:mesaGrouped.get(o.id)||[]}));const groups=(gq.data||[]).map((g:any)=>{const mids=(mq.data||[]).filter((m:any)=>m.grupo_id===g.id).map((m:any)=>users.get(m.responsable_id)).filter(Boolean);const unit=(unitq.data||[]).find((u:any)=>u.grupo_id===g.id)||null;return {id:g.id,nombre:g.nombre,zona:zonaGrupo(g.nombre),miembros:mids.map((u:any)=>({id:u.id,nombre:u.nombre,bodega_asociada:u.bodega_asociada})),unidad:unit?{id:unit.id,nombre:unit.nombre,novedad:unitNews.get(unit.id)||null}:null,ordenes_activas:orders.filter((o:any)=>o.grupo_asignado===g.nombre&&!['COMPLETADA','CANCELADA','CANCELADA_EN_SITIO','NO_EJECUTADA_CLIENTE'].includes(norm(o.estado))).length}});const groupByName=new Map(groups.map((g:any)=>[norm(g.nombre),g]));const orderById=new Map(orders.map((o:any)=>[o.id,o]));const reasignaciones=(reqq.data||[]).map((r:any)=>{const o=orderById.get(r.orden_id)||null;const g=groupByName.get(norm(r.grupo_actual||o?.grupo_asignado))||null;const unidad=g?.unidad||null;const un=unidad?.novedad||null;return {id:r.id,orden_id:r.orden_id,id_orden:o?.id_orden||null,cliente_nombre:o?.cliente_nombre||null,grupo_actual:r.grupo_actual||o?.grupo_asignado||null,zona:zonaGrupo(r.grupo_actual||o?.grupo_asignado),motivo:r.motivo,created_at:r.created_at,solicitado_por_id:r.solicitado_por_id,causa_operativa:un?{unidad:unidad.nombre,tipo:un.tipo,motivo:un.motivo,estado:un.estado}:null}});const requiere:any[]=[];for(const o of orders){
 const mesa_pendientes:any[]=[];
 if(o.onu_solicitud)mesa_pendientes.push({tipo:'ONU',estado:o.onu_solicitud.estado,solicitado_at:o.onu_solicitud.updated_at||null});
 if(o.ip_solicitud)mesa_pendientes.push({tipo:'IP',estado:o.ip_solicitud.estado,solicitado_at:o.ip_solicitud.created_at||null});
 if(o.acceso_remoto)mesa_pendientes.push({tipo:'ACCESO_REMOTO',estado:o.acceso_remoto.estado,solicitado_at:o.acceso_remoto.updated_at||null});
 for(const lote of o.mesa_requerimientos||[]){
   const acciones=Array.isArray(lote.acciones)?lote.acciones:[];
   for(const accion of acciones)mesa_pendientes.push({tipo:String(accion||''),estado:lote.estado,solicitado_at:lote.solicitado_at||lote.created_at||null,lote_id:lote.id});
 }
 const vistos=new Set<string>();const mesa_unicos=mesa_pendientes.filter((x:any)=>{const k=norm(x.tipo);if(vistos.has(k))return false;vistos.add(k);return true});
 if(mesa_unicos.length){
   const fechas=mesa_unicos.map((x:any)=>x.solicitado_at).filter(Boolean).sort();
   requiere.push({...o,tipo_atencion:'MESA_TECNICA',mesa_pendientes:mesa_unicos,mesa_pendiente_desde:fechas[0]||null});
 }
 else if(['REPROGRAMADO','PAUSADA'].includes(norm(o.estado)))requiere.push({...o,tipo_atencion:'NOVEDAD_OT'});
}for(const r of reasignaciones)requiere.unshift({id:r.orden_id,id_orden:r.id_orden,cliente_nombre:r.cliente_nombre,grupo_asignado:r.grupo_actual,zona:r.zona,estado:'REASIGNACION_PENDIENTE',tipo_atencion:'REASIGNACION',reasignacion:r});// Datos derivados de las MISMAS consultas del tablero; no invoca nuevas funciones.
const snapshot={
 completo:{
  IP:(ipq.data||[]).length<120,
  ONU:(onuq.data||[]).length<120,
  REMOTO:(arq.data||[]).length<80,
  MESA:(mesaq.data||[]).length<160
 },
 pendientes:[
  ...(ipq.data||[]).filter((x:any)=>x.estado==='PENDIENTE').map((x:any)=>({
    area:'IP',solicitud_id:x.id,orden_uuid:x.orden_id,estado:x.estado
  })),
  ...(onuq.data||[]).filter((x:any)=>x.estado==='SOLICITADO').map((x:any)=>({
    area:'ONU',solicitud_id:x.id,orden_uuid:x.orden_id,estado:x.estado
  })),
  ...(arq.data||[]).filter((x:any)=>x.estado==='SOLICITADO').map((x:any)=>({
    area:'REMOTO',solicitud_id:x.id,orden_uuid:x.orden_id,estado:x.estado
  })),
  ...(mesaq.data||[]).filter((x:any)=>x.estado==='PENDIENTE').map((x:any)=>({
    area:'MESA',solicitud_id:x.id,orden_uuid:x.orden_id,estado:x.estado,
    acciones:Array.isArray(x.acciones)?x.acciones.slice(0,8):[]
  }))
 ]
};
const resumen={creadas:orders.filter((o:any)=>o.created_at>=from&&o.created_at<=to).length,finalizadas:orders.filter((o:any)=>terminal(o.estado)&&o.updated_at>=from&&o.updated_at<=to).length,reprogramadas:orders.filter((o:any)=>norm(o.estado)==='REPROGRAMADO').length,canceladas:orders.filter((o:any)=>norm(o.estado).includes('CANCELADA')||norm(o.estado)==='NO_EJECUTADA_CLIENTE').length,en_campo:orders.filter((o:any)=>['ASIGNADA','EN CAMINO','EN_PROCESO','EN PROCESO'].includes(norm(o.estado))).length};return reply({ok:true,fecha:date,usuario:{nombre:me.nombre,rol:me.rol},groups,orders,novedades:nq.data||[],novedades_unidad:unitnq.data||[],reasignaciones,requiere_atencion:requiere.slice(0,40),avisos_snapshot:snapshot,resumen})}catch(e){console.error(e);return reply({error:String((e as any)?.message||e)},500)}});
