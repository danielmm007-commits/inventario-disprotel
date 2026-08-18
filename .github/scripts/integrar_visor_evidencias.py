from pathlib import Path
p=Path('instalacion-ejecucion.html')
s=p.read_text(encoding='utf-8')
tag='<script src="evidencias-modal-v1.js?v=20260817-2206"></script>'
if 'evidencias-modal-v1.js' not in s:
    s=s.replace('</body></html>',tag+'</body></html>')
else:
    import re
    s=re.sub(r'<script src="evidencias-modal-v1\.js\?v=[^"]+"></script>',tag,s)
p.write_text(s,encoding='utf-8')
