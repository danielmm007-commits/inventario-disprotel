import {createClient} from 'npm:@supabase/supabase-js@2.95.0';

// Actualiza SOLO metadatos: name (si está vacío) y address_or_comment (IP).
// No invoca authorize_onu, resync_config, save_config ni modifica servicios GPON.
const CORS={
 'Access-Control-Allow-Origin':'https://danielmm007-commits.github.io',
 'Access-Control-Allow-Headers':'authorization,content-type,x-session',
 'Access-Control-Allow-Methods':'POST,OPTIONS',
 'Content-Type':'application/json; charset=utf-8'
};
const reply=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:CORS});
const upper=(v:any)=>String(v??'').trim().toUpperCase();
const clean=(v:any)=>upper(v).replace(/[^A-Z0-9]/g,'');
const isSn=(v:string)=>/^[A-F0-9]{16}$/.test(v);
function canonicalSn(v:any):string {
 const s=clean(v);
 if(isSn(s))return s;
 if(/^[A-Z0-9]{4}[A-F0-9]{8}$/.test(s)){
  const head=Array.from(s.slice(0,4)).map(c=>c.charCodeAt(0).toString(16).padStart(2,'0')).join('').toUpperCase();
  return head+s.slice(4);
 }
 return '';
}
function humanSn(hex:string):string {
 if(!isSn(hex))throw Error('Serial Huawei inválido');
 const chars=[0,2,4,6].map(i=>String.fromCharCode(parseInt(hex.slice(i,i+2),16)));
 return chars.every(c=>/^[A-Z0-9]$/.test(c))?chars.join('')+hex.slice(8):hex;
}
function ipCorrecta(v:any):boolean {
 const t=String(v??'').trim(),p=t.split('.');
 return p.length===4&&p.every(a=>/^(0|[1-9][0-9]{0,2})$/.test(a)&&Number(a)<=255);
}
function database(){
 const raw=Deno.env.get('SUPABASE_SECRET_KEYS');
 const key=raw?JSON.parse(raw).default:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!key)throw Error('Servidor no configurado');
 return createClient(Deno.env.get('SUPABASE_URL')!,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
async function sha(s:string){
 const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));
 return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function sessionSupervisor(db:any,token:string){
 if(!token)return false;
 const auth=await db.from('app_auth_sessions').select('responsable_id')
  .eq('token_hash',await sha(token)).is('revoked_at',null)
  .gt('expires_at',new Date().toISOString()).maybeSingle();
 if(auth.error||!auth.data)return false;
 const me=await db.from('responsables').select('rol,es_admin_principal,activo')
  .eq('id',auth.data.responsable_id).eq('activo',true).maybeSingle();
 if(me.error||!me.data)return false;
 const rol=upper(me.data.rol).normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 return me.data.es_admin_principal===true||rol.includes('ADMINISTRADOR')||rol.includes('SUPERVISOR TECNICO');
}
function settings(olt:string){
 const subdomain=String(Deno.env.get('SMARTOLT_SUBDOMAIN')||'').trim().toLowerCase();
 const key=String(Deno.env.get('SMARTOLT_API_TOKEN')||'');
 if(!/^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/.test(subdomain)||!key)
  throw Error('SmartOLT no está configurado en secretos del servidor');
 let oltIds:any;
 try{oltIds=JSON.parse(Deno.env.get('SMARTOLT_OLT_IDS_JSON')||'{}');}catch{throw Error('Mapeo de OLT SmartOLT inválido');}
 const id=Number(oltIds?.[olt]);
 if(!Number.isSafeInteger(id)||id<=0)throw Error('No existe ID SmartOLT validado para OLT '+olt);
 return {url:'https://'+subdomain+'.smartolt.com',key,id};
}
async function smartolt(cfg:{url:string,key:string,id:number},path:string,form?:URLSearchParams){
 const response=await fetch(cfg.url+path,{
  method:form?'POST':'GET',
  headers:{'X-Token':cfg.key,...(form?{'Content-Type':'application/x-www-form-urlencoded'}:{})},
  body:form?.toString(),
  signal:AbortSignal.timeout(18000)
 });
 const body=await response.json().catch(()=>({status:false,error:'Respuesta no JSON'}));
 if(!response.ok||body.status!==true)
  throw Error('SmartOLT rechazó la consulta: '+String(body.error||body.error_code||response.status).slice(0,170));
 return body;
}
function field(row:any,keys:string[]):string {
 for(const k of keys)if(row?.[k]!==undefined&&row?.[k]!==null)return String(row[k]).trim();
 return '';
}
async function locate(cfg:{url:string,key:string,id:number},sn:string){
 // Filtro paginado; no exportación completa ni sondeo continuo.
 const q=new URLSearchParams({page:'1',page_size:'100',olt_id:String(cfg.id),sn:humanSn(sn)});
 const info=await smartolt(cfg,'/api/onu/get_all_onus_details?'+q.toString());
 const rows=Array.isArray(info.onus)?info.onus:[];
 const matching=rows.filter((r:any)=>{
  const serial=canonicalSn(field(r,['sn','onu_sn','serial_number','serial']));
  const olt=field(r,['olt_id','olt_unique_id']);
  return serial===sn && (!olt||Number(olt)===cfg.id);
 });
 if(matching.length!==1)throw Error('SmartOLT no encontró exactamente una ONU de este serial/OLT. No se modifica nada.');
 const row=matching[0];
 const external=field(row,['onu_external_id','external_id','onu_unique_external_id','unique_external_id']);
 if(!/^[A-Z0-9_-]{1,64}$/i.test(external))
  throw Error('SmartOLT no devolvió un ID externo verificable. No se modifica nada.');
 return {row,external};
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:CORS});
 if(req.method!=='POST')return reply({error:'Método no permitido'},405);
 try{
  const body=await req.json(),action=String(body.action||'');
  if(!['preview','sync'].includes(action))return reply({error:'Acción desconocida'},400);
  const olt=upper(body.olt_codigo),sn=canonicalSn(body.onu_sn);
  if(!/^[A-Z0-9_-]{2,32}$/.test(olt)||!isSn(sn))
   return reply({error:'OLT o serial incorrectos'},400);
  const db=database();
  const machineToken=Deno.env.get('DETECTOR_TOKEN')||'';
  const machine=!!machineToken && req.headers.get('authorization')==='Bearer '+machineToken;
  const human=await sessionSupervisor(db,String(req.headers.get('x-session')||body.session_token||''));
  if(!human&&!machine)return reply({error:'No autorizado'},403);
  if(machine&&action!=='sync')return reply({error:'El agente solo puede sincronizar'},403);
  if(machine&&Deno.env.get('SMARTOLT_METADATA_AUTO_ENABLED')!=='true')
   return reply({error:'Sincronización automática inactiva'},403);
  const reg=await db.from('onu_autorizaciones_manuales')
   .select('id,olt_codigo,onu_sn,onu_pon,nombre,ip_administrativa,estado,aprobado_por_id')
   .eq('olt_codigo',olt).eq('onu_sn',sn).maybeSingle();
  if(reg.error)throw reg.error;
  const r=reg.data;
  if(!r||!r.aprobado_por_id)return reply({error:'No existe aprobación de esta ONU en DISPROTEL'},409);
  const name=String(r.nombre||'').trim(),ip=String(r.ip_administrativa||'').trim();
  if(name.length<2||!ipCorrecta(ip))return reply({error:'Cliente o IP administrativa incompletos en DISPROTEL'},409);
  const cache=await db.from('huawei_onus_cache')
   .select('fsp,ont_id,presente').eq('olt_codigo',olt).eq('onu_sn',sn).eq('presente',true).limit(2);
  if(cache.error)throw cache.error;
  if((cache.data||[]).length!==1||cache.data[0].fsp!==r.onu_pon)
   return reply({error:'Falta confirmar identidad ONU/PON en el inventario Huawei. No se modifica SmartOLT'},409);
  const cfg=settings(olt);
  const {row,external}=await locate(cfg,sn);
  const nameKey=['name','onu_name'].find(k=>row[k]!==undefined);
  const currentName=nameKey?String(row[nameKey]??'').trim():'';
  const commentKey=['address_or_comment','address','onu_address','comment'].find(k=>row[k]!==undefined);
  // Si no conocemos el valor actual, no forzamos una escritura.
  if(!commentKey)return reply({error:'SmartOLT no entregó el comentario actual; revisar formato API antes de escribir'},409);
  const currentComment=String(row[commentKey]??'').trim();
  const changes:{name?:string,address_or_comment?:string}={};
  // Si SmartOLT no informó el campo de nombre, jamás adivinar su valor.
  if(nameKey&&!currentName)changes.name=name;
  if(currentComment!==ip){
   if(currentComment&&!human) return reply({error:'Comentario SmartOLT diferente; revisión manual obligatoria'},409);
   if(currentComment&&action==='sync'&&body.sobrescribir_comentario!==true)
    return reply({error:'SmartOLT ya tiene otro comentario. Confirmar antes de reemplazar.',actual:currentComment,propuesto:ip},409);
   changes.address_or_comment=ip;
  }
  const preview={ok:true,olt_codigo:olt,onu_sn:sn,external_id:external,
   nombre_disprotel:name,ip_administrativa:ip,nombre_smartolt:currentName,
   comentario_smartolt:currentComment,actualizacion:changes,
   solo_metadatos:true,requiere_guardado_olt:false};
  if(action==='preview'||!Object.keys(changes).length)return reply({...preview,sin_cambios:!Object.keys(changes).length});
  if(Deno.env.get('SMARTOLT_METADATA_WRITES_ENABLED')!=='true')
   return reply({error:'Escrituras administrativas SmartOLT deshabilitadas en servidor',preview},409);
  if(!machine&&body.confirmar_serial!==sn)
   return reply({error:'Confirmar serial completo antes de sincronizar'},400);
  const form=new URLSearchParams();
  if(changes.name)form.set('name',changes.name);
  if(changes.address_or_comment)form.set('address_or_comment',changes.address_or_comment);
  await smartolt(cfg,'/api/onu/update_location_details/'+encodeURIComponent(external),form);
  return reply({...preview,sincronizado:true,mensaje:'Datos administrativos enviados a SmartOLT. No se modificó el servicio Huawei.'});
 }catch(err){return reply({error:String((err as Error).message||err).slice(0,300)},400);}
});
