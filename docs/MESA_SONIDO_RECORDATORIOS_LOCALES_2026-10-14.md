# DISPROTEL: sonido y recordatorios de Mesa Técnica

## Objetivo
Reforzar los avisos flotantes privados Fernando/Bryan sin Edge Functions nuevas,
consultas ni polling de servidor.

## Comportamiento
- Con un requerimiento pendiente, Fernando ve el aviso y un indicador persistente
  con el número de solicitudes sin respuesta conocido por **esa sesión**.
- **Atender**: cambia el estado **local de la notificación** a `en_gestion`,
  pospone recordatorios 15 minutos y abre la ruta de Mesa Técnica a esa OT.
  **No** cambia el estado de la solicitud en Supabase.
- **En gestión**: registra esa intención local sin navegar, pospone recordatorios 15 minutos.
- **Recordar en 5 min**: oculta el aviso y lo reenvía tras 5 minutos si no se recibió una respuesta real.
- **X**: cierra únicamente la tarjeta, no cancela recordatorios.
- Los avisos se muestran otra vez mientras la solicitud registrada permanezca pendiente.
  Hasta dos recordatorios por ciclo, para evitar ruido masivo.
- Cuando llega el Broadcast de la misma `solicitud_id` con respuesta final
  (IP ASIGNADA/CANCELADA, ONU CONFIRMADO/REQUIERE_CORRECCION,
  remoto CONFIRMADO/REQUIERE_CORRECCION, Mesa ATENDIDO),
  cancela inmediatamente el recordatorio de Fernando.
- El sonido usa **Web Audio API**, sin descargar un fichero. El usuario debe pulsar
  **«Activar sonido de Mesa»** por la política de reproducción de los navegadores.
  Se aplica un límite de tres segundos entre sonidos.
- Los recordatorios usan `setInterval` **solo en el navegador** (15 segundos para
  evaluar vencimientos de 5/15 minutos). **No** hacen fetch, SQL ni Edge Function.
- Persistencia **solo de la sesión del navegador** con vigencia máxima de 12 horas.
  Si el navegador está cerrado, se suspende la programación. Las pestañas en segundo
  plano pueden ejecutar avisos con retraso por restricciones del navegador.
- No se afirma que el supervisor haya **resuelto** una solicitud solo por pulsar
  Atender/En gestión; la respuesta oficial sigue siendo el estado en la base.
- El canal privado añade `orden_uuid` y `solicitud_id` (UUID internos), sin
  datos personales, IP, seriales, coordenadas, credenciales ni evidencias.
- El enlace abre Mesa Técnica a través de la misma ruta que ya usa el botón ATENDER
  de Supervisión Técnica, pasando la OT. Si falta el UUID, abre Supervisión técnica.

## Consumo
- Abrir/Cerrar/En gestión/Posponer/Sonido/Recordatorio: **0 invocaciones Edge nuevas**.
- El clic de **Atender** abre el módulo y ese módulo puede hacer **sus consultas habituales**.
- Los Broadcast cuentan contra cuotas de mensajes Realtime, separadas de Edge Functions.
- No hay reconocimiento multiplataforma o persistencia garantizada si el navegador
  estuvo cerrado: requeriría sincronización con servidor y potencialmente más consumo.

## Seguridad
- Exclusivo del piloto Fernando/Bryan con Auth y RLS privado ya existente.
- Sin escrituras administrativas por los botones de recordatorio.
- Sin tocar Huawei, OLT, inventario ni flujo de autorizaciones de ONU.

## Pruebas
- Parseo JavaScript, HTML y contrato del Broadcast.
- Simulación de una solicitud a Fernando, botón En gestión, ausencia de recordatorio
  a los 5 minutos, recordatorio a los 15, cancelación por respuesta real, enlace
  directo de Atender y recepción de confirmación por Bryan.
- Falta la prueba visual en Edge en las cuentas reales con una solicitud real futura.

## Deshacer
Revertir el PR frontend y quitar la función de envío de los dos UUID
(reponer la versión anterior del SQL). No borrar los triggers existentes de IP/ONU.
