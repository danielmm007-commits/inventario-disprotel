from pathlib import Path
import re

root = Path('.')
principal_path = root / 'principal.html'
panel_path = root / 'panel-experiencia-v1.js'
integracion_path = root / 'integracion-admin-panel.js'

principal = principal_path.read_text(encoding='utf-8')

# El armazón izquierda/derecha queda en el HTML desde el primer parseo.
if 'id="principalMenuShell"' not in principal:
    pat = re.compile(r'(<main class="main">[\s\S]*?</main>)', re.M)
    match = pat.search(principal)
    if not match:
        raise SystemExit('No se encontró <main class="main"> para fijar el armazón.')
    main = match.group(1)
    shell = f'''<div class="menuShell" id="principalMenuShell">
<aside class="menuAside" id="principalMenuAside"></aside>
<section class="menuStage">
  <div class="mobileModuleBar"><button type="button" class="mobileModuleBack">← Menú</button><strong class="mobileModuleTitle">Módulo</strong></div>
  <div class="menuHome"><section class="menuDashboard" id="principalMenuDashboard"></section>{main}</div>
  <iframe class="menuFrame" id="principalMenuFrame" title="Módulo DISPROTEL"></iframe>
</section>
</div>'''
    principal = principal[:match.start()] + shell + principal[match.end():]

principal_path.write_text(principal, encoding='utf-8')

panel = panel_path.read_text(encoding='utf-8')

