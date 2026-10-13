-- Autorizacion Huawei manual: datos administrativos separados de la evidencia SmartOLT.
-- NO provisiona ONU ni habilita comandos de escritura. La aprobacion siempre es humana.
CREATE TABLE IF NOT EXISTS public.onu_autorizaciones_manuales (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 orden_id uuid NOT NULL UNIQUE REFERENCES public.ordenes_trabajo(id) ON DELETE CASCADE,
 olt_codigo text NOT NULL,
 onu_sn text NOT NULL,
 onu_pon text NOT NULL,
 onu_modelo text,
 nombre text NOT NULL,
 nap text,
 zona text,
 ip_administrativa inet,
 estado text NOT NULL DEFAULT 'DATOS_REGISTRADOS'
   CHECK (estado IN ('DATOS_REGISTRADOS','APROBADA_PENDIENTE_EJECUCION','EJECUTANDO','AUTORIZADA','ERROR','CANCELADA')),
 registrado_por_id uuid NOT NULL REFERENCES public.responsables(id),
 aprobado_por_id uuid REFERENCES public.responsables(id),
 registrado_at timestamptz NOT NULL DEFAULT now(),
 aprobado_at timestamptz,
 ejecutado_at timestamptz,
 resultado_huawei jsonb,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT onu_aut_m_nap_o_zona CHECK (length(btrim(coalesce(nap,'')))>0 OR length(btrim(coalesce(zona,'')))>0),
 CONSTRAINT onu_aut_m_sn CHECK (onu_sn ~ '^[A-F0-9]{16}$'),
 CONSTRAINT onu_aut_m_pon CHECK (onu_pon ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{1,2}$'),
 CONSTRAINT onu_aut_m_nombre CHECK (length(btrim(nombre)) BETWEEN 2 AND 120)
);
CREATE UNIQUE INDEX IF NOT EXISTS onu_aut_m_olt_sn_activa
 ON public.onu_autorizaciones_manuales (olt_codigo,onu_sn) WHERE estado <> 'CANCELADA';
CREATE INDEX IF NOT EXISTS onu_aut_m_estado_olt ON public.onu_autorizaciones_manuales(estado,olt_codigo);
ALTER TABLE public.onu_autorizaciones_manuales ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.onu_autorizaciones_manuales FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.onu_autorizaciones_manuales TO service_role;
COMMENT ON COLUMN public.onu_autorizaciones_manuales.ip_administrativa IS 'IP informativa para administracion; NUNCA parametro de provisioning Huawei.';
COMMENT ON TABLE public.onu_autorizaciones_manuales IS 'Aprobaciones humanas de ONU; separado de orden_onu_solicitudes CONFIRMADO que corresponde a evidencia SmartOLT.';
