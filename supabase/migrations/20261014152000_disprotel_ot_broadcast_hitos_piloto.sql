-- Piloto Fernando + Bryan: enriquecer el evento Realtime PRIVADO sin datos de clientes.
-- Solo metadatos operativos: ID legible de OT, estado, grupo, y primer nombre
-- del receptor verificado exclusivamente en el paso de aceptación.
-- No altera tablas, permisos RLS ni el trigger existente.
create or replace function public.disprotel_emitir_cambio_ot()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_ot text;
  v_estado text;
  v_anterior text := null;
  v_grupo text;
  v_actor text := null;
begin
  if TG_OP = 'UPDATE'
    and row(new.estado,new.grupo_destino,new.grupo_asignado,new.aceptado_por_id,
      new.reasignacion_pendiente,new.reprogramacion_pendiente,new.accion_operativa_permitida)
    is not distinct from
    row(old.estado,old.grupo_destino,old.grupo_asignado,old.aceptado_por_id,
      old.reasignacion_pendiente,old.reprogramacion_pendiente,old.accion_operativa_permitida)
  then
    return new;
  end if;

  -- Nunca bloquear una OT si falla el aviso. Ni nombres/datos del cliente,
  -- números de teléfono, IP, dirección ni notas entran en el Broadcast.
  begin
    if TG_OP = 'DELETE' then
      v_ot := old.id_orden;
      v_estado := 'ELIMINADA';
      v_anterior := old.estado;
      v_grupo := coalesce(old.grupo_asignado,old.grupo_destino);
    else
      v_ot := new.id_orden;
      v_estado := new.estado;
      v_grupo := coalesce(new.grupo_asignado,new.grupo_destino);
      if TG_OP = 'UPDATE' then v_anterior := old.estado; end if;
      -- El responsable de RECEPCION es el usuario que aceptó formalmente la OT.
      -- Para otros pasos NO afirmar quién hizo clic (puede actuar un compañero).
      if pg_catalog.upper(coalesce(new.estado,'')) in ('ACEPTADA','TOMADA')
        and new.aceptado_por_id is not null
      then
        select pg_catalog.split_part(pg_catalog.btrim(r.nombre),' ',1)
          into v_actor
          from public.responsables r where r.id = new.aceptado_por_id;
      end if;
    end if;

    perform realtime.send(
      pg_catalog.jsonb_build_object(
        'revision',pg_catalog.clock_timestamp()::text,
        'ot',v_ot,
        'estado',v_estado,
        'anterior',v_anterior,
        'grupo',v_grupo,
        'actor',v_actor,
        'accion',TG_OP
      ),
      'ot_changed',
      'disprotel:ot-eventos',
      true
    );
  exception when others then
    raise warning 'DISPROTEL: aviso OT no enviado (SQLSTATE %)', SQLSTATE;
  end;

  if TG_OP = 'DELETE' then return old; end if;
  return new;
end;
$$;
