-- Validación manual en consola de la OLT SALCEDO, 2026-10-13.
-- Se creó en Huawei el service profile 24 HG8310M_DSP_1ETH, commit exitoso,
-- display ont-srvprofile gpon profile-id 24: ETH=1, POTS=0, CATV=0, bindings=0.
-- El perfil 5 SmartOLT_G, VLAN 100, GEM 1 y tablas RX9/TX8 se mantienen.
-- La ONU pendiente C8BFCE42 está detectada por autofind, ausente del inventario
-- display ont info 12 all. No se provisiona ONU, no se cambia estado de aprobación.
-- IMPORTANTE: este cambio de ID mantiene bloqueada toda ejecución Huawei.
UPDATE public.onu_perfiles_olt AS p
SET service_profile_id = 24,
    observaciones = 'Service Profile 24 HG8310M_DSP_1ETH creado con commit y verificado en Huawei SALCEDO 2026-10-13: ETH 1, POTS 0, CATV 0, binding 0. Line Profile 5 SmartOLT_G, VLAN 100, native ETH1 VLAN 100 PRI 0, GEM 1, RX 9 / TX 8, translate. SN 48575443C8BFCE42 presente en autofind 0/1/12 y ausente de display ont info 12 all. Perfil DESHABILITADO mientras no se valide flujo real y guardado permanente en Huawei. NO reutilizar service-port 440 ni ONT-ID 45.',
    habilitado = false,
    updated_at = now()
FROM public.olt_configuraciones AS o
WHERE p.olt_id = o.id
  AND o.codigo = 'SALCEDO'
  AND p.modelo_clave = 'HG8310M'
  AND p.tipo_onu = 'BRIDGE'
  AND p.service_profile_id = 1
  AND p.habilitado = false;
