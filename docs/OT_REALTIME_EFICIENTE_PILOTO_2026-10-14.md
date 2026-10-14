# DISPROTEL — piloto de órdenes en tiempo real sin consultas repetitivas

Estado: **RAMA DE PRUEBA; NO DESPLEGADO**. No modifica Huawei, ONU ni el inventario físico.

## Problema que corrige
- `trabajos-tecnicos.html`: 4 consultas repetidas cada 8 segundos; además 3 acciones inexistentes que se intentaban al cargar.
- `panel-experiencia-v1.js`: 2 consultas cada 15 segundos para contadores de órdenes.
- `supervisor-ot-progreso-v1.js`: dashboard completo cada 15 segundos.
- `panel-supervisor-vivo-v2.html`: dashboard completo cada 8 segundos.
- `alertas-inventario-ui-v1.js`: consulta alertas cada 10 segundos, incluso pestaña oculta.

## Diseño
1. Al ingresar por Supabase Auth, se guarda en el `sessionStorage` del navegador la sesión Auth bajo `ot_auth_session`, además de la sesión opaca del ERP. No se publican service role keys. El login heredado sigue soportado SIN Realtime, con respaldo periódico.
2. `disprotel-ot-realtime-v1.js` usa ese JWT Auth para suscribirse al canal **privado** `disprotel:ot-eventos`. Renueva tokens Auth y los guarda en el contexto de sesión. Si el SDK, la autenticación o la conexión fallan, sigue funcionando el modo polling reducido.
3. Migración: RLS de `realtime.messages` permite recibir SOLO a usuarios con `auth_user_id` que corresponda a un responsable activo y visible. La función auxiliar es SECURITY DEFINER con search_path vacío.
4. Trigger de `ordenes_trabajo` emite `ot_changed` solo en altas/bajas o cambios reales de estado, grupos, asignación y controles de reprogramación. El mensaje contiene únicamente una revisión temporal: SIN ID de OT, SIN nombres, IP ni datos de clientes. Las pantallas consultan información por su API original, con controles de permisos existentes.
5. Varios avisos seguidos se agrupan (400 ms). Actualización puntual después de acciones y al recuperar foco. Consulta de respaldo en 60 s si Realtime está desconectado, 3–5 min si está conectado.
6. En `trabajos-tecnicos.html`, disponibles y activas se consultan periódicamente; historial y órdenes propias se cachean 5 min y se refrescan después de eventos. Se eliminan 3 acciones inexistentes.
7. Alertas de inventario **aún no usan Realtime**; temporalmente pasan de 10 a 60 s y se pausan en pestaña oculta. En una segunda fase se enviarán eventos privados de transferencias/materiales.

## Compatibilidad de cuentas (revisión 2026-10-14)
Actualmente hay **16 responsables activos y visibles**, de los cuales **7 tienen `auth_user_id` y 9 no**. Entre los 6 técnicos, 3 tienen Supabase Auth y 3 usan solamente el acceso legado. Un supervisor técnico activo sí tiene Supabase Auth.

**No retirar el polling de respaldo** mientras queden cuentas sin `auth_user_id`. Para usuarios legados no se abrirá el canal privado; sus órdenes siguen consultándose cada 60 segundos. La transición a Auth debe hacerse por usuario, sin cambiar permisos ni crear credenciales no autorizadas. El piloto se debe validar con al menos un técnico Auth y uno legado.

## Validaciones antes de fusionar/desplegar
- Confirmar que el JS UMD de Supabase está disponible desde el navegador de oficina.
- Validar conexión privada con usuarios de Auth vigentes. Inicio de sesión anterior requiere salir/volver a entrar para adquirir la sesión Auth.
- Asegurar que un invitado, JWT anónimo, usuario desactivado y canal público NO reciben eventos.
- Dos navegadores: oficina crea soporte → técnico recibe; técnico acepta → supervisor actualiza; finalizar → historial refleja cierre.
- Probar 2 cambios consecutivos rápidos; no perder el último estado.
- Simular WebSocket desconectado: cada pantalla recupera novedades antes de 60 s en el modo respaldo.
- Medir invocaciones en un intervalo representativo y comparar con el consumo anterior.
- Validar prueba de persistencia del JWT luego de refresh token y navegación; los tokens no deben imprimirse en consola/logs.
- Revisar CSP/CDN, accesibilidad desde GitHub Pages, permisos RLS y roles especiales (incluido login legado).
- Tomar respaldo y preparar reversión: revertir los archivos JS/HTML; eliminar trigger, policy y funciones auxiliares con migración de rollback autorizada.
- **No aplicar SQL en producción antes de validar permisos RLS**. Si no se habilita la migración, el frontend sigue con su respaldo periódico.

## Observaciones
Realtime tiene cuota independiente de mensajes y conexiones. La reducción de Edge Functions no significa invocaciones cero.
La sesión general actual sigue usando el token opaco para funciones de negocio; Auth JWT solamente habilita canal privado.
La migración es aditiva, excepto el nuevo trigger de órdenes, que NO altera la lógica de órdenes ni saldos.
