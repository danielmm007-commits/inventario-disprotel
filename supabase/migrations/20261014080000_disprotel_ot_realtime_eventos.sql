-- DISPROTEL: eventos de OT sin datos de clientes, solo para usuarios autenticados y activos.
-- NO aplicar sin probar primero la autenticacion y la suscripcion privada.
-- Cada cambio de estado/asignacion de OT produce 1 Broadcast privado.
create or replace function public.disprotel_realtime_usuario_activo()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.responsables r
    where r.auth_user_id = (select auth.uid())
      and r.activo is true
      and r.setup_visible is true
  );
$$;

revoke all on function public.disprotel_realtime_usuario_activo() from public, anon;
grant execute on function public.disprotel_realtime_usuario_activo() to authenticated;

create policy "disprotel_ot_eventos_private_receive"
on realtime.messages for select to authenticated
using (
  topic = 'disprotel:ot-eventos'
  and public.disprotel_realtime_usuario_activo()
);

create or replace function public.disprotel_emitir_cambio_ot()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  -- Evita enviar por cambios en otros campos, p. ej. GPS, IP, datos de contacto.
  if TG_OP = 'UPDATE'
    and row(new.estado,new.grupo_destino,new.grupo_asignado,new.aceptado_por_id,
      new.reasignacion_pendiente,new.reprogramacion_pendiente,new.accion_operativa_permitida)
    is not distinct from
    row(old.estado,old.grupo_destino,old.grupo_asignado,old.aceptado_por_id,
      old.reasignacion_pendiente,old.reprogramacion_pendiente,old.accion_operativa_permitida)
  then
    return new;
  end if;

  -- No incluir nombres, telefonos, IP, notas, identificadores de cliente ni OT.
  perform realtime.send(
    pg_catalog.jsonb_build_object('revision',pg_catalog.extract(epoch from pg_catalog.clock_timestamp())::bigint),
    'ot_changed',
    'disprotel:ot-eventos',
    true
  );

  if TG_OP = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists trg_disprotel_ot_realtime on public.ordenes_trabajo;
create trigger trg_disprotel_ot_realtime
after insert or update or delete on public.ordenes_trabajo
for each row execute function public.disprotel_emitir_cambio_ot();
