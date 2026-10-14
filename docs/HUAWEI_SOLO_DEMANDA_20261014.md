# DISPROTEL · Huawei bajo demanda + lecturas ópticas compartidas

## Objetivo y límites
El usuario pidió compartir **una sola lectura nueva Huawei** entre Fernando y Bryan y reducir los sondeos Edge de 8 segundos. Se mantiene el agente Huawei de PC **apagado hasta que un operador lo inicie expresamente**. Nada configura, autoriza, borra ni reinicia ONU en la OLT.

## Flujo
1. Fernando abre Mesa Técnica desde una OT de soporte activa y pulsa **Consultar potencia Huawei ahora**. Debe existir un requerimiento **PENDIENTE** de `VERIFICAR_POTENCIA`.
2. La Edge Function EXISTENTE `inventario-mesa-tecnica` valida sesión/rol, OT, servicio y vinculación por serial; consulta caché Huawei por SN indexado, valida que coincida con la OLT vinculada y registra `consulta_red_solicitudes`. Si ya hay lectura pendiente de esa ONU la reutiliza; si es de otra OT, genera un registro seguidor asociado a su propia OT.
3. El agente `huawei-olt-reader.py --on-demand` obtiene la configuración de OLT una vez/hora y consulta los pendientes **de todas las OLT en UNA petición cada 60 segundos** (configurable). Cuando no hay pendientes, NO ejecuta ningún comando Huawei.
4. Para cada serial pendiente, corre el lector individual `display ont info by-sn` y luego `display ont optical-info`, sin inventario, autofind ni barrido. Procesa como máximo 8 filas/ciclo. Para solicitudes duplicadas por SN/OLT, solo realiza UNA lectura física.
5. La Edge Function EXISTENTE `inventario-onu-detector` valida serial, muestra óptica, fecha posterior a la solicitud y evita que una muestra anterior sobreescriba `huawei_onus_cache`. Propaga la lectura a otras solicitudes de demanda pendientes del mismo SN/OLT. Añade muestras aceptadas a `huawei_onu_senal_historial` sin borrar historia.
6. Los triggers privados Broadcast envían solo `orden_uuid`, `solicitud_id`, `estado` y `revision`: nunca envían datos del cliente, SN, IP ni niveles ópticos. Los navegadores autorizados reciben `disprotel:huawei-resultado` y hacen **una sola consulta de estado** para visualizar la medición compartida (no una por segundo).

## Cómo iniciar el modo bajo demanda en PC
Actualizar `huawei-olt-reader.py` desde GitHub y conservar las variables de entorno ya configuradas de Supabase/OLT/DETECTOR_TOKEN. **NO** publicar credenciales en GitHub.
- Probar el parser sin conectarse: `py .\huawei-olt-reader.py --self-test`
- Iniciar explícitamente: `py .\huawei-olt-reader.py --on-demand`
- Detener: Ctrl+C.
- Opcional: `OLT_DEMAND_POLL_SECONDS=120` (dos minutos entre comprobaciones, aproximadamente la mitad de invocaciones frente a 60s). Windows PowerShell: `$env:OLT_DEMAND_POLL_SECONDS='120'`.
- La opción `--on-demand` tiene prioridad frente a `OLT_MULTI_MODE=1`; **no ejecutar simultáneamente dos instancias del agente**.

## Consumo real
- El trigger Broadcast no añade invocaciones Edge.
- Solicitar una medición: una invocación a Mesa; leer el resultado en cada pantalla autorizada: una invocación de estado por pantalla; el detector necesita una invocación al informar el resultado.
- **Mientras el agente esté ENCENDIDO y esperando**, hace 1 llamada Edge para pendientes por intervalo (por defecto 60s = 1440 al día = ~43.200 en 30 días), MÁS una llamada de configuración por hora. No son cero invocaciones. Con intervalo 120s = ~21.600 cada 30 días, con hasta 2 min de espera.
- Poll de respaldo de Mesa/soporte/acceso remoto cambió de 8 a 120 segundos cuando la vista está activa y visible; Realtime actualiza al recibir un cambio de datos. Cuando no hay token Supabase Auth/Realtime la vista depende del respaldo.
- No se crean Edge Functions nuevas; se modifican dos funciones existentes y dos funciones SQL de Broadcast.

## Garantías y límites
- La identificación requiere vínculo seguro de servicio/serial/OLT; sin coincidencia única no se crea solicitud.
- Lecturas sin señal, sin fecha válida, serial inconsistente o muestras expiradas de la solicitud son errores y no sustituyen la vigente.
- Al confirmar potencia, el sistema conserva la fotografía y el histórico.
- Notificaciones piloto **solo Fernando y Bryan**, según RLS y Auth existentes. Otros técnicos deben incorporarse mediante nueva evaluación de permisos.
- Si la PC está apagada, la solicitud vence tras 10 minutos y la pantalla muestra espera o vencimiento. Reintento manual con nueva solicitud.
- No se simulan cambios de estado de OT ni pruebas reales de ONU en producción.

## Verificación antes de activar el agente
- Verificar que no esté ejecutándose el modo MULTI y que DETECTOR_TOKEN y las credenciales estén disponibles localmente.
- Comprobar que el botón de Fernando registra exactamente una solicitud.
- Activar `--on-demand` en PC con una solicitud real y confirmar resultado con sello de tiempo en Fernando y Bryan.
- Confirmar que al detener la PC cesan las invocaciones de polling del agente.
