import { createClient } from 'npm:@supabase/supabase-js@2.95.0';

const origin='https://danielmm007-commits.github.io';
const DETECTOR_TOKEN=Deno.env.get('DETECTOR_TOKEN')||'';
const headers={
  'Access-Control-Allow-Origin':origin,
  'Access-Control-Allow-Headers':'content-type,authorization,x-session',
  'Access-Control-Allow-Methods':'POST,OPTIONS',
  'Content-Type':'application/json; charset=utf-8'
};
const reply=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers});
function db(){const raw=Deno.env.get('SUPABASE_SECRET_KEYS');const key=raw?JSON.parse(raw).default:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!key)throw new Error('Clave servidor no disponible');return createClient(Deno.env.get('SUPABASE_URL')!,key,{auth:{persistSession:false,autoRefreshToken:false}})}
async function sha256(text:string){const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function detectorOk(req:Request){return Boolean(DETECTOR_TOKEN)&&(req.headers.get('authorization')||'')===`Bearer ${DETECTOR_TOKEN}`}
async function sessionUser(s:any,req:Request,body:any){
 const token=String(req.headers.get('x-session')||body.session_token||'').trim();if(!token)throw new Error('Sesión general requerida');
 const q=await s.from('app_auth_sessions').select('id,responsable_id').eq('token_hash',await sha256(token)).is('revoked_at',null).gt('expires_at',new Date().toISOString()).maybeSingle();
 if(q.error||!q.data)throw new Error('Sesión vencida o inválida');
 const p=await s.from('responsables').select('id,nombre,rol,unidad_grupo,activo').eq('id',q.data.responsable_id).eq('activo',true).maybeSingle();if(p.error||!p.data)throw new Error('Usuario no disponible');return p.data;
}
async function orderAllowed(s:any,ordenId:string,me:any){
 const q=await s.from('ordenes_trabajo').select('id,id_orden,grupo_asignado,aceptado_por_id,estado,router_cobertura_id').eq('id',ordenId).maybeSingle();if(q.error)throw q.error;if(!q.data)throw new Error('Orden no encontrada');
 if(String(me.rol||'').toUpperCase().includes('TÉCNICO')&&q.data.aceptado_por_id!==me.id&&String(q.data.grupo_asignado||'')!==String(me.unidad_grupo||''))throw new Error('OT fuera de tu asignación');return q.data;
}
function normItem(x:any){return {
 olt_codigo:String(x.olt_codigo||'').trim(),olt_nombre:String(x.olt_nombre||'').trim()||null,
 onu_sn:String(x.sn||x.onu_sn||'').trim().toUpperCase(),onu_sn_display:String(x.sn_id||x.onu_sn_display||'').trim()||null,
 pon:String(x.fsp||x.pon||'').trim()||null,vendor:String(x.vendor||'').trim()||null,modelo:String(x.model||x.modelo||'').trim()||null,
 version:String(x.version||'').trim()||null,software:String(x.software||'').trim()||null,detectada_at:x.detected_at||x.detectada_at||null
}}
async function oltOrden(s:any,o:any){
 if(!o?.router_cobertura_id)return null;
 const r=await s.from('routers_cobertura').select('nombre').eq('id',o.router_cobertura_id).maybeSingle();if(r.error)throw r.error;
 const n=String(r.data?.nombre||'').toUpperCase();
 if(n.includes('SALCEDO'))return 'SALCEDO';
 return null;
}
async function solicitudesOlt(s:any,oltCodigo:string,soloPendientesLectura=false){
 const rc=await s.from('routers_cobertura').select('id,nombre').eq('activo',true).ilike('nombre',`%${oltCodigo}%`);if(rc.error)throw rc.error;
 const routerIds=(rc.data||[]).map((x:any)=>x.id);if(!routerIds.length)return[];
 const oo=await s.from('ordenes_trabajo').select('id,router_cobertura_id,estado').in('router_cobertura_id',routerIds).not('estado','in','("COMPLETADA","CANCELADA")');if(oo.error)throw oo.error;
 const orderIds=(oo.data||[]).map((x:any)=>x.id);if(!orderIds.length)return[];
 const q=await s.from('orden_onu_solicitudes').select('id,orden_id,estado,solicitado_at,olt_ultima_lectura_at,onu_sn,onu_estado_olt').in('orden_id',orderIds).eq('estado','SOLICITADO').order('solicitado_at',{ascending:true});if(q.error)throw q.error;
 const rows=q.data||[];if(!soloPendientesLectura)return rows;
 return rows.filter((x:any)=>!x.olt_ultima_lectura_at||new Date(x.olt_ultima_lectura_at).getTime()<new Date(x.solicitado_at).getTime());
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});if(req.method!=='POST')return reply({error:'Método no permitido'},405);
 try{
  const body=await req.json().catch(()=>({})),action=String(body.action||''),s=db();
  if(action==='scanner-live-pending'){
   if(!detectorOk(req))return reply({error:'Scanner no autorizado'},401);
   const oltCodigo=String(body.olt_codigo||'').trim().toUpperCase();if(!oltCodigo)return reply({error:'OLT obligatoria'},400);
   const q=await s.from('consulta_red_solicitudes').select('id,servicio_id,onu_sn,olt_codigo,solicitado_at,expira_at').eq('olt_codigo',oltCodigo).eq('olt_estado','PENDIENTE').gt('expira_at',new Date().toISOString()).order('solicitado_at',{ascending:true}).limit(20);if(q.error)throw q.error;
   return reply({ok:true,solicitudes:q.data||[]});
  }
  if(action==='scanner-live-pending-batch'){
   if(!detectorOk(req))return reply({error:'Scanner no autorizado'},401);
   const olts=Array.isArray(body.olt_codigos)?[...new Set(body.olt_codigos
     .map((x:any)=>String(x||'').trim().toUpperCase()).filter((x:string)=>/^[A-Z0-9_-]{2,40}$/.test(x)))].slice(0,10):[];
   if(!olts.length)return reply({error:'Lista de OLT obligatoria'},400);
   const q=await s.from('consulta_red_solicitudes')
     .select('id,servicio_id,orden_id,onu_sn,olt_codigo,solicitado_at,expira_at')
     .in('olt_codigo',olts).eq('olt_estado','PENDIENTE')
     .gt('expira_at',new Date().toISOString())
     .order('solicitado_at',{ascending:true}).limit(30);
   if(q.error)throw q.error;
   return reply({ok:true,solicitudes:q.data||[]});
  }
  if(action==='scanner-live-result'){
   if(!detectorOk(req))return reply({error:'Scanner no autorizado'},401);
   const id=String(body.id||'');if(!id)return reply({error:'Solicitud obligatoria'},400);
   const now=new Date().toISOString(),resultado=body.resultado||{error:String(body.error||'Error de lectura OLT')};
   const req=await s.from('consulta_red_solicitudes')
     .select('id,servicio_id,orden_id,olt_codigo,onu_sn,mikrotik_estado,expira_at')
     .eq('id',id).eq('olt_estado','PENDIENTE').maybeSingle();
   if(req.error)throw req.error;
   const q=req.data;if(!q)return reply({ok:true,ignorada:true});
   const demanda=q.mikrotik_estado==='NO_APLICA'&&!!q.orden_id;
   const normal=(v:any)=>{
     const sn=String(v||'').toUpperCase().replace(/[\s:.-]/g,'');
     if(/^[0-9A-F]{16}$/.test(sn))return sn;
     if(/^[A-Z0-9]{4}[A-F0-9]{8}$/.test(sn))
       return [...sn.slice(0,4)].map(c=>c.charCodeAt(0).toString(16).padStart(2,'0')).join('').toUpperCase()+sn.slice(4);
     return sn;
   };
   const serialDevuelto=resultado.onu_sn||resultado.sn||null;
   const serialValido=!serialDevuelto||normal(serialDevuelto)===normal(q.onu_sn);
   const optico=Number.isFinite(Number(resultado.rx_optical_dbm))&&resultado.rx_optical_dbm!=null||
     Number.isFinite(Number(resultado.olt_rx_ont_dbm))&&resultado.olt_rx_ont_dbm!=null;
   const captura=Date.parse(String(resultado.optica_leida_at||'')),requestMs=Date.parse(String(q.expira_at||''))-600000;
   const fresh=Number.isFinite(captura)&&captura<=Date.now()+300000&&captura>=requestMs-300000;
   let ok=body.ok!==false;
   if(demanda){
     ok=ok&&resultado.found===true&&serialValido&&optico&&fresh&&new Date(q.expira_at).getTime()>Date.now();
   }
   const patch:any={
     olt_estado:ok?'OK':'ERROR',olt_resultado:ok?resultado:{
       error:demanda?'Lectura no válida: ONU, serial, señal o fecha no confirmados':
          String(body.error||resultado.error||'Error de consulta OLT')
     },olt_respondido_at:now
   };
   const u=await s.from('consulta_red_solicitudes').update(patch)
     .eq('id',id).eq('olt_estado','PENDIENTE');if(u.error)throw u.error;
   if(ok&&q.olt_codigo&&q.onu_sn&&resultado){
     const previous=await s.from('huawei_onus_cache')
       .select('optica_leida_at').eq('olt_codigo',q.olt_codigo).eq('onu_sn',q.onu_sn).limit(1).maybeSingle();
     if(previous.error)throw previous.error;
     const oldDate=Date.parse(String(previous.data?.optica_leida_at||'')),newDate=Date.parse(String(resultado.optica_leida_at||''));
     // Una respuesta antigua NO puede degradar la lectura vigente.
     const updateOptica=!Number.isFinite(oldDate)||Number.isFinite(newDate)&&newDate>=oldDate;
     const hp:any={updated_at:now};
     if(resultado.run_state!=null)hp.run_state=resultado.run_state;
     if(resultado.pon!=null)hp.fsp=resultado.pon;
     if(resultado.ont_id!=null)hp.ont_id=Number(resultado.ont_id);
     if(updateOptica){
       for(const k of ['rx_optical_dbm','tx_optical_dbm','olt_rx_ont_dbm','temperatura_c','voltaje_v','corriente_ma','distancia_m'])
         if(resultado[k]!=null)hp[k]=resultado[k];
       if(resultado.optica_leida_at)hp.optica_leida_at=resultado.optica_leida_at;
     }
     if(!demanda){
       for(const k of ['descripcion','ip_descripcion','nombre_cliente_huawei','zona_huawei','nap_huawei','auth_huawei'])
         if(resultado[k]!=null&&String(resultado[k]).trim()!=='')hp[k]=resultado[k];
     }
     const hc=await s.from('huawei_onus_cache').update(hp)
       .eq('olt_codigo',q.olt_codigo).eq('onu_sn',q.onu_sn);
     if(hc.error)throw hc.error;
     if(demanda&&updateOptica&&fresh){
       // Registro histórico para comparar sin borrar lecturas anteriores.
       const hist=await s.from('huawei_onu_senal_historial').upsert({
         olt_codigo:q.olt_codigo,onu_sn:q.onu_sn,capturada_at:resultado.optica_leida_at,
         rx_optical_dbm:resultado.rx_optical_dbm??null,
         tx_optical_dbm:resultado.tx_optical_dbm??null,
         olt_rx_ont_dbm:resultado.olt_rx_ont_dbm??null,
         run_state:resultado.run_state??null
       },{onConflict:'olt_codigo,onu_sn,capturada_at'});
       if(hist.error)console.warn('Historial óptico no guardado:',hist.error.message);
     }
   }
   // Compartir UNA misma respuesta de Huawei con solicitudes simultáneas
   // de la misma ONU: sin otra lectura física, ni otra llamada Edge del agente.
   if(q.olt_codigo&&q.onu_sn){
     const share=await s.from('consulta_red_solicitudes')
       .update(patch).eq('olt_codigo',q.olt_codigo).eq('onu_sn',q.onu_sn)
       .eq('olt_estado','PENDIENTE').neq('id',id).gt('expira_at',now);
     if(share.error)console.warn('No se pudo compartir lectura:',share.error.message);
   }
   return reply({ok:true,cache_actualizada:ok,lectura_valida:ok});
  }
  if(action==='autofind-read'){
   await sessionUser(s,req,body);
   const oltCodigo=String(body.olt_codigo||'').trim();if(!oltCodigo)return reply({error:'OLT obligatoria'},400);
   const q=await s.from('olt_onu_autofind_cache').select('*').eq('olt_codigo',oltCodigo).order('ultima_lectura_at',{ascending:false}).limit(100);if(q.error)throw q.error;
   const rows=q.data||[],lastRead=rows[0]?.ultima_lectura_at||null,lastMs=lastRead?new Date(lastRead).getTime():NaN,ageSeconds=Number.isFinite(lastMs)?Math.max(0,Math.floor((Date.now()-lastMs)/1000)):null;
   return reply({ok:true,read_only:true,olt_codigo:oltCodigo,olt_nombre:rows[0]?.olt_nombre||null,last_read_at:lastRead,age_seconds:ageSeconds,stale:ageSeconds==null||ageSeconds>60,items:rows.filter((x:any)=>x.presente===true).map((x:any)=>({onu_sn:x.onu_sn,onu_sn_display:x.onu_sn_display,pon:x.pon,vendor:x.vendor,modelo:x.modelo,version:x.version,software:x.software,detectada_at:x.detectada_at,ultima_lectura_at:x.ultima_lectura_at}))});
  }
  if(action==='scanner-snapshot'){
   if(!detectorOk(req))return reply({error:'Scanner no autorizado'},401);
   const oltCodigo=String(body.olt_codigo||'').trim().toUpperCase();if(!oltCodigo)return reply({error:'OLT obligatoria'},400);
   const now=new Date().toISOString(),items=(Array.isArray(body.onts)?body.onts:[]).map((x:any)=>normItem({...x,olt_codigo:oltCodigo,olt_nombre:body.olt_nombre})).filter((x:any)=>x.onu_sn);
   const sns=items.map((x:any)=>x.onu_sn);
   const old=await s.from('olt_onu_autofind_cache').update({presente:false,ultima_lectura_at:now}).eq('olt_codigo',oltCodigo);if(old.error)throw old.error;
   if(items.length){const rows=items.map((x:any)=>({...x,ultima_lectura_at:now,presente:true}));const u=await s.from('olt_onu_autofind_cache').upsert(rows,{onConflict:'olt_codigo,onu_sn'});if(u.error)throw u.error}
   const solicitudes=await solicitudesOlt(s,oltCodigo,false),ids=solicitudes.map((x:any)=>x.id);
   if(ids.length){const u=await s.from('orden_onu_solicitudes').update({olt_codigo:oltCodigo,olt_nombre:String(body.olt_nombre||'').trim()||null,olt_ultima_lectura_at:now}).in('id',ids);if(u.error)throw u.error}
   return reply({ok:true,olt_codigo:oltCodigo,pending_count:items.length,tracked:ids.length,sns,read_at:now});
  }
  if(action==='scanner-pending'){
   if(!detectorOk(req))return reply({error:'Scanner no autorizado'},401);
   const oltCodigo=String(body.olt_codigo||'').trim().toUpperCase();if(!oltCodigo)return reply({error:'OLT obligatoria'},400);
   const solicitudes=await solicitudesOlt(s,oltCodigo,true);
   return reply({ok:true,olt_codigo:oltCodigo,pending_count:solicitudes.length,solicitudes});
  }
  if(action==='scanner-authorized'){
   if(!detectorOk(req))return reply({error:'Scanner no autorizado'},401);
   const id=String(body.solicitud_id||''),sn=String(body.onu_sn||'').trim().toUpperCase();if(!id||!sn)return reply({error:'Solicitud y SN obligatorios'},400);
   const patch:any={onu_estado_olt:String(body.run_state||'AUTHORIZED').toUpperCase(),onu_ont_id:body.ont_id==null?null:Number(body.ont_id),onu_pon:body.pon||null,olt_ultima_lectura_at:new Date().toISOString(),updated_at:new Date().toISOString()};
   if(body.rx_onu_dbm!=null)patch.rx_onu_dbm=Number(body.rx_onu_dbm);if(body.rx_olt_dbm!=null)patch.rx_olt_dbm=Number(body.rx_olt_dbm);if(body.distancia_m!=null)patch.distancia_m=Number(body.distancia_m);if(body.rx_onu_dbm!=null||body.rx_olt_dbm!=null)patch.optica_ultima_lectura_at=new Date().toISOString();
   const u=await s.from('orden_onu_solicitudes').update(patch).eq('id',id).eq('onu_sn',sn);if(u.error)throw u.error;return reply({ok:true});
  }
  const me=await sessionUser(s,req,body),ordenId=String(body.orden_id||'');if(!ordenId)return reply({error:'Orden obligatoria'},400);const ord=await orderAllowed(s,ordenId,me);
  if(action==='pending-list'){
   const oltCodigo=String(body.olt_codigo||'').trim().toUpperCase()||await oltOrden(s,ord);if(!oltCodigo)return reply({ok:true,supported:false,requested:false,waiting:false,items:[]});
   const rq=await s.from('orden_onu_solicitudes').select('id,estado,solicitado_at,olt_ultima_lectura_at,onu_sn').eq('orden_id',ordenId).maybeSingle();if(rq.error)throw rq.error;
   if(!rq.data)return reply({ok:true,requested:false,waiting:false,items:[]});
   const q=await s.from('olt_onu_autofind_cache').select('*').eq('olt_codigo',oltCodigo).eq('presente',true).order('ultima_lectura_at',{ascending:false}).limit(30);if(q.error)throw q.error;
   const rows=q.data||[],lastRead=rows[0]?.ultima_lectura_at||rq.data.olt_ultima_lectura_at||null;
   const ready=Boolean(lastRead)&&new Date(lastRead).getTime()>=new Date(rq.data.solicitado_at).getTime();
   return reply({ok:true,requested:true,waiting:!ready,request_at:rq.data.solicitado_at,last_read_at:lastRead,selected_sn:rq.data.onu_sn||null,items:ready?rows:[]});
  }
  if(action==='identify'||action==='bind'){
   const sn=String(body.onu_sn||'').trim().toUpperCase(),oltCodigo=String(body.olt_codigo||'').trim().toUpperCase()||await oltOrden(s,ord);if(!sn||!oltCodigo)return reply({error:'ONU obligatoria o detector OLT no disponible para esta OT'},400);
   const reqRow=await s.from('orden_onu_solicitudes').select('id,estado,solicitado_at').eq('orden_id',ordenId).maybeSingle();if(reqRow.error)throw reqRow.error;if(!reqRow.data)return reply({error:'Esta OT todavía no tiene solicitud ONU. Usa primero el flujo normal de activación/soporte.'},409);
   const c=await s.from('olt_onu_autofind_cache').select('*').eq('olt_codigo',oltCodigo).eq('onu_sn',sn).eq('presente',true).maybeSingle();if(c.error)throw c.error;if(!c.data)return reply({error:'La ONU ya no aparece en la lectura solicitada'},409);
   const readAt=c.data.ultima_lectura_at?new Date(c.data.ultima_lectura_at).getTime():NaN,requestAt=new Date(reqRow.data.solicitado_at).getTime();if(!Number.isFinite(readAt)||readAt<requestAt)return reply({error:'Todavía no llega la lectura Huawei solicitada para esta OT.'},409);
   const now=new Date().toISOString(),patch={olt_codigo:oltCodigo,olt_nombre:c.data.olt_nombre,onu_sn:sn,onu_sn_display:c.data.onu_sn_display,onu_pon:c.data.pon,onu_vendor:c.data.vendor,onu_modelo:c.data.modelo,onu_version:c.data.version,onu_software:c.data.software,onu_detectada_at:c.data.detectada_at,onu_estado_olt:'PENDING_AUTOFIND',onu_vinculada_at:now,onu_vinculada_por_id:me.id,olt_ultima_lectura_at:c.data.ultima_lectura_at,updated_at:now};
   const u=await s.from('orden_onu_solicitudes').update(patch).eq('orden_id',ordenId).select('*').single();if(u.error)throw u.error;return reply({ok:true,informativo:true,estado_solicitud:u.data.estado,onu:u.data});
  }
  if(action==='status'){
   const q=await s.from('orden_onu_solicitudes').select('*').eq('orden_id',ordenId).maybeSingle();if(q.error)throw q.error;return reply({ok:true,onu:q.data||null});
  }
  return reply({error:'Acción no válida'},400);
 }catch(e){console.error(e);const m=String((e as any)?.message||e);return reply({error:m},/Sesión|Usuario/i.test(m)?401:/fuera/i.test(m)?403:500)}
});