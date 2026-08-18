from pathlib import Path
import re

link='<link rel="stylesheet" href="responsive-global.css?v=20260818-2305">'
gps='<script src="gps-aceptacion-v1.js?v=20260818-2338"></script>'
hitos='<script src="gps-hitos-tecnico-v1.js?v=20260818-0635"></script>'
activos='<script src="trabajos-vista-activos-v1.js?v=20260818-1048"></script>'
prepaint='<style id="preSessionCss">html.preSession body{visibility:hidden!important}</style><script id="preSessionJs">(()=>{try{const s=JSON.parse(sessionStorage.getItem("disprotel_trabajos_test")||"null");if(s?.usuario&&s?.pin)document.documentElement.classList.add("preSession")}catch{}})();</script>'
execpre='<style id="execHeaderPrepaint">[data-contexto-ejecucion]:not([data-compacto="1"]){visibility:hidden!important}</style>'
flex='<script src="domicilio-flujo-flex-v1.js?v=20260818-1103"></script>'
correo='<script src="correo-tld-v1.js?v=20260818-1202"></script>'
docdom='<script src="domicilio-documento-v1.js?v=20260818-0818"></script>'
contacto='<script src="domicilio-contacto-final-v1.js?v=20260818-0824"></script>'
nav='<script src="flujo-navegacion-v1.js?v=20260818-1031"></script>'
plan='<script src="plan-catalogo-v1.js?v=20260818-1504"></script>'
ipcompact='<script src="ip-plan-compacto-v3.js?v=20260818-1504"></script>'
cedula='<script src="cedula-miniaturas-v1.js?v=20260818-1443"></script>'
ident='<script src="ejecucion-identificacion-v1.js?v=20260818-1105"></script>'
equipos='<script src="equipos-guardado-fluido-v1.js?v=20260818-1237"></script>'
onu='<script src="onu-control-modelo-v1.js?v=20260818-1350"></script>'
eliminar='<script src="items-eliminar-inline-v1.js?v=20260818-1426"></script>'
for p in Path('.').glob('*.html'):
    if p.name=='reporte-trabajo.html':
        continue
    s=p.read_text(encoding='utf-8')
    if 'responsive-global.css' in s:
        s=re.sub(r'<link rel="stylesheet" href="responsive-global\.css\?v=[^"]+">',link,s)
    elif '</head>' in s:
        s=s.replace('</head>',link+'</head>',1)
    if p.name=='trabajos-tecnicos.html':
        s=re.sub(r'<style id="preSessionCss">.*?</style><script id="preSessionJs">.*?</script>','',s,flags=re.S)
        s=re.sub(r'<script src="trabajos-vista-activos-v1\.js\?v=[^"]+\"></script>','',s)
        if '</head>' in s:s=s.replace('</head>',prepaint+activos+'</head>',1)
        s=re.sub(r'<script src="gps-aceptacion-v1\.js\?v=[^"]+\"></script>','',s)
        s=re.sub(r'<script src="gps-hitos-tecnico-v1\.js\?v=[^"]+\"></script>','',s)
        if '</body>' in s:
            s=s.replace('</body>',gps+hitos+'</body>',1)
    if p.name=='instalacion-domicilio.html':
        s=re.sub(r'<script src="domicilio-flujo-flex-v1\.js\?v=[^"]+\"></script>','',s)
        s=re.sub(r'<script src="correo-tld-v1\.js\?v=[^"]+\"></script>','',s)
        s=re.sub(r'<script src="domicilio-documento-v1\.js\?v=[^"]+\"></script>','',s)
        s=re.sub(r'<script src="domicilio-contacto-final-v1\.js\?v=[^"]+\"></script>','',s)
        s=re.sub(r'<script src="flujo-navegacion-v1\.js\?v=[^"]+\"></script>','',s)
        if '</body>' in s:s=s.replace('</body>',flex+correo+docdom+contacto+nav+'</body>',1)
    if p.name=='instalacion-ejecucion.html':
        s=re.sub(r'<style id="execHeaderPrepaint">.*?</style>','',s,flags=re.S)
        if '</head>' in s:s=s.replace('</head>',execpre+'</head>',1)
        s=s.replace("await post(B+'inventario-items-instalacion','batch-edit-items'","await post(API_DOM,'batch-edit-items'")
        s=s.replace("show(`✅ ${cambios.length} modificación(es) guardada(s). Inventario actualizado.`);await cargarInventario();await estadoArticulos(true)","show(`✅ ${cambios.length} modificación(es) guardada(s). Inventario actualizado.`);const bl=$('guardarCambiosMasivos');if(bl){let ml=$('accionResultadoLocal');if(!ml){ml=document.createElement('div');ml.id='accionResultadoLocal';bl.insertAdjacentElement('afterend',ml)}ml.className='msg ok';ml.textContent=`✅ ${cambios.length} modificación(es) guardada(s). Inventario actualizado.`}await cargarInventario();await estadoArticulos(true)")
        s=s.replace("catch(e){show(e.message,'err');actualizarConteoCambios()}","catch(e){show(e.message,'err');const bl=$('guardarCambiosMasivos');if(bl){let ml=$('accionResultadoLocal');if(!ml){ml=document.createElement('div');ml.id='accionResultadoLocal';bl.insertAdjacentElement('afterend',ml)}ml.className='msg err';ml.textContent='❌ '+e.message}actualizarConteoCambios()}",1)
        s=re.sub(r'<script src="plan-catalogo-v1\.js\?v=[^"]+\"></script>','',s)
        s=re.sub(r'<script src="ip-plan-compacto-v3\.js\?v=[^"]+\"></script>','',s)
        s=re.sub(r'<script src="cedula-miniaturas-v1\.js\?v=[^"]+\"></script>','',s)
        s=re.sub(r'<script src="ejecucion-identificacion-v1\.js\?v=[^"]+\"></script>','',s)
        s=re.sub(r'<script src="equipos-guardado-fluido-v1\.js\?v=[^"]+\"></script>','',s)
        s=re.sub(r'<script src="onu-control-modelo-v1\.js\?v=[^"]+\"></script>','',s)
        s=re.sub(r'<script src="items-eliminar-inline-v1\.js\?v=[^"]+\"></script>','',s)
        s=re.sub(r'<script src="flujo-navegacion-v1\.js\?v=[^"]+\"></script>','',s)
        if '</body>' in s:s=s.replace('</body>',plan+ipcompact+cedula+ident+equipos+onu+eliminar+nav+'</body>',1)
    p.write_text(s,encoding='utf-8')
