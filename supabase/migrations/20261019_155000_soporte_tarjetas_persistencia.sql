-- DISPROTEL · Persistencia de las tarjetas de soporte (numerales 4 y 5).
-- Ya aplicada en Supabase del entorno de pruebas el 19-10-2026.
-- Idempotente: no modifica OT existentes ni descuenta inventario.
ALTER TABLE public.soporte_reportes
  ADD COLUMN IF NOT EXISTS canasta_borrador jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.soporte_reportes
  ADD COLUMN IF NOT EXISTS canasta_confirmada_at timestamptz;
ALTER TABLE public.soporte_reportes
  ADD COLUMN IF NOT EXISTS canasta_actualizada_at timestamptz;
ALTER TABLE public.soporte_reportes
  ADD COLUMN IF NOT EXISTS registro_tecnico_guardado_at timestamptz;

COMMENT ON COLUMN public.soporte_reportes.canasta_borrador IS
  'Borrador vigente, editable, agrupado por producto; no mueve inventario hasta finalizar OT';
COMMENT ON COLUMN public.soporte_reportes.canasta_confirmada_at IS
  'Última confirmación explícita de canasta del técnico';
COMMENT ON COLUMN public.soporte_reportes.registro_tecnico_guardado_at IS
  'Última confirmación del registro técnico / observaciones opcionales';
