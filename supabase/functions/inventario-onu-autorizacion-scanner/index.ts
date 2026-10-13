import { createClient } from 'npm:@supabase/supabase-js@2.95.0';

// DISPROTEL: cola autorizada por supervisor, consumida únicamente por PC Scanner.
// Solo "pending" está habilitado; claim y result requieren desbloqueo
// deliberado de secretos del servidor, aparte del bloqueo local de Huawei V3.
const AUTH_TOKEN=String(Deno.env.get('DETECTOR_TOKEN')||'');
const WRITE_ENABLED=Deno.env.get('HUAWEI_ONU_WRITES_ENABLED')==='true';
// Bloqueo triple: servidor, OLT permitida y perfil por modelo habilitado.
const ALLOWED_OLTS=new Set(
 String(Deno.env.get('HUAWEI_ONU_ALLOWED_OLTS')||'').split(',')
 .map(x=>x.trim().toUpperCase()).filter(x=>/^[A-Z0-9_-]{2,32}$/.test(x))
);
function writeAllowed(olt:string){return WRITE_ENABLED&&ALLOWED_OLTS.has(code(olt));}

const headers={
  'Access-Control-Allow-Origin':'https://danielmm007-commits.github.io',
  'Access-Control-Allow-Headers':'authorization,content-type',
  'Access-Control-Allow-Methods':'POST,OPTIONS',
  'Content-Type':'application/json; charset=utf-8'
};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
const code=(x:any)=>String(x||'').trim().toUpperCase();
const model=(x:any)=>code(x).replace(/[^A-Z0-9_.-]/g,'');
const isSn=(x:any)=>/^[A-F0-9]{16}$/.test(code(x));
const isPon=(x:any)=>/^\d{1,2}\/\d{1,2}\/\d{1,2}$/.test(String(x||''));
function db(){
 const raw=Deno.env.get('SUPABASE_SECRET_KEYS');
 const key=raw?JSON.parse(raw).default:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!key)throw Error('Clave de servidor no disponible');
 return createClient(Deno.env.get('SUPABASE_URL')!,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
function validParams(p:any){
 if(!p||p.tag_transform!=='translate')return false;
 if(!['vlan_servicio','vlan_usuario'].every(k=>Number.isSafeInteger(p[k])&&p[k]>=1&&p[k]<=4094))return false;
 if(!['line_profile_id','service_profile_id','gemport','traffic_in_id','traffic_out_id']
   .every(k=>Number.isSafeInteger(p[k])&&p[k]>=0&&p[k]<=4095))return false;
 return true;
}
async function validate(s:any,row:any){
 if(!/^[A-Z0-9_-]{2,32}$/.test(code(row.olt_codigo)))return {ok:false,reason:'OLT inválida'};
 if(!isSn(row.onu_sn)||!isPon(row.onu_pon))return {ok:false,reason:'Serial o PON inválidos'};
 const cfg=await s.from('olt_configuraciones').select('id,codigo,activo').eq('codigo',row.olt_codigo).eq('activo',true).maybeSingle();
 if(cfg.error||!cfg.data)return {ok:false,reason:'OLT no configurada o desactivada'};
 const det=await s.from('olt_onu_autofind_cache').select('onu_sn,pon,modelo,presente,ultima_lectura_at').eq('olt_codigo',row.olt_codigo).eq('onu_sn',row.onu_sn).eq('presente',true).maybeSingle();
 if(det.error||!det.data||det.data.pon!==row.onu_pon)return {ok:false,reason:'ONU no aparece en autofind con OLT/PON correctos'};
 const age=Date.now()-Date.parse(det.data.ultima_lectura_at||'');
 if(!Number.isFinite(age)||age<0||age>15*60*1000)return {ok:false,reason:'Autofind antiguo: actualizar detección'};
 const actualModel=model(det.data.modelo),requestedModel=model(row.onu_modelo);
 if(!actualModel||!requestedModel||actualModel!==requestedModel)return {ok:false,reason:'Modelo actual de Huawei no coincide con la solicitud'};
 const already=await s.from('huawei_onus_cache').select('id').eq('olt_codigo',row.olt_codigo).eq('onu_sn',row.onu_sn).eq('presente',true).limit(1);
 if(already.error)throw already.error;
 if((already.data||[]).length)return {ok:false,reason:'ONU ya registrada en inventario Huawei; comprobar antes de autorizar'};
 const profile=await s.from('onu_perfiles_olt').select('id,olt_id,tipo_onu,modelo_clave,vlan_servicio,vlan_usuario,line_profile_id,service_profile_id,gemport,traffic_in_id,traffic_out_id,tag_transform,habilitado').eq('olt_id',cfg.data.id).eq('tipo_onu','BRIDGE').eq('modelo_clave',actualModel).maybeSingle();
 if(profile.error)throw profile.error;
 if(!validParams(profile.data))return {ok:false,reason:'Perfil BRIDGE incompleto o inexistente para esta OLT/modelo'};
 if(profile.data.habilitado!==true)return {ok:false,reason:'Perfil GPON no validado/habilitado para ejecución'};
 return {ok:true,profile:profile.data};
}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return reply({error:'Método no permitido'},405);
 if(!AUTH_TOKEN||req.headers.get('authorization')!==('Bearer '+AUTH_TOKEN))return reply({error:'Agente no autorizado'},401);
 try{
  const body=await req.json(),action=String(body.action||'');
  const olt_codigo=code(body.olt_codigo);
  if(!/^[A-Z0-9_-]{2,32}$/.test(olt_codigo))return reply({error:'OLT inválida'},400);
  const s=db();
  if(action==='scanner-pending'){
   // Consultar solicitudes aprobadas, sin efectuar escrituras.
   const q=await s.from('onu_autorizaciones_manuales').select('id,orden_id,olt_codigo,onu_sn,onu_pon,onu_modelo,nombre,nap,zona,estado,aprobado_at').eq('olt_codigo',olt_codigo).eq('estado','APROBADA_PENDIENTE_EJECUCION').order('aprobado_at',{ascending:true}).limit(20);
   if(q.error)throw q.error;
   const jobs=[];
   for(const job of q.data||[]){
     const check=await validate(s,job);
   const habilitada=writeAllowed(olt_codigo);
   const lista=check.ok&&habilitada;
     jobs.push({id:job.id,orden_id:job.orden_id,olt_codigo,onu_sn:job.onu_sn,onu_pon:job.onu_pon,onu_modelo:job.onu_modelo,
       nombre:job.nombre,nap:job.nap,zona:job.zona,aprobado_at:job.aprobado_at,
       listo:lista,motivo:!check.ok?check.reason:habilitada?null:'OLT o servidor no habilitados para escritura',
    perfil:check.ok?check.profile:null});
   }
   const habilitada=writeAllowed(olt_codigo);
   return reply({ok:true,solo_preparacion:true,
     escrituras_habilitadas:habilitada,
     bloqueo_servidor:habilitada?null:'Servidor u OLT sin autorización de escritura',
     jobs});
  }
  if(action==='scanner-claim'||action==='scanner-result'){

   const id=String(body.id||'');
   if(!/^[0-9a-f-]{36}$/i.test(id))return reply({error:'ID inválido'},400);
   const rr=await s.from('onu_autorizaciones_manuales').select('*').eq('id',id).eq('olt_codigo',olt_codigo).maybeSingle();
   if(rr.error||!rr.data)return reply({error:'Solicitud no encontrada'},404);
   // Los resultados ya iniciados se admiten aun después de desactivar escrituras.
   // Solo tomar un NUEVO trabajo requiere servidor y OLT habilitados.
   if(action==='scanner-claim'&&!writeAllowed(olt_codigo))
     return reply({error:'Escritura Huawei deshabilitada para esta OLT'},403);
   if(action==='scanner-claim'){
     if(rr.data.estado!=='APROBADA_PENDIENTE_EJECUCION'||!rr.data.aprobado_por_id||!rr.data.aprobado_at)return reply({error:'Solicitud sin aprobación vigente'},409);
     const check=await validate(s,rr.data);
     if(!check.ok)return reply({error:check.reason},409);
     const upd=await s.from('onu_autorizaciones_manuales').update({estado:'EJECUTANDO',updated_at:new Date().toISOString()}).eq('id',id).eq('estado','APROBADA_PENDIENTE_EJECUCION').select('id,estado').maybeSingle();
     if(upd.error)throw upd.error;
     if(!upd.data)return reply({error:'Ya fue tomada por otro scanner'},409);
     return reply({ok:true,job:{id,orden_id:rr.data.orden_id,olt_codigo,onu_sn:rr.data.onu_sn,onu_pon:rr.data.onu_pon,
       onu_modelo:rr.data.onu_modelo,nombre:rr.data.nombre,nap:rr.data.nap,zona:rr.data.zona,perfil:check.profile}});
   }
   if(rr.data.estado!=='EJECUTANDO')return reply({error:'Solicitud no está en ejecución'},409);
   const result=body.resultado;
   if(!result||typeof result!=='object'||Array.isArray(result))return reply({error:'Resultado Huawei obligatorio'},400);
   const success=body.ok===true;
   // Registrar estado PENDIENTE_GUARDAR cuando la configuración está online
   // pero todavía no se confirmó el guardado persistente Huawei.
   if(success&&(!isSn(result.serial_verificado)||code(result.serial_verificado)!==rr.data.onu_sn
     ||result.verified_online!==true||result.native_vlan_verificada!==true||result.config_match!==true
     ||result.service_port_up!==true||!Number.isSafeInteger(result.service_port_id)))
     return reply({error:'Falta verificar serial, VLAN nativa ETH1, ONLINE, NORMAL/MATCH o service-port UP/ID'},409);
   // No se acepta que el agente declare guardado persistente de toda la OLT
   // sin un proceso de revisión/guardado supervisado independiente.
   if(success&&result.guardado_permanente===true)
     return reply({error:'El guardado permanente requiere validación supervisada independiente'},409);
   const finalState=success?'PENDIENTE_GUARDAR':'ERROR';
   const upd=await s.from('onu_autorizaciones_manuales').update({estado:finalState,ejecutado_at:new Date().toISOString(),resultado_huawei:{
     verified_online:result.verified_online===true,native_vlan_verificada:result.native_vlan_verificada===true,
     config_match:result.config_match===true,service_port_up:result.service_port_up===true,
     service_port_id:Number.isSafeInteger(result.service_port_id)?result.service_port_id:null,
     guardado_permanente:false,serial_verificado:result.serial_verificado||null,
     ont_id:Number.isSafeInteger(result.ont_id)?result.ont_id:null,
     motivo:String(result.motivo||'').slice(0,300)
   },updated_at:new Date().toISOString()}).eq('id',id).eq('estado','EJECUTANDO').select('id,estado').maybeSingle();
   if(upd.error)throw upd.error;if(!upd.data)return reply({error:'Resultado ya registrado'},409);
   // Intento administrativo opcional tras una provisión Huawei verificada.
   // Si SmartOLT aún no ha importado la ONU, el error NO cambia el resultado
   // Huawei; la pantalla permite reintentar el metadata-sync con seguridad.
   if(success&&Deno.env.get('SMARTOLT_METADATA_AUTO_ENABLED')==='true'){
     const syncUrl=(Deno.env.get('SUPABASE_URL')||'')+
       '/functions/v1/inventario-onu-smartolt-metadata';
     const task=fetch(syncUrl,{method:'POST',headers:{
       'Authorization':'Bearer '+AUTH_TOKEN,'Content-Type':'application/json'
     },body:JSON.stringify({action:'sync',olt_codigo,onu_sn:rr.data.onu_sn})})
     .then(async res=>{
       if(!res.ok)console.warn('SmartOLT metadata pendiente:',res.status,(await res.text()).slice(0,180));
     }).catch(e=>console.warn('SmartOLT metadata pendiente:',String(e).slice(0,180)));
     const runtime=(globalThis as any).EdgeRuntime;
     if(runtime?.waitUntil)runtime.waitUntil(task);
     else await task;
   }
   return reply({ok:true,...upd.data});
  }
  return reply({error:'Acción inválida'},400);
 }catch(e){return reply({error:String((e as Error).message||e)},400)}
});