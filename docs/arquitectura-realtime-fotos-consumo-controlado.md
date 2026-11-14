# DISPROTEL · Política anti-descargas repetidas y Realtime
Actualización: 2026-11-14. Aplicable a Mesa Técnica, técnico, soportes, documentos, instalaciones y capturas móviles.

## Principio de arquitectura
**Realtime transmite cambios de estado e identificadores. Nunca incluir bytes de imágenes ni enlaces firmados por defecto.**
- Los paneles muestran `GUARDADA`/tipo/fecha, no un `<img src=URL_FIRMADA>` al actualizar.
- Los enlaces Storage privados se crean exclusivamente ante interacción **Ver fotografía** o generación explícita de un informe que requiere imágenes.
- Autorización del backend por sesión válida, OT, instalación/grupo asignado y evidencia; no aceptar rutas arbitrarias aportadas por el navegador.
- Caducidad corta de URL firmada (en los visores interactivos actuales: 600 segundos).
- Evitar múltiples solicitudes de la misma foto mientras la primera siga pendiente; sin bucles de reintentos automáticos.
- Guardar imagen con compresión apropiada y máximo de tamaño; no subir repetidamente el mismo archivo por re-render.
- Realtime notifica el evento y el consumidor consulta estado/datos mínimos. Los mensajes no deben contener PII ni medios. No provocar eco de los mismos eventos.
- Consultas de respaldo solo con módulo visible y sesión activa; mantener una solicitud en vuelo y deduplicar notificaciones. Priorizar los eventos en el ping-pong Fernando ↔ técnicos.

## Componentes actualizados
- `inventario-mesa-tecnica` v36: fotos ONU, potencia, diagnóstico y acceso remoto solo con operación de vista, historial incluido.
- `mesa-tecnica-fernando-v1.js`: ninguna miniatura remota automática.
- `inventario-acceso-remoto` v19 y `acceso-remoto-fernando-v1.js`: estado sin URL y vista individual.
- `onu-activacion-tecnico-v1.js`: botones de imagen, sin miniaturas automáticas; respaldo de 30 s y señales Realtime.
- `inventario-soporte` v30 y `soporte-tecnico-v2.html`: evidencias individuales, no `support-summary` al refrescar miniaturas; avisos visuales de Mesa sin descarga.
- `inventario-instalaciones` v17 y `evidencias-instalaciones.html`: metadatos y visor por clic.
- `inventario-producto-foto` v9 y `compras-producto-fotos-v1.js`: 12 s durante sesión móvil y nuevas URLs solo para IDs nuevos.
- `inventario-evidencias-orden` y `inventario-documentos-orden`: versiones normales corregidas guardadas en GitHub, pero **ambos endpoints activos permanecen temporalmente en mantenimiento**.

## Excepciones deliberadas
- Los generadores explícitos de informes pueden solicitar fotografías para componer un PDF; no deben ejecutarse en cada evento de Realtime.
- La captura móvil puede traer automáticamente **solo la nueva imagen** mientras una sesión de captura esté activa; jamás volver a descargar sistemáticamente las anteriores.
- Todo flujo de informe/compartir debe conservar comprobación de permisos.

## Verificación antes de reabrir
1. Mantener pantalla de mantenimiento y acceso deshabilitado hasta pruebas acotadas.
2. Validar el inicio de sesión, asignación de OT, foto ONU, acceso remoto, SmartOLT, documentos, soporte, sustitución de imágenes e informe final en un único flujo de prueba.
3. En Network, al recibir un evento de Realtime **sin abrir imagen**, contar 0 solicitudes de archivos Storage de fotografías. Las solicitudes de metadatos sí pueden existir.
4. Al pulsar **Ver fotografía**, confirmar una solicitud de enlace y una descarga solo de la imagen elegida; abrirla correctamente.
5. Confirmar que los eventos y avisos de Fernando y los técnicos llegan sin eco ni consultas descontroladas; comparar manualmente con el uso del panel Supabase, **sin sondeos programados**.
6. Si algún requisito falla, mantener mantenimiento y corregir. No asumir validación funcional a partir de inspección estática.
