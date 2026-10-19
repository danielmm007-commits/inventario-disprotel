-- DISPROTEL: borrador de cambios. NO ejecutar en producción sin revisar primero.
-- Registro técnico explícito y canasta confirmada por OT antes del cierre.
ALTER TABLE public.soporte_reportes
  ADD COLUMN IF NOT EXISTS registro_tecnico_guardado_at timestamptz,
  ADD COLUMN IF NOT EXISTS canasta_borrador jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS canasta_actualizada_at timestamptz,
  ADD COLUMN IF NOT EXISTS canasta_confirmada_at timestamptz;

-- Solo listas estructuradas. El stock se verificará de nuevo al cerrar la OT.
ALTER TABLE public.soporte_reportes DROP CONSTRAINT IF EXISTS soporte_reportes_canasta_borrador_lista_chk;
ALTER TABLE public.soporte_reportes ADD CONSTRAINT soporte_reportes_canasta_borrador_lista_chk
  CHECK (jsonb_typeof(canasta_borrador) = 'array'
    AND jsonb_array_length(canasta_borrador) <= 100);

COMMENT ON COLUMN public.soporte_reportes.registro_tecnico_guardado_at
  IS 'Última confirmación explícita del registro técnico del numeral 4';
COMMENT ON COLUMN public.soporte_reportes.canasta_borrador
  IS 'Canasta editable antes de finalizar soporte; no descuenta inventario';
COMMENT ON COLUMN public.soporte_reportes.canasta_confirmada_at
  IS 'Momento de última confirmación íntegra de la canasta; queda NULL al reabrir cambios';
