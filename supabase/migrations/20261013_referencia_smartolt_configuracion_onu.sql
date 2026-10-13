-- Referencia de formulario SmartOLT, NO es un perfil Huawei validado.
-- Fuente: captura del formulario SmartOLT para HG8310M de Salcedo (2026-10-13).
-- No asignar VLAN/perfiles automáticamente a ONU por este registro.
CREATE TABLE IF NOT EXISTS public.onu_referencias_smartolt (
  olt_codigo text NOT NULL,
  modelo_clave text NOT NULL,
  modo_onu text NOT NULL,
  line_profile_nombre text,
  service_profile_nombre text,
  vlan_internet_mostrada integer CHECK (vlan_internet_mostrada BETWEEN 1 AND 4094),
  mapa_gem_texto text,
  velocidad_bajada text,
  velocidad_subida text,
  fuente text NOT NULL DEFAULT 'CAPTURA_SMARTOLT',
  validado_en_huawei boolean NOT NULL DEFAULT false,
  observaciones text NOT NULL DEFAULT '',
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (olt_codigo, modelo_clave)
);
ALTER TABLE public.onu_referencias_smartolt ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.onu_referencias_smartolt FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.onu_referencias_smartolt TO service_role;
INSERT INTO public.onu_referencias_smartolt
 (olt_codigo,modelo_clave,modo_onu,line_profile_nombre,service_profile_nombre,vlan_internet_mostrada,mapa_gem_texto,velocidad_bajada,velocidad_subida,observaciones)
VALUES ('SALCEDO','HG8310M','Bridging','Mapeo PRIO','Predeterminado (HG8310M)',100,'PRIO 0,7 → GEM 1 · PRIO 2 → GEM 2 · PRIO 5 → GEM 3','1G','1G',
 'Selección visible en formulario SmartOLT para una ONU de Salcedo. NO confirma ID numérico de perfiles, GEM de service-port, traffic-tables, tag-transform ni provisionamiento guardado. Zona/NAP son datos particulares de cada equipo, no valores por modelo.')
ON CONFLICT(olt_codigo,modelo_clave) DO UPDATE SET
 modo_onu=EXCLUDED.modo_onu,
 line_profile_nombre=EXCLUDED.line_profile_nombre,
 service_profile_nombre=EXCLUDED.service_profile_nombre,
 vlan_internet_mostrada=EXCLUDED.vlan_internet_mostrada,
 mapa_gem_texto=EXCLUDED.mapa_gem_texto,
 velocidad_bajada=EXCLUDED.velocidad_bajada,
 velocidad_subida=EXCLUDED.velocidad_subida,
 observaciones=EXCLUDED.observaciones,
 validado_en_huawei=false,
 actualizado_en=now();
COMMENT ON TABLE public.onu_referencias_smartolt IS 'Referencia informativa por modelo y OLT a partir de formulario SmartOLT. No concede capacidad de autorizar en Huawei.';
