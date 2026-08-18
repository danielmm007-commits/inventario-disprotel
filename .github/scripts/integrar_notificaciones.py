from pathlib import Path
for name in ['solicitudes-oficina.html','asignacion-ip.html']:
    p=Path(name)
    s=p.read_text(encoding='utf-8')
    tag='<script src="notificaciones-v1.js?v=20260817-2222"></script>'
    if 'notificaciones-v1.js' not in s:
        s=s.replace('</body>',tag+'</body>')
    else:
        import re
        s=re.sub(r'notificaciones-v1\.js\?v=[^"\']+','notificaciones-v1.js?v=20260817-2222',s)
    p.write_text(s,encoding='utf-8')
