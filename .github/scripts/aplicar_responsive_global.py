from pathlib import Path
import re

link='<link rel="stylesheet" href="responsive-global.css?v=20260818-2305">'
gps='<script src="gps-aceptacion-v1.js?v=20260818-2338"></script>'
hitos='<script src="gps-hitos-tecnico-v1.js?v=20260818-0635"></script>'
activos='<script src="trabajos-vista-activos-v1.js?v=20260818-0924"></script>'
flex='<script src="domicilio-flujo-flex-v1.js?v=20260818-0904"></script>'
docdom='<script src="domicilio-documento-v1.js?v=20260818-0818"></script>'
contacto='<script src="domicilio-contacto-final-v1.js?v=20260818-0824"></script>'
nav='<script src="flujo-navegacion-v1.js?v=20260818-0924"></script>'
plan='<script src="plan-catalogo-v1.js?v=20260818-0721"></script>'
cedula='<script src="cedula-miniaturas-v1.js?v=20260818-0758"></script>'
ident='<script src="ejecucion-identificacion-v1.js?v=20260818-0803"></script>'
for p in Path('.').glob('*.html'):
    if p.name=='reporte-trabajo.html':
        continue
    s=p.read_text(encoding='utf-8')
    if 'responsive-global.css' in s:
        s=re.sub(r'<link rel="stylesheet" href="responsive-global\.css\?v=[^"]+">',link,s)
    elif '</head>' in s:
        s=s.replace('</head>',link+'</head>',1)
    if p.name=='trabajos-tecnicos.html':
        s=re.sub(r'<script src="trabajos-vista-activos-v1\.js\?v=[^"]+\"></script>','',s)
        if '</head>' in s:s=s.replace('</head>',activos+'</head>',1)
        s=re.sub(r'<script src="gps-aceptacion-v1\.js\?v=[^"]+\"></script>','',s)
        s=re.sub(r'<script src="gps-hitos-tecnico-v1\.js\?v=[^"]+\"></script>','',s)
        if '</body>' in s:
            s=s.replace('</body>',gps+hitos+'</body>',1)
    if p.name=='instalacion-domicilio.html':
        s=re.sub(r'<script src="domicilio-flujo-flex-v1\.js\?v=[^"]+\"></script>','',s)
        s=re.sub(r'<script src="domicilio-documento-v1\.js\?v=[^"]+\"></script>','',s)
        s=re.sub(r'<script src="domicilio-contacto-final-v1\.js\?v=[^"]+\"></script>','',s)
        s=re.sub(r'<script src="flujo-navegacion-v1\.js\?v=[^"]+\"></script>','',s)
        if '</body>' in s:s=s.replace('</body>',flex+docdom+contacto+nav+'</body>',1)
    if p.name=='instalacion-ejecucion.html':
        s=re.sub(r'<script src="plan-catalogo-v1\.js\?v=[^"]+\"></script>','',s)
        s=re.sub(r'<script src="cedula-miniaturas-v1\.js\?v=[^"]+\"></script>','',s)
        s=re.sub(r'<script src="ejecucion-identificacion-v1\.js\?v=[^"]+\"></script>','',s)
        s=re.sub(r'<script src="flujo-navegacion-v1\.js\?v=[^"]+\"></script>','',s)
        if '</body>' in s:s=s.replace('</body>',plan+cedula+ident+nav+'</body>',1)
    p.write_text(s,encoding='utf-8')
