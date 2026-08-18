from pathlib import Path
p=Path('instalacion-ejecucion.html')
s=p.read_text(encoding='utf-8')
s=s.replace('evidencias-cierre-v1.js?v=1','evidencias-cierre-v1.js?v=20260817-2125')
s=s.replace('evidencias-cierre-v1.js?v=20260817-2124','evidencias-cierre-v1.js?v=20260817-2125')
p.write_text(s,encoding='utf-8')
