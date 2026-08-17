from pathlib import Path
import re

p=Path('ip-servicio-v2.js')
s=p.read_text(encoding='utf-8')

old="$('actualizar').classList.remove('hidden');$('actualizar').textContent='🔄 REVISAR IP';$('stIp').textContent=cs.length?'⚠️ IP TENTATIVA':'⏳ ESPERANDO IP';$('ipEstado').innerHTML=`<span class=\"badge wait\">${cs.length?'⚠️ IP TENTATIVA DETECTADA':'⏳ BUSCANDO IP'}</span>"
new="$('actualizar').classList.remove('hidden');$('actualizar').textContent='🔄 REVISAR IP';const agotado=q.detector_estado==='TIEMPO_AGOTADO';$('stIp').textContent=cs.length?'⚠️ IP TENTATIVA':agotado?'⏱️ BÚSQUEDA FINALIZADA':'⏳ ESPERANDO IP';$('ipEstado').innerHTML=`<span class=\"badge wait\">${cs.length?'⚠️ IP TENTATIVA DETECTADA':agotado?'⏱️ BÚSQUEDA FINALIZADA · 30 MIN':'⏳ BUSCANDO IP'}</span>"
if old not in s:
    raise SystemExit('No se encontró bloque de estado IP')
s=s.replace(old,new,1)

old2="function bootExtra(){cssExtra();observarArticulos();activarContinuarNumeral();let intentos=0;"
new2="function bootExtra(){cssExtra();observarArticulos();activarContinuarNumeral();if(!window.__disprotelIpAuto){window.__disprotelIpAuto=setInterval(()=>window.estadoIp().catch(()=>{}),8000)}let intentos=0;"
if old2 not in s:
    raise SystemExit('No se encontró bootExtra')
s=s.replace(old2,new2,1)

p.write_text(s,encoding='utf-8')

p=Path('instalacion-ejecucion.html')
s=p.read_text(encoding='utf-8')
s=re.sub(r'ip-servicio-v2\.js\?v=[^\"\']+', 'ip-servicio-v2.js?v=20260817-1604', s)
p.write_text(s,encoding='utf-8')
