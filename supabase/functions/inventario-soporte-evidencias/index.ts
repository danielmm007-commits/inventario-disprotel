import { createClient } from 'npm:@supabase/supabase-js@2.95.0';
const origin='https://danielmm007-commits.github.io';
const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'content-type,x-session','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json; charset=utf-8'};
function reply(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers})}
async function sha256(text:string){const b=new TextEncoder().encode(text);const h=await crypto.subtle.digest('SHA-256',b);return Array.from(new Uint8Array(h)).map(x=>x.toString(16).padStart(2,'0')).join('')}
function db(){const url=Deno.env.get('SUPABASE_URL')!;const raw=Deno.env.get('SUPABASE_SECRET_KEYS');const key=raw?JSON.parse(raw).default:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!key)throw new Error('Clave servidor no disponible');return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}
function decodeBase64(input:string){const clean=input.includes(',')?input.split(',').pop()!:input;const bin=atob(clean);const out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out}
function extMime(m:string){return m==='image/png'?'png':m==='image/webp'?'webp':'jpg'}
async function auth(s:any,token:string){const t=String(token||'').trim();if(!t)throw new Error('Sesión requerida');const {data:ses}=await s.from('app_auth_sessions').select('responsable_id').eq('token_hash',await sha256(t)).is('revoked_at',null).gt('expires_at',new Date().toISOString()).maybeSingle();if(!ses)throw new Error('Sesión inválida');const {data:p}=await s.from('responsables').select('id,nombre,rol,unidad_grupo,activo').eq('id',ses.responsable_id).eq('activo',true).maybeSingle();if(!p)throw new Error('Usuario no disponible');return p}
Deno.serve(async req=>{if(req.method==='OPTIONS')return new Response('ok',{headers});if(req.method!=='POST')return reply({error:'Método no permitido'},405);try{const body=await req.json().catch(()=>({}));const s=db();const me=await auth(s,req.headers.get('x-session')||String(body.session_token||''));if(me.rol!=='TÉCNICO')return reply({error:'Solo técnicos'},403);if(body.action==='delete'){
 const id=String(body.evidencia_id||'').trim(),ordenId=String(body.orden_id||'').trim();
 if(!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)||!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(ordenId))
   return reply({error:'Identificador de evidencia u OT inválido'},400);
 const {data:o,error:ordErr}=await s.from('ordenes_trabajo')
   .select('id,tipo_trabajo,grupo_asignado,estado').eq('id',ordenId).maybeSingle();
 if(ordErr)throw ordErr;
 if(!o||!['SOPORTE_TECNICO','CAMBIO_EQUIPOS','REUBICACION'].includes(o.tipo_trabajo))
   return reply({error:'OT no encontrada'},404);
 if(o.grupo_asignado!==me.unidad_grupo)return reply({error:'OT asignada a otro grupo'},403);
 if(o.estado!=='EN_PROCESO')return reply({error:'No se eliminan fotos de una OT cerrada'},409);
 const {data:ev,error:evErr}=await s.from('soporte_evidencias')
   .select('id,tipo_foto,storage_path_original,storage_path_vista,registrado_por_id,es_actual')
   .eq('id',id).eq('orden_id',ordenId).eq('es_actual',true).maybeSingle();
 if(evErr)throw evErr;
 if(!ev)return reply({error:'La fotografía vigente no existe o ya fue sustituida'},404);
 // Bryan únicamente puede quitar su propia prueba de campo; los comprobantes de Fernando nunca.
 const borrables=['FACHADA','DANO_ENCONTRADO','EQUIPO_INSTALADO','TEST_VELOCIDAD',
                  'TV_CANALES','MATERIAL','SERIAL','ADICIONAL'];
 if(!borrables.includes(ev.tipo_foto)||ev.registrado_por_id!==me.id)
   return reply({error:'No tienes permiso para eliminar esta comprobación'},403);
 const {error:delErr}=await s.from('soporte_evidencias')
   .delete().eq('id',id).eq('orden_id',ordenId).eq('registrado_por_id',me.id).eq('es_actual',true);
 if(delErr)throw delErr;
 const paths=[ev.storage_path_original,ev.storage_path_vista].filter((p:string|null)=>!!p);
 const {error:storageErr}=await s.storage.from('soporte-evidencias').remove(paths);
 if(storageErr)console.warn('Archivo de evidencia pendiente de limpiar',storageErr.message);
 return reply({ok:true,eliminada:true,evidencia_id:id,almacenamiento_pendiente:!!storageErr});
}
const ordenId=String(body.orden_id||'').trim(),tipo=String(body.tipo_foto||'ADICIONAL').toUpperCase(),mime=String(body.mime_type||'image/jpeg').toLowerCase(),b64=String(body.base64_original||''),vista=String(body.base64_vista||''),offlineSyncId=String(body.offline_sync_id||'').trim()||null;const permitidos=['FACHADA','DANO_ENCONTRADO','EQUIPO_INSTALADO','TEST_VELOCIDAD','TV_CANALES','MATERIAL','SERIAL','ADICIONAL'];if(!permitidos.includes(tipo))return reply({error:'Tipo de evidencia no válido'},400);if(!['image/jpeg','image/png','image/webp'].includes(mime))return reply({error:'Formato de imagen no permitido'},400);if(!b64)return reply({error:'Imagen requerida'},400);if(offlineSyncId){const {data:dup,error:dupErr}=await s.from('soporte_evidencias').select('id,tipo_foto,fecha_hora_captura').eq('offline_sync_id',offlineSyncId).maybeSingle();if(dupErr)throw dupErr;if(dup)return reply({ok:true,evidencia:dup,deduplicada:true})}const {data:o,error:oErr}=await s.from('ordenes_trabajo').select('id,tipo_trabajo,grupo_asignado,estado').eq('id',ordenId).maybeSingle();if(oErr)throw oErr;if(!o||!['SOPORTE_TECNICO','CAMBIO_EQUIPOS','REUBICACION'].includes(o.tipo_trabajo))return reply({error:'Trabajo técnico no encontrado'},404);if(o.grupo_asignado!==me.unidad_grupo)return reply({error:'Este soporte pertenece a otro grupo'},403);if(o.estado!=='EN_PROCESO')return reply({error:'Las evidencias se registran con el soporte EN PROCESO'},400);const bytes=decodeBase64(b64);if(bytes.length>5*1024*1024)return reply({error:'La imagen supera 5 MB'},400);const ext=extMime(mime),base=`${ordenId}/${tipo.toLowerCase()}-${crypto.randomUUID()}`,pathO=`${base}-original.${ext}`;const {error:upErr}=await s.storage.from('soporte-evidencias').upload(pathO,bytes,{contentType:mime,upsert:false});if(upErr)throw upErr;let pathV:string|null=null;if(vista){const vb=decodeBase64(vista);pathV=`${base}-vista.${ext}`;const {error:vErr}=await s.storage.from('soporte-evidencias').upload(pathV,vb,{contentType:mime,upsert:false});if(vErr){await s.storage.from('soporte-evidencias').remove([pathO]);throw vErr}}const payload={orden_id:ordenId,tipo_foto:tipo,storage_path_original:pathO,storage_path_vista:pathV,mime_type:mime,tamano_bytes:bytes.length,fecha_hora_captura:body.fecha_hora_captura||new Date().toISOString(),latitud:body.latitud??null,longitud:body.longitud??null,gps_precision_m:body.gps_precision_m??null,gps_capturado_at:body.gps_capturado_at??null,tomada_por_id:me.id,registrado_por_id:me.id,offline_sync_id:offlineSyncId};const {data:e,error:eErr}=await s.from('soporte_evidencias').insert(payload).select('id,tipo_foto,fecha_hora_captura,es_actual,reemplaza_a_id').single();if(eErr){await s.storage.from('soporte-evidencias').remove([pathO,...(pathV?[pathV]:[])]);throw eErr}return reply({ok:true,evidencia:e})}catch(e){const m=String((e as any)?.message||e);return reply({error:m},m.includes('Sesión')?401:m.includes('Solo técnicos')||m.includes('otro grupo')?403:500)}});