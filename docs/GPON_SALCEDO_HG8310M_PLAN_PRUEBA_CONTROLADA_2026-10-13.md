# DISPROTEL — Huawei Salcedo — HG8310M — plan de prueba controlada

**ESTADO: BORRADOR / SOLO REVISIÓN. NO EJECUTAR EN PRODUCCIÓN TODAVÍA.**

## Identidad de prueba

- OLT real: `OLT-ACC-DISPROTELSALCEDO-01`, GPON `0/1/12` (código interno SALCEDO).
- ONU pendiente: SN hexadecimal `48575443C8BFCE42`; modelo detectado `HG8310M`; aprobación administrativa en DISPROTEL: `APROBADA_PENDIENTE_PERFIL`.
- ONU activa usada como **referencia en lectura**: ONT-ID **45**, SN `485754433493775C`. **No modificar, reiniciar, desautorizar ni eliminar esta ONU**.
- Modelado real de referencia: `display ont version 12 45` confirma `Equipment-ID: HG8310M`; `display ont capability 12 45` indica ETH=1, POTS=0, CATV=0.
- **NUEVA VERIFICACIÓN:** `display ont port attribute 12 45 eth 1` confirma ETH1 `Port switch=on`, `Auto-neg=enable`, `Speed=auto`, `Duplex=auto`, `Flow control=off`, `Native VLAN=100`, `Priority=0`. Es un ajuste del puerto de esta ONT, **no queda automáticamente aplicado** al autorizar otra ONU.
- Línea de referencia: profile-id **5**, `SmartOLT_G`, mapeo `802.1p PRI`, GEM 1 para prioridad 0/7, GEM 2 prioridad 2, GEM 3 prioridad 5, T-CONT 1 con DBA-ID 10.
- Servicio de referencia: service-port **440** (exclusivo de ONT 45, **NO REUTILIZAR**), VLAN 100, VLAN de usuario 100, GEM 1, tag-transform translate, RX index **9** (`SMARTOLT-1G-DOWN`), TX index **8** (`SMARTOLT-1G-UP`), estado UP.
- Ambas traffic tables: CIR/PIR 1.048.064 kbps según lectura Huawei.
- La ONT de referencia está online/Config normal, pero `Match state: mismatch`. El service profile 1 `HG8310M` define ETH=4/POTS=1, distinto de capacidad ETH=1/POTS=0. Perfil 1 tiene **499 vinculaciones**: **NO MODIFICAR**.
- Perfil 2 `010H` (ETH=1/POTS=0) tiene 19 vinculaciones; perfil 3 `HG8010H` (ETH=1/POTS=0) tiene 164. No reutilizarlos sin prueba; **no modificarlos**.
- Perfil 13 es adaptativo (ETH hasta 8, POTS hasta 32, CATV hasta 8), no se ha probado con esta ONU.

## A. Comprobaciones de solo lectura PREVIAS (permitidas)

Estando en `(config)#`:

```text
display ont-srvprofile gpon all
display ont-lineprofile gpon profile-id 5
display traffic table ip index 9
display traffic table ip index 8
interface gpon 0/1
display ont autofind 12
display ont info 12 all
quit
```

No continuar sin comprobar: (1) que el ID de perfil nuevo esté libre, (2) SN pendiente exactamente una vez en autofind del PON 12, (3) que no esté ya registrada, (4) mismo modelo/PON y aprobación vigente. También revisar el DBA profile 10 y el tratamiento de VLAN en ETH1. No asumir el estado actual de la OLT a partir de esta nota.

## B. PROPUESTA de perfil nuevo: no ejecutar hasta aprobar la ventana

Se propone **profile-id 24** solo porque no aparecía en la lista de 26 perfiles de servicio enviada el 2026-10-13. **VOLVER A COMPROBAR que esté libre justo antes de crear**. Nombre de ejemplo `HG8310M_DSP_1ETH`.

```text
ont-srvprofile gpon profile-id 24 profile-name HG8310M_DSP_1ETH
ont-port eth 1 pots 0
commit
quit
display ont-srvprofile gpon profile-id 24
```

- Crear un perfil nuevo **no cambia** los perfiles 1, 2, 3 ni las ONU existentes.
- Se espera ETH=1, POTS=0, CATV adaptativo por defecto, como perfiles 2/3. Comprobarlo en la salida real.
- **Ahora está confirmada la VLAN nativa ETH1=100, prioridad 0, en la ONT 45 existente**, pero este ajuste no se hereda necesariamente del nuevo Service Profile. Para una instalación de Internet sin etiquetado en el router/CPE, verificar que la nueva ONU tenga idéntica VLAN nativa y prioridad **después del alta**. No cambiar nunca la ONT 45. Validar el tipo de CPE del técnico y el comando exacto de esta revisión Huawei con `?` antes de preparar la escritura.
- Si el comando marca error o devuelve un prompt inesperado, detenerse y revisar, **no repetir automáticamente**.
- La creación del perfil y su `commit` requieren consentimiento operativo explícito.

