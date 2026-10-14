# DISPROTEL · Recordatorios Mesa Técnica de múltiples grupos (piloto)

## Propósito
El supervisor Fernando puede recibir simultáneamente solicitudes de múltiples grupos técnicos y resolverlas de manera independiente, sin nuevas invocaciones Edge ni nuevas consultas SQL.

## Diseño
- Cada solicitud se identifica como `ÁREA | solicitud_id`, nunca por el nombre del grupo o solo por la OT.
- IP, ONU, acceso remoto y lotes de Mesa tienen claves independientes, incluso cuando coinciden OT, grupo y horario.
- Las notificaciones visibles siguen limitadas a cuatro para que no invadan la pantalla; el indicador `Mesa: N solicitudes · M grupos` abre una cola para revisar todos los pendientes (primeras 200 filas visibles), con botones Atender / En gestión / Recordar 5 min por solicitud.
- Sonido habilitado por el usuario; recordatorios locales se muestran en tandas de hasta dos con al menos 45 segundos entre tandas, evitando ráfagas molestas. Persistencia local por sesión (máximo 500 recordatorios guardados).
- La operación Atender/En gestión no cambia el estado de la solicitud en la base.
- Cuando llega una respuesta real por Broadcast, se elimina solo el ID que fue atendido.

## Conciliación y ahorro de invocaciones
- La Edge Function **existente** `inventario-panel-supervisor` (v14) conserva la misma cantidad de llamadas a tablas y utiliza los resultados que ya había consultado para formar `avisos_snapshot`.
- El resumen contiene claves operativas `area, solicitud_id, orden_uuid, estado` de los pendientes y un marcador por área `completo`. No incorpora nombres de clientes adicionales ni IP/ONU SN en Broadcast.
- Fernando recibe `disprotel:mesa-pendientes-snapshot` desde esa respuesta del dashboard que **ya se consulta**. No hay un nuevo fetch ni una Edge Function adicional por aviso.
- Una solicitud desaparecida del resumen solo se limpia si la consulta de **su área** no alcanzó el límite de resultados; ante respuesta truncada se conserva para evitar bajas falsas.
- Se protege la carrera con Realtime: si la solicitud llegó después de iniciar la consulta, la respuesta vieja no la elimina.
- Si un cambio de atención llegó por Realtime mientras el resumen estaba en vuelo, se evita reabrir localmente el recordatorio.
- No se añade una periodicidad nueva de consulta. Los temporizadores de recordatorio son del navegador.

## Límites
- Solo está habilitada la suscripción privada para Fernando y Bryan durante el piloto.
- Fernando ve los requerimientos de los grupos; las respuestas a otros técnicos requerirán ampliar permisos y audiencia en una fase posterior.
- La cola y los temporizadores no funcionan con el navegador cerrado. Las pestañas inactivas pueden retrasar sonidos y recordatorios.
- Si la fuente de datos tiene más de 80 solicitudes de remoto, 120 ONU, 120 IP o 160 Mesa (respectivos límites actuales), el área se marca `completo=false` y **no** se limpia por ausencia hasta recibir un resumen completo o el evento específico de respuesta.
- Las OT no presentes en las 300 órdenes devueltas por el dashboard no se reconstituyen a ciegas.

## Validaciones
- Simulación de tres grupos (IP, ONU y Mesa) al mismo tiempo: tres claves, tres grupos en indicador y tres entradas en cola.
- Un resumen parcial no borra el pendiente ausente; uno completo quita solo el pendiente atendido.
- Una solicitud entrante durante una consulta antigua no se elimina prematuramente.
- El siguiente resumen completo reconcilia el pendiente resuelto.
- El código no crea Edge Functions adicionales y el número de consultas `s.from(...)` en la Edge existente permanece igual.

## Reversión
El código anterior de `inventario-panel-supervisor` estaba en v13. Se conserva el código v14 en GitHub para auditar y revertir. El frontend puede revertirse mediante PR sin tocar la OLT, IP real o inventario.
