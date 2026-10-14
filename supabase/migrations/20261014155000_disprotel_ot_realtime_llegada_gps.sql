-- DISPROTEL: aviso privado de llegada GPS para Fernando y Bryan.
-- LLEGADA se registra en orden_gps_eventos, NO cambia el estado de ordenes_trabajo.
-- Enviar solo hito operativo; jamas incluir coordenadas, contacto ni datos del cliente.
-- Conserva permisos de suscripcion establecidos para el piloto privado.
create or replace function public.disprotel_realtime_llegada_gps()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_ot text;
  v_grupo text;
  v_estado_ot text;
  v_actor text;
begin
  if TG_OP <> 'INSERT'
    or pg_catalog.upper(pg_catalog.btrim(coalesce(new.tipo_evento,''))) <> 'LLEGADA'
    or pg_catalog.upper(pg_catalog.btrim(coalesce(new.estado_gps,''))) <> 'REGISTRADO'
  then
    return new;
  end if;

  -- Cualquier error en la notificacion NO debe impedir guardar el GPS.
  begin
    select o.id_orden,coalesce(o.grupo_asignado,o.grupo_destino),o.estado,
           pg_catalog.split_part(pg_catalog.btrim(r.nombre),' ',1)
      into v_ot,v_grupo,v_estado_ot,v_actor
      from public.ordenes_trabajo o
      left join public.responsables r on r.id = new.responsable_id
      where o.id = new.orden_id;

    if v_ot is not null then
      perform realtime.send(
        pg_catalog.jsonb_build_object(
          'revision',pg_catalog.clock_timestamp()::text,
          'ot',v_ot,
          'estado','LLEGADA_EN_SITIO',
          'anterior',v_estado_ot,
          'grupo',v_grupo,
          'actor',v_actor,
          'accion','GPS_LLEGADA'
        ),
        'ot_changed',
        'disprotel:ot-eventos',
        true
      );
    end if;
  exception when others then
    raise warning 'DISPROTEL: aviso GPS LLEGADA no enviado (SQLSTATE %)', SQLSTATE;
  end;

  return new;
end;
$$;

drop trigger if exists trg_disprotel_ot_realtime_llegada_gps on public.orden_gps_eventos;
create trigger trg_disprotel_ot_realtime_llegada_gps
after insert on public.orden_gps_eventos
for each row execute function public.disprotel_realtime_llegada_gps();
