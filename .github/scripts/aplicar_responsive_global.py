from pathlib import Path

link='<link rel="stylesheet" href="responsive-global.css?v=20260818-2305">'
for p in Path('.').glob('*.html'):
    if p.name=='reporte-trabajo.html':
        continue
    s=p.read_text(encoding='utf-8')
    if 'responsive-global.css' in s:
        import re
        s=re.sub(r'<link rel="stylesheet" href="responsive-global\.css\?v=[^"]+">',link,s)
    elif '</head>' in s:
        s=s.replace('</head>',link+'</head>',1)
    p.write_text(s,encoding='utf-8')
