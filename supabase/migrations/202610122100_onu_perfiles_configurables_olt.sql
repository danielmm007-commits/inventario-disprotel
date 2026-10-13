-- DISPROTEL / Configuracion GPON por OLT, tipo y modelo.
-- Almacena perfiles para autorizaciones FUTURAS; no habilita escrituras Huawei.
CREATE TABLE IF NOT EXISTS public.onu_perfiles_olt (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  olt_id uuid NOT NULL REFERENCES public.olt_configuraciones(id) ON DELETE CASCADE,
  tipo_onu text NOT NULL CHECK (tipo_onu IN ('BRIDGE','WIFI','CATV')),
  modelo_clave text NOT NULL CHECK (length(modelo_clave) BETWEEN 1 AND 64 AND modelo_clave = upper(modelo_clave)),
  vlan_servicio integer CHECK (vlan_servicio BETWEEN 1 AND 4094),
  vlan_usuario integer CHECK (vlan_usuario BETWEEN 1 AND 4094),
  line_profile_id integer CHECK (line_profile_id BETWEEN 0 AND 4095),
  service_profile_id integer CHECK (service_profile_id BETWEEN 0 AND 4095),
  gemport integer CHECK (gemport BETWEEN 0 AND 4095),
  traffic_in_id integer CHECK (traffic_in_id >= 0),
  traffic_out_id integer CHECK (traffic_out_id >= 0),
  tag_transform text CHECK (tag_transform IN ('translate','transparent','default')),
  observaciones text NOT NULL DEFAULT '',
  fuente text NOT NULL DEFAULT 'MANUAL' CHECK (fuente IN ('MANUAL','INSPECCION_HUAWEI')),
  habilitado boolean NOT NULL DEFAULT false,
  creado_por_id uuid REFERENCES public.responsables(id) ON DELETE SET NULL,
  actualizado_por_id uuid REFERENCES public.responsables(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (olt_id, tipo_onu, modelo_clave)
);
CREATE INDEX IF NOT EXISTS onu_perfiles_olt_idx ON public.onu_perfiles_olt(olt_id,tipo_onu);
ALTER TABLE public.onu_perfiles_olt ENABLE ROW LEVEL SECURITY;
-- Sin políticas RLS públicas. Las solicitudes se validan en Edge con sesión general.
REVOKE ALL ON TABLE public.onu_perfiles_olt FROM anon, authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.onu_perfiles_olt TO service_role;
COMMENT ON TABLE public.onu_perfiles_olt IS 'Perfiles GPON por OLT y modelo: inicialmente deshabilitados. No provisiona ONU por si sola.';