new_ensure = r'''function ensureMenuShell(){
    if(!menuPilot||menuShell)return;
    const shell=document.getElementById('principalMenuShell');
    const main=shell?.querySelector('.menuHome>.main');
    const aside=shell?.querySelector('.menuAside');
    const stage=shell?.querySelector('.menuStage');
    const dash=shell?.querySelector('.menuDashboard');
    const mobileBar=shell?.querySelector('.mobileModuleBar');
    if(!shell||!main||!aside||!stage||!dash||!mobileBar)return;

    menuShell=shell;
    menuHome=shell.querySelector('.menuHome');
    menuFrame=shell.querySelector('.menuFrame');

    const cards=[...main.querySelectorAll('.module')].map((card,i)=>{
      const link=card.querySelector('a.btn');
      let title=card.querySelector('h3')?.textContent?.trim(),icon=card.querySelector('.ico')?.textContent?.trim()||'•',href=link?.getAttribute('href');
      if(!link||!title||getComputedStyle(card).display==='none'||getComputedStyle(link).display==='none')return null;
      if(isRubi&&norm(title).includes('AREA TECNICA')){title='Área técnica · Supervisión';icon='🛠️';href='panel-general-supervisor-visual.html?v='+Date.now()}
      if(norm(title)==='TRANSFERENCIAS')title='Solicitudes y transferencias de equipos y materiales';
      return{title,icon,href,i}
    }).filter(Boolean);
    if(isRubi&&!cards.some(x=>String(x.href||'').includes('solicitudes-oficina.html')))cards.push({title:'Solicitudes técnicas',icon:'📝',href:'solicitudes-oficina.html?v='+Date.now(),i:cards.length});

    aside.innerHTML='<div class="sideTitle"><div class="navAvatar">'+(avatarEmoji[prefs.avatar_tipo]||'🧑')+'</div><b>Navegación</b><small>Módulos habilitados para ti</small></div><div class="navGroup">MÓDULOS PRINCIPALES</div>'+cards.map(x=>'<button data-href="'+x.href.replace(/"/g,'&quot;')+'">'+x.icon+' <span>'+x.title+'</span></button>').join('');

    dash.innerHTML=isRubi
      ?'<div class="dashHero"><div><small>CONTROL ADMINISTRATIVO DE INVENTARIO</small><h1>Hola, '+String(me.nombre||'Rubí').toUpperCase()+'</h1><p>Resumen general de inventario, compras, seriales y movimientos pendientes.</p></div><div class="dashHeroActions"><span class="panelConnected">● CONECTADO</span><button id="dashRefresh">↻ Actualizar</button></div></div><div class="dashGrid"><article class="dashPanel dashFull"><h2>📊 Estado administrativo</h2><div class="dashSub">Indicadores que requieren revisión durante la jornada.</div><div class="dashMetrics"><div class="dashMetric"><strong id="dashPurchases">—</strong><span>COMPRAS E INGRESOS</span></div><div class="dashMetric"><strong id="dashTransfers">—</strong><span>TRANSFERENCIAS PENDIENTES</span></div><div class="dashMetric"><strong id="dashSerialsPending">—</strong><span>SERIALES POR CARGAR</span></div><div class="dashMetric"><strong id="dashSupport">—</strong><span>SOPORTES POR ATENDER</span></div></div></article><article class="dashPanel"><h2>📦 Inventario bajo control</h2><div class="dashSub">Existencias disponibles en las bodegas asignadas.</div><div class="dashMetrics"><div class="dashMetric"><strong id="dashSerials">—</strong><span>EQUIPOS CON SERIAL</span></div><div class="dashMetric"><strong id="dashMaterials">—</strong><span>TIPOS DE MATERIALES</span></div><div class="dashMetric"><strong id="dashUnits">—</strong><span>UNIDADES DE MATERIALES</span></div><div class="dashMetric"><strong id="dashLocation">—</strong><span>BODEGAS ASIGNADAS</span></div></div></article><article class="dashPanel"><h2>🔔 Pendientes y alertas</h2><div class="dashSub">Movimientos que necesitan seguimiento administrativo.</div><div class="dashList" id="dashAlerts"><div class="dashItem"><span>⏳</span><span>Consultando alertas de inventario…</span></div></div></article><article class="dashPanel dashFull"><h2>🧾 Actividad reciente</h2><div class="dashSub">Últimas transferencias y movimientos registrados.</div><div class="dashList" id="dashRecent"><div class="dashItem"><span>⏳</span><span>Cargando actividad reciente…</span></div></div></article></div>'
      :'<div class="dashHero"><div><small>RESUMEN OPERATIVO PERSONAL</small><h1>Hola, '+String(me.nombre||'Técnico').toUpperCase()+'</h1><p>Este es el estado general de tu jornada, grupo e inventario.</p></div><div class="dashHeroActions"><span class="panelConnected">● CONECTADO</span><button id="dashRefresh">↻ Actualizar</button></div></div><div class="dashGrid"><article class="dashPanel"><h2>🛠️ Operación de hoy</h2><div class="dashSub">Trabajos técnicos asociados a tu perfil y grupo.</div><div class="dashMetrics"><div class="dashMetric"><strong id="dashAvailable">—</strong><span>DISPONIBLES</span></div><div class="dashMetric"><strong id="dashProcess">—</strong><span>EN PROCESO</span></div><div class="dashMetric"><strong id="dashDone">—</strong><span>FINALIZADOS</span></div><div class="dashMetric"><strong id="dashPending">—</strong><span>PENDIENTES</span></div></div></article><article class="dashPanel"><h2>👥 Mi grupo</h2><div class="dashSub">Asignación operativa vigente para la jornada.</div><div class="dashGroup">'+String(me.unidad_grupo||me.grupo||'Grupo por confirmar').toUpperCase()+'</div><div class="dashList" style="margin-top:9px"><div class="dashItem"><span>📍</span><span>Bodega o minibodega vigente</span><b id="dashLocation">Consultando…</b></div><div class="dashItem"><span>📣</span><span>Novedades del grupo</span><b id="dashNews">Sin novedades</b></div></div></article><article class="dashPanel"><h2>📦 Mi inventario</h2><div class="dashSub">Existencias y movimientos bajo tu responsabilidad.</div><div class="dashMetrics"><div class="dashMetric"><strong id="dashSerials">—</strong><span>EQUIPOS CON SERIAL</span></div><div class="dashMetric"><strong id="dashMaterials">—</strong><span>TIPOS DE MATERIALES</span></div><div class="dashMetric"><strong id="dashUnits">—</strong><span>UNIDADES</span></div><div class="dashMetric"><strong id="dashTransfers">—</strong><span>TRANSFERENCIAS PENDIENTES</span></div></div></article><article class="dashPanel"><h2>🔔 Alertas</h2><div class="dashSub">Elementos que requieren tu atención.</div><div class="dashList" id="dashAlerts"><div class="dashItem"><span>⏳</span><span>Consultando alertas operativas…</span></div></div></article><article class="dashPanel dashFull"><h2>🧾 Actividad reciente</h2><div class="dashSub">Últimos movimientos vinculados a tu usuario.</div><div class="dashList" id="dashRecent"><div class="dashItem"><span>⏳</span><span>Cargando actividad reciente…</span></div></div></article></div>';

    const refresh=dash.querySelector('#dashRefresh');if(refresh)refresh.onclick=e=>refreshDashboard(e.currentTarget);
    const observer=new MutationObserver(syncTechnicalMetrics);main.querySelectorAll('.stat .num').forEach(x=>observer.observe(x,{childList:true,subtree:true,characterData:true}));
    const attentionObserver=new MutationObserver(syncAttentionIndicators);attentionObserver.observe(dash,{childList:true,subtree:true,characterData:true});
    syncTechnicalMetrics();

    const goMenuHome=()=>{
      document.body.classList.remove('moduleOpen');
      menuFrame.src='about:blank';
      menuFrame.style.visibility='hidden';
      aside.querySelectorAll('button').forEach(x=>x.classList.remove('on'))
    };
    mobileBar.querySelector('.mobileModuleBack').onclick=goMenuHome;
    menuFrame.onload=()=>{
      if(menuFrame.src==='about:blank')return;
      menuFrame.style.visibility='visible';menuFrame.removeAttribute('aria-busy');
      try{const d=menuFrame.contentDocument,path=menuFrame.contentWindow.location.pathname;if(/login-general|principal\.html/.test(path)){goMenuHome();return}d.addEventListener('click',e=>{const control=e.target.closest('button,a');if(control&&norm(control.textContent).includes('ATRAS')){e.preventDefault();e.stopImmediatePropagation();goMenuHome()}},true)}catch(e){console.warn('Navegación interna:',e)}
    };
    aside.querySelectorAll('[data-href]').forEach(btn=>btn.onclick=()=>{
      mobileBar.querySelector('.mobileModuleTitle').textContent=btn.querySelector('span')?.textContent||'Módulo';
      menuFrame.style.visibility='hidden';menuFrame.setAttribute('aria-busy','true');menuFrame.src=directModuleUrl(btn.dataset.href);
      document.body.classList.add('moduleOpen');aside.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===btn))
    });
    document.documentElement.dataset.panelStaticHydrated='1';
  }'''

pattern = re.compile(r'function ensureMenuShell\(\)\{[\s\S]*?\n\n  function paint\(\)', re.M)
if pattern.search(panel):
    panel = pattern.sub(new_ensure + '\n\n  function paint()', panel, count=1)
elif 'dataset.panelStaticHydrated' not in panel:
    raise SystemExit('No se encontró ensureMenuShell para convertirlo a estructura fija.')

panel_path.write_text(panel, encoding='utf-8')

# Revelar solo cuando la estructura fija ya fue hidratada y tiene ambas columnas listas.
integracion = integracion_path.read_text(encoding='utf-8')
integracion = integracion.replace("if(!document.body.classList.contains('panelMenu'))return false;", "if(!document.body.classList.contains('panelMenu')||document.documentElement.dataset.panelStaticHydrated!=='1')return false;")
integracion_path.write_text(integracion, encoding='utf-8')

print('Armazón principal fijo: izquierda y derecha ya no se crean ni se mueven después del primer render.')
