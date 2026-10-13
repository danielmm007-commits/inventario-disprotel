# DISPROTEL — Sincronización administrativa ONU → SmartOLT

## Reglas de negocio solicitadas
- SmartOLT **Nombre** = nombre del cliente de DISPROTEL.
- SmartOLT **Dirección o comentario** = **IP administrativa** del registro DISPROTEL, **no** una dirección física.
- No crear un segundo campo de dirección física.
- Si SmartOLT ya muestra un nombre no vacío, **no sobrescribirlo automáticamente** (por ejemplo: en SmartOLT "BODEGA DE MATERIALES SALCEDO NP01", mientras DISPROTEL registra "BODEGA DE MATERIALES").
- Si Dirección o comentario está vacío, escribir la IP del registro. Si hay otro texto, exigir confirmación explícita del supervisor; un agente automático no lo sobrescribe.
- Si no existe IP, la ONU no está en inventario Huawei, el SN/OLT no coincide o el API no da una identidad inequívoca, **detenerse**.

## Endpoint utilizado (solo datos)
- Lectura paginada de SmartOLT: `GET /api/onu/get_all_onus_details?page=1&page_size=100&olt_id=...&sn=...`.
- Escritura de metadatos: `POST /api/onu/update_location_details/{onu_external_id}`; parámetros **solamente** `name` (si vacío en SmartOLT) y `address_or_comment` (IP del cliente).
- Autenticación SmartOLT: encabezado `X-Token` en el servidor, **nunca en el navegador**.
- **PROHIBIDOS en esta integración:** `authorize_onu`, `resync_config`, `save_config`, `reboot`, `delete`, `update_service_port` y cualquier comando de la OLT.
- La representación SN Huawei de 16 dígitos hex puede aparecer como `HWTC...` en SmartOLT. La función convierte el prefijo ASCII al comparar y requiere coincidencia exacta de serial y OLT; no asume que el `onu_external_id` sea siempre el serial.

Fuentes: https://api.smartolt.com/ y https://www.postman.com/smartolt/smartolt-s-public-workspace/request/9197ggn/update-onu-location-details-by-onu-unique-external-id

## Configuración de secretos de Supabase (no crear valores ficticios)

Guardar estos secretos **solo del lado servidor**:
- `SMARTOLT_SUBDOMAIN`: subdominio existente de su instancia SmartOLT, sin URL ni ruta.
- `SMARTOLT_API_TOKEN`: clave de API SmartOLT con permiso mínimo requerido para actualizar metadatos.
- `SMARTOLT_OLT_IDS_JSON`: mapa verificado con la API SmartOLT `GET /api/system/get_olts`, por ejemplo `{"SALCEDO":8}` **SOLO SI 8 es el ID confirmado por la API**.
- `SMARTOLT_METADATA_WRITES_ENABLED`: dejar ausente o `false` hasta probar previsualización con credenciales reales.
- `SMARTOLT_METADATA_AUTO_ENABLED`: dejar ausente o `false` hasta probar un caso manual real y un segundo modelo.

El servidor permite previsualizar sin permisos de escritura. Si la función de prueba no encuentra el campo de comentario exacto en el resultado de SmartOLT, falla cerrada para revisar el contrato de la API.

## Uso en DISPROTEL
- Menú **Monitoreo OLT** → **Nombre / IP SmartOLT**; también hay acceso desde **ONU esperando autorización**.
- Ingresar OLT y SN de la ONU **ya autorizada**.
- Pulsar **Comprobar datos sin modificar**.
- Revisar nombre ya existente en SmartOLT, comentario anterior y la IP propuesta.
- Pulsar **Sincronizar datos** y confirmar serial. Si el comentario actual es distinto, confirmar reemplazo expresamente.
- Abrir SmartOLT y comprobar que el nombre se conserva y que Dirección o comentario contiene la IP.

## Automatización futura ya preparada en el scanner
Cuando `scanner-result` registra alta Huawei con verificaciones correctas (estado `PENDIENTE_GUARDAR`), puede notificar a la función de metadatos **solo si `SMARTOLT_METADATA_AUTO_ENABLED=true`**. Este intento no altera estado GPON ni declara automáticamente el guardado Huawei. Si SmartOLT aún no ha importado la ONU, el intento falla y puede reintentarse manualmente. No existe garantía de entrega ni reintento automático persistente en esta etapa.

## Primera ONU de referencia
- OLT: SALCEDO, PON 0/1/12, ONT-ID 6.
- Serial: `48575443C8BFCE42` (equivalente SmartOLT `HWTCC8BFCE42`).
- Nombre en SmartOLT mostrado: **BODEGA DE MATERIALES SALCEDO NP01**. **Mantenerlo**, no sustituirlo por el nombre más corto de DISPROTEL.
- IP administrativa actualmente registrada en DISPROTEL: `172.45.1.12`.
- En SmartOLT, Dirección o comentario aparece vacío. Objetivo de la primera prueba: completar **solo** ese dato.
- El estado administrativo histórico `ERROR` en `onu_autorizaciones_manuales` es ajeno a este campo: no lo sobrescribir ni reautorizar la ONU.

## Antes de desplegar
1. Revisar que la función se despliegue con `verify_jwt=false`, porque usa la sesión DISPROTEL o el token del agente; sin tokens no debe dar acceso.
2. Confirmar subdominio, API token y mapa de OLT del lado servidor, sin enviarlos por chats ni archivos públicos.
3. Probar búsqueda de ONU con la IP en modo previsualización. Si los nombres de claves SmartOLT difieren (`sn`, `address_or_comment`, `onu_external_id`), adaptar su lectura **antes** de habilitar escritura.
4. Habilitar `SMARTOLT_METADATA_WRITES_ENABLED=true` solamente en la ventana de prueba autorizada.
5. Probar una única ONU y constatar el resultado en SmartOLT; solo después habilitar `SMARTOLT_METADATA_AUTO_ENABLED=true`.
6. Evitar re-sincronizaciones GPON desde SmartOLT de una ONU importada desde Huawei sin una ventana y respaldo de configuración.
