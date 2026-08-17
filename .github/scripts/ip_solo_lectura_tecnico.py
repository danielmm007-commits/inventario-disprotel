from pathlib import Path
import re

js = Path('ip-servicio-v2.js')
s = js.read_text(encoding='utf-8')
old = """<div class=\"muted\" style=\"margin-top:8px\">Cuando Fernando confirme la IP por su medio habitual, regístrala aquí. Quedará auditado que Fernando la confirmó y el técnico solo la digitó.</div><div class=\"pickRow\" style=\"margin-top:8px\"><input id=\"ipFernando\" inputmode=\"decimal\" autocomplete=\"off\" placeholder=\"Ej. 172.25.1.120\"><button type=\"button\" onclick=\"registrarIpFernando()\">✅ REGISTRAR IP CONFIRMADA POR FERNANDO</button></div>"""
new = """<div class=\"muted\" style=\"margin-top:8px\"><b>El técnico no registra ni confirma la IP.</b> Fernando o un responsable autorizado debe confirmarla desde su módulo. Cuando lo haga, esta pantalla se actualizará automáticamente.</div>"""
if old in s:
    s = s.replace(old, new)
else:
    s = re.sub(r'<div class="muted" style="margin-top:8px">Cuando Fernando confirme la IP.*?</div><div class="pickRow".*?</div>', new, s, count=1)

s = re.sub(r"window\.registrarIpFernando=async function\(\)\{.*?\};\n", "window.registrarIpFernando=async function(){show('La IP solo puede confirmarla un responsable autorizado.','warn')};\n", s, count=1, flags=re.S)
s = s.replace("const agotado=q.detector_estado==='TIEMPO_AGOTADO';", "const agotado=q.detector_estado==='TIEMPO_AGOTADO'||q.detector_detalle?.motivo==='VENTANA_30_MINUTOS_FINALIZADA';")
js.write_text(s, encoding='utf-8')

html = Path('instalacion-ejecucion.html')
h = html.read_text(encoding='utf-8')
h = re.sub(r'ip-servicio-v2\.js\?v=[^\"\']+', 'ip-servicio-v2.js?v=20260817-1801', h)
html.write_text(h, encoding='utf-8')
