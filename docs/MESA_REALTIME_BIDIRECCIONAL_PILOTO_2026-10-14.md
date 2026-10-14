# DISPROTEL · Avisos de Mesa Técnica (piloto Fernando / Bryan)

## Objetivo
Enviar avisos flotantes de operaciones importantes **sin invocar Edge Functions adicionales**. Un trigger de Postgres emite Broadcast privado de metadatos; el cliente ya suscrito dibuja el mensaje.

## Alcance
- **Fernando**: solicitudes nuevas de IP, ONU, acceso remoto y lotes de Mesa Técnica.
- **Bryan**: IP asignada/cancelada, ONU confirmada/corrección, acceso remoto confirmado/corrección y requerimientos atendidos.
- Los eventos de otras órdenes no deben mostrar respuestas en Bryan: se comprueba `destinatario` contra su `responsables.id`.
- Canal `disprotel:ot-eventos` mantiene la política RLS estricta existente para únicamente los dos Auth del piloto.
- No incluye nombres de clientes, IP, seriales de ONU, evidencias, ubicación GPS, coordenadas, números de teléfono, detalles ni observaciones en Broadcast.
- El cliente se obtiene exclusivamente de los datos ya devueltos por el dashboard autenticado del supervisor o la consulta técnica autenticada, en eventos del navegador del mismo origen.
- Confirmación de ONU significa **confirmación de registro/evidencia en el ERP**, **NO** autorización o configuración física en la OLT.
- **Sin cambios en Huawei, inventario o funcionalidades de autorización ONU.**

## Fuentes de eventos
1. `orden_ip_solicitudes`: INSERT y cambios de `estado` solamente. Nunca `detector_estado`, escaneo o candidatos.
2. `orden_onu_solicitudes`: INSERT y cambios de `estado`.
3. `orden_acceso_remoto`: INSERT y cambios de `estado`.
4. `orden_mesa_requerimientos`: INSERT y cambios de `estado`; solo códigos conocidos de acciones.
Las actualizaciones sin cambio de estado no generan aviso. Los eventos por lote de Mesa evitan duplicar la notificación inicial desde la tabla subordinada durante una ventana de 20 segundos.

## Consumo y seguridad
- El Broadcast y las ventanas flotantes no cuentan como invocaciones de Edge Function.
- Cada operación original, si usa una Edge Function, mantiene su invocación normal.
- Realtime consume cuotas propias de mensajes/conexiones.
- La integración **no** fuerza `dashboard` ni `inventario-ordenes` al recibir cada aviso de Mesa. El panel puede actualizar datos cuando se abre o mediante su sondeo de respaldo actual.
- La función de trigger captura errores en Realtime, garantizando que un fallo del aviso no impida registrar la operación.
- Los scripts tienen limitación por usuario, audiencia y destinatario, antirrepetición de 5s, máximo cuatro tarjetas y cierre automático a 16s.
- Evita duplicados visuales en iframes integrados.

## Validaciones
- Validación estática de JavaScript, HTML y SQL por inspección.
- Prueba local simulada: solicitud IP a Fernando, respuesta IP a Bryan, ONU confirmada a Bryan y lote de Mesa a Fernando, incluyendo filtrado cruzado y por destinatario.
- **Pendiente**: prueba extremo a extremo con próxima solicitud real autorizada, revisando emisión del evento, recepción en navegadores y consumo de Edge Functions.

## Reversión
- Scripts frontend: revertir PR asociado o quitar `disprotel-mesa-avisos-v1.js`.
- SQL: `DROP TRIGGER IF EXISTS trg_disprotel_mesa_realtime_ip ON public.orden_ip_solicitudes;` y análogos `_onu`, `_remoto`, `_requerimiento`. No borrar triggers preexistentes de detector IP. No modificar RLS/Reatime existente.
