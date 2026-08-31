(()=>{
  const API='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-permisos-granulares';
  const me=(()=>{try{return JSON.parse(sessionStorage.getItem('disprotel_login_general_v2')||'{}')}catch{return{}}})();
  if(!me?.usuario)return;
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
  const fallback={
    'ADMINISTRADOR SUPREMO':['*'],
    'ADMINISTRADOR':['inventario.ver','compras.ver','transferencias.ver','solicitudes.ver','trabajos.ver'],
    'SUPERVISOR TECNICO':['inventario.ver','compras.ver','transferencias.ver','solicitudes.ver','trabajos.ver','ip.ver'],
    'TECNICO':['inventario.ver','transferencias.ver','trabajos.ver'],
    'PASANTE / AYUDANTE':['inventario.ver','trabajos.ver']
  };
  const moduleRules={
    'Inventario':['inventario.ver'],
    'Compras e ingresos':['compras.ver','compras.crear','seriales.ingresar'],
    'Transferencias':['transferencias.ver','transferencias.solicitar','transferencias.recibir'],
    'Área técnica':['trabajos.ver','trabajos.aceptar','trabajos.cargar_evidencias'],
    'Solicitudes':['instalaciones.solicitar','soportes.solicitar','solicitudes.asignar','solicitudes.editar'],
    'IP y acceso remoto':['ip.ver','ip.solicitar','ip.asignar','remoto.solicitar']
  };
  const rootRules=[['usuarios.ver','usuarios.crear','usuarios.editar'],['permisos.ver','permisos.asignar','perfiles.gestionar'],['grupos.ver','grupos.gestionar','bodegas.gestionar'],['auditoria.ver','seguridad.configurar']];
  function canAny(allowed,keys){return allowed.has('*')||keys.some(key=>allowed.has(key))}
  function apply(profile,keys){
    const allowed=new Set(keys||[]);
    document.querySelectorAll('.module').forEach(card=>{const name=card.querySelector('h3')?.textContent?.trim()||'';card.style.display=canAny(allowed,moduleRules[name]||[])?'flex':'none'});
    const ipCard=[...document.querySelectorAll('.module')].find(card=>card.querySelector('h3')?.textContent?.trim()==='IP y acceso remoto');
    if(ipCard&&ipCard.style.display!=='none'&&!canAny(allowed,['ip.asignar','ip.liberar','ip.reasignar','remoto.confirmar'])){const title=ipCard.querySelector('h3');if(title)title.textContent='Solicitud de IP y acceso remoto';const description=ipCard.querySelector('p');if(description)description.textContent='Solicitar IP y validación de acceso remoto para los trabajos asignados.';const button=ipCard.querySelector('.btn');if(button)button.textContent='Solicitar IP / remoto →'}
    const cards=[...document.querySelectorAll('#rootArea .rootCard')];cards.forEach((card,index)=>card.style.display=canAny(allowed,rootRules[index]||[])?'flex':'none');
    const root=document.getElementById('rootArea');if(root)root.style.display=cards.some(card=>card.style.display!=='none')?'block':'none';
    if(cards[0]?.style.display!=='none'){const button=cards[0].querySelector('button');if(button)button.onclick=()=>location.href='usuarios.html'}
    if(cards[1]?.style.display!=='none'){const button=cards[1].querySelector('button');if(button)button.onclick=()=>location.href='permisos-accesos-visual.html?v=100'}
    const techAllowed=canAny(allowed,['trabajos.ver','solicitudes.ver','instalaciones.solicitar','soportes.solicitar']);
    const adminAllowed=canAny(allowed,['inventario.ver','compras.ver','transferencias.ver','seriales.ingresar']);
    const summaries=document.querySelectorAll('.summaryPanel');if(summaries[0])summaries[0].style.display=techAllowed?'block':'none';if(summaries[1])summaries[1].style.display=adminAllowed?'block':'none';
    const adminStats=summaries[1]?.querySelectorAll('.stat')||[],adminStatRules=[['compras.ver','compras.crear'],['transferencias.ver','transferencias.recibir'],['seriales.ingresar','compras.completar_seriales']];adminStats.forEach((card,index)=>card.style.display=canAny(allowed,adminStatRules[index]||[])?'block':'none');
    const wrap=document.querySelector('.summaryWrap');if(wrap){const visible=[...summaries].filter(item=>item.style.display!=='none').length;wrap.style.gridTemplateColumns=visible===1?'1fr':''}
    const profileName=profile?.nombre||me.rol||'USUARIO';
    const inventoryCard=[...document.querySelectorAll('.module')].find(card=>card.querySelector('h3')?.textContent?.trim()==='Inventario');if(inventoryCard&&normalize(profileName)==='TECNICO'){const description=inventoryCard.querySelector('p');if(description)description.textContent='Consulta de solo lectura de los equipos y materiales disponibles en tu bodega operativa.';const link=inventoryCard.querySelector('a.btn');if(link){link.href='mi-inventario-tecnico.html?v=111';link.textContent='Ver mi inventario →'}}
    const transferCard=[...document.querySelectorAll('.module')].find(card=>card.querySelector('h3')?.textContent?.trim()==='Transferencias');if(transferCard&&normalize(profileName)==='TECNICO'){const link=transferCard.querySelector('a.btn');if(link){link.href='solicitudes-transferencias-tecnico.html?v=3';link.textContent='Abrir solicitudes y transferencias →'}const description=transferCard.querySelector('p');if(description)description.textContent='Abastecimientos recibidos, transferencias desde tu bodega y solicitudes de baja.'}
    const summaryTransfer=summaries[1]?.querySelectorAll('.stat')?.[1];if(summaryTransfer&&normalize(profileName)==='TECNICO')summaryTransfer.onclick=()=>location.href='solicitudes-transferencias-tecnico.html?v=3';
    document.querySelectorAll('.menuAside button[data-href]').forEach(btn=>{if(normalize(profileName)==='TECNICO'&&/SOLICITUDES Y TRANSFERENCIAS/i.test(btn.textContent||''))btn.dataset.href='solicitudes-transferencias-tecnico.html?v=3'});
    const whoRole=document.getElementById('whoRole');if(whoRole)whoRole.textContent=profileName;const badge=document.getElementById('rootBadge');if(badge)badge.textContent='● '+profileName.toUpperCase();const hero=document.querySelector('.hero p');if(hero)hero.textContent='Panel adaptado a los permisos efectivos de '+profileName+'.';
    const techCard=[...document.querySelectorAll('.module')].find(card=>card.querySelector('h3')?.textContent?.trim()==='Área técnica');if(techCard&&normalize(profileName).includes('SUPERVISOR')){const link=techCard.querySelector('a.btn');if(link){link.href='panel-general-supervisor-visual.html';link.textContent='Abrir supervisión técnica →'}}
    const title=[...document.querySelectorAll('.sectionTitle h2')].find(item=>item.textContent.trim()==='Módulos principales');if(title){const subtitle=title.parentElement?.querySelector('span');if(subtitle)subtitle.textContent='Vista dinámica según perfil y excepciones individuales'}
    document.querySelector('.modules')?.setAttribute('data-permissions-source','granular-v1');
  }
  async function init(){
    const role=me.es_admin_principal?'ADMINISTRADOR SUPREMO':normalize(me.rol);apply({nombre:me.rol||role},fallback[role]||fallback['PASANTE / AYUDANTE']);if(!me.session_token&&!me.pin)return;
    try{const response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','x-user':me.usuario,'x-pin':me.pin||'','x-session':me.session_token||''},body:JSON.stringify({action:'resolve_self'})});const data=await response.json();if(!response.ok||data?.error)throw new Error(data?.error||'No se pudieron cargar permisos');const permisos=data.permisos||[];apply(data.perfil,permisos);const accessContext={usuario:me.usuario,usuario_id:me.id||'',perfil:data.perfil||{nombre:me.rol||role},permisos,validado_en:new Date().toISOString(),session_token:me.session_token||''};sessionStorage.setItem('disprotel_access_context_v1',JSON.stringify(accessContext));sessionStorage.setItem('disprotel_login_general_v2',JSON.stringify({...me,perfil_efectivo:accessContext.perfil,permisos_efectivos:permisos,modulos_validados:true,permisos_validados_en:accessContext.validado_en}));window.dispatchEvent(new CustomEvent('disprotel:permissions-ready',{detail:accessContext}))}catch(error){console.warn('Panel granular: usando permisos de respaldo',error)}
  }
  init();
})();