-- Referencia verificada en Huawei SALCEDO 2026-10-13.
-- ONT existente 0/1/12 ID 45; display ont version: Equipment-ID HG8310M.
-- display ont info: line profile 5 (SmartOLT_G, 802.1p PRI, GEM 1 para prioridades 0/7),
-- service profile 1 (HG8310M), pero Match state=mismatch.
-- display service-port 440: VLAN 100, usuario VLAN 100, GEM 1, tag-transform translate,
-- traffic RX 9 (SMARTOLT-1G-DOWN), TX 8 (SMARTOLT-1G-UP).
-- Tablas 8 y 9 comprobadas; NO reutilizar service-port 440 ni ONT ID 45.
-- El perfil SE MANTIENE DESHABILITADO hasta revisar mismatch, configurar ejecución controlada
-- y verificar mediante pruebas sin afectar al cliente de referencia.
INSERT INTO public.onu_perfiles_olt
 (olt_id,tipo_onu,modelo_clave,vlan_servicio,vlan_usuario,line_profile_id,
  service_profile_id,gemport,traffic_in_id,traffic_out_id,tag_transform,
  observaciones,fuente,habilitado)
SELECT id,'BRIDGE','HG8310M',100,100,5,1,1,9,8,'translate',
 'PROVISIONAL, DESHABILITADO. Referencia ONU 0/1/12 ID 45, SN HWTC-3493775C. Equipment-ID HG8310M confirmado por display ont version. Line 5 SmartOLT_G (802.1p PRI); Service 1 HG8310M; VLAN 100; GEM 1; RX 9 DOWN/ TX 8 UP; translate. ONU referencia online con Match state MISMATCH. Validar discrepancia y procedimiento de provisioning antes de habilitar. No reutilizar service-port 440.',
 'INSPECCION_HUAWEI',false
FROM public.olt_configuraciones
WHERE codigo='SALCEDO' AND activo=true
ON CONFLICT (olt_id,tipo_onu,modelo_clave) DO UPDATE SET
 vlan_servicio=EXCLUDED.vlan_servicio,
 vlan_usuario=EXCLUDED.vlan_usuario,
 line_profile_id=EXCLUDED.line_profile_id,
 service_profile_id=EXCLUDED.service_profile_id,
 gemport=EXCLUDED.gemport,
 traffic_in_id=EXCLUDED.traffic_in_id,
 traffic_out_id=EXCLUDED.traffic_out_id,
 tag_transform=EXCLUDED.tag_transform,
 observaciones=EXCLUDED.observaciones,
 fuente=EXCLUDED.fuente,
 habilitado=false,
 updated_at=now();
