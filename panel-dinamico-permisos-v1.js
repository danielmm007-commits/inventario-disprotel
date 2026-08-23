(()=>{
  const BASE=['ADMINISTRADOR SUPREMO','ADMINISTRADOR','SUPERVISOR TÉCNICO','TÉCNICO','PASANTE / AYUDANTE'];
  const norm=s=>String(s||'').trim().toUpperCase();
  const me=(()=>{try{return JSON.parse(sessionStorage.getItem('disprotel_login_general_v2')||'{}')}catch{return{}}})();
  if(!me?.usuario)return;

  function resolveBase(){
    if(me.es_admin_principal===true)return 'ADMINISTRADOR SUPREMO';
    const direct=norm(me.rol);
    if(BASE.includes(direct))return direct;
    try{
      const setup=JSON.parse(localStorage.getItem('disprotel_puesta_marcha_v2')||'{}');
      const found=(setup.roles||[]).find(r=>norm(r?.[0])===direct);
      const inherited=norm(found?.[2]);
      if(BASE.includes(inherited))return inherited;
    }catch(e){}
    return 'PASANTE / AYUDANTE';
  }

  const base=resolveBase();
  const all=['Inventario','Compras e ingresos','Transferencias','Área técnica','Solicitudes','IP y acceso remoto'];
  const matrix={
    'ADMINISTRADOR SUPREMO':all,
    'ADMINISTRADOR':all,
    'SUPERVISOR TÉCNICO':['Inventario','Transferencias','Área técnica','Solicitudes','IP y acceso remoto'],
    'TÉCNICO':['Inventario','Transferencias','Área técnica'],
    'PASANTE / AYUDANTE':['Área técnica']
  };
  const allowed=new Set(matrix[base]||[]);

  document.querySelectorAll('.module').forEach(card=>{
    const name=card.querySelector('h3')?.textContent?.trim()||'';
    card.style.display=allowed.has(name)?'flex':'none';
  });

  const modules=document.querySelector('.modules');
  if(modules)modules.dataset.profileBase=base;

  const techAllowed=allowed.has('Área técnica')||allowed.has('Solicitudes');
  const adminAllowed=allowed.has('Inventario')||allowed.has('Compras e ingresos')||allowed.has('Transferencias');
  const summaries=document.querySelectorAll('.summaryPanel');
  if(summaries[0])summaries[0].style.display=techAllowed?'block':'none';
  if(summaries[1])summaries[1].style.display=adminAllowed?'block':'none';
  const wrap=document.querySelector('.summaryWrap');
  if(wrap){
    const visible=[...summaries].filter(x=>x.style.display!=='none').length;
    if(visible===1)wrap.style.gridTemplateColumns='1fr';
  }

  const visibleRole=me.rol||base;
  const whoRole=document.getElementById('whoRole');
  if(whoRole)whoRole.textContent=visibleRole;
  const badge=document.getElementById('rootBadge');
  if(badge&&base!=='ADMINISTRADOR SUPREMO')badge.textContent='● '+visibleRole.toUpperCase();

  const heroText=document.querySelector('.hero p');
  if(heroText&&base!=='ADMINISTRADOR SUPREMO')heroText.textContent='Panel adaptado al perfil '+visibleRole+'. Solo se muestran los módulos habilitados para este tipo de usuario.';

  const title=document.querySelector('.sectionTitle h2');
  const moduleTitle=[...document.querySelectorAll('.sectionTitle h2')].find(x=>x.textContent.trim()==='Módulos principales');
  if(moduleTitle){
    const sub=moduleTitle.parentElement?.querySelector('span');
    if(sub)sub.textContent='Vista dinámica según perfil y permisos';
  }
})();