(()=>{
  const API='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-perfiles-config';
  const BASE=['ADMINISTRADOR SUPREMO','ADMINISTRADOR','SUPERVISOR TÉCNICO','TÉCNICO','PASANTE / AYUDANTE'];
  const norm=s=>String(s||'').trim().toUpperCase();
  const me=(()=>{try{return JSON.parse(sessionStorage.getItem('disprotel_login_general_v2')||'{}')}catch{return{}}})();
  if(!me?.usuario)return;
  const names={inventario:'Inventario',compras:'Compras e ingresos',transferencias:'Transferencias',area_tecnica:'Área técnica',solicitudes:'Solicitudes',ip_remoto:'IP y acceso remoto'};
  const fallback={
    'ADMINISTRADOR SUPREMO':['inventario','compras','transferencias','area_tecnica','solicitudes','ip_remoto'],
    'ADMINISTRADOR':['inventario','compras','transferencias','area_tecnica','solicitudes','ip_remoto'],
    'SUPERVISOR TÉCNICO':['inventario','transferencias','area_tecnica','solicitudes','ip_remoto'],
    'TÉCNICO':['inventario','transferencias','area_tecnica'],
    'PASANTE / AYUDANTE':['area_tecnica']
  };
  function fallbackBase(){if(me.es_admin_principal===true)return'ADMINISTRADOR SUPREMO';const r=norm(me.rol);return BASE.includes(r)?r:'PASANTE / AYUDANTE'}
  function apply(profileName,base,moduleKeys){
    const allowed=new Set((moduleKeys||[]).map(k=>names[k]).filter(Boolean));
    document.querySelectorAll('.module').forEach(card=>{const name=card.querySelector('h3')?.textContent?.trim()||'';card.style.display=allowed.has(name)?'flex':'none'});
    const modules=document.querySelector('.modules');if(modules)modules.dataset.profileBase=base;
    const techAllowed=allowed.has('Área técnica')||allowed.has('Solicitudes');
    const adminAllowed=allowed.has('Inventario')||allowed.has('Compras e ingresos')||allowed.has('Transferencias');
    const summaries=document.querySelectorAll('.summaryPanel');
    if(summaries[0])summaries[0].style.display=techAllowed?'block':'none';
    if(summaries[1])summaries[1].style.display=adminAllowed?'block':'none';
    const wrap=document.querySelector('.summaryWrap');if(wrap){const visible=[...summaries].filter(x=>x.style.display!=='none').length;wrap.style.gridTemplateColumns=visible===1?'1fr':''}
    const whoRole=document.getElementById('whoRole');if(whoRole)whoRole.textContent=profileName||base;
    const badge=document.getElementById('rootBadge');if(badge&&base!=='ADMINISTRADOR SUPREMO')badge.textContent='● '+String(profileName||base).toUpperCase();
    const heroText=document.querySelector('.hero p');if(heroText&&base!=='ADMINISTRADOR SUPREMO')heroText.textContent='Panel adaptado al perfil '+(profileName||base)+'. Solo se muestran los módulos habilitados para este perfil.';
    const moduleTitle=[...document.querySelectorAll('.sectionTitle h2')].find(x=>x.textContent.trim()==='Módulos principales');if(moduleTitle){const sub=moduleTitle.parentElement?.querySelector('span');if(sub)sub.textContent='Vista dinámica según perfil y permisos de Supabase'}
  }
  async function init(){
    const base=fallbackBase();apply(me.rol||base,base,fallback[base]||['area_tecnica']);
    if(!me.pin)return;
    try{
      const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','x-user':me.usuario,'x-pin':me.pin},body:JSON.stringify({action:'resolve'})});
      const d=await r.json();if(!r.ok||d?.error)throw new Error(d?.error||'No se pudieron resolver permisos');
      const p=d.perfil||{};const resolvedBase=norm(p.perfil_base)||base;const mods=Array.isArray(d.modulos)&&d.modulos.length?d.modulos:(fallback[resolvedBase]||['area_tecnica']);
      apply(p.nombre||me.rol||resolvedBase,resolvedBase,mods);
    }catch(e){console.warn('Permisos panel: usando perfil de sesión',e)}
  }
  init();
})();