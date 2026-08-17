from pathlib import Path

p=Path('instalacion-ejecucion.html')
s=p.read_text(encoding='utf-8')

css='''
/* DISPROTEL · encabezado técnico */
body{background:linear-gradient(135deg,#f7f9fb 0%,#eaf3ff 55%,#eef2f5 100%);min-height:100vh}
.wrap{max-width:920px}
.techHero{padding:24px 22px 22px;background:linear-gradient(180deg,#ffffff 0%,#fbfdff 100%);border:1px solid #dbe5ee;box-shadow:0 10px 28px rgba(23,49,61,.10)}
.techHero h1{text-align:center;margin:0;color:#17313d;font-size:31px;letter-spacing:.3px}
.techType{text-align:center;margin:8px 0 20px;color:#2878d4;font-size:18px;font-weight:900;letter-spacing:.8px}
.techType:before,.techType:after{content:'';display:inline-block;width:42px;height:2px;background:#cbd7e2;vertical-align:middle;margin:0 12px}
.techGrid{display:grid;grid-template-columns:1fr;gap:10px;max-width:720px;margin:0 auto}
.techRow{display:grid;grid-template-columns:48px 150px 1fr;gap:12px;align-items:center}
.techIcon{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:23px;border:1px solid #d8e5f4;background:#eef6ff}
.techLabel{font-size:13px;font-weight:900;color:#334a58;letter-spacing:.3px}
.techValue{min-height:44px;display:flex;align-items:center;padding:10px 14px;border-radius:13px;border:1px solid #d9e2e9;background:#f4f7fa;font-weight:900;color:#17313d}
.techRow.group .techIcon,.techRow.group .techValue{background:#edf8f1;border-color:#d4eadc}.techRow.group .techValue{color:#176b45}
.techRow.worker .techIcon,.techRow.worker .techValue{background:#fff6e8;border-color:#f2d9a7}.techRow.worker .techValue{color:#8a5300}
.techRow.time .techIcon,.techRow.time .techValue{background:#f1f5fb;border-color:#dbe4f0}
@media(max-width:620px){.techHero{padding:20px 14px}.techHero h1{font-size:25px}.techType{font-size:16px}.techRow{grid-template-columns:44px 1fr}.techIcon{width:44px;height:44px}.techLabel{align-self:end}.techValue{grid-column:2;margin-top:-4px}.techType:before,.techType:after{width:24px;margin:0 7px}}
'''
if '/* DISPROTEL · encabezado técnico */' not in s:
    s=s.replace('</style>',css+'</style>',1)

old='<section class="card intro"><h1>🔧 Ejecución técnica</h1><div data-contexto-ejecucion="1" style="margin-top:8px"><div style="font-size:20px;font-weight:800">CARGANDO OT · CLIENTE...</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><span class="badge">👷 TÉCNICO</span><span class="badge okb">🚐 GRUPO</span></div></div><div id="msg"></div></section>'
new='<section class="card intro techHero"><h1>🔧 EJECUCIÓN TÉCNICA</h1><div id="tipoTrabajoHero" class="techType">🛠️ CARGANDO...</div><div data-contexto-ejecucion="1" class="techGrid"><div class="muted">Cargando contexto de la orden...</div></div><div id="msg"></div></section>'
if old in s:
    s=s.replace(old,new,1)
elif 'class="card intro techHero"' not in s:
    raise SystemExit('No se encontró el encabezado actual')

oldjs="const tec=up(s.nombre||s.usuario||'—'),grp=up(s.unidad_grupo||s.grupo||'—'),tipos={INSTALACION_INTERNET:'INSTALACIÓN',INSTALACION_INTERNET_TV:'INSTALACIÓN',ACTIVACION_TV_EXISTENTE:'ACTIVACIÓN TV',CAMBIO_EQUIPOS:'CAMBIO DE EQUIPOS',SOPORTE_TECNICO:'SOPORTE TÉCNICO',REUBICACION:'REUBICACIÓN',RETIRO:'RETIRO',OTRO:'OTRO'},tipo=tipos[O.tipo_trabajo]||up(O.tipo_trabajo||'—');ctx.innerHTML=`<div style=\"font-size:20px;font-weight:800\">${esc(up(O.id_orden||ordenId()||'—'))} · ${esc(up(O.cliente_nombre||'CLIENTE'))}</div><div style=\"display:flex;gap:8px;flex-wrap:wrap;margin-top:10px\"><span class=\"badge\">👷 ${esc(tec)}</span><span class=\"badge okb\">🚐 ${esc(grp)}</span><span class=\"badge\">🛠️ ${esc(tipo)}</span></div>`"
newjs="const tec=up(s.nombre||s.usuario||'—'),grp=up(s.unidad_grupo||s.grupo||'—'),tipos={INSTALACION_INTERNET:'INSTALACIÓN',INSTALACION_INTERNET_TV:'INSTALACIÓN',ACTIVACION_TV_EXISTENTE:'ACTIVACIÓN TV',CAMBIO_EQUIPOS:'CAMBIO DE EQUIPOS',SOPORTE_TECNICO:'SOPORTE TÉCNICO',REUBICACION:'REUBICACIÓN',RETIRO:'RETIRO',OTRO:'OTRO'},tipo=tipos[O.tipo_trabajo]||up(O.tipo_trabajo||'—'),fecha=new Date().toLocaleString('es-EC',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});const th=document.getElementById('tipoTrabajoHero');if(th)th.textContent='🛠️ '+tipo;ctx.innerHTML=`<div class=\"techRow\"><div class=\"techIcon\">📋</div><div class=\"techLabel\">OT</div><div class=\"techValue\">${esc(up(O.id_orden||ordenId()||'—'))}</div></div><div class=\"techRow\"><div class=\"techIcon\">👤</div><div class=\"techLabel\">CLIENTE</div><div class=\"techValue\">${esc(up(O.cliente_nombre||'CLIENTE'))}</div></div><div class=\"techRow group\"><div class=\"techIcon\">🚐</div><div class=\"techLabel\">GRUPO TÉCNICO</div><div class=\"techValue\">${esc(grp)}</div></div><div class=\"techRow worker\"><div class=\"techIcon\">👷</div><div class=\"techLabel\">TÉCNICO</div><div class=\"techValue\">${esc(tec)}</div></div><div class=\"techRow time\"><div class=\"techIcon\">🗓️</div><div class=\"techLabel\">HORA Y FECHA</div><div class=\"techValue\">${esc(fecha)}</div></div>`"
if oldjs not in s:
    raise SystemExit('No se encontró el bloque JS actual del contexto')
s=s.replace(oldjs,newjs,1)
p.write_text(s,encoding='utf-8')
