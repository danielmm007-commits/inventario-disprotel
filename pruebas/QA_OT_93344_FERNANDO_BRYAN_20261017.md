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
