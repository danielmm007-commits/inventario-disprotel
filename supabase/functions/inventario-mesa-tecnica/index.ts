import { createClient } from 'npm:@supabase/supabase-js@2.95.0';

const origin='https://danielmm007-commits.github.io';
const headers={
  'Access-Control-Allow-Origin':origin,
  'Access-Control-Allow-Headers':'content-type,x-session',
  'Access-Control-Allow-Methods':'POST,OPTIONS',
  'Content-Type':'application/json; charset=utf-8'
};
const reply=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers});
const norm=(v:any)=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
async function sha256(text:string){const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function db(){const raw=Deno.env.get('SUPABASE_SECRET_KEYS');const key=raw?JSON.parse(raw).default:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!key)throw new Error('Clave servidor no disponible');return createClient(Deno.env.get('SUPABASE_URL')!,key,{auth:{persistSession:false,autoRefreshToken:false}})}
async function auth(s:any,req:Request,body:any){
  const token=String(req.headers.get('x-session')||body?.session_token||'').trim();
  if(!token)throw new Error('Sesión general requerida');
  const ses=await s.from('app_auth_sessions').select('id,responsable_id').eq('token_hash',await sha256(token)).is('revoked_at',null).gt('expires_at',new Date().toISOString()).maybeSingle();
  if(ses.error||!ses.data)throw new Error('Sesión vencida o inválida');
  const p=await s.from('responsables').select('id,nombre,rol,unidad_grupo,activo,puede_asignar_ip,es_admin_principal').eq('id',ses.data.responsable_id).eq('activo',true).maybeSingle();
  if(p.error||!p.data)throw new Error('Usuario inactivo o no disponible');
  await s.from('app_auth_sessions').update({last_used_at:new Date().toISOString()}).eq('id',ses.data.id);
  return p.data;
}
function supervisor(me:any){const r=norm(me?.rol);return !!me?.puede_asignar_ip||!!me?.es_admin_principal||r.includes('SUPERVISOR TECNICO')||r.includes('ADMINISTRADOR')}
function tech(me:any){return norm(me?.rol)==='TECNICO'}
function assigned(o:any,me:any){return o?.aceptado_por_id===me.id||norm(o?.grupo_asignado)===norm(me?.unidad_grupo)}
function decodeBase64(input:string){const clean=input.includes(',')?input.split(',').pop()!:input;const bin=atob(clean);const out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out}
async function order(s:any,id:string){
  const q=await s.from('ordenes_trabajo').select('id,id_orden,tipo_trabajo,estado,cliente_nombre,cliente_nombre_final,cliente_direccion,cliente_direccion_final,cliente_referencia,cliente_referencia_final,cliente_id,grupo_asignado,grupo_destino,aceptado_por_id,router_cobertura_id,servicio_cliente_id,plan_final,plan_solicitado,tv_final,tv_solicitada,ip_creacion_estado,ip_creacion_registrada,ip_creacion_verificada_at,updated_at').eq('id',id).maybeSingle();
  if(q.error)throw q.error;if(!q.data)throw new Error('Orden no encontrada');return q.data;
}
async function signedOnu(s:any,row:any){if(!row?.storage_path)return null;const sg=await s.storage.from('instalacion-evidencias').createSignedUrl(row.storage_path,900);return sg.data?.signedUrl||null}
async function serialCampo(s:any,o:any){
 if(String(o?.tipo_trabajo||'').startsWith('INSTALACION')){
  const i=await s.from('instalaciones').select('id').eq('orden_id',o.id).order('created_at',{ascending:false}).limit(1).maybeSingle();if(i.error)throw i.error;if(!i.data)return null;
  const e=await s.from('instalacion_evidencias').select('id,storage_path,fecha_hora_captura').eq('instalacion_id',i.data.id).eq('tipo_foto','SERIAL').eq('es_actual',true).order('created_at',{ascending:false}).limit(1).maybeSingle();if(e.error)throw e.error;if(!e.data)return null;
  const sg=await s.storage.from('instalacion-evidencias').createSignedUrl(e.data.storage_path,900);return {...e.data,url:sg.data?.signedUrl||null};
 }
 const e=await s.from('soporte_evidencias').select('id,storage_path_original,fecha_hora_captura').eq('orden_id',o.id).eq('tipo_foto','SERIAL').order('created_at',{ascending:false}).limit(1).maybeSingle();if(e.error)throw e.error;if(!e.data)return null;
 const sg=await s.storage.from('soporte-evidencias').createSignedUrl(e.data.storage_path_original,900);return {...e.data,url:sg.data?.signedUrl||null};
}
async function accesoEvidencia(s:any,row:any){
 if(!row)return null;
 if(row.soporte_evidencia_id){
  const e=await s.from('soporte_evidencias').select('id,storage_path_original,created_at').eq('id',row.soporte_evidencia_id).maybeSingle();if(e.error)throw e.error;if(!e.data)return null;
  const sg=await s.storage.from('soporte-evidencias').createSignedUrl(e.data.storage_path_original,900);return {id:e.data.id,url:sg.data?.signedUrl||null,created_at:e.data.created_at,origen:'SOPORTE'};
 }
 if(row.evidencia_id){
  const e=await s.from('instalacion_evidencias').select('id,storage_path,created_at').eq('id',row.evidencia_id).maybeSingle();if(e.error)throw e.error;if(!e.data)return null;
  const sg=await s.storage.from('instalacion-evidencias').createSignedUrl(e.data.storage_path,900);return {id:e.data.id,url:sg.data?.signedUrl||null,created_at:e.data.created_at,origen:'INSTALACION'};
 }
 return null;
}
async function lecturaOptica(s:any,o:any){
  let vinculo:any=null;
  if(o.servicio_cliente_id){
    const v=await s.from('smartolt_onu_vinculos').select('servicio_id,ip_cliente,onu_external_id,sn,nombre_smartolt,olt_nombre,tarjeta,puerto,onu_posicion,estado_vinculo,sincronizado_at,verificado_at').eq('servicio_id',o.servicio_cliente_id).order('updated_at',{ascending:false}).limit(1).maybeSingle();
    if(v.error)throw v.error;vinculo=v.data||null;
  }
  let cache:any=null;
  if(vinculo?.onu_external_id){
    const q=await s.from('smartolt_onus_cache').select('onu_external_id,sn,sn16,onu_type,nombre,olt,tarjeta,puerto,onu_asignada,estado,calidad_senal,senal_onu_dbm,senal_olt_dbm,distancia_m,updated_at').eq('onu_external_id',vinculo.onu_external_id).maybeSingle();
    if(q.error)throw q.error;cache=q.data||null;
  }
  if(!cache&&vinculo?.sn){
    const q=await s.from('smartolt_onus_cache').select('onu_external_id,sn,sn16,onu_type,nombre,olt,tarjeta,puerto,onu_asignada,estado,calidad_senal,senal_onu_dbm,senal_olt_dbm,distancia_m,updated_at').eq('sn',vinculo.sn).order('updated_at',{ascending:false}).limit(1).maybeSingle();
    if(q.error)throw q.error;cache=q.data||null;
  }
  const ip=String(o.ip_creacion_registrada||vinculo?.ip_cliente||'');
  if(!cache&&ip){
    const q=await s.from('smartolt_onus_cache').select('onu_external_id,sn,sn16,onu_type,nombre,olt,tarjeta,puerto,onu_asignada,estado,calidad_senal,senal_onu_dbm,senal_olt_dbm,distancia_m,updated_at').eq('ip_detectada',ip).order('updated_at',{ascending:false}).limit(1).maybeSingle();
    if(q.error)throw q.error;cache=q.data||null;
  }
  let live:any=null;
  if(o.servicio_cliente_id){
    const l=await s.from('smartolt_diagnosticos').select('id,onu_external_id,estado,senal_onu_dbm,senal_olt_dbm,distancia_m,consultado_at').eq('servicio_id',o.servicio_cliente_id).order('consultado_at',{ascending:false}).limit(1).maybeSingle();
    if(l.error)throw l.error;live=l.data||null;
  }
  // Lecturas ópticas compartidas: elegir la MEDICIÓN más nueva por fecha
  // de captura, sin mezclar mediciones de instantes distintos.
  // Este método lee CACHÉ, nunca llama a Huawei/SmartOLT en vivo.
  const normalizarSerial=(v:any):string|null=>{
    const sn=String(v||'').toUpperCase().replace(/[\s:.-]/g,'');
    if(/^[A-F0-9]{16}$/.test(sn))return sn;
    if(/^[A-Z0-9]{4}[A-F0-9]{8}$/.test(sn)){
      const vendor=[...sn.slice(0,4)].map(c=>c.charCodeAt(0).toString(16).padStart(2,'0')).join('').toUpperCase();
      return vendor+sn.slice(4);
    }
    return null;
  };
  const sn16=normalizarSerial(vinculo?.sn||cache?.sn||live?.onu_external_id||cache?.onu_external_id);
  let huawei:any=null;
  if(sn16){
    // Consulta indexada por ONU SN (no recorre OLT ni invoca lector).
    const h=await s.from('huawei_onus_cache')
      .select('olt_codigo,olt_nombre,onu_sn,fsp,ont_id,rx_optical_dbm,tx_optical_dbm,olt_rx_ont_dbm,distancia_m,run_state,optica_leida_at,presente')
      .eq('onu_sn',sn16).eq('presente',true).limit(2);
    if(h.error)throw h.error;
    // Si hay dos ONU con el mismo serial, NO atribuir una medición ambigua.
    if((h.data||[]).length===1)huawei=h.data[0];
  }
  const medicionValida=(v:any)=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
  const fechaValida=(v:any):number=>{
    const t=Date.parse(String(v||''));
    // Una lectura sin fecha o con reloj futuro no reemplaza datos conocidos.
    return Number.isFinite(t)&&t<=Date.now()+300000?t:0;
  };
  const registros:any[]=[];
  const oltEsperada=String(vinculo?.olt_nombre||cache?.olt||'').toUpperCase();
  const oltActual=String(huawei?.olt_codigo||'').toUpperCase();
  // Un serial en OLT diferente a la asociada al servicio requiere revisión.
  if(huawei&&oltEsperada&&oltActual&&!oltEsperada.includes(oltActual))huawei=null;
  if(huawei&&(medicionValida(huawei.rx_optical_dbm)||medicionValida(huawei.olt_rx_ont_dbm))){
    const t=fechaValida(huawei.optica_leida_at);
    if(t)registros.push({fuente:'HUAWEI_CACHE',captura:t,leido_at:huawei.optica_leida_at,
      rx_onu_dbm:huawei.rx_optical_dbm??null,rx_olt_dbm:huawei.olt_rx_ont_dbm??null,
      tx_onu_dbm:huawei.tx_optical_dbm??null,distancia_m:huawei.distancia_m??null,
      estado:huawei.run_state||null,olt:huawei.olt_nombre||huawei.olt_codigo||null,
      sn:huawei.onu_sn||sn16,
      tarjeta:String(huawei.fsp||'').split('/').slice(0,2).join('/')||null,
      puerto:String(huawei.fsp||'').split('/')[2]||null,
      ont_id:huawei.ont_id??null,modelo:cache?.onu_type||null,
      diagnostico_id:null,onu_external_id:cache?.onu_external_id||vinculo?.onu_external_id||null});
  }
  if(live&&(medicionValida(live.senal_onu_dbm)||medicionValida(live.senal_olt_dbm))){
    const t=fechaValida(live.consultado_at);
    if(t)registros.push({fuente:'SMARTOLT_LIVE',captura:t,leido_at:live.consultado_at,
      rx_onu_dbm:live.senal_onu_dbm??null,rx_olt_dbm:live.senal_olt_dbm??null,
      distancia_m:live.distancia_m??null,estado:live.estado||null,olt:cache?.olt||vinculo?.olt_nombre||null,
      sn:cache?.sn||vinculo?.sn||null,tarjeta:cache?.tarjeta||vinculo?.tarjeta||null,
      puerto:cache?.puerto||vinculo?.puerto||null,ont_id:cache?.onu_asignada||vinculo?.onu_posicion||null,
      modelo:cache?.onu_type||null,diagnostico_id:live.id,
      onu_external_id:live.onu_external_id||cache?.onu_external_id||vinculo?.onu_external_id||null});
  }
  if(cache&&(medicionValida(cache.senal_onu_dbm)||medicionValida(cache.senal_olt_dbm))){
    const t=fechaValida(cache.updated_at);
    if(t)registros.push({fuente:'SMARTOLT_CACHE',captura:t,leido_at:cache.updated_at,
      rx_onu_dbm:cache.senal_onu_dbm??null,rx_olt_dbm:cache.senal_olt_dbm??null,
      distancia_m:cache.distancia_m??null,estado:cache.estado||null,olt:cache.olt||vinculo?.olt_nombre||null,
      sn:cache.sn||vinculo?.sn||null,tarjeta:cache.tarjeta||vinculo?.tarjeta||null,
      puerto:cache.puerto||vinculo?.puerto||null,ont_id:cache.onu_asignada||vinculo?.onu_posicion||null,
      modelo:cache.onu_type||null,diagnostico_id:null,
      onu_external_id:cache.onu_external_id||vinculo?.onu_external_id||null});
  }
  if(!registros.length)return null;
  // En empate exacto de fecha, preferir Huawei sin descartar historial previo.
  const peso=(v:string)=>v==='HUAWEI_CACHE'?3:v==='SMARTOLT_LIVE'?2:1;
  registros.sort((a,b)=>b.captura-a.captura||peso(b.fuente)-peso(a.fuente));
  const vigente=registros[0];
  return {...vigente,calidad_senal:vigente.fuente==='HUAWEI_CACHE'?null:cache?.calidad_senal||null,
    lectura_historica:Date.now()-vigente.captura>15*60*1000,
    antiguedad_min:Math.max(0,Math.floor((Date.now()-vigente.captura)/60000))};
}
async function latestIp(s:any,ordenId:string){
  const q=await s.from('orden_ip_solicitudes').select('id,estado,ip_asignada,solicitado_at,asignada_at,observacion,detector_estado,detector_ultimo_scan,detector_detalle').eq('orden_id',ordenId).order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(q.error)throw q.error;
  let candidatos:any[]=[];
  if(q.data?.id&&q.data.estado==='PENDIENTE'){const c=await s.from('orden_ip_candidatos').select('id,address,comentario,score,queue_name,queue_parent,plan_detectado,detectado_at').eq('solicitud_ip_id',q.data.id).eq('estado','CANDIDATO').order('score',{ascending:false}).limit(8);if(c.error)throw c.error;candidatos=c.data||[]}
  return {solicitud:q.data||null,candidatos};
}
// Identidad canónica para Huawei: HWTCxxxxxxxx -> 48575443xxxxxxxx.
function huaweiSn16(v:any):string|null{
 const sn=String(v||'').toUpperCase().replace(/[\s:.-]/g,'');
 if(/^[0-9A-F]{16}$/.test(sn))return sn;
 if(/^[A-Z0-9]{4}[A-F0-9]{8}$/.test(sn))
   return [...sn.slice(0,4)].map(c=>c.charCodeAt(0).toString(16).padStart(2,'0')).join('').toUpperCase()+sn.slice(4);
 return null;
}
async function huaweiSolicitudEstado(s:any,ordenId:string){
 const q=await s.from('consulta_red_solicitudes')
   .select('id,olt_codigo,olt_estado,solicitado_at,expira_at,olt_respondido_at')
   .eq('orden_id',ordenId).eq('mikrotik_estado','NO_APLICA')
   .not('olt_codigo','is',null).order('solicitado_at',{ascending:false}).limit(1).maybeSingle();
 if(q.error)throw q.error;
 const x=q.data;if(!x)return null;
 return {id:x.id,olt_codigo:x.olt_codigo,estado:x.olt_estado,
   solicitado_at:x.solicitado_at,expira_at:x.expira_at,respondido_at:x.olt_respondido_at,
   expirada:x.olt_estado==='PENDIENTE'&&new Date(x.expira_at).getTime()<=Date.now()};
}
async function state(s:any,o:any){
  const [m,on,ar,ip]=await Promise.all([
    s.from('orden_mesa_tecnica_estado').select('*').eq('orden_id',o.id).maybeSingle(),
    s.from('orden_onu_solicitudes').select('id,estado,solicitado_at,confirmado_at,observacion,storage_path,mime_type,solicitado_por_id,confirmado_por_id,olt_codigo,olt_nombre,onu_sn,onu_sn_display,onu_pon,onu_vendor,onu_modelo,onu_estado_olt,onu_vinculada_at,olt_ultima_lectura_at,rx_onu_dbm,rx_olt_dbm,distancia_m').eq('orden_id',o.id).maybeSingle(),
    s.from('orden_acceso_remoto').select('id,estado,solicitado_at,confirmado_at,observacion,evidencia_id,soporte_evidencia_id').eq('orden_id',o.id).maybeSingle(),
    latestIp(s,o.id)
  ]);
  if(m.error)throw m.error;if(on.error)throw on.error;if(ar.error)throw ar.error;
  const onu=on.data?{...on.data,evidencia_url:await signedOnu(s,on.data)}:null;
  const acceso=ar.data?{...ar.data,evidencia:await accesoEvidencia(s,ar.data)}:null;
  return {mesa:m.data||null,onu,ip,acceso,optica:await lecturaOptica(s,o),lectura_huawei:await huaweiSolicitudEstado(s,o.id),requerimientos:await requerimientosMesa(s,o.id)};
}
async function ensureMesa(s:any,o:any,me:any){
  const {error}=await s.from('orden_mesa_tecnica_estado').upsert({orden_id:o.id,solicitado_por_id:me.id,solicitado_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:'orden_id'});
  if(error)throw error;
}
async function ensureOnu(s:any,o:any,me:any){
  const {data:prev,error:pErr}=await s.from('orden_onu_solicitudes').select('id,estado').eq('orden_id',o.id).maybeSingle();if(pErr)throw pErr;
  if(prev?.estado==='CONFIRMADO')return prev;
  const {data,error}=await s.from('orden_onu_solicitudes').upsert({orden_id:o.id,estado:'SOLICITADO',solicitado_por_id:me.id,solicitado_at:new Date().toISOString(),confirmado_por_id:null,confirmado_at:null,observacion:null,updated_at:new Date().toISOString()},{onConflict:'orden_id'}).select('id,estado').single();
  if(error)throw error;return data;
}
async function ensureIp(s:any,o:any,me:any,force=false){
  const q=await s.from('orden_ip_solicitudes').select('id,estado').eq('orden_id',o.id).order('created_at',{ascending:false}).limit(1).maybeSingle();if(q.error)throw q.error;
  if(q.data?.estado==='PENDIENTE')return q.data;
  if(q.data?.estado==='ASIGNADA'&&!force)return q.data;
  const {data,error}=await s.rpc('solicitar_ip_orden',{p_orden_id:o.id,p_responsable_id:me.id,p_plan_final:o.plan_final||o.plan_solicitado||'',p_tv_final:Boolean(o.tv_final??o.tv_solicitada)});
  if(error)throw error;return data;
}
async function ensureRemote(s:any,o:any,me:any){
  const {data,error}=await s.from('orden_acceso_remoto').upsert({orden_id:o.id,estado:'SOLICITADO',solicitado_por_id:me.id,solicitado_at:new Date().toISOString(),confirmado_por_id:null,confirmado_at:null,observacion:null,updated_at:new Date().toISOString()},{onConflict:'orden_id'}).select('id,estado').single();
  if(error)throw error;return data;
}
const MESA_ACCIONES=new Set(['VERIFICAR_POTENCIA','ACTIVAR_CAMBIAR_ONU','CONFIRMAR_IP_ACTUAL','ASIGNAR_NUEVA_IP','VERIFICAR_ACCESO_REMOTO','REVISAR_RADIO_CPE','VERIFICAR_CONECTIVIDAD','OTRA_ACCION']);
async function crearRequerimientoLote(s:any,o:any,me:any,acciones:string[]){
  const clean=[...new Set((acciones||[]).map(x=>String(x||'').trim().toUpperCase()).filter(x=>MESA_ACCIONES.has(x)))];
  if(!clean.length)throw new Error('Selecciona al menos una acción requerida');
  const now=new Date().toISOString();
  const q=await s.from('orden_mesa_requerimientos').insert({orden_id:o.id,acciones:clean,estado:'PENDIENTE',solicitado_por_id:me.id,solicitado_at:now,updated_at:now}).select('id,acciones,estado,solicitado_at').single();
  if(q.error)throw q.error;
  return q.data;
}
async function datosIpActual(s:any,o:any){
  let ip=String(o?.ip_creacion_registrada||'').trim(),routerId=o?.ip_creacion_router_id||o?.router_cobertura_id||null,servicio:any=null;
  if(o?.servicio_cliente_id){
    const q=await s.from('servicios_cliente').select('id,codigo_servicio_legacy,tipo_conexion,ip_cliente,router_cobertura_id,router_legacy').eq('id',o.servicio_cliente_id).maybeSingle();
    if(q.error)throw q.error;servicio=q.data||null;
  }else if(o?.cliente_id){
    const q=await s.from('servicios_cliente').select('id,codigo_servicio_legacy,tipo_conexion,ip_cliente,router_cobertura_id,router_legacy,activo,estado').eq('cliente_id',o.cliente_id).eq('activo',true).order('created_at',{ascending:true}).limit(10);
    if(q.error)throw q.error;
    const activos=q.data||[];
    if(activos.length===1)servicio=activos[0];
    else if(activos.length>1)return {ip:null,router_id:null,router_nombre:null,servicio_id:null,codigo_servicio:null,tipo_conexion:null,requiere_seleccion_servicio:true,servicios:activos.map((x:any)=>({id:x.id,codigo_servicio:x.codigo_servicio_legacy,tipo_conexion:x.tipo_conexion,ip:x.ip_cliente?String(x.ip_cliente).replace('/32',''):null,router_legacy:x.router_legacy||null}))};
  }
  if(servicio){
    if(!ip&&servicio?.ip_cliente)ip=String(servicio.ip_cliente).replace('/32','');
    if(!routerId&&servicio?.router_cobertura_id)routerId=servicio.router_cobertura_id;
    if(!routerId&&servicio?.router_legacy){
      const raw=String(servicio.router_legacy||'').toUpperCase().replace(/[-_]+/g,' ').replace(/\s+/g,' ').trim();
      const alias=raw.includes('SANTANA')?'ROUTER SALCEDO':raw;
      const rq=await s.from('routers_cobertura').select('id,nombre').eq('activo',true).ilike('nombre',alias).limit(1).maybeSingle();
      if(rq.error)throw rq.error;if(rq.data?.id)routerId=rq.data.id;
    }
  }
  let routerNombre=null;
  if(routerId){const q=await s.from('routers_cobertura').select('id,nombre').eq('id',routerId).maybeSingle();if(q.error)throw q.error;routerNombre=q.data?.nombre||null}
  return {ip:ip||null,router_id:routerId,router_nombre:routerNombre,servicio_id:servicio?.id||o?.servicio_cliente_id||null,codigo_servicio:servicio?.codigo_servicio_legacy||null,tipo_conexion:servicio?.tipo_conexion||null,requiere_seleccion_servicio:false};
}
async function sincronizarVerificacionIp(s:any,ordenId:string,r:any){
  const vi=r?.resultado?.verificacion_ip,consultaId=vi?.consulta_id;
  if(!consultaId)return r;
  const q=await s.from('consulta_red_solicitudes').select('id,ip_cliente,router_id,mikrotik_estado,mikrotik_resultado,mikrotik_respondido_at,solicitado_at,expira_at').eq('id',consultaId).maybeSingle();
  if(q.error)throw q.error;if(!q.data)return r;
  const row=q.data,res=row.mikrotik_resultado||{},encontrada=row.mikrotik_estado==='OK'&&res?.encontrada===true;
  const evidencia={...vi,consulta_id:row.id,ip:String(row.ip_cliente||vi.ip||''),router_id:row.router_id||vi.router_id||null,estado:row.mikrotik_estado||'PENDIENTE',encontrada,resultado:res,solicitado_at:row.solicitado_at||vi.solicitado_at||null,respondido_at:row.mikrotik_respondido_at||null};
  const resultado={...(r.resultado||{}),verificacion_ip:evidencia};
  if(encontrada&&r.estado==='PENDIENTE'){
    const now=row.mikrotik_respondido_at||new Date().toISOString();
    const u=await s.from('orden_mesa_requerimientos').update({estado:'ATENDIDO',atendido_at:now,canal_resolucion:'MIKROTIK_LIVE',resultado,updated_at:new Date().toISOString()}).eq('id',r.id);
    if(u.error)throw u.error;
    await s.from('orden_historial').insert({orden_id:ordenId,evento:'MESA_TECNICA_IP_ACTUAL_CONFIRMADA',detalle:{requerimiento_id:r.id,consulta_red_id:row.id,ip:evidencia.ip,router_id:evidencia.router_id,resultado:res},realizado_por_id:null});
    return {...r,estado:'ATENDIDO',atendido_at:now,canal_resolucion:'MIKROTIK_LIVE',resultado};
  }
  if(JSON.stringify(r.resultado||{})!==JSON.stringify(resultado)){
    const u=await s.from('orden_mesa_requerimientos').update({resultado,updated_at:new Date().toISOString()}).eq('id',r.id);if(u.error)throw u.error;
  }
  return {...r,resultado};
}
async function requerimientosMesa(s:any,ordenId:string){
  const q=await s.from('orden_mesa_requerimientos').select('id,acciones,estado,solicitado_at,atendido_at,canal_resolucion,resultado').eq('orden_id',ordenId).order('solicitado_at',{ascending:false}).limit(20);
  if(q.error)throw q.error;
  let rows=q.data||[];
  rows=await Promise.all(rows.map((r:any)=>Array.isArray(r.acciones)&&r.acciones.includes('CONFIRMAR_IP_ACTUAL')?sincronizarVerificacionIp(s,ordenId,r):r));
  for(const r of rows){
    const path=r?.resultado?.evidencia_potencia?.storage_path;
    if(path){
      const sg=await s.storage.from('soporte-evidencias').createSignedUrl(path,21600);
      r.resultado={...(r.resultado||{}),evidencia_potencia:{...(r.resultado?.evidencia_potencia||{}),url:sg.data?.signedUrl||null}};
    }
    const onuPath=r?.resultado?.evidencia_onu?.storage_path;
    if(onuPath){
      const sg=await s.storage.from('instalacion-evidencias').createSignedUrl(onuPath,21600);
      r.resultado={...(r.resultado||{}),evidencia_onu:{...(r.resultado?.evidencia_onu||{}),url:sg.data?.signedUrl||null}};
    }
  }
  return rows;
}
const MESA_PREPARACION=new Set(['VERIFICAR_POTENCIA','ACTIVAR_CAMBIAR_ONU','CONFIRMAR_IP_ACTUAL','ASIGNAR_NUEVA_IP','REVISAR_RADIO_CPE','OTRA_ACCION']);
const MESA_FINAL=new Set(['VERIFICAR_ACCESO_REMOTO','VERIFICAR_CONECTIVIDAD']);
async function validarSecuenciaSoporte(s:any,o:any,acciones:string[]){
  const clean=[...new Set((acciones||[]).map(x=>String(x||'').toUpperCase()))];
  if(clean.includes('CONFIRMAR_IP_ACTUAL')&&clean.includes('ASIGNAR_NUEVA_IP'))throw new Error('Elige confirmar la IP actual o asignar una nueva IP, no ambas.');
  const st=await state(s,o);
  const solicitadas=new Set((st.requerimientos||[]).flatMap((x:any)=>Array.isArray(x.acciones)?x.acciones:[]));
  const repetidas=clean.filter((x:string)=>solicitadas.has(x));
  if(repetidas.length)throw new Error('Esta acción ya fue solicitada a Mesa Técnica: '+repetidas.join(', ')+'. Revisa el resultado existente antes de volver a solicitarla.');
  return st;
}
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers});
  if(req.method!=='POST')return reply({error:'Método no permitido'},405);
  try{
    const body=await req.json().catch(()=>({})),s=db(),me=await auth(s,req,body),action=String(body.action||'');
    if(action==='request-installation'){
      if(!tech(me))return reply({error:'Solo el técnico puede solicitar la activación'},403);
      const o=await order(s,String(body.orden_id||''));if(!String(o.tipo_trabajo||'').startsWith('INSTALACION'))return reply({error:'Esta acción corresponde a una instalación'},400);
      if(!assigned(o,me))return reply({error:'La OT no está asignada a este técnico/grupo'},403);
      if(!o.router_cobertura_id)return reply({error:'Selecciona primero el router de cobertura'},400);
      await ensureMesa(s,o,me);await ensureOnu(s,o,me);await ensureIp(s,o,me,false);
      await s.from('orden_historial').insert({orden_id:o.id,evento:'MESA_TECNICA_ACTIVACION_SOLICITADA',detalle:{onu:true,ip:true},realizado_por_id:me.id});
      return reply({ok:true,...await state(s,o)});
    }
    if(action==='request-support'){
      if(!tech(me))return reply({error:'Solo el técnico puede solicitar apoyo de Mesa técnica'},403);
      const o=await order(s,String(body.orden_id||''));if(String(o.tipo_trabajo||'').startsWith('INSTALACION'))return reply({error:'Usa el flujo de instalación'},400);
      if(!assigned(o,me))return reply({error:'La OT no está asignada a este técnico/grupo'},403);
      let acciones=Array.isArray(body.acciones)?body.acciones.map((x:any)=>String(x||'').trim().toUpperCase()).filter(Boolean):[];
      if(!acciones.length){
        if(Boolean(body.onu))acciones.push('ACTIVAR_CAMBIAR_ONU');
        if(Boolean(body.ip))acciones.push('ASIGNAR_NUEVA_IP');
        if(Boolean(body.remoto))acciones.push('VERIFICAR_ACCESO_REMOTO');
      }
      acciones=[...new Set(acciones)];
      if(acciones.includes('ASIGNAR_NUEVA_IP')&&!o.router_cobertura_id)return reply({error:'La OT necesita router de cobertura para asignar una nueva IP'},400);
      await validarSecuenciaSoporte(s,o,acciones);
      await ensureMesa(s,o,me);
      const reqLote=await crearRequerimientoLote(s,o,me,acciones);
      if(acciones.includes('ACTIVAR_CAMBIAR_ONU'))await ensureOnu(s,o,me);
      if(acciones.includes('ASIGNAR_NUEVA_IP'))await ensureIp(s,o,me,true);
      if(acciones.includes('VERIFICAR_ACCESO_REMOTO'))await ensureRemote(s,o,me);
      await s.from('orden_historial').insert({orden_id:o.id,evento:'MESA_TECNICA_SOPORTE_SOLICITADO',detalle:{requerimiento_id:reqLote.id,acciones:reqLote.acciones},realizado_por_id:me.id});
      return reply({ok:true,requerimiento:reqLote,...await state(s,o)});
    }
    if(action==='request-remote'){
      if(!tech(me))return reply({error:'Solo el técnico puede solicitar acceso remoto'},403);
      const o=await order(s,String(body.orden_id||''));if(!assigned(o,me))return reply({error:'La OT no está asignada a este técnico/grupo'},403);
      const st=await state(s,o);
      if(String(o.tipo_trabajo||'').startsWith('INSTALACION')){
        if(st.onu?.estado!=='CONFIRMADO')return reply({error:'Primero debe quedar activada y confirmada la ONU.'},409);
        if(st.ip?.solicitud?.estado!=='ASIGNADA')return reply({error:'Primero debe quedar asignada la IP.'},409);
      }else{
        await validarSecuenciaSoporte(s,o,['VERIFICAR_ACCESO_REMOTO']);
      }
      await ensureMesa(s,o,me);await ensureRemote(s,o,me);
      return reply({ok:true,...await state(s,o)});
    }
    if(action==='request-huawei-optical'){
      // SOLO solicitud de lectura. La OLT nunca recibe comandos desde esta función.
      if(!supervisor(me))return reply({error:'Solo Mesa Técnica puede solicitar la lectura Huawei'},403);
      const o=await order(s,String(body.orden_id||''));
      if(!o.servicio_cliente_id)return reply({error:'OT sin servicio enlazado; verifica identificación de ONU'},409);
      const rq=await s.from('orden_mesa_requerimientos').select('id,acciones,estado').eq('orden_id',o.id)
        .order('solicitado_at',{ascending:false}).limit(20);
      if(rq.error)throw rq.error;
      if(!(rq.data||[]).some((r:any)=>r.estado==='PENDIENTE'&&Array.isArray(r.acciones)&&r.acciones.includes('VERIFICAR_POTENCIA')))
        return reply({error:'No existe una solicitud pendiente de verificación de potencia para esta OT'},409);
      const v=await s.from('smartolt_onu_vinculos')
        .select('sn,onu_external_id,olt_nombre,estado_vinculo').eq('servicio_id',o.servicio_cliente_id)
        .order('updated_at',{ascending:false}).limit(2);
      if(v.error)throw v.error;
      if((v.data||[]).length!==1)return reply({error:'Vínculo de ONU ausente o ambiguo; confirma serial en el servicio'},409);
      const vinc=v.data[0],sn=huaweiSn16(vinc.sn||vinc.onu_external_id);
      if(!sn)return reply({error:'Serial del servicio no válido para Huawei'},409);
      const matches=await s.from('huawei_onus_cache')
        .select('olt_codigo,onu_sn').eq('onu_sn',sn).eq('presente',true).limit(2);
      if(matches.error)throw matches.error;
      if((matches.data||[]).length!==1)return reply({error:'ONU no identificada de forma única en caché Huawei. Verifica OLT/serial antes de leer'},409);
      const olt=String(matches.data[0].olt_codigo||'').trim().toUpperCase();
      const oltV=String(vinc.olt_nombre||'').trim().toUpperCase();
      if(!olt||oltV&&!oltV.includes(olt))return reply({error:'La OLT Huawei no coincide con el vínculo SmartOLT'},409);
      const now=new Date(),iso=now.toISOString();
      const exist=await s.from('consulta_red_solicitudes')
        .select('id,olt_estado,solicitado_at,expira_at')
        .eq('olt_codigo',olt).eq('onu_sn',sn).eq('olt_estado','PENDIENTE')
        .gt('expira_at',iso).order('solicitado_at',{ascending:false}).limit(1).maybeSingle();
      if(exist.error)throw exist.error;
      if(exist.data)return reply({ok:true,reutilizada:true,solicitud:{
        id:exist.data.id,estado:'PENDIENTE',solicitado_at:exist.data.solicitado_at,
        expira_at:exist.data.expira_at,olt_codigo:olt}});
      const exp=new Date(now.getTime()+10*60000).toISOString();
      const insert=await s.from('consulta_red_solicitudes').insert({
        servicio_id:o.servicio_cliente_id,orden_id:o.id,solicitado_por_id:me.id,
        olt_codigo:olt,onu_sn:sn,olt_estado:'PENDIENTE',origen_consulta:'SERVICIO',
        mikrotik_estado:'NO_APLICA',smartolt_estado:'NO_APLICA',
        solicitado_at:iso,expira_at:exp
      }).select('id,olt_estado,solicitado_at,expira_at').single();
      if(insert.error)throw insert.error;
      return reply({ok:true,reutilizada:false,solicitud:{
        id:insert.data.id,estado:insert.data.olt_estado,
        solicitado_at:insert.data.solicitado_at,expira_at:insert.data.expira_at,olt_codigo:olt}});
    }
    if(action==='status'){
      const o=await order(s,String(body.orden_id||''));if(tech(me)&&!assigned(o,me))return reply({error:'OT fuera de tu asignación'},403);
      return reply({ok:true,orden:o,...await state(s,o)});
    }
    if(action==='confirm-client'){
      if(!supervisor(me))return reply({error:'No autorizado'},403);
      const o=await order(s,String(body.orden_id||''));
      const {error}=await s.from('orden_mesa_tecnica_estado').upsert({orden_id:o.id,cliente_registrado:true,cliente_registrado_por_id:me.id,cliente_registrado_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:'orden_id'});if(error)throw error;
      await s.from('orden_historial').insert({orden_id:o.id,evento:'CLIENTE_SERVICIO_REGISTRADO_MESA',detalle:{},realizado_por_id:me.id});
      return reply({ok:true,...await state(s,o)});
    }
    if(action==='onu-upload'){
      if(!supervisor(me))return reply({error:'No autorizado'},403);
      const o=await order(s,String(body.orden_id||''));
      const mime=String(body.mime_type||'image/jpeg').toLowerCase(),base64=String(body.base64||'');
      if(!base64)return reply({error:'Imagen obligatoria'},400);if(!['image/jpeg','image/png','image/webp'].includes(mime))return reply({error:'Formato no permitido'},400);
      const bytes=decodeBase64(base64);if(bytes.length<=0||bytes.length>5*1024*1024)return reply({error:'La imagen supera 5 MB'},400);
      const ext=mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg',path=`mesa-onu/${o.id}/onu-${crypto.randomUUID()}.${ext}`;
      const up=await s.storage.from('instalacion-evidencias').upload(path,bytes,{contentType:mime,upsert:false});if(up.error)throw up.error;
      const prev=await s.from('orden_onu_solicitudes').select('storage_path').eq('orden_id',o.id).maybeSingle();if(prev.error)throw prev.error;
      const {error}=await s.from('orden_onu_solicitudes').upsert({orden_id:o.id,estado:'CONFIRMADO',confirmado_por_id:me.id,confirmado_at:new Date().toISOString(),storage_path:path,mime_type:mime,updated_at:new Date().toISOString()},{onConflict:'orden_id'});if(error){await s.storage.from('instalacion-evidencias').remove([path]);throw error}
      if(prev.data?.storage_path&&prev.data.storage_path!==path)await s.storage.from('instalacion-evidencias').remove([prev.data.storage_path]);
      const now=new Date().toISOString();
      const rq=await s.from('orden_mesa_requerimientos').select('id,acciones,resultado').eq('orden_id',o.id).eq('estado','PENDIENTE').order('solicitado_at',{ascending:false});
      if(rq.error)throw rq.error;
      const req=(rq.data||[]).find((x:any)=>Array.isArray(x.acciones)&&x.acciones.includes('ACTIVAR_CAMBIAR_ONU'));
      if(req){
        const evidencia_onu={storage_path:path,mime_type:mime,confirmado_at:now,confirmado_por_id:me.id,sn:o?.onu_sn||null};
        const resultado={...(req.resultado||{}),evidencia_onu,activacion_onu:{estado:'ACTIVADA_SEGUN_EVIDENCIA',fuente:'SMARTOLT_EVIDENCIA',confirmado_at:now}};
        const ur=await s.from('orden_mesa_requerimientos').update({estado:'ATENDIDO',atendido_por_id:me.id,atendido_at:now,canal_resolucion:'ONU_EVIDENCIA',resultado,updated_at:now}).eq('id',req.id);
        if(ur.error)throw ur.error;
        await s.from('orden_historial').insert({orden_id:o.id,evento:'MESA_TECNICA_ONU_CONFIRMADA',detalle:{requerimiento_id:req.id,storage_path:path},realizado_por_id:me.id});
      }
      await s.from('orden_historial').insert({orden_id:o.id,evento:'ONU_ACTIVADA_CONFIRMADA',detalle:{origen:'MESA_TECNICA'},realizado_por_id:me.id});
      return reply({ok:true,...await state(s,o)});
    }
    if(action==='onu-correction'){
      if(!supervisor(me))return reply({error:'No autorizado'},403);const o=await order(s,String(body.orden_id||'')),obs=String(body.observacion||'').trim();if(!obs)return reply({error:'Indica la corrección requerida'},400);
      const {error}=await s.from('orden_onu_solicitudes').upsert({orden_id:o.id,estado:'REQUIERE_CORRECCION',confirmado_por_id:me.id,confirmado_at:null,observacion:obs,updated_at:new Date().toISOString()},{onConflict:'orden_id'});if(error)throw error;
      return reply({ok:true,...await state(s,o)});
    }
    if(action==='verify-current-ip'){
      if(!supervisor(me))return reply({error:'No autorizado'},403);
      const o=await order(s,String(body.orden_id||'')),rid=String(body.requerimiento_id||'').trim();
      if(!rid)return reply({error:'Requerimiento obligatorio'},400);
      const {data:r,error:rErr}=await s.from('orden_mesa_requerimientos').select('id,acciones,estado,resultado').eq('id',rid).eq('orden_id',o.id).maybeSingle();
      if(rErr)throw rErr;if(!r)return reply({error:'Requerimiento no encontrado'},404);
      if(!Array.isArray(r.acciones)||!r.acciones.includes('CONFIRMAR_IP_ACTUAL'))return reply({error:'Este requerimiento no incluye confirmación de IP actual'},400);
      if(r.estado==='ATENDIDO')return reply({ok:true,...await state(s,o)});
      const datos=await datosIpActual(s,o);if(datos.requiere_seleccion_servicio)return reply({error:'Este cliente tiene varios servicios. Selecciona primero el servicio correcto antes de verificar la IP.',requiere_seleccion_servicio:true,servicios:datos.servicios||[]},409);if(!datos.ip)return reply({error:'La OT/servicio no tiene una IP registrada'},409);if(!datos.router_id)return reply({error:'La OT/servicio no tiene router de cobertura asociado'},409);
      const previo=r?.resultado?.verificacion_ip?.consulta_id;
      if(previo){
        const q=await s.from('consulta_red_solicitudes').select('id,mikrotik_estado,expira_at').eq('id',previo).maybeSingle();if(q.error)throw q.error;
        if(q.data?.mikrotik_estado==='PENDIENTE'&&new Date(q.data.expira_at||0).getTime()>Date.now())return reply({ok:true,pendiente:true,...await state(s,o)});
      }
      const now=new Date(),exp=new Date(now.getTime()+120000).toISOString();
      const q=await s.from('consulta_red_solicitudes').insert({orden_id:o.id,servicio_id:datos.servicio_id,solicitado_por_id:me.id,router_id:datos.router_id,ip_cliente:datos.ip,mikrotik_estado:'PENDIENTE',smartolt_estado:'NO_APLICA',olt_estado:'NO_APLICA',expira_at:exp}).select('id,solicitado_at').single();
      if(q.error)throw q.error;
      const resultado={...(r.resultado||{}),verificacion_ip:{consulta_id:q.data.id,servicio_id:datos.servicio_id,codigo_servicio:datos.codigo_servicio,tipo_conexion:datos.tipo_conexion,ip:datos.ip,router_id:datos.router_id,router_nombre:datos.router_nombre,estado:'PENDIENTE',solicitado_at:q.data.solicitado_at}};
      const u=await s.from('orden_mesa_requerimientos').update({resultado,updated_at:new Date().toISOString()}).eq('id',rid);if(u.error)throw u.error;
      await s.from('orden_historial').insert({orden_id:o.id,evento:'MESA_TECNICA_IP_ACTUAL_CONSULTA',detalle:{requerimiento_id:rid,consulta_red_id:q.data.id,ip:datos.ip,router_id:datos.router_id},realizado_por_id:me.id});
      return reply({ok:true,pendiente:true,...await state(s,o)});
    }
    if(action==='power-evidence-upload'){
      if(!supervisor(me))return reply({error:'No autorizado'},403);
      const o=await order(s,String(body.orden_id||'')),rid=String(body.requerimiento_id||'').trim();
      if(!rid)return reply({error:'Requerimiento obligatorio'},400);
      const {data:r,error:rErr}=await s.from('orden_mesa_requerimientos').select('id,acciones,resultado').eq('id',rid).eq('orden_id',o.id).maybeSingle();
      if(rErr)throw rErr;if(!r)return reply({error:'Requerimiento no encontrado'},404);
      if(!Array.isArray(r.acciones)||!r.acciones.includes('VERIFICAR_POTENCIA'))return reply({error:'Este requerimiento no incluye verificación de potencia'},400);
      const mime=String(body.mime_type||'image/jpeg').toLowerCase(),base64=String(body.base64||'');
      if(!base64)return reply({error:'Imagen obligatoria'},400);
      if(!['image/jpeg','image/png','image/webp'].includes(mime))return reply({error:'Formato no permitido'},400);
      const bytes=decodeBase64(base64);if(bytes.length<=0||bytes.length>5*1024*1024)return reply({error:'La imagen supera 5 MB'},400);
      const ext=mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg';
      const path=`mesa-potencia/${o.id}/${rid}/potencia-${crypto.randomUUID()}.${ext}`;
      const up=await s.storage.from('soporte-evidencias').upload(path,bytes,{contentType:mime,upsert:false});if(up.error)throw up.error;
      const prevPath=r?.resultado?.evidencia_potencia?.storage_path||null;
      const now=new Date().toISOString();
      const resultado={...(r.resultado||{}),evidencia_potencia:{storage_path:path,mime_type:mime,subido_at:now,subido_por_id:me.id}};
      const {error:uErr}=await s.from('orden_mesa_requerimientos').update({resultado,updated_at:now}).eq('id',rid);if(uErr){await s.storage.from('soporte-evidencias').remove([path]);throw uErr}
      if(prevPath&&prevPath!==path)await s.storage.from('soporte-evidencias').remove([prevPath]);
      await s.from('orden_historial').insert({orden_id:o.id,evento:'MESA_TECNICA_EVIDENCIA_POTENCIA',detalle:{requerimiento_id:rid},realizado_por_id:me.id});
      const sg=await s.storage.from('soporte-evidencias').createSignedUrl(path,21600);
      return reply({ok:true,evidencia:{...resultado.evidencia_potencia,url:sg.data?.signedUrl||null},...await state(s,o)});
    }
    if(action==='confirm-power-check'){
      if(!supervisor(me))return reply({error:'No autorizado'},403);
      const o=await order(s,String(body.orden_id||'')),rid=String(body.requerimiento_id||'').trim();
      if(!rid)return reply({error:'Requerimiento obligatorio'},400);
      const {data:r,error:rErr}=await s.from('orden_mesa_requerimientos').select('id,acciones,estado').eq('id',rid).eq('orden_id',o.id).maybeSingle();if(rErr)throw rErr;if(!r)return reply({error:'Requerimiento no encontrado'},404);
      if(!Array.isArray(r.acciones)||!r.acciones.includes('VERIFICAR_POTENCIA'))return reply({error:'Este requerimiento no incluye verificación de potencia'},400);
      const optica=await lecturaOptica(s,o);if(!optica)return reply({error:'No hay lectura óptica disponible para este servicio'},409);
      const {data:actual,error:aErr}=await s.from('orden_mesa_requerimientos').select('resultado').eq('id',rid).maybeSingle();if(aErr)throw aErr;
      if(!actual?.resultado?.evidencia_potencia?.storage_path)return reply({error:'Pega o carga primero la evidencia visual de SmartOLT'},409);
      const now=new Date().toISOString();
      const resultado={...(actual.resultado||{}),verificacion_potencia:{...optica,confirmado_at:now,confirmado_por_id:me.id}};
      const {error:uErr}=await s.from('orden_mesa_requerimientos').update({estado:'ATENDIDO',atendido_por_id:me.id,atendido_at:now,canal_resolucion:optica.fuente==='HUAWEI_CACHE'?'LECTURA_HUAWEI_CACHE_EVIDENCIA':'LECTURA_SMARTOLT_EVIDENCIA',resultado,updated_at:now}).eq('id',rid);if(uErr)throw uErr;
      await s.from('orden_historial').insert({orden_id:o.id,evento:'MESA_TECNICA_POTENCIA_VERIFICADA',detalle:{requerimiento_id:rid,optica:resultado.verificacion_potencia},realizado_por_id:me.id});
      return reply({ok:true,optica,...await state(s,o)});
    }
if(action==='resolve-support-request'){
      if(!supervisor(me))return reply({error:'No autorizado'},403);
      const o=await order(s,String(body.orden_id||'')),rid=String(body.requerimiento_id||'').trim();
      if(!rid)return reply({error:'Requerimiento obligatorio'},400);
      const {data:r,error:rErr}=await s.from('orden_mesa_requerimientos').select('id,acciones,estado').eq('id',rid).eq('orden_id',o.id).maybeSingle();if(rErr)throw rErr;if(!r)return reply({error:'Requerimiento no encontrado'},404);
      if(r.estado==='ATENDIDO')return reply({ok:true,...await state(s,o)});
      const evidenciaObligatoria=['VERIFICAR_POTENCIA','CONFIRMAR_IP_ACTUAL','ACTIVAR_CAMBIAR_ONU','ASIGNAR_NUEVA_IP','VERIFICAR_ACCESO_REMOTO'];
      const bloqueadas=(r.acciones||[]).filter((x:string)=>evidenciaObligatoria.includes(x));
      if(bloqueadas.length)return reply({error:'Este requerimiento necesita evidencia técnica y no puede cerrarse manualmente: '+bloqueadas.join(', ')},409);
      const now=new Date().toISOString(),canal=String(body.canal_resolucion||'SISTEMA').trim().toUpperCase();
      const {error:uErr}=await s.from('orden_mesa_requerimientos').update({estado:'ATENDIDO',atendido_por_id:me.id,atendido_at:now,canal_resolucion:canal,updated_at:now}).eq('id',rid);if(uErr)throw uErr;
      await s.from('orden_historial').insert({orden_id:o.id,evento:'MESA_TECNICA_REQUERIMIENTO_ATENDIDO',detalle:{requerimiento_id:rid,acciones:r.acciones,canal_resolucion:canal},realizado_por_id:me.id});
      return reply({ok:true,...await state(s,o)});
    }
    if(action==='board'){
      if(!supervisor(me))return reply({error:'No autorizado'},403);
      const {data:rows,error:rErr}=await s.from('orden_mesa_tecnica_estado').select('orden_id,solicitado_at,cliente_registrado,cliente_registrado_at').not('solicitado_at','is',null).order('solicitado_at',{ascending:true}).limit(100);if(rErr)throw rErr;
      const ids=(rows||[]).map((x:any)=>x.orden_id);if(!ids.length)return reply({ok:true,instalaciones:[],soportes:[]});
      const {data:orders,error:oErr}=await s.from('ordenes_trabajo').select('id,id_orden,tipo_trabajo,estado,cliente_nombre,cliente_nombre_final,cliente_direccion,cliente_direccion_final,cliente_referencia,cliente_referencia_final,grupo_asignado,grupo_destino,router_cobertura_id,servicio_cliente_id,ip_creacion_registrada,ip_creacion_estado,ip_creacion_router_id,updated_at').in('id',ids).not('estado','in','("COMPLETADA","CANCELADA")');if(oErr)throw oErr;
      const out:any[]=[];
      for(const o of orders||[]){
        const st=await state(s,o),m=(rows||[]).find((x:any)=>x.orden_id===o.id),servicio_actual=await datosIpActual(s,o);
        const pendingOnu=st.onu&&['SOLICITADO','REQUIERE_CORRECCION'].includes(st.onu.estado);
        const pendingIp=st.ip?.solicitud?.estado==='PENDIENTE';
        const pendingRemote=st.acceso?.estado==='SOLICITADO';
        const pendingBatch=(st.requerimientos||[]).some((x:any)=>x.estado==='PENDIENTE');
        const esInst=String(o.tipo_trabajo||'').startsWith('INSTALACION');
        const activacionLista=esInst&&!!m?.cliente_registrado&&st.onu?.estado==='CONFIRMADO'&&st.ip?.solicitud?.estado==='ASIGNADA';
        const waitingRemote=st.acceso?.estado==='REQUIERE_CORRECCION'||(activacionLista&&(!st.acceso||st.acceso.estado==='PENDIENTE'));
        const needsAction=(esInst&&!m?.cliente_registrado)||pendingOnu||pendingIp||pendingRemote||pendingBatch;
        out.push({...o,mesa:m,onu:st.onu,ip:st.ip,acceso:st.acceso,optica:st.optica,servicio_actual,requerimientos:st.requerimientos||[],requiere_accion:needsAction,espera_tecnico:waitingRemote,activacion_lista:activacionLista});
      }
      return reply({ok:true,instalaciones:out.filter(x=>String(x.tipo_trabajo||'').startsWith('INSTALACION')),soportes:out.filter(x=>!String(x.tipo_trabajo||'').startsWith('INSTALACION'))});
    }
    return reply({error:'Acción no válida'},400);
  }catch(e){
    console.error(e);const m=String((e as any)?.message||e);
    return reply({error:m},/sesión|usuario/i.test(m)?401:/No autorizado|no está asignada|fuera/i.test(m)?403:500);
  }
});