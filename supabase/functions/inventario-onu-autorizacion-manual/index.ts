import {createClient} from 'npm:@supabase/supabase-js@2.95.0';
const ORIGIN='https://danielmm007-commits.github.io';
const HEADERS={'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Headers':'content-type,x-session,authorization','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json; charset=utf-8'};
const reply=(obj:any,status=200)=>new Response(JSON.stringify(obj),{headers:HEADERS,status});
const normalize=(v:any)=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
async function sha(s:string){const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('');}
function database(){const raw=Deno.env.get('SUPABASE_SECRET_KEYS');const key=raw?JSON.parse(raw).default:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!key)throw Error('Servidor sin credenciales');return createClient(Deno.env.get('SUPABASE_URL')!,key,{auth:{persistSession:false,autoRefreshToken:false}});}
async function supervisor(db:any,token:string){if(!token)throw Error('Sesión requerida');const s=await db.from('app_auth_sessions').select('responsable_id').eq('token_hash',await sha(token)).is('revoked_at',null).gt('expires_at',new Date().toISOString()).maybeSingle();if(s.error||!s.data)throw Error('Sesión inválida');const p=await db.from('responsables').select('id,rol,activo,es_admin_principal').eq('id',s.data.responsable_id).eq('activo',true).maybeSingle();if(p.error||!p.data)throw Error('Usuario sin acceso');const rol=normalize(p.data.rol);if(p.data.es_admin_principal!==true&&!rol.includes('SUPERVISOR TECNICO')&&!rol.includes('ADMINISTRADOR'))throw Error('Solo supervisores pueden registrar/autorizaciones');return p.data;}
function validateIp(ip:any){let v=String(ip||'').trim();if(!v)return null;const p=v.split('.');if(p.length!==4||p.some(x=>!/^(0|[1-9][0-9]{0,2})$/.test(x)||Number(x)>255))throw Error('IP administrativa inválida');return v;}
function normSn(x:any){const t=normalize(x).replace(/[-:\s]/g,'');if(!/^[A-F0-9]{16}$/.test(t))throw Error('Serial Huawei inválido');return t;}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:HEADERS});
 if(req.method!=='POST')return reply({error:'Método no permitido'},405);
 try{
  const data=await req.json();const db=database();const me=await supervisor(db,String(req.headers.get('x-session')||data.session_token||''));const action=String(data.action||'');
  if(action==='pending-list'){
   // Consulta puntual del supervisor. No se llama por sondeo ni habilita provisioning.
   const olt=normalize(data.olt_codigo||'');
   let q=db.from('olt_onu_autofind_cache').select('olt_codigo,olt_nombre,onu_sn,onu_sn_display,pon,vendor,modelo,version,software,detectada_at,ultima_lectura_at').eq('presente',true).order('ultima_lectura_at',{ascending:false}).limit(150);
   if(olt)q=q.eq('olt_codigo',olt);
   const pending=await q;if(pending.error)throw pending.error;
   const found=pending.data||[],sns=[...new Set(found.map((r:any)=>r.onu_sn).filter(Boolean))];
   if(!sns.length)return reply({ok:true,items:[],updated_at:new Date().toISOString()});
   const assoc=await db.from('orden_onu_solicitudes').select('orden_id,olt_codigo,onu_sn,onu_pon,estado').in('onu_sn',sns).neq('estado','CONFIRMADO').limit(300);
   if(assoc.error)throw assoc.error;
   const ordIds=[...new Set((assoc.data||[]).map((o:any)=>o.orden_id).filter(Boolean))];
   let orders:any[]=[],saved:any[]=[];
   if(ordIds.length){
    const ord=await db.from('ordenes_trabajo').select('id,id_orden,estado').in('id',ordIds).limit(300);if(ord.error)throw ord.error;orders=ord.data||[];
    const reg=await db.from('onu_autorizaciones_manuales').select('orden_id,olt_codigo,onu_sn,nombre,nap,zona,ip_administrativa,estado').in('orden_id',ordIds).limit(300);
    if(reg.error)throw reg.error;saved=reg.data||[];
   }
   const alive=new Map(orders.filter((o:any)=>!['COMPLETADA','CANCELADA'].includes(normalize(o.estado))).map((o:any)=>[o.id,o]));
   const items=found.map((r:any)=>{
    const linked=(assoc.data||[]).filter((a:any)=>a.olt_codigo===r.olt_codigo&&a.onu_sn===r.onu_sn&&a.onu_pon===r.pon&&alive.has(a.orden_id));
    // Si dos OT reclaman el mismo serial, no autorizar por ambigüedad.
    const selected=linked.length===1?linked[0]:null;
    const ot=selected?alive.get(selected.orden_id):null;
    const registered=selected?saved.find((a:any)=>a.orden_id===selected.orden_id&&a.olt_codigo===r.olt_codigo&&a.onu_sn===r.onu_sn):null;
    return {olt_codigo:r.olt_codigo,olt_nombre:r.olt_nombre,onu_sn:r.onu_sn,onu_sn_display:r.onu_sn_display,pon:r.pon,
      modelo:r.modelo,vendor:r.vendor,version:r.version,software:r.software,detectada_at:r.detectada_at,
      ultima_lectura_at:r.ultima_lectura_at,orden_id:ot?.id||null,orden_numero:ot?.id_orden||null,
      conflicto_ot:linked.length>1,estado_aprobacion:registered?.estado||null,nombre:registered?.nombre||null,
      nap:registered?.nap||null,zona:registered?.zona||null,ip_administrativa:registered?.ip_administrativa||null};
   });
   return reply({ok:true,items,updated_at:new Date().toISOString()});
  }
  const orden_id=String(data.orden_id||'').trim();
  if(!/^[0-9a-f-]{36}$/i.test(orden_id))return reply({error:'OT obligatoria'},400);
  const ord=await db.from('ordenes_trabajo').select('id,id_orden,estado').eq('id',orden_id).maybeSingle();if(ord.error||!ord.data)return reply({error:'OT inexistente'},404);
  if(action==='status'){
   const r=await db.from('onu_autorizaciones_manuales').select('id,orden_id,olt_codigo,onu_sn,onu_pon,onu_modelo,nombre,nap,zona,ip_administrativa,estado,registrado_at,aprobado_at,registrado_por_id,aprobado_por_id').eq('orden_id',orden_id).maybeSingle();if(r.error)throw r.error;
   return reply({ok:true,registro:r.data});
  }
  if(action==='register'){
   if(['COMPLETADA','CANCELADA'].includes(normalize(ord.data.estado)))return reply({error:'La OT está cerrada'},409);
   const reqRow=await db.from('orden_onu_solicitudes').select('estado,olt_codigo,onu_sn,onu_pon,onu_modelo').eq('orden_id',orden_id).maybeSingle();
   if(reqRow.error||!reqRow.data?.onu_sn||!reqRow.data?.onu_pon||!reqRow.data?.olt_codigo)return reply({error:'La ONU debe identificarse primero en el detector Huawei de la OT'},409);
   if(reqRow.data.estado==='CONFIRMADO')return reply({error:'La ONU ya consta confirmada por evidencia; verifica el estado antes de continuar'},409);
   const det=await db.from('olt_onu_autofind_cache').select('onu_sn,pon,modelo,presente,ultima_lectura_at').eq('olt_codigo',reqRow.data.olt_codigo).eq('onu_sn',reqRow.data.onu_sn).eq('presente',true).maybeSingle();
   if(det.error||!det.data||det.data.pon!==reqRow.data.onu_pon)return reply({error:'ONU sin detección actual coincidente en la OLT y PON'},409);
   const found=await db.from('onu_autorizaciones_manuales').select('id,estado').eq('orden_id',orden_id).maybeSingle();if(found.error)throw found.error;
   if(found.data&&!['DATOS_REGISTRADOS','ERROR'].includes(found.data.estado))return reply({error:'Esta solicitud ya está aprobada o en ejecución'},409);
   const name=String(data.nombre||'').trim(),nap=String(data.nap||'').trim(),zona=String(data.zona||'').trim();
   if(name.length<2||name.length>120||(!nap&&!zona)||nap.length>80||zona.length>80)return reply({error:'Ingresa nombre y NAP o zona válidos'},400);
   const payload={orden_id,olt_codigo:reqRow.data.olt_codigo,onu_sn:normSn(reqRow.data.onu_sn),onu_pon:reqRow.data.onu_pon,onu_modelo:reqRow.data.onu_modelo||det.data.modelo||null,nombre:name,nap:nap||null,zona:zona||null,ip_administrativa:validateIp(data.ip_administrativa),estado:'DATOS_REGISTRADOS',registrado_por_id:me.id,aprobado_por_id:null,aprobado_at:null,updated_at:new Date().toISOString()};
   const r=found.data?await db.from('onu_autorizaciones_manuales').update(payload).eq('id',found.data.id).select('id,estado').single():await db.from('onu_autorizaciones_manuales').insert(payload).select('id,estado').single();
   if(r.error)throw r.error;
   return reply({ok:true,registro:r.data,nota:'Datos guardados. Huawei sin cambios.'});
  }
  if(action==='approve'){
   if(['COMPLETADA','CANCELADA'].includes(normalize(ord.data.estado)))return reply({error:'La OT está cerrada'},409);
   const old=await db.from('onu_autorizaciones_manuales').select('*').eq('orden_id',orden_id).maybeSingle();if(old.error||!old.data)return reply({error:'Registra primero los datos administrativos'},409);
   if(old.data.estado!=='DATOS_REGISTRADOS')return reply({error:'La solicitud ya fue procesada o aprobada'},409);
   const reqRow=await db.from('orden_onu_solicitudes').select('onu_sn,onu_pon,olt_codigo,estado').eq('orden_id',orden_id).maybeSingle();
   if(reqRow.error||reqRow.data?.estado==='CONFIRMADO'||reqRow.data?.onu_sn!==old.data.onu_sn||reqRow.data?.onu_pon!==old.data.onu_pon||reqRow.data?.olt_codigo!==old.data.olt_codigo)return reply({error:'La detección de la OT cambió; revisar antes de aprobar'},409);
   const det=await db.from('olt_onu_autofind_cache').select('presente,pon,ultima_lectura_at').eq('olt_codigo',old.data.olt_codigo).eq('onu_sn',old.data.onu_sn).eq('presente',true).maybeSingle();
   if(det.error||!det.data||det.data.pon!==old.data.onu_pon)return reply({error:'La ONU ya no consta pendiente en Huawei'},409);
   const profileOlt=await db.from('olt_configuraciones').select('id,activo').eq('codigo',old.data.olt_codigo).eq('activo',true).maybeSingle();
   if(profileOlt.error||!profileOlt.data)return reply({error:'OLT no configurada o inactiva'},409);
   const model=normalize(old.data.onu_modelo).replace(/[^A-Z0-9_.-]/g,'');
   const profile=await db.from('onu_perfiles_olt').select('id,vlan_servicio,line_profile_id,service_profile_id,gemport,traffic_in_id,traffic_out_id').eq('olt_id',profileOlt.data.id).eq('tipo_onu','BRIDGE').eq('modelo_clave',model).maybeSingle();
   if(profile.error||!profile.data||[profile.data.vlan_servicio,profile.data.line_profile_id,profile.data.service_profile_id,profile.data.gemport,profile.data.traffic_in_id,profile.data.traffic_out_id].some(v=>v==null))return reply({error:'No existe un perfil BRIDGE completo para el modelo detectado en esta OLT'},409);
   const up=await db.from('onu_autorizaciones_manuales').update({estado:'APROBADA_PENDIENTE_EJECUCION',aprobado_por_id:me.id,aprobado_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',old.data.id).eq('estado','DATOS_REGISTRADOS').select('id,estado').maybeSingle();
   if(up.error)throw up.error;if(!up.data)return reply({error:'Solicitud aprobada previamente; recarga'},409);
   await db.from('orden_historial').insert({orden_id,evento:'ONU_HUAWEI_APROBACION_MANUAL',detalle:{olt_codigo:old.data.olt_codigo,onu_sn:old.data.onu_sn,pon:old.data.onu_pon,perfil_id:profile.data.id,ip_solo_administrativa:true},realizado_por_id:me.id});
   return reply({ok:true,registro:up.data,nota:'Aprobación registrada. El lector Huawei todavía no ejecuta escrituras.'});
  }
  return reply({error:'Acción desconocida'},400);
 }catch(e){return reply({error:String((e as Error).message||e)},400)}
});