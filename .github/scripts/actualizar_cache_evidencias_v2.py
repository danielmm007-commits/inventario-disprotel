from pathlib import Path
import re
p=Path('instalacion-ejecucion.html')
s=p.read_text(encoding='utf-8')
s=re.sub(r'evidencias-cierre-v1\.js\?v=[^"\']+', 'evidencias-cierre-v1.js?v=20260817-2250', s)
if 'cierre-resumen-v1.js' not in s:
    s=s.replace('</body>','<script src="cierre-resumen-v1.js?v=20260817-2250"></script></body>')
else:
    s=re.sub(r'cierre-resumen-v1\.js\?v=[^"\']+', 'cierre-resumen-v1.js?v=20260817-2250', s)
p.write_text(s,encoding='utf-8')
