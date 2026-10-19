# DISPROTEL — Plan de pruebas de navegación y OT (NO ejecutar hasta autorización)

**Rama:** `ux-soporte-observaciones-canasta-evidencias-20261017`  
**PR:** #133 (borrador)  
**OT de referencia:** `OT-20261014-93344`  
**Estado verificado en base de datos:** EN_PROCESO, potencia ATENDIDA, última verificación remota ATENDIDA. Existe un registro remoto anterior ATENDIDO que queda solo para auditoría.

## Antes de iniciar
- Probar primero migraciones + Edge Functions en entorno de ensayo, con copia no sensible de los casos necesarios. No ejecutar en producción sin respaldo, validación y autorización.
- Revisar que el frontend y backend desplegados correspondan al **mismo commit**; no probar HTML nuevo contra funciones viejas.
- Utilizar cuentas reales solo después de autorizar el piloto, sin cambiar IP, ONU, router, configuración SmartOLT/Huawei ni cerrar la OT.
- La creación de fotos, solicitudes y observaciones sí produce escrituras: pedir confirmación específica para cada prueba.

## Casos de prueba

| Caso | Acción | Resultado esperado |
|---|---|---|
| NAV-01 | Abrir Principal → Área técnica → volver a Principal, 5 veces | Sin `about:blank`, pantalla blanca ni carga duplicada |
| NAV-02 | Abrir OT desde notificación y desde lista | Mismo módulo correcto, sin segunda redirección |
| NAV-03 | Reabrir módulo con red lenta y refrescar manualmente | Mensaje de recuperación si falla; sin perder sesión |
| MESA-01 | Fernando abre Mesa Técnica y selecciona OT | Solo **una** comprobación vigente de potencia y acceso remoto |
| MESA-02 | Bryan abre la misma OT | Mismo estado vigente; registros anteriores no duplicados |
| MESA-03 | Reiniciar una comprobación ATENDIDA *solo en entorno de ensayo* | Se reutiliza `requerimiento_id`; pasa a PENDIENTE, guarda historia sin borrar fotografía |
| MESA-04 | Intentar confirmar potencia con lectura anterior al reinicio | Backend rechaza; exige lectura posterior |
| MESA-05 | Rectificar fotografía *solo en ensayo* | Nueva foto activa; vieja histórica; no nueva verificación |
| OT-04 | Guardar observación y abrir de nuevo el módulo | La nota sigue guardada y no reaparece como texto nuevo |
| OT-04b | Agregar otra observación, editarla y recargar | Dos notas distinguibles y editables, sin duplicarlas |
| OT-05 | Añadir dos veces la misma fibra en metros | Una línea con cantidad acumulada |
| OT-05b | Modificar cantidad, quitar artículo y reconfirmar | Canasta editable y confirmación reestablecida; inventario sin consumo antes de cerrar |
| OT-06 | Tomar foto o cargar archivo | Guarda directamente y muestra miniatura pequeña |
| OT-06b | Corregir foto del mismo proceso | Solo última versión visible; anterior conservada |
| OT-07 | Abrir previsualización del reporte | Solo evidencia vigente y cantidades correctas |
| SEG-01 | Intentar ejecutar flujo de otra OT o rol no autorizado | Acceso rechazado |
| SEG-02 | Comprobar lectores SmartOLT/Huawei | Sin comandos de configuración, alta automática ni `save` desde estas pantallas |

## Validación de base de datos (solo lectura)
Antes/después del ensayo, comparar:
- `orden_mesa_requerimientos`: mismos IDs cuando se reinicia una verificación.
- `orden_historial`: evidencia del reinicio / rectificación guardada.
- `soporte_evidencias`: como máximo una `es_actual=true` por OT/tipo de proceso, con historial intacto.
- `orden_acceso_remoto`: un único puntero a la foto vigente confirmada.
- `soporte_reportes` y `ordenes_trabajo`: nada finalizado hasta autorización de cierre.

**Condición de salida:** todos los casos críticos aprobados, sin pantallas blancas, sin duplicados activos ni escrituras a equipos de red. El cierre de la OT es una operación independiente que requiere autorización expresa.

## Ensayo ampliado — numerales 4 y 5 (captura de Bryan, 19-oct-2026)

| Caso | Procedimiento | Resultado esperado |
|---|---|---|
| OT4-01 | Bryan escribe «ONU apagada / sin energía» y «Restablecer alimentación / conexión eléctrica» y pulsa **Guardar registro técnico** | Se guarda en `soporte_reportes` con `registro_tecnico_guardado_at`. Debajo se muestra registro con fecha; no hace falta repetir el numeral 2 |
| OT4-02 | Añadir observación opcional, y después otra | Se listan individualmente con editar y quitar, pero permanecen en el mismo reporte de OT |
| OT4-03 | Reabrir el soporte desde otro navegador | Registro, observaciones y fecha de confirmación recuperados del backend |
| OT4-04 | Modificar el diagnóstico y recargar sin guardar | El editor conserva el cambio local, el registro anterior sigue visible y el numeral siguiente queda pendiente hasta volver a guardar |
| OT5-01 | Cargar 1 m y luego 10 m de la misma referencia de fibra | Solo una línea, cantidad **11 m**, sin dos filas |
| OT5-02 | Añadir fibra de 2 hilos y fibra de 4 hilos con IDs de producto distintos | Se mantienen dos líneas, porque son productos diferentes |
| OT5-03 | Confirmar la canasta de la OT y reabrir desde otra sesión | Se recuperan materiales, cantidades y estado confirmado desde Supabase |
| OT5-04 | Editar 11 m a 8 m, quitar o añadir otro ítem | Estado cambia a **CAMBIOS SIN CONFIRMAR**; botones siguen disponibles; nueva confirmación persiste la revisión |
| OT5-05 | Intentar confirmar dos registros del mismo serial | Un solo equipo por serial |
| OT5-06 | Intentar cerrar con ítems diferentes a la canasta guardada | Backend devuelve rechazo de conflicto. Nunca descuenta stock de canasta no confirmada |
| OT5-07 | Ver disponibilidad de fibra (captura mostraba «DISP. 1») | Si se requieren 11 m pero stock real es 1 m, mantener registro editable y validar el stock al cerrar; no inventar disponibilidad |
| OT5-08 | Intentar modificar la canasta durante una petición en curso | Bloquear cambios hasta completar el guardado, sin perder el estado confirmado |

**Dependencias de publicación:** migración `20261019_130000_soporte_registro_tecnico_canasta.sql`; Edge Function `inventario-soporte`; páginas `soporte-tecnico-v2.html` y `soporte-resumen-v2.html`. Desplegar como conjunto coherente, no solo la interfaz.

**Comprobado por análisis de código:** normalización 1+10=11; referencia diferente no fusionada; serial duplicado eliminado; cierre compara versión guardada; scripts HTML sin errores de sintaxis. **No se han ejecutado todavía pruebas end-to-end con la sesión real de Bryan ni el despliegue de Supabase.**
