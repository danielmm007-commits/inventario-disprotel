(()=>{
  if(!window.state||!Array.isArray(state.roles))return;
  const API='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-perfiles-config';
  const session=(()=>{try{return JSON.parse(sessionStorage.getItem('disprotel_login_general_v2')||'null')}catch{return null}})();
  if(!session?.usuario||(!session?.session_token&&!session?.pin))return;
  const BASE=new Set(['ADMINISTRADOR SUPREMO','ADMINISTRADOR','SUPERVISOR TÉCNICO','TÉCNICO','PASANTE / AYUDANTE']);
  let ready=false,syncing=false,timer=null,lastSig='';
  const norm=s=>String(s||'').trim().toUpperCase();
  const modulesFor=base=>({
    'ADMINISTRADOR SUPREMO':['inventario','compras','transferencias','area_tecnica','solicitudes','ip_remoto','admin_usuarios','admin_perfiles','admin_grupos','seguridad'],
    'ADMINISTRADOR':['inventario','compras','transferencias','area_tecnica','solicitudes','ip_remoto'],
    'SUPERVISOR TÉCNICO':['inventario','transferencias','area_tecnica','solicitudes','ip_remoto'],
    'TÉCNICO':['inventario','transferencias','area_tecnica'],
    'PASANTE / AYUDANTE':['area_tecnica']
  }[norm(base)]||['area_tecnica']);
  function headers(){return {'Content-Type':'application/json','x-user':session.usuario||'','x-pin':session.pin||'','x-session':session.session_token||''}}
  async function call(body){const r=await fetch(API,{method:'POST',headers:headers(),body:JSON.stringify(body)});const d=await r.json().catch(()=>({error:'Respuesta inválida'}));if(!r.ok||d?.error)throw new Error(d?.error||'No se pudo sincronizar perfiles');return d}
  function payload(){return (state.roles||[]).map(r=>{const name=String(r?.[0]||'').trim();const base=BASE.has(norm(name))&&!r?.[2]?norm(name):norm(r?.[2]||'ADMINISTRADOR');return {nombre:name,perfil_base:base,activo:r?.[1]!==0,modulos:modulesFor(base)}}).filter(x=>x.nombre)}
  function signature(){return JSON.stringify(payload())}
  function injectStatus(){const box=document.getElementById('rolesList');if(!box||document.getElementById('rolesBackendStatus'))return;const d=document.createElement('div');d.id='rolesBackendStatus';d.style.cssText='margin:0 0 9px;padding:7px 10px;border:1px solid #cfe1ec;border-radius:10px;background:#f3f9fd;color:#496b7e;font-size:9px;font-weight:900';d.textContent='PERFILES · CONECTANDO SUPABASE…';box.parentElement?.insertBefore(d,box)}
  function status(t,ok=true){injectStatus();const d=document.getElementById('rolesBackendStatus');if(!d)return;d.textContent='PERFILES · '+t;d.style.color=ok?'#23734e':'#9a4a34';d.style.borderColor=ok?'#bfe1cf':'#efc4ba';d.style.background=ok?'#eff9f3':'#fff4f1'}
  function fromBackend(p){const name=String(p.nombre||'');return BASE.has(norm(name))&&norm(name)===norm(p.perfil_base)?[name,p.activo?1:0]:[name,p.activo?1:0,p.perfil_base||'ADMINISTRADOR']}
  async function syncNow(force=false){if(!ready||syncing)return;const sig=signature();if(!force&&sig===lastSig)return;syncing=true;status('GUARDANDO EN SUPABASE…');try{await call({action:'sync',profiles:payload()});lastSig=sig;status('GUARDADO EN SUPABASE')}catch(e){status('PENDIENTE DE SINCRONIZAR',false);console.warn('Perfiles backend:',e)}finally{syncing=false}}
  function schedule(){clearTimeout(timer);timer=setTimeout(()=>syncNow(),450)}
  async function init(){injectStatus();status('CONECTANDO SUPABASE…');try{let d=await call({action:'list'});const remote=Array.isArray(d.profiles)?d.profiles:[];const remoteCustom=remote.filter(p=>!p.es_sistema);const localCustom=(state.roles||[]).filter(r=>!BASE.has(norm(r?.[0]))||r?.[2]);if(!remoteCustom.length&&localCustom.length){ready=true;await syncNow(true);d=await call({action:'list'})}if(Array.isArray(d.profiles)&&d.profiles.length){state.roles=d.profiles.map(fromBackend);try{save();window.renderRoles?.()}catch(e){}ready=true;lastSig=signature();status(`CARGADOS DESDE SUPABASE · ${d.profiles.length} PERFIL(ES)`)}else{ready=true;lastSig='';await syncNow(true)}}catch(e){ready=true;status('MODO LOCAL · SIN CONEXIÓN',false);console.warn('Perfiles backend:',e)}}
  const oldSave=window.save;if(typeof oldSave==='function'){window.save=function(...args){const r=oldSave.apply(this,args);if(ready)schedule();return r}}
  setInterval(()=>{if(!ready||syncing)return;let sig='';try{sig=signature()}catch{return}if(sig!==lastSig)schedule()},900);
  new MutationObserver(injectStatus).observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(init,100);
})();