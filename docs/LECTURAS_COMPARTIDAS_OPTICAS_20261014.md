# DISPROTEL · Lecturas ópticas compartidas (fase de aprovechamiento)

## Regla
- La **lectura vigente** de una ONU es la muestra de señal más reciente por `leido_at`/captura, tomada de `huawei_onus_cache`, `smartolt_diagnosticos` o `smartolt_onus_cache`.
- Una lectura más nueva sustituye a la vieja en la **vista actual**, independientemente de si la solicitó Fernando, Bryan u otro módulo. No se mezclan RX ONU de un instante con RX OLT de otro.
- **Los registros históricos NO se borran:** `huawei_onu_senal_historial` y la `verificacion_potencia` dentro de `orden_mesa_requerimientos.resultado` siguen auditables con la fuente y hora de cada medición.
- Si la medida tiene más de 15 minutos, el soporte la identifica como **HISTÓRICA**; no presentarla como lectura Huawei EN VIVO.
- Huawei gana frente a SmartOLT **solo** si su `optica_leida_at` realmente es posterior. Un diagnóstico SmartOLT nuevo con datos de señal y fecha posterior gana a Huawei antiguo.
- La coincidencia se hace por SN normalizado al hexadecimal de 16 caracteres, mediante búsqueda indexada en `huawei_onus_cache`. Si aparecen dos coincidencias o el serial aparece en otra OLT distinta a la vinculada al servicio, se descarta esa lectura Huawei para impedir una asignación errónea.
- Si no hay señal válida o fecha, no se inventa medición.

## Alcance aplicado
1. `inventario-mesa-tecnica`: seleccionar siempre la mejor muestra **ya guardada** y reportar `fuente`, `leido_at`, `lectura_historica` y `antiguedad_min`. La operación `confirm-power-check` archiva la misma medición que mostró la vista compartida, con `canal_resolucion` distinguiendo Huawei de SmartOLT.
2. `soporte-tecnico-v2.html`: Bryan ve el último resultado compartido si es posterior al que quedó archivado al confirmar; la muestra histórica firmada sigue visible como referencia temporal. Mostrar fuente, fecha y antigüedad.
3. La consulta de `huawei_onus_cache` es **una consulta indexada en la base**, no una sesión ni comando a la OLT. El flujo agrega un SELECT a la **misma Edge Function ya invocada** y por tanto no agrega una invocación de Edge Function.

## Pendiente de fase posterior
- El **lector Huawei de PC sigue detenido**: esta mejora no genera ninguna nueva lectura física.
- Para solicitar una medición nueva bajo demanda, crear flujo de solicitudes por ONU con bloqueo/idempotencia, resolver ubicación PON/ONT-ID, ejecutar una sola lectura de Huawei, grabar cache+historial en orden cronológico y notificar por Realtime a los usuarios con acceso.
- El sondeo de 8 segundos del módulo soporte aún está vigente. Migrarlo a Realtime y dejar recuperación eventual de errores para reducir invocaciones, sin romper los estados de las OT.
- La consulta actual del agente periódico y las autorizaciones ONU/OLT no se alteran.

## Validación
Pruebas de selección de 5 escenarios: Huawei posterior; diagnóstico SmartOLT posterior; serial ambiguo en 2 OLT; serial en OLT no vinculada; solo SmartOLT antiguo. Además, parseo JavaScript HTML del soporte y verificación de que el resultado Huawei respeta PON 0/1/0.

## Reversión
Revertir el PR (frontend y archivo fuente respaldado) y redesplegar la versión anterior de `inventario-mesa-tecnica`. Nunca ejecutar comandos de configuración Huawei ni borrar el historial de señales.
