-- Estado no terminal para ONU registrada en running-config pero sin guardado persistente OLT.
ALTER TABLE public.onu_autorizaciones_manuales
  DROP CONSTRAINT IF EXISTS onu_autorizaciones_manuales_estado_check;
ALTER TABLE public.onu_autorizaciones_manuales
  ADD CONSTRAINT onu_autorizaciones_manuales_estado_check CHECK (
    estado IN (
      'DATOS_REGISTRADOS','APROBADA_PENDIENTE_EJECUCION',
      'EJECUTANDO','PENDIENTE_GUARDAR','AUTORIZADA','ERROR','CANCELADA'
    )
  );
COMMENT ON TABLE public.onu_autorizaciones_manuales IS
  'Registro de aprobacion humana separado de evidencia SmartOLT. PENDIENTE_GUARDAR no es una autorizacion terminada.';
