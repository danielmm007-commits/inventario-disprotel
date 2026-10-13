
-- Acciones Huawei exclusivamente solicitadas por supervisores autenticados.
-- Servicio de ejecución en PC independiente del lector Huawei V3; sin reemplazarlo.
CREATE TABLE IF NOT EXISTS public.onu_gestion_huawei_ordenes(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 olt_codigo text NOT NULL,
 onu_sn text NOT NULL CHECK(onu_sn ~ '^[0-9A-F]{16}$'),
 onu_pon text NOT NULL CHECK(onu_pon ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{1,2}$'),
 ont_id integer,
 accion text NOT NULL CHECK(accion IN ('AUTORIZAR','ESTADO','OPTICA','REINICIAR','DESHABILITAR','HABILITAR','ELIMINAR')),
 estado text NOT NULL DEFAULT 'PENDIENTE' CHECK(estado IN ('PENDIENTE','EJECUTANDO','COMPLETADA','ERROR','REQUIERE_REVISION')),
 responsable_id uuid NOT NULL REFERENCES public.responsables(id),
 perfil_snapshot jsonb,
 resultado jsonb,
 mensaje text,
 creada_at timestamptz NOT NULL DEFAULT now(),
 tomada_at timestamptz,
 terminada_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS onu_gestion_una_operacion_pendiente
 ON public.onu_gestion_huawei_ordenes (olt_codigo,onu_sn)
 WHERE estado IN ('PENDIENTE','EJECUTANDO');
CREATE INDEX IF NOT EXISTS onu_gestion_ordenes_recientes
 ON public.onu_gestion_huawei_ordenes (olt_codigo,creada_at DESC);
ALTER TABLE public.onu_gestion_huawei_ordenes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.onu_gestion_huawei_ordenes FROM anon,authenticated;
