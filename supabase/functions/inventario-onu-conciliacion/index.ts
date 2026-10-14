import {createClient} from 'npm:@supabase/supabase-js@2.95.0';

// Reconciliación administrativa de la PRIMERA ONU de prueba.
// Nunca conecta a Huawei ni ejecuta authorize / service-port / save.
// El agente debe haber verificado la configuración previamente.
// Se habilita por separado y por un supervisor cuando exista evidencia.
// No confundir PENDIENTE_GUARDAR con AUTORIZADA.
const OLT='SALCEDO',SN='48575443C8BFCE42',PON='0/1/12',ONT=6,SP=3006;
const HEADERS={
 'Access-Control-Allow-Origin':'https://danielmm007-commits.github.io',
 'Access-Control-Allow-Headers':'content-type,x-session,authorization',
 'Access-Control-Allow-Methods':'POST,OPTIONS',
 'Content-Type':'application/json; charset=utf-8'
};
const reply=(x:any,status=200)=>new Response(JSON.stringify(x),{status,headers:HEADERS});
function database(){
 const raw=Deno.env.get('SUPABASE_SECRET_KEYS');
 const key=raw?JSON.parse(raw).default:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!key)throw new Error('Credenciales Supabase no configuradas');
 return createClient(Deno.env.get('SUPABASE_URL')!,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
async function sha(s:string){
 const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));
 return [...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function normal(v:any){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();}
async function supervisor(db:any,token:string){
 if(!token)throw Error('Inicio de sesión requerido');
 const s=await db.from('app_auth_sessions').select('responsable_id')
  .eq('token_hash',await sha(token)).is('revoked_at',null)
  .gt('expires_at',new Date().toISOString()).maybeSingle();
 if(s.error||!s.data)throw Error('Sesión inválida');
 const u=await db.from('responsables').select('id,rol,activo,es_admin_principal')
  .eq('id',s.data.responsable_id).eq('activo',true).maybeSingle();
 if(u.error||!u.data)throw Error('Usuario deshabilitado');
 const rol=normal(u.data.rol);
 if(u.data.es_admin_principal!==true&&!rol.includes('SUPERVISOR TECNICO')&&!rol.includes('ADMINISTRADOR'))
  throw Error('Solo supervisores pueden conciliar resultados Huawei');
 return u.data;
}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:HEADERS});
 if(req.method!=='POST')return reply({error:'Método no permitido'},405);
 try{
  const body=await req.json(),action=String(body.action||'');
  if(!['preflight','reconcile'].includes(action))return reply({error:'Acción no permitida'},400);
  if(normal(body.olt_codigo)!==OLT||normal(body.onu_sn)!==SN)
   return reply({error:'Solo se admite la ONU de prueba explicitamente identificada'},403);
  const db=database();
  const user=await supervisor(db,String(req.headers.get('x-session')||body.session_token||''));
  const r=await db.from('onu_autorizaciones_manuales').select('*')
   .eq('olt_codigo',OLT).eq('onu_sn',SN).maybeSingle();
  if(r.error)throw r.error;
  if(!r.data)return reply({error:'No existe autorización histórica'},404);
  const old=r.data;
  const inv=await db.from('huawei_onus_cache')
   .select('onu_sn,olt_codigo,fsp,ont_id,run_state,config_state,match_state,presente,ultima_lectura_at')
   .eq('olt_codigo',OLT).eq('onu_sn',SN).eq('presente',true).limit(2);
  if(inv.error)throw inv.error;
  const h=(inv.data||[]).length===1?inv.data[0]:null;
  const minutes=h?.ultima_lectura_at?(Date.now()-Date.parse(h.ultima_lectura_at))/60000:NaN;
  const checks=[
   {codigo:'ESTADO_ERROR',ok:old.estado==='ERROR',detalle:'Estado anterior debe ser ERROR'},
   {codigo:'APROBADO',ok:!!old.aprobado_por_id&&!!old.aprobado_at,detalle:'Aprobación del supervisor existente'},
   {codigo:'IDENTIDAD',ok:old.onu_pon===PON&&h?.fsp===PON&&h?.ont_id===ONT&&h?.onu_sn===SN,
    detalle:'SN, PON y ONT-ID iguales a la primera prueba'},
   {codigo:'CACHE_RECIENTE',ok:Number.isFinite(minutes)&&minutes>=0&&minutes<=15,
    detalle:'Último inventario Huawei con antigüedad máxima de 15 min'},
   {codigo:'ESTADOS_HUAWEI',ok:normal(h?.run_state)==='ONLINE'&&normal(h?.config_state)==='NORMAL'&&normal(h?.match_state)==='MATCH',
    detalle:'Huawei: online, config normal y match'},
   {codigo:'SIN_SAVE',ok:old.resultado_huawei?.guardado_permanente!==true,
    detalle:'No declarar guardado permanente sin verificación independiente'}
  ];
  const apto=checks.every(x=>x.ok);
  if(action==='preflight')return reply({ok:true,solo_lectura:true,olt_codigo:OLT,onu_sn:SN,
   ont_id:ONT,service_port:SP,estado:old.estado,checks,apto_para_conciliar:apto,
   recordatorio:'La caché no confirma service-port ni VLAN nativa. Requiere evidencia CLI verificada por operador antes de conciliar. No guardar la OLT desde aquí.'});
  if(!apto)return reply({error:'No cumplen todas las condiciones de seguridad',checks},409);
  // Switch separado para que el despliegue tampoco modifique estados sin autorización de la ventana.
  if(Deno.env.get('HUAWEI_ONU_RECONCILIATION_ENABLED')!=='true')
   return reply({error:'Conciliación administrativa de escrituras deshabilitada en servidor'},403);
  if(body.confirmar!=='CONCILIAR 3006 SIN SAVE')return reply({error:'Falta confirmación literal del supervisor'},400);
  if(body.guardado_permanente!==false)return reply({error:'El guardado de la OLT aún no está confirmado'},400);
  const cli=String(body.evidencia_cli||'').trim();
  // Evidencia introducida por humano. El sistema no afirma que fue medida automáticamente.
  if(cli!=='VERIFICADO: SERVICE-PORT 3006, VLAN100, GEM1, RX9/TX8, UP.')
   return reply({error:'Se necesita la salida verificada de la reparación del service-port 3006'},400);
  const previous=old.resultado_huawei||{};
  const nuevo={
   ...previous,
   motivo:'Corrección verificada del service-port 3006; pendiente guardado supervisado',
   verified_online:true,config_match:true,native_vlan_verificada:true,
   serial_verificado:SN,ont_id:ONT,service_port_id:SP,
   service_port_up:true,guardado_permanente:false,
   reconciliacion:{
    estado_previo:'ERROR',resultado_previo:previous,origen:'EVIDENCIA_CLI_APORTADA_POR_SUPERVISOR',
    evidencia_service_port:cli,
    verificaciones_cache:checks,verificado_por_id:user.id,
    verificado_at:new Date().toISOString(),save_confirmado:false
   }
  };
  const changed=await db.from('onu_autorizaciones_manuales')
   .update({estado:'PENDIENTE_GUARDAR',resultado_huawei:nuevo,updated_at:new Date().toISOString()})
   .eq('id',old.id).eq('estado','ERROR').eq('updated_at',old.updated_at)
   .select('id,estado').maybeSingle();
  if(changed.error)throw changed.error;
  if(!changed.data)return reply({error:'El registro cambió antes de conciliar; actualizar'},409);
  if(old.orden_id){
   const audit=await db.from('orden_historial').insert({
    orden_id:old.orden_id,realizado_por_id:user.id,
    evento:'ONU_HUAWEI_RECONCILIACION_MANUAL',
    detalle:{olt_codigo:OLT,onu_sn:SN,pon:PON,ont_id:ONT,service_port:SP,
     estado_previo:'ERROR',estado_nuevo:'PENDIENTE_GUARDAR',guardado_permanente:false}
   });
   if(audit.error)console.warn('No se registró historial de OT:',audit.error.message);
  }
  return reply({ok:true,registro:changed.data,guardado_permanente:false,
   nota:'Solo se concilió el estado administrativo. La OLT no recibió ningún comando.'});
 }catch(e){return reply({error:String((e as Error).message||e)},400)}
});
