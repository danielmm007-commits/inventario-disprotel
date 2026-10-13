# DISPROTEL — cola Huawei multi-ONU (cambio en revisión)

## Alcance

La aprobación humana del supervisor crea la solicitud de aprovisionamiento **solo si** existe un perfil GPON BRIDGE completo y habilitado para la pareja (OLT, modelo). Ya no se codifican el serial de prueba, el PON 0/1/12 ni el perfil fijo 5/24. La asignación del ONT-ID y del service-port queda a cargo del agente local y de la respuesta real de la OLT.

La aprobación **NO** equivale a ejecución en la OLT: debe existir un agente local de escritura verificado. El lector `huawei-olt-reader.py` se conserva **SOLO LECTURA**.

## Controles que siguen activos

1. El supervisor debe estar autenticado y aprobar el serial identificado en Huawei. Se requiere un perfil BRIDGE por OLT y modelo (`onu_perfiles_olt.habilitado=true`), configurado tras verificar el firmware/perfil real.
2. El backend de cola exige simultáneamente `HUAWEI_ONU_WRITES_ENABLED=true` y `HUAWEI_ONU_ALLOWED_OLTS` que incluya explícitamente el código de la OLT. Por defecto ambos bloquean cualquier nueva ejecución.
3. El agente PC necesita su **propia** habilitación local de escritura. No debe tomar trabajos si no cuenta con una validación exacta de serial, modelo, PON, autorización y perfil. La configuración debe realizarse por cliente, sin parámetros heredados de la ONU anterior.
4. El backend vuelve a verificar en cada reclamación que el autofind sea reciente (15 min), que el serial/OLT/PON/modelo coincidan y que el serial no figure en el inventario autorizado.
5. El estado `EJECUTANDO` se reclama atómicamente para evitar dos agentes operando la misma solicitud. Una operación fallida se registra como `ERROR`, sin reintentos ciegos.
6. Un resultado positivo requiere al menos SN exacto, ONT online, configuración MATCH, VLAN nativa ETH1 verificada y service-port UP identificado. El estado final permitido en esta etapa es **PENDIENTE_GUARDAR**.
7. `save` no se ejecuta automáticamente: puede persistir cambios de otras configuraciones de la OLT y exige revisión operacional independiente.

## Pruebas obligatorias antes de desplegar

- [ ] Sin flags servidor: aprobación válida queda pendiente, `scanner-pending` no ofrece `listo=true` y `scanner-claim` rechaza la operación.
- [ ] Con `HUAWEI_ONU_WRITES_ENABLED=true`, pero sin la OLT en `HUAWEI_ONU_ALLOWED_OLTS`: sigue bloqueado.
- [ ] Con OLT habilitada y modelo sin perfil o con perfil deshabilitado: sigue bloqueado.
- [ ] Con ONU ya registrada, serial o PON discrepante, detección de más de 15 min, o perfil cambiado: sigue bloqueado.
- [ ] Con dos solicitudes válidas del mismo o distinto PON, cada una mantiene su identidad y el agente determina ONT-ID y service-port distintos según lectura Huawei.
- [ ] Reclamación concurrente del mismo trabajo: una sola pasa a `EJECUTANDO`.
- [ ] Reinicio de PC después de `ont add` y antes de service-port: detener, inspeccionar estado parcial, NO reautorizar ni borrar automáticamente.
- [ ] El agente informa `service_port_up=true`, `service_port_id` entero y demás verificaciones, o reporta error. No aceptar `AUTORIZADA` sin guardado supervisado.
- [ ] En producción, probar primero una segunda HG8310M y luego un modelo distinto con su perfil específico, sin tocar la ONU de referencia ni reutilizar sus identificadores.

## Pendiente para funcionamiento extremo a extremo

Este cambio actualiza backend y página web **en una rama de revisión**, sin desplegar. Se necesita integrar el **agente de escritura que actualmente reside en la PC** (carpeta local `disprotel_onu_v4_integracion`) para que consuma la cola dinámica, descubra en vivo cada ONT-ID y service-port, valide VLAN/GEM/tablas y publique `service_port_up` y `service_port_id`. Hasta revisar ese código y realizar una prueba de laboratorio/supervisada, no habilitar flags ni fusionar esta rama.
