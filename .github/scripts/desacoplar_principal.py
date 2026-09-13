from pathlib import Path

root = Path('.')
base_path = root / 'principal-base.html'
principal_path = root / 'principal.html'
integracion_path = root / 'integracion-admin-panel.js'

base = base_path.read_text(encoding='utf-8')

head_injection = '''
<!-- PRINCIPAL DIRECTO: evita pintar la estructura antigua antes del menú definitivo -->
<style id="principalDirectPrepaint">html{visibility:hidden}</style>
<link rel="stylesheet" href="disprotel-erp-theme-v1.css?v=20260913-direct">
<link rel="stylesheet" href="disprotel-erp-refine.css?v=20260913-direct">
<link rel="stylesheet" href="erp-sidebar-dinamico-v1.css?v=20260913-direct">
'''

scripts = '''
<!-- PRINCIPAL DIRECTO: scripts funcionales cargados sobre el DOM definitivo -->
<script src="integracion-admin-panel.js?v=20260913-direct"></script>
<script src="panel-dinamico-permisos-v2.js?v=20260913-direct"></script>
<script src="panel-experiencia-v1.js?v=20260913-direct"></script>
<script src="erp-sidebar-dinamico-v1.js?v=20260913-direct"></script>
<script src="prioridad-tecnica-local-v1.js?v=20260913-direct"></script>
<script src="navegacion-movil-historial-v1.js?v=20260913-direct"></script>
<script src="compras-seriales-loader-v1.js?v=20260913-direct"></script>
<script src="inventario-inicial-loader-v1.js?v=20260913-direct"></script>
<script src="chat-interno-v1.js?v=20260913-direct"></script>
<script src="chat-limpieza-ui-v1.js?v=20260913-direct"></script>
<script src="panel-supervisor-agrupado-v1.js?v=20260913-direct"></script>
<script src="supervisor-ot-progreso-v1.js?v=20260913-direct"></script>
<script src="alertas-inventario-ui-v1.js?v=20260913-direct"></script>
<script src="informes-finalizados-v1.js?v=20260913-direct"></script>
'''

if 'principalDirectPrepaint' not in base:
    base = base.replace('</head>', head_injection + '\n</head>', 1)

if 'integracion-admin-panel.js?v=20260913-direct' not in base:
    base = base.replace('</body>', scripts + '\n</body>', 1)

principal_path.write_text(base, encoding='utf-8')

# El revelado final también elimina el prepaint definido directamente en principal.html.
integracion = integracion_path.read_text(encoding='utf-8')
needle = "document.body.classList.add('panelAtomicReady');"
replacement = "document.body.classList.add('panelAtomicReady');document.getElementById('principalDirectPrepaint')?.remove();"
if needle in integracion and replacement not in integracion:
    integracion = integracion.replace(needle, replacement, 1)
integracion_path.write_text(integracion, encoding='utf-8')

# principal-base.html queda fuera de ejecución. Solo se elimina si ninguna página o script
# funcional lo referencia después de generar principal.html.
refs = []
for path in root.rglob('*'):
    if not path.is_file():
        continue
    if '.git' in path.parts or '.github' in path.parts or path.name in {'principal-base.html'}:
        continue
    try:
        text = path.read_text(encoding='utf-8')
    except Exception:
        continue
    if 'principal-base.html' in text:
        refs.append(str(path))

if not refs:
    base_path.unlink()
    print('principal-base.html eliminado: ya no tiene referencias activas.')
else:
    print('principal-base.html queda como respaldo porque aún aparece en:', refs)

print('principal.html ahora contiene el DOM definitivo y ya no usa fetch/document.write para montar el panel.')
