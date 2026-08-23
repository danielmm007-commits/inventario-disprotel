(()=>{
  const API='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-configuracion';
  const session=(()=>{try{return JSON.parse(sessionStorage.getItem('disprotel_login_general_v2')||'null')}catch{return null}})();
  if(!session?.usuario||!session?.pin)return;
  const $b=k=>document.querySelector(`[data-bind="${k}"]`);
  const status=document.getElementById('saveState');
  let loading=false,timer=null,last='';
  function authHeaders(){return {'Content-Type':'application/json','x-user':session.usuario,'x-pin':session.pin}}
  function setStatus(text,ok=true){if(!status)return;status.textContent=text;status.style.background=ok?'rgba(255,255,255,.14)':'rgba(255,191,71,.18)';}
  function payload(){return {action:'save-company',nombre:$b('empresa.nombre')?.value||'',razon_social:$b('empresa.razon')?.value||'',ruc:$b('empresa.ruc')?.value||'',slogan:$b('empresa.eslogan')?.value||'',correo:$b('empresa.correo')?.value||'',telefono:$b('empresa.telefono')?.value||'',direccion:$b('empresa.direccion')?.value||'',ciudad:$b('empresa.ciudad')?.value||'',zona_horaria:$b('empresa.zona')?.value||'America/Guayaquil',moneda:$b('empresa.moneda')?.value||'USD',pais:'ECUADOR'} }
  async function call(body){const r=await fetch(API,{method:'POST',headers:authHeaders(),body:JSON.stringify(body)});const d=await r.json().catch(()=>({error:'Respuesta inválida'}));if(!r.ok||d?.error)throw new Error(d?.error||'No se pudo conectar con Supabase');return d}
  function apply(c){if(!c)return;loading=true;const map={'empresa.nombre':c.nombre,'empresa.razon':c.razon_social,'empresa.ruc':c.ruc,'empresa.eslogan':c.slogan,'empresa.correo':c.correo,'empresa.telefono':c.telefono,'empresa.direccion':c.direccion,'empresa.ciudad':c.ciudad,'empresa.zona':c.zona_horaria,'empresa.moneda':c.moneda};Object.entries(map).forEach(([k,v])=>{const el=$b(k);if(el&&v!=null&&String(v)!==String(el.value)){el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}});loading=false;last=JSON.stringify(payload());setStatus('GUARDADO EN SUPABASE');}
  async function saveCompany(){if(loading)return;const p=payload();if(!p.nombre.trim())return;const sig=JSON.stringify(p);if(sig===last)return;setStatus('GUARDANDO EN SUPABASE…');try{await call(p);last=sig;setStatus('GUARDADO EN SUPABASE');}catch(e){setStatus('PENDIENTE DE SINCRONIZAR',false);console.warn('Empresa backend:',e)}}
  function schedule(){if(loading)return;clearTimeout(timer);timer=setTimeout(saveCompany,650)}
  async function init(){setStatus('CONECTANDO SUPABASE…');try{const d=await call({action:'get-company'});if(d.company)apply(d.company);else{setStatus('LISTO PARA SINCRONIZAR');setTimeout(saveCompany,500)}}catch(e){setStatus('MODO LOCAL · SIN CONEXIÓN',false);console.warn('Empresa backend:',e)}}
  document.addEventListener('input',e=>{if(e.target?.matches?.('[data-bind^="empresa."]'))schedule()},true);
  document.addEventListener('change',e=>{if(e.target?.matches?.('[data-bind^="empresa."]'))schedule()},true);
  init();
})();