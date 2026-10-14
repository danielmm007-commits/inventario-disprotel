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
   const registeredAll=await db.from('onu_autorizaciones_manuales').select('orden_id,olt_codigo,onu_sn,nombre,nap,zona,ip_administrativa,estado').in('onu_sn',sns).limit(300);
   if(registeredAll.error)throw registeredAll.error;
   const modelKeys=[...new Set(found.map((r:any)=>normalize(r.modelo).replace(/[^A-Z0-9_.-]/g,'')).filter(Boolean))];
   const models=modelKeys.length?await db.from('onu_modelos_catalogo').select('modelo_clave,pon_tipo,ethernet_puertos,wifi_puertos,voip_puertos,catv,capacidad,es_generico').in('modelo_clave',modelKeys):{data:[],error:null};
   if(models.error)throw models.error;
   const modelMap=new Map((models.data||[]).map((m:any)=>[m.modelo_clave,m]));
   const items=found.map((r:any)=>{
    const linked=(assoc.data||[]).filter((a:any)=>a.olt_codigo===r.olt_codigo&&a.onu_sn===r.onu_sn&&a.onu_pon===r.pon&&alive.has(a.orden_id));
    // Si dos OT reclaman el mismo serial, no autorizar por ambigüedad.
    const selected=linked.length===1?linked[0]:null;
    const ot=selected?alive.get(selected.orden_id):null;
    const registered=(registeredAll.data||[]).find((a:any)=>a.olt_codigo===r.olt_codigo&&a.onu_sn===r.onu_sn)||null;
    return {olt_codigo:r.olt_codigo,olt_nombre:r.olt_nombre,onu_sn:r.onu_sn,onu_sn_display:r.onu_sn_display,pon:r.pon,
      modelo:r.modelo,modelo_catalogo:modelMap.get(normalize(r.modelo).replace(/[^A-Z0-9_.-]/g,''))||null,vendor:r.vendor,version:r.version,software:r.software,detectada_at:r.detectada_at,
      ultima_lectura_at:r.ultima_lectura_at,orden_id:registered?.orden_id||ot?.id||null,orden_numero:ot?.id_orden||null,
      conflicto_ot:linked.length>1,estado_aprobacion:registered?.estado||null,nombre:registered?.nombre||null,
      nap:registered?.nap||null,zona:registered?.zona||null,ip_administrativa:registered?.ip_administrativa||null};
   });
   return reply({ok:true,items,updated_at:new Date().toISOString()});
  }
  if(action==='active-orders'){
   const q=await db.from('ordenes_trabajo').select('id,id_orden,tipo_trabajo,estado,cliente_nombre,cliente_nombre_final,grupo_asignado').not('estado','in','("COMPLETADA","CANCELADA")').limit(150);
   if(q.error)throw q.error;return reply({ok:true,rows:q.data||[]});
  }
  const orden_id=String(data.orden_id||'').trim();
  if(orden_id&&!/^[0-9a-f-]{36}$/i.test(orden_id))return reply({error:'OT inválida'},400);
  let ord:any={data:null};
  if(orden_id){ord=await db.from('ordenes_trabajo').select('id,estado').eq('id',orden_id).maybeSingle();if(ord.error||!ord.data)return reply({error:'OT inexistente'},404);}
  const olt_codigo=normalize(data.olt_codigo||'');
  const onu_sn=data.onu_sn?normSn(data.onu_sn):'';
  const identity=()=>db.from('onu_autorizaciones_manuales').select('*').eq('olt_codigo',olt_codigo).eq('onu_sn',onu_sn).maybeSingle();
  if(!orden_id&&(!olt_codigo||!onu_sn))return reply({error:'OLT y serial obligatorios'},400);
  if(action==='status'){
   const q=orden_id?db.from('onu_autorizaciones_manuales').select('*').eq('orden_id',orden_id).maybeSingle():identity();
   const r=await q;if(r.error)throw r.error;return reply({ok:true,registro:r.data});
  }
  if(action==='preflight'){
   // PREVUELO: consulta de Supabase, nunca cambia estado ni ejecuta Huawei.
   const reg=await identity();
   if(reg.error)throw reg.error;
   if(!reg.data)return reply({error:'Esta ONU no tiene datos administrativos registrados'},404);
   const r=reg.data;
   const checks:{codigo:string,ok:boolean,detalle:string}[]=[];
   const add=(codigo:string,ok:boolean,detalle:string)=>checks.push({codigo,ok,detalle});
   add('APROBACION',!!r.aprobado_por_id&&!!r.aprobado_at&&['APROBADA_PENDIENTE_PERFIL','APROBADA_PENDIENTE_EJECUCION'].includes(r.estado),
     r.aprobado_at?'Aprobación registrada; estado '+r.estado:'Falta aprobación manual vigente');
   const cfg=await db.from('olt_configuraciones').select('id,activo').eq('codigo',olt_codigo).maybeSingle();
   if(cfg.error)throw cfg.error;
   add('OLT',cfg.data?.activo===true,cfg.data?.activo===true?'OLT configurada y habilitada':'OLT no activa o no configurada');
   const det=await db.from('olt_onu_autofind_cache').select('pon,modelo,presente,ultima_lectura_at').eq('olt_codigo',olt_codigo).eq('onu_sn',onu_sn).maybeSingle();
   if(det.error)throw det.error;
   const same=!!det.data&&det.data.presente===true&&det.data.pon===r.onu_pon&&normalize(det.data.modelo)===normalize(r.onu_modelo);
   add('AUTOFIND',same,same?'Serial, PON y modelo coinciden en detección':'No coincide serial/modelo/PON en detección Huawei');
   const age=det.data?.ultima_lectura_at?Date.now()-Date.parse(det.data.ultima_lectura_at):NaN;
   const fresh=Number.isFinite(age)&&age>=0&&age<=15*60*1000;
   add('LECTURA_RECIENTE',fresh,fresh?'Detección actualizada hace '+Math.ceil(age/60000)+' min':'Detección sin lectura reciente (máximo 15 min)');
   const inv=await db.from('huawei_onus_cache').select('id').eq('olt_codigo',olt_codigo).eq('onu_sn',onu_sn).eq('presente',true).limit(1);
   if(inv.error)throw inv.error;
   add('NO_REGISTRADA',(inv.data||[]).length===0,(inv.data||[]).length?'El serial figura en inventario Huawei: no duplicar':'No figura como registrada en el inventario del scanner');
   const modelo=normalize(r.onu_modelo).replace(/[^A-Z0-9_.-]/g,'');
   const prof=cfg.data?await db.from('onu_perfiles_olt').select('tipo_onu,modelo_clave,vlan_servicio,vlan_usuario,line_profile_id,service_profile_id,gemport,traffic_in_id,traffic_out_id,tag_transform,habilitado,fuente').eq('olt_id',cfg.data.id).eq('tipo_onu','BRIDGE').eq('modelo_clave',modelo).maybeSingle():{data:null,error:null};
   if(prof.error)throw prof.error;
   const p=prof.data;
   const complete=!!p&&['vlan_servicio','vlan_usuario','line_profile_id','service_profile_id','gemport','traffic_in_id','traffic_out_id'].every(k=>Number.isSafeInteger(p[k]))&&p.tag_transform==='translate';
   add('PERFIL',complete,complete?'Perfil numérico completo: línea '+p.line_profile_id+', servicio '+p.service_profile_id+', VLAN '+p.vlan_servicio+', GEM '+p.gemport+', RX '+p.traffic_in_id+', TX '+p.traffic_out_id:'Faltan parámetros de perfil GPON');
   add('PERFIL_HABILITADO',p?.habilitado===true,p?.habilitado===true?'Perfil habilitado por revisión técnica':'Perfil intencionalmente deshabilitado para escrituras');
   // No afirmamos conectividad Huawei ni ejecución desde un API que no opera la PC.
   return reply({ok:true,solo_lectura:true,escrituras_ejecutadas:0,olt_codigo,onu_sn,estado:r.estado,
     perfil:p?{modelo_clave:p.modelo_clave,line_profile_id:p.line_profile_id,service_profile_id:p.service_profile_id,
       vlan_servicio:p.vlan_servicio,vlan_usuario:p.vlan_usuario,gemport:p.gemport,
       traffic_in_id:p.traffic_in_id,traffic_out_id:p.traffic_out_id,tag_transform:p.tag_transform,habilitado:p.habilitado}:null,
     checks,apto_para_cola:checks.every(c=>c.ok),
     ejecucion_huawei_disponible:false,
     aviso:'Verificación de base de datos y cachés. No reemplaza el preflight en vivo del agente local ni demuestra guardado persistente.'});
  }
  if(action==='enqueue-huawei'){
   // Solo el supervisor autenticado pone una ONU YA aprobada en la cola.
   // Esta accion NO envia ningun comando a la OLT.
   const reg=await identity();if(reg.error)throw reg.error;
   const row=reg.data;
   if(!row||!row.aprobado_por_id||!row.aprobado_at||
      !['APROBADA_PENDIENTE_PERFIL','APROBADA_PENDIENTE_EJECUCION'].includes(row.estado))
      return reply({error:'La ONU no tiene una aprobacion vigente pendiente'},409);
   // Usar la identidad detectada, no el serial de la primera prueba.
   if(!/^[A-Z0-9_-]{2,32}$/.test(row.olt_codigo)||!/^[A-F0-9]{16}$/.test(row.onu_sn)
      ||!/^[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{1,2}$/.test(row.onu_pon))
      return reply({error:'Identidad de OLT, serial o PON inválida'},400);
   if(String(data.confirmar_serial||'').trim().toUpperCase()!==row.onu_sn)
      return reply({error:'Confirma el serial exacto'},400);
   const cfg=await db.from('olt_configuraciones').select('id,activo').eq('codigo',row.olt_codigo).maybeSingle();
   if(cfg.error)throw cfg.error;
   if(!cfg.data||cfg.data.activo!==true)return reply({error:'OLT no activa'},409);
   const det=await db.from('olt_onu_autofind_cache').select('pon,modelo,presente,ultima_lectura_at')
     .eq('olt_codigo',row.olt_codigo).eq('onu_sn',row.onu_sn).maybeSingle();
   if(det.error)throw det.error;
   const age=Date.now()-Date.parse(det.data?.ultima_lectura_at||'');
   if(!det.data||det.data.presente!==true||det.data.pon!==row.onu_pon||
       normalize(det.data.modelo)!==normalize(row.onu_modelo)||!Number.isFinite(age)||age<0||age>15*60000)
       return reply({error:'Falta deteccion Huawei actualizada del serial/modelo/PON'},409);
   const inv=await db.from('huawei_onus_cache').select('id').eq('olt_codigo',row.olt_codigo).eq('onu_sn',row.onu_sn).eq('presente',true).limit(1);
   if(inv.error)throw inv.error;
   if((inv.data||[]).length)return reply({error:'La ONU ya esta registrada: detener'},409);
   const modelo=normalize(row.onu_modelo).replace(/[^A-Z0-9_.-]/g,'');
   const prof=await db.from('onu_perfiles_olt').select('*').eq('olt_id',cfg.data.id).eq('modelo_clave',modelo).eq('tipo_onu','BRIDGE').maybeSingle();
   if(prof.error)throw prof.error;
   const p=prof.data;
   if(!p||p.habilitado!==true||p.tag_transform!=='translate'
      ||!['vlan_servicio','vlan_usuario'].every(k=>Number.isSafeInteger(p[k])&&p[k]>=1&&p[k]<=4094)
      ||!['line_profile_id','service_profile_id','gemport','traffic_in_id','traffic_out_id']
        .every(k=>Number.isSafeInteger(p[k])&&p[k]>=0&&p[k]<=4095))
      return reply({error:'Perfil GPON de OLT/modelo no validado o incompleto'},409);
   const q=await db.from('onu_autorizaciones_manuales')
     .update({estado:'APROBADA_PENDIENTE_EJECUCION',updated_at:new Date().toISOString()})
     .eq('id',row.id).in('estado',['APROBADA_PENDIENTE_PERFIL','APROBADA_PENDIENTE_EJECUCION'])
     .select('id,estado').maybeSingle();
   if(q.error)throw q.error;
   if(!q.data)return reply({error:'La solicitud cambio antes de enviarse'},409);
   if(row.orden_id)await db.from('orden_historial').insert({orden_id:row.orden_id,
      evento:'ONU_HUAWEI_ENCOLADA',detalle:{olt_codigo:row.olt_codigo,onu_sn:row.onu_sn,
      pon:row.onu_pon,service_profile_id:p.service_profile_id},realizado_por_id:me.id});
   return reply({ok:true,registro:q.data,
      nota:'Solicitud lista para el agente Huawei de autorizacion. Aun NO enviada a OLT.'});
  }
  if(action==='register'){
   if(ord.data&&['COMPLETADA','CANCELADA'].includes(normalize(ord.data.estado)))return reply({error:'OT cerrada'},409);
   const code=orden_id?olt_codigo:normalize(data.olt_codigo);
   const serial=orden_id?onu_sn:normSn(data.onu_sn);
   if(!code||!serial)return reply({error:'OLT/serial obligatorio'},400);
   if(orden_id){
    const request=await db.from('orden_onu_solicitudes').select('olt_codigo,onu_sn,onu_pon,estado').eq('orden_id',orden_id).maybeSingle();
    if(request.error)throw request.error;
    if(request.data?.onu_sn&&(normalize(request.data.olt_codigo)!==code||normSn(request.data.onu_sn)!==serial||request.data.onu_pon!==data.onu_pon))
      return reply({error:'La OT ya tiene otra ONU identificada; no se puede vincular esta'},409);
    if(request.data?.estado==='CONFIRMADO')return reply({error:'La ONU ya fue confirmada en la OT'},409);
   }
   const det=await db.from('olt_onu_autofind_cache').select('onu_sn,pon,modelo').eq('olt_codigo',code).eq('onu_sn',serial).eq('presente',true).maybeSingle();
   if(det.error||!det.data||det.data.pon!==data.onu_pon)return reply({error:'ONU no detectada en la OLT/PON seleccionadas'},409);
   const current=await db.from('onu_autorizaciones_manuales').select('*').eq('olt_codigo',code).eq('onu_sn',serial).maybeSingle();
   if(current.error)throw current.error;
   if(current.data&&!['DATOS_REGISTRADOS','ERROR'].includes(current.data.estado))return reply({error:'ONU ya aprobada o en proceso'},409);
   if(current.data?.orden_id&&orden_id&&current.data.orden_id!==orden_id)return reply({error:'ONU vinculada a otra OT'},409);
   const nombre=String(data.nombre||'').trim(),nap=String(data.nap||'').trim(),zona=String(data.zona||'').trim();
   if(nombre.length<2||nombre.length>120||(!nap&&!zona)||nap.length>80||zona.length>80)return reply({error:'Nombre y NAP o zona requeridos'},400);
   const payload={orden_id:orden_id||null,olt_codigo:code,onu_sn:serial,onu_pon:det.data.pon,onu_modelo:det.data.modelo,nombre,nap:nap||null,zona:zona||null,ip_administrativa:validateIp(data.ip_administrativa),estado:'DATOS_REGISTRADOS',registrado_por_id:me.id,aprobado_por_id:null,aprobado_at:null,updated_at:new Date().toISOString()};
   const saved=current.data?await db.from('onu_autorizaciones_manuales').update(payload).eq('id',current.data.id).eq('estado','DATOS_REGISTRADOS').select('id,estado').maybeSingle():await db.from('onu_autorizaciones_manuales').insert(payload).select('id,estado').single();
   if(saved.error)throw saved.error;if(!saved.data)return reply({error:'La solicitud cambió; actualiza'},409);
   return reply({ok:true,registro:saved.data,nota:'Información administrativa registrada'});
  }
  if(action==='approve'){
   if(ord.data&&['COMPLETADA','CANCELADA'].includes(normalize(ord.data.estado)))return reply({error:'OT cerrada'},409);
   const old=orden_id?await db.from('onu_autorizaciones_manuales').select('*').eq('orden_id',orden_id).maybeSingle():await identity();
   if(old.error||!old.data)return reply({error:'Primero registra los datos'},409);
   if(old.data.estado!=='DATOS_REGISTRADOS')return reply({error:'Solicitud ya procesada'},409);
   const det=await db.from('olt_onu_autofind_cache').select('pon,modelo,ultima_lectura_at').eq('olt_codigo',old.data.olt_codigo).eq('onu_sn',old.data.onu_sn).eq('presente',true).maybeSingle();
   if(det.error||!det.data||det.data.pon!==old.data.onu_pon||normalize(det.data.modelo)!==normalize(old.data.onu_modelo))return reply({error:'Huawei ya no detecta el mismo modelo/PON'},409);
   const olt=await db.from('olt_configuraciones').select('id').eq('codigo',old.data.olt_codigo).eq('activo',true).maybeSingle();
   if(olt.error||!olt.data)return reply({error:'OLT inactiva'},409);
   const modelo=normalize(old.data.onu_modelo).replace(/[^A-Z0-9_.-]/g,'');
   const p=await db.from('onu_perfiles_olt').select('*').eq('olt_id',olt.data.id).eq('tipo_onu','BRIDGE').eq('modelo_clave',modelo).maybeSingle();if(p.error)throw p.error;
   const complete=!!p.data&&['vlan_servicio','vlan_usuario','line_profile_id','service_profile_id','gemport','traffic_in_id','traffic_out_id'].every(k=>p.data[k]!=null)&&p.data.tag_transform==='translate'&&p.data.habilitado===true;
   const estado=complete?'APROBADA_PENDIENTE_EJECUCION':'APROBADA_PENDIENTE_PERFIL';
   const up=await db.from('onu_autorizaciones_manuales').update({estado,aprobado_por_id:me.id,aprobado_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',old.data.id).eq('estado','DATOS_REGISTRADOS').select('id,estado').maybeSingle();
   if(up.error)throw up.error;if(!up.data)return reply({error:'Solicitud actualizada previamente'},409);
   if(old.data.orden_id)await db.from('orden_historial').insert({orden_id:old.data.orden_id,evento:'ONU_HUAWEI_APROBACION_MANUAL',detalle:{olt_codigo:old.data.olt_codigo,onu_sn:old.data.onu_sn,perfil_id:p.data?.id||null,estado,ip_solo_administrativa:true},realizado_por_id:me.id});
   return reply({ok:true,registro:up.data,nota:complete?'Aprobación registrada y enviada a cola; la OLT solo se modificará si el servidor y la PC están habilitados.':'Aprobación guardada, pendiente de perfil GPON validado. No se ejecutará Huawei.'});
  }
  return reply({error:'Acción desconocida'},400);
 }catch(e){return reply({error:String((e as Error).message||e)},400)}
});