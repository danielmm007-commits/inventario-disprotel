# DISPROTEL — contrato funcional de reporte final y acceso remoto por equipo

**Decisión del usuario · 19/oct/2026.** Aplicar en PR #133. Sin fusionar ni desplegar una implementación parcial.

## 1. Comprobación única, evidencias de múltiples equipos
- Una OT tiene **una sola comprobación operativa** `VERIFICAR_ACCESO_REMOTO`. No repetir filas de requerimiento ni permitir que Bryan la confirme.
- Es Fernando/Mesa Técnica quien valida la comprobación global, solo cuando **todas** las evidencias requeridas por los equipos de esta visita estén presentes y vigentes.
- Las evidencias son **por equipo**, NO una única imagen por OT:
  - `RADIO`: al menos `ANTENA_CPE_1` y `ROUTER_WIFI_1` (2 evidencias diferentes).
  - `FIBRA`: `ROUTER_WIFI_1`, no pedir acceso remoto a ONU bridge por defecto (1 evidencia).
  - Dos routers WiFi instalados/utilizados en el cliente: `ROUTER_WIFI_1` y `ROUTER_WIFI_2`, incluso si son de la misma marca; usar identificación real del router/serial si existe.
  - RADIO + dos routers WiFi: antena/CPE + Router WiFi 1 + Router WiFi 2 (3 capturas actuales).
- El formulario debe permitir añadir un router cuando la OT lo requiera y mostrar estado independiente **Pendiente / Captura cargada / Confirmado** por cada equipo.
- No confundir `VERIFICAR_ACCESO_REMOTO` con varias solicitudes de Mesa: son evidencias componentes de **una comprobación única**.
- La ruta/link a cada dispositivo debe estar fundamentada en la configuración real de la OT, no asumir que todos comparten IP/puerto o que es correcto copiar el enlace del primer equipo.
- La identidad del slot de router debe basarse preferentemente en identificador de inventario/serial; si falta, usar número de equipo ligado a la OT, no nombre comercial del modelo.
- Solo personal de Mesa Técnica puede ejecutar `confirm`/revisar corrección; el técnico puede solicitar revisión, NO auto-confirmar.

## 2. Solo la evidencia vigente por equipo
- Cuando se sube otra foto al mismo equipo, la nueva sustituye a la anterior, sin crear otra comprobación.
- NO conservar fotos antiguas de cada equipo para auditoría como archivos históricos de prueba.
- Las fotos de diferentes equipos (antena y router, Router 1 y Router 2) se mantienen simultáneamente como vigentes hasta integrar el reporte final.
- Al cargar sustitución, verificar guardado correcto de la nueva imagen y actualización del puntero antes de eliminar la anterior; no borrar pruebas de trabajos anteriores mientras aún no existe un archivo final cerrado.
- Tras generar y verificar la hoja final en Storage, retirar los temporales conforme a política de retención del proyecto; el **reporte final** es la constancia archivada.
- Antes de limpiar originales, comprobar que el PDF final incorpora nítidamente cada evidencia actual de cada equipo y que el documento es recuperable con credenciales autorizadas.

## 3. Imprimir / Guardar PDF — comportamiento ya acordado
- Previsualización de la hoja antes del cierre; permite **Volver a editar** o **Confirmar y cerrar trabajo**. No gastar inventario/seriales antes del cierre.
- Al cerrar, validar datos obligatorios, IP (cuando aplique), materiales/seriales, GPS (según etapa), evidencias/confirmaciones y coherencia de la canasta. Cierre consistente con movimiento de inventario, estado y autor/timestamp.
- Hoja oficial DISPROTEL A4, ordenada y printable, con logo y OT, solicitante/cliente, contacto, servicio/plan/IP, técnico/grupo, fechas/tiempos, hallazgo + solución (únicos, numeral 2), observaciones adicionales opcionales (numeral 4), inventario/seriales, ubicación GPS y evidencias vigentes rotuladas por equipo.
- La impresión A4 no incluye botones o controles. Tras cerrar, controles **Regresar** e **Imprimir / Guardar PDF**, como acordado.
- En `reporte-trabajo.html`, los botones actuales Imprimir y Guardar PDF ejecutan `window.print()`: **no** significa que el PDF quede almacenado automáticamente en la OT.
- En `soporte-resumen-v2.html`, «Imprimir / Guardar PDF» también invoca `window.print()`; el CSS no define `@page A4` y debe armonizarse con la hoja oficial.
- El documento **definitivo** debe generarse/congelarse y quedar archivado en Storage con referencia en la OT, visible para técnico y solicitante (más adelante administración/gerencia), incluso si el usuario nunca pulsa el botón de imprimir.
- La PC Scanner tiene `transferencias-temporales/archivo-disprotel-20261012/archivar-reportes.py` que hoy descarga evidencia bruta, no crea el PDF final. No confundir copia local de fotos con archivado de hoja final ni usarla como única copia.
- No afirmar que el archivo PDF ya se guarda automáticamente: implementación y pruebas pendientes.

## 4. Implicaciones técnicas
- Actualmente `orden_acceso_remoto` posee puntero único `soporte_evidencia_id` / `evidencia_id`: NO permite representar dos equipos.
- `soporte_evidencias` tiene índice único parcial activo por (orden_id, tipo_foto), con `ACCESO_REMOTO` tratado como un único tipo: hay que introducir identidad de equipo/slot y cambiar la unicidad a (orden_id, slot de equipo), **sin perder la protección contra duplicados de un mismo equipo**.
- Respuestas de `inventario-acceso-remoto` (`status`/`pending`), confirmación, rectificación, las vistas de Fernando y el reporte deben leer una colección de evidencias vigentes por equipo. Mantener compatibilidad con comprobantes antiguos que solo tenían una foto.
- El comprobante de Mesa sigue siendo uno, con lista de IDs de las evidencias actuales para cada equipo. Cada foto rotulada por dispositivo; no inventar acceso remoto confirmado si falta una requerida.
- Si el informe final no se genera o no puede recuperarse, el procedimiento **no debe limpiar fotografías actuales ni declarar completo el archivado final**.
- Ejecutar pruebas de migración/escritura en el proyecto de pruebas solo con implementación completa y autorizada; no desplegar una mezcla de interfaz nueva y backend con puntero único.

## 5. Casos de aceptación
| Caso | Capturas requeridas | Condición para confirmar |
|---|---|---|
| FIBRA, 1 router WiFi | Router 1 | 1/1 actual |
| FIBRA, 2 routers WiFi | Router 1 + Router 2 | 2/2 actuales |
| RADIO, antena/CPE + 1 router WiFi | Antena + Router 1 | 2/2 actuales |
| RADIO, antena/CPE + 2 routers WiFi | Antena + Router 1 + Router 2 | 3/3 actuales |
| Reemplazar foto de Router 1 | Misma ranura Router 1, versión nueva | Sin segunda comprobación, Router 2 intacto |
| Omitir foto de Router 2 con 2 routers configurados | Solo Router 1 | Fernando NO puede confirmar |
| Imprimir después del cierre | Hoja oficial A4, sin controles | Fotos rotuladas por equipo, mismo contenido archivado |
| No pulsar «Guardar PDF» en navegador | — | Hoja final sigue disponible en la OT |
| Fallar archivado final | — | No descartar evidencia temporal ni reportar archivo final completo |

**Pendiente:** implementación de backend de colección de evidencias por equipo, almacenamiento/archivado oficial PDF, pruebas E2E con Fernando/Bryan. PR #133 sigue en borrador hasta completar.