## C. PLANTILLA de autorización: SOLO PREVISUALIZACIÓN / NO EJECUTAR

**DEPENDENCIAS:** perfil 24 creado y verificado, port tagging/native VLAN validado, cola y serial verificados en tiempo real, rollback acordado, ventana aprobada.

```text
interface gpon 0/1
display ont autofind 12
display ont info 12 all

ont add 12 sn-auth 48575443C8BFCE42 omci ont-lineprofile-id 5 ont-srvprofile-id 24 desc "DESCRIPCION_VALIDADA"

# PENDIENTE de validar sintaxis y necesidad para la nueva ONU, ETH1 VLAN nativa 100/PRI 0:
# ont port native-vlan 12 <ONT_ID_DEVUELTO_POR_HUAWEI> eth 1 vlan 100 priority 0
# Verificar primero con ayuda contextual y aprobación de la ventana. NO ejecutar en ONT 45.
display ont port attribute 12 <ONT_ID_DEVUELTO_POR_HUAWEI> eth 1
display ont info 12 <ONT_ID_DEVUELTO_POR_HUAWEI>
quit

service-port vlan 100 gpon 0/1/12 ont <ONT_ID_DEVUELTO_POR_HUAWEI> gemport 1 multi-service user-vlan 100 tag-transform translate inbound traffic-table index 9 outbound traffic-table index 8
display service-port port 0/1/12 ont <ONT_ID_DEVUELTO_POR_HUAWEI>
display service-port <SERVICE_PORT_ID_DEVUELTO>

interface gpon 0/1
display ont version 12 <ONT_ID_DEVUELTO_POR_HUAWEI>
display ont capability 12 <ONT_ID_DEVUELTO_POR_HUAWEI>
display ont info 12 <ONT_ID_DEVUELTO_POR_HUAWEI>
quit
```

**No copiar la plantilla literalmente**: los valores `<...>` son marcadores y el ONT-ID / service-port se obtienen de la respuesta real. El código de usuario/IP administrativa no es un parámetro GPON. No reutilizar service-port 440 ni ONT-ID 45.

La secuencia `ont add` / `service-port` es una **propuesta sin validación en esta revisión exacta del firmware**. Requiere confirmar sintaxis con ayuda de `?` y respuestas de CLI de la OLT. Si Huawei asigna la ONU pero falla el service-port, **NO repetir la autorización ni borrar automáticamente**; comprobar el estado parcial y resolver manualmente.

## D. Verificación y persistencia (aún pendiente)

1. Verificar el **SN exacto** y `Equipment-ID HG8310M` para el ONT-ID nuevo.
2. Verificar `Run state online`, `Config normal` y, preferiblemente, `Match match`. Si queda mismatch, estudiar la causa antes de tratar como completado.
3. Verificar service-port **UP**, VLAN 100, GEM 1, TX 8/RX 9 y `Tag transform translate`.
4. Verificar que el router conectado efectivamente recibe servicio, con prueba de conectividad acordada.
5. **Confirmar ETH1 Native VLAN 100, prioridad 0**, `Port switch on` y modo auto en la nueva ONT; correlacionarlo con la configuración del CPE. No asumir que `service-port vlan 100` configura por sí solo la VLAN nativa del puerto Ethernet.
6. El comando `save` puede guardar **más cambios de la OLT**, por lo que **NO ejecutarlo** sin revisar los cambios globales y autorizar el guardado en ventana supervisada.
7. DISPROTEL debe conservar estado `PENDIENTE_GUARDAR` si la configuración aún no es persistente y jamás declarar `AUTORIZADA` sin verificación.
8. **No habilitar** `onu_perfiles_olt.habilitado`, `HUAWEI_ONU_WRITES_ENABLED` ni `OLT_ONU_WRITES_ENABLED` hasta completar pruebas.

## E. Estado DISPROTEL al redactar este plan

- `onu_perfiles_olt`: perfil `SALCEDO / BRIDGE / HG8310M` registrado como **provisional**, por ahora apunta a service profile **1** por fidelidad al equipo de referencia; **habilitado=false**. Actualizar al ID 24 **solo cuando el perfil 24 exista realmente en la OLT** y se valide la configuración.
- El lector Huawei V3 de producción se mantiene **solo lectura**. Existe un **borrador separado** de puente de autorización, no desplegado ni validado para escrituras/guardado.
- La aprobación administrativa previa no ejecutó comandos Huawei. **El primer acto de escritura requiere nueva confirmación operacional.**

Fuentes: salidas CLI de la OLT Salcedo compartidas en la conversación de 2026-10-13; documentación de referencia Huawei MA5800 Commissioning and Configuration Guide V100R017 (la revisión exacta de firmware de la OLT debe corroborarse).
