-- Realtime privado: cambios en evidencia Mesa y lecturas Huawei bajo demanda.
-- Solo IDs y estados; jamás fotografías, serie ONU, IP, credenciales ni potencia en el Broadcast.
create or replace function public.disprotel_mesa_dato_broadcast()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_ot text;
begin
  if new.resultado is not distinct from old.resultado then return new; end if;
  begin
    select id_orden into v_ot from public.ordenes_trabajo where id=new.orden_id;
    if v_ot is null then return new; end if;
    perform realtime.send(pg_catalog.jsonb_build_object(
      'revision',pg_catalog.clock_timestamp()::text,
      'fuente','MESA_DATO','ot',v_ot,'orden_uuid',new.orden_id::text,
      'solicitud_id',new.id::text,'estado',new.estado
    ),'ot_changed','disprotel:ot-eventos',true);
  exception when others then
    raise warning 'DISPROTEL Mesa dato Realtime %',SQLSTATE;
  end;
  return new;
end;
$$;
drop trigger if exists trg_disprotel_mesa_dato_broadcast on public.orden_mesa_requerimientos;
create trigger trg_disprotel_mesa_dato_broadcast
after update of resultado on public.orden_mesa_requerimientos
for each row execute function public.disprotel_mesa_dato_broadcast();

create or replace function public.disprotel_huawei_demanda_broadcast()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_ot text;
begin
  if new.olt_estado is not distinct from old.olt_estado then return new; end if;
  if new.olt_estado not in ('OK','ERROR') or new.orden_id is null
     or new.mikrotik_estado <> 'NO_APLICA' or new.origen_consulta <> 'SERVICIO' then
    return new;
  end if;
  begin
    select id_orden into v_ot from public.ordenes_trabajo where id=new.orden_id;
    if v_ot is null then return new; end if;
    perform realtime.send(pg_catalog.jsonb_build_object(
      'revision',pg_catalog.clock_timestamp()::text,
      'fuente','HUAWEI_DEMANDA','ot',v_ot,'orden_uuid',new.orden_id::text,
      'solicitud_id',new.id::text,'estado',new.olt_estado
    ),'ot_changed','disprotel:ot-eventos',true);
  exception when others then
    raise warning 'DISPROTEL Huawei demanda Realtime %',SQLSTATE;
  end;
  return new;
end;
$$;
drop trigger if exists trg_disprotel_huawei_demanda_broadcast on public.consulta_red_solicitudes;
create trigger trg_disprotel_huawei_demanda_broadcast
after update of olt_estado on public.consulta_red_solicitudes
for each row execute function public.disprotel_huawei_demanda_broadcast();
