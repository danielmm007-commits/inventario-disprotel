from pathlib import Path
import re

link='<link rel="stylesheet" href="responsive-global.css?v=20260818-2305">'
gps='<script src="gps-aceptacion-v1.js?v=20260818-2338"></script>'
for p in Path('.').glob('*.html'):
    if p.name=='reporte-trabajo.html':
        continue
    s=p.read_text(encoding='utf-8')
    if 'responsive-global.css' in s:
        s=re.sub(r'<link rel="stylesheet" href="responsive-global\.css\?v=[^"]+">',link,s)
    elif '</head>' in s:
        s=s.replace('</head>',link+'</head>',1)
    if p.name=='trabajos-tecnicos.html':
        s=re.sub(r'<script src="gps-aceptacion-v1\.js\?v=[^"]+"></script>','',s)
        if '</body>' in s:
            s=s.replace('</body>',gps+'</body>',1)
    p.write_text(s,encoding='utf-8')
