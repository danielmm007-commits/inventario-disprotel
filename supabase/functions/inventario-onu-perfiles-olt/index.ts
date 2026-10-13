import { createClient } from "npm:@supabase/supabase-js@2.95.0";
const ORIGIN="https://danielmm007-commits.github.io";
const HEADERS={"Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Headers":"content-type,x-session,authorization","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json;charset=utf-8"};
const answer=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:HEADERS});
const norm=(x:unknown)=>String(x??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toUpperCase();
async function hash(x:string){const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(x));return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");}
function db(){const raw=Deno.env.get("SUPABASE_SECRET_KEYS");const key=raw?JSON.parse(raw).default:Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!key)throw Error("Servidor no configurado");return createClient(Deno.env.get("SUPABASE_URL")!,key,{auth:{persistSession:false,autoRefreshToken:false}});}
function integer(v:unknown,name:string,min=0,max=4095){if(v===null||v===undefined||String(v).trim()==="")return null;const n=Number(v);if(!Number.isSafeInteger(n)||n<min||n>max)throw Error(name+" fuera de rango");return n;}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:HEADERS});
 if(req.method!=="POST")return answer({error:"Método no permitido"},405);
 try{
 const body=await req.json();const s=db();
 const token=String(req.headers.get("x-session")||body.session_token||"").trim();
 if(!token)throw Error("Sesión general requerida");
 const session=await s.from("app_auth_sessions").select("responsable_id").eq("token_hash",await hash(token)).is("revoked_at",null).gt("expires_at",new Date().toISOString()).maybeSingle();
 if(session.error||!session.data)throw Error("Sesión inválida");
 const me=await s.from("responsables").select("id,rol,activo,es_admin_principal").eq("id",session.data.responsable_id).eq("activo",true).maybeSingle();
 if(me.error||!me.data)throw Error("Usuario no disponible");
 const rol=norm(me.data.rol);
 const admin=me.data.es_admin_principal===true||rol.includes("ADMINISTRADOR")||rol.includes("SUPREMO")||rol.includes("SUPERVISOR");
 if(!admin)return answer({error:"Sin permiso de configuración"},403);
 const action=norm(body.action);
 if(action==="LIST"){
  const q=await s.from("onu_perfiles_olt").select("id,olt_id,tipo_onu,modelo_clave,vlan_servicio,vlan_usuario,line_profile_id,service_profile_id,gemport,traffic_in_id,traffic_out_id,tag_transform,observaciones,fuente,habilitado,updated_at").order("tipo_onu").order("modelo_clave");
  if(q.error)throw q.error;
  return answer({ok:true,rows:q.data});
 }
 if(action!=="SAVE")return answer({error:"Acción desconocida"},400);
 const olt_id=String(body.olt_id||"");if(!/^[a-f0-9-]{36}$/i.test(olt_id))throw Error("OLT inválida");
 const olt=await s.from("olt_configuraciones").select("id,codigo").eq("id",olt_id).maybeSingle();
 if(olt.error||!olt.data)throw Error("OLT no encontrada");
 const tipo=norm(body.tipo_onu);
 if(!["BRIDGE","WIFI","CATV"].includes(tipo))throw Error("Tipo ONU inválido");
 const modelo=norm(body.modelo_clave).replace(/[^A-Z0-9_.-]/g,"");
 if(modelo.length<1||modelo.length>64)throw Error("Modelo obligatorio (máximo 64)");
 const mapping={
 olt_id,tipo_onu:tipo,modelo_clave:modelo,
 vlan_servicio:integer(body.vlan_servicio,"VLAN de servicio",1,4094),
 vlan_usuario:integer(body.vlan_usuario,"VLAN de usuario",1,4094),
 line_profile_id:integer(body.line_profile_id,"Line profile"),
 service_profile_id:integer(body.service_profile_id,"Service profile"),
 gemport:integer(body.gemport,"GEM"),
 traffic_in_id:integer(body.traffic_in_id,"Traffic IN",0,2147483647),
 traffic_out_id:integer(body.traffic_out_id,"Traffic OUT",0,2147483647),
 tag_transform:["translate","transparent","default"].includes(String(body.tag_transform))?String(body.tag_transform):null,
 observaciones:String(body.observaciones||"").slice(0,700),
 // Es deliberado: los perfiles configurados no habilitan escrituras en Huawei.
 habilitado:false,fuente:"MANUAL",actualizado_por_id:me.data.id
 };
 const found=await s.from("onu_perfiles_olt").select("id").eq("olt_id",olt_id).eq("tipo_onu",tipo).eq("modelo_clave",modelo).maybeSingle();
 if(found.error)throw found.error;
 const saved=found.data?
 await s.from("onu_perfiles_olt").update({...mapping,updated_at:new Date().toISOString()}).eq("id",found.data.id).select("id").single():
 await s.from("onu_perfiles_olt").insert({...mapping,creado_por_id:me.data.id}).select("id").single();
 if(saved.error)throw saved.error;
 return answer({ok:true,id:saved.data.id,olt_codigo:olt.data.codigo,habilitado:false});
 }catch(e){return answer({error:String((e as Error).message||e)},400)}
});
