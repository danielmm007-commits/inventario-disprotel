from pathlib import Path
import re
p=Path('instalacion-ejecucion.html')
s=p.read_text(encoding='utf-8')
s2=re.sub(r'evidencias-cierre-v1\.js\?v=[^"\']+', 'evidencias-cierre-v1.js?v=20260817-2152', s)
if s2==s:
    s2=s.replace('evidencias-cierre-v1.js', 'evidencias-cierre-v1.js?v=20260817-2152', 1)
p.write_text(s2, encoding='utf-8')
