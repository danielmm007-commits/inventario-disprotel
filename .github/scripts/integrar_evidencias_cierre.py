from pathlib import Path
p=Path('instalacion-ejecucion.html')
s=p.read_text(encoding='utf-8')
old='<details class="card"><summary>5. Evidencias y cierre <span class="summaryState">PENDIENTE</span></summary><div class="body"><div class="box"><b>GPS, fotografías, prueba de velocidad y finalización</b><div class="muted">Lo integraremos después de dejar artículos e IP cerrados.</div></div></div></details>'
new='''<details class="card" id="accEvidencias"><summary>5. Evidencias y cierre <span id="stEvidencias" class="summaryState">PENDIENTE</span></summary><div class="body"><div class="box"><b>📍 UBICACIÓN GPS DE LA INSTALACIÓN</b><div class="muted">Se guarda con fecha, hora y precisión. Esta ubicación acompañará las evidencias.</div><div id="evGps"></div><button id="capturarGpsEv">📍 CAPTURAR UBICACIÓN ACTUAL</button></div><div class="photoBox"><b>🏠 INSTALACIÓN GENERAL</b><div class="muted">Foto general del trabajo terminado.</div><div id="st-INSTALACION_GENERAL" style="margin-top:8px"></div><div class="photoActions"><button id="btncam-INSTALACION_GENERAL">📷 TOMAR FOTO</button><button id="btngal-INSTALACION_GENERAL" class="secondary">🖼️ ELEGIR DE GALERÍA</button></div></div><div class="photoBox"><b>📡 EQUIPOS INSTALADOS</b><div class="muted">Foto de ONU/router y equipos instalados.</div><div id="st-EQUIPOS_INSTALADOS" style="margin-top:8px"></div><div class="photoActions"><button id="btncam-EQUIPOS_INSTALADOS">📷 TOMAR FOTO</button><button id="btngal-EQUIPOS_INSTALADOS" class="secondary">🖼️ ELEGIR DE GALERÍA</button></div></div><div class="photoBox"><b>🔌 PUNTO / TERMINACIÓN DE FIBRA</b><div class="muted">Roseta, caja o terminación final de fibra.</div><div id="st-PUNTO_FIBRA" style="margin-top:8px"></div><div class="photoActions"><button id="btncam-PUNTO_FIBRA">📷 TOMAR FOTO</button><button id="btngal-PUNTO_FIBRA" class="secondary">🖼️ ELEGIR DE GALERÍA</button></div></div><div id="evMsg"></div></div></details>'''
if old not in s:
    raise SystemExit('No se encontró el bloque original del numeral 5')
s=s.replace(old,new,1)
inputs='''<input id="cam-INSTALACION_GENERAL" class="hidden" type="file" accept="image/*,.heic,.heif" capture="environment"><input id="gal-INSTALACION_GENERAL" class="hidden" type="file" accept="image/*,.heic,.heif"><input id="cam-EQUIPOS_INSTALADOS" class="hidden" type="file" accept="image/*,.heic,.heif" capture="environment"><input id="gal-EQUIPOS_INSTALADOS" class="hidden" type="file" accept="image/*,.heic,.heif"><input id="cam-PUNTO_FIBRA" class="hidden" type="file" accept="image/*,.heic,.heif" capture="environment"><input id="gal-PUNTO_FIBRA" class="hidden" type="file" accept="image/*,.heic,.heif">'''
anchor='<input id="serialCam" class="hidden" type="file" accept="image/*" capture="environment">'
if inputs not in s:
    s=s.replace(anchor,anchor+inputs,1)
script='<script src="evidencias-cierre-v1.js?v=1"></script>'
if script not in s:
    s=s.replace('</body>',script+'</body>',1)
p.write_text(s,encoding='utf-8')
print('Numeral 5 integrado')