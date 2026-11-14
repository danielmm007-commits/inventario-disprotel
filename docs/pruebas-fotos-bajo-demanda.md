# Validación de fotografías bajo demanda — DISPROTEL
Este documento describe una **prueba manual**, no un proceso automático. No ejecuta llamadas a Supabase por sí mismo.

## Cambios emparejados (no desplegar por separado)
- `supabase/functions/inventario-evidencias-orden/index.ts` + `evidencias-cierre-v1.js`
- `supabase/functions/inventario-documentos-orden/index.ts` + `cedula-miniaturas-v1.js` + `domicilio-documento-v1.js`

## Pruebas antes de publicar (en entorno aislado)
1. Con una OT de prueba, abrir las pantallas de documentos y evidencias **sin pulsar ver**. Confirmar en Network que no se solicitan archivos `/storage/v1/object/sign/` ni URLs de imagen, aunque sí pueda haber solicitudes de metadatos a Edge Functions.
2. Abrir una evidencia individual con `VER GRANDE`: exactamente **una** solicitud de enlace y una descarga por acción voluntaria; confirmar visualización.
3. Abrir una cédula desde la pantalla de instalación y desde domicilio: solo la foto seleccionada se descarga; botones de captura, reemplazo y compartir siguen operativos.
4. Repetir prueba con OT cerrada y acceso válido; intentar acceder a un documento de otra OT y confirmar que el backend lo rechaza.
5. Registrar y reemplazar una imagen de prueba; la vista de metadatos sigue correcta y no se vuelven a descargar todas las fotos.
6. Probar actualización de GPS, cierre de OT y resumen; confirmar que no hay regresiones.
7. Medir manualmente invocaciones y egress del panel de Supabase tras una sola sesión de prueba, sin sondeos programados ni cargas masivas.
8. Si falla cualquier caso, **no fusionar** el PR ni desplegar estas funciones en el proyecto activo.

## Precauciones
- Los cambios de backend devuelven metadatos y **dejan de incluir URL** en consultas de contexto/status; publicar únicamente con todos los consumidores corregidos.
- Los scripts de sincronización de PC Scanner y otros módulos de imágenes requieren auditoría separada.
- Las ocho comprobaciones estáticas realizadas en revisión son **no funcionales**: no sustituyen esta prueba.
