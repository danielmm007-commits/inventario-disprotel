-- La asociacion con una OT es opcional: el supervisor puede autorizar una ONU detectada directamente.
-- Se preserva la unicidad por OLT y serial; no se crea ni modifica ninguna OT.
ALTER TABLE public.onu_autorizaciones_manuales
  ALTER COLUMN orden_id DROP NOT NULL;

-- Aprobacion administrativa posible aun cuando falte validar el perfil GPON;
-- esta condicion NO entra en la cola de ejecucion Huawei.
ALTER TABLE public.onu_autorizaciones_manuales
  DROP CONSTRAINT IF EXISTS onu_autorizaciones_manuales_estado_check;
ALTER TABLE public.onu_autorizaciones_manuales
  ADD CONSTRAINT onu_autorizaciones_manuales_estado_check
  CHECK (estado IN (
    'DATOS_REGISTRADOS',
    'APROBADA_PENDIENTE_PERFIL',
    'APROBADA_PENDIENTE_EJECUCION',
    'EJECUTANDO',
    'PENDIENTE_GUARDAR',
    'AUTORIZADA',
    'ERROR',
    'CANCELADA'
  ));

COMMENT ON COLUMN public.onu_autorizaciones_manuales.orden_id IS
 'Opcional: autorizar ONU Huawei no exige una OT. Si existe se mantiene vinculada.';
COMMENT ON TABLE public.onu_autorizaciones_manuales IS
 'Autorizacion manual por supervisor; OT opcional. APROBADA_PENDIENTE_PERFIL bloquea provisioning hasta validacion y nueva confirmacion.';
