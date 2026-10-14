-- DISPROTEL / PILOTO: Mesa Tecnica bidireccional Fernando <-> Bryan.
-- No RLS nuevo: reutiliza el canal privado existente limitado a ambos usuarios.
-- Solo sucesos de negocio (no detector_estado, IP, ONU SN, fotos o notas).
-- Un trigger falla ABIERTO a la operacion: nunca bloquea OT o gestion tecnica.
create or replace function public.disprotel_mesa_realtime_hito()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_area text;
  v_estado text;
  v_anterior text := null;
  v_pendiente boolean;
  v_responsable uuid;
  v_acciones text[] := array[]::text[];
  v_ot text;
  v_grupo text;
  v_tipo text;
  v_aceptado uuid;
  v_actor text;
  v_destino text;
  v_accion text;
  v_orden_id uuid;
  v_duplicado boolean := false;
begin
  if TG_OP = 'UPDATE' and new.estado is not distinct from old.estado then
    return new;
  end if;
  v_estado := pg_catalog.upper(coalesce(new.estado,''));
  if TG_OP = 'UPDATE' then v_anterior := old.estado; end if;
  v_orden_id := new.orden_id;
  case TG_TABLE_NAME
    when 'orden_ip_solicitudes' then
      v_area := 'IP';
      if v_estado not in ('PENDIENTE','ASIGNADA','CANCELADA') then return new; end if;
      v_pendiente := v_estado = 'PENDIENTE';
      v_responsable := case when v_pendiente then new.solicitado_por_id else new.asignada_por_id end;
    when 'orden_onu_solicitudes' then
      v_area := 'ONU';
      if v_estado not in ('SOLICITADO','REQUIERE_CORRECCION','CONFIRMADO') then return new; end if;
      v_pendiente := v_estado = 'SOLICITADO';
      v_responsable := case when v_pendiente then new.solicitado_por_id else new.confirmado_por_id end;
    when 'orden_acceso_remoto' then
      v_area := 'REMOTO';
      if v_estado not in ('SOLICITADO','REQUIERE_CORRECCION','CONFIRMADO') then return new; end if;
      v_pendiente := v_estado = 'SOLICITADO';
      v_responsable := case when v_pendiente then new.solicitado_por_id else new.confirmado_por_id end;
    when 'orden_mesa_requerimientos' then
      v_area := 'MESA';
      if v_estado not in ('PENDIENTE','ATENDIDO') then return new; end if;
      v_pendiente := v_estado = 'PENDIENTE';
      v_responsable := case when v_pendiente then new.solicitado_por_id else new.atendido_por_id end;
      -- Solo codigos de acciones predefinidos, sin texto libre ni resultados.
      select coalesce(pg_catalog.array_agg(x),array[]::text[])
        into v_acciones
        from pg_catalog.unnest(coalesce(new.acciones,array[]::text[])) x
        where x in ('VERIFICAR_POTENCIA','ACTIVAR_CAMBIAR_ONU','CONFIRMAR_IP_ACTUAL',
                    'ASIGNAR_NUEVA_IP','VERIFICAR_ACCESO_REMOTO','REVISAR_RADIO_CPE',
                    'VERIFICAR_CONECTIVIDAD','OTRA_ACCION');
    else
      return new;
  end case;

  -- Solo el lector del piloto con Auth puede ver este Broadcast privado.
  -- Seleccionar destinatario segun direccion de la solicitud.
  v_destino := case when v_pendiente then 'SUPERVISOR' else 'TECNICO' end;
  begin
    select o.id_orden,coalesce(o.grupo_asignado,o.grupo_destino),o.tipo_trabajo,o.aceptado_por_id
      into v_ot,v_grupo,v_tipo,v_aceptado
      from public.ordenes_trabajo o where o.id=v_orden_id;
    if v_ot is null then return new; end if;

    -- Si el paquete de Mesa ya genera una solicitud IP/ONU/REMOTO dentro
    -- de los mismos 20 segundos, no duplicar la alerta al supervisor.
    if v_pendiente and v_area in ('IP','ONU','REMOTO') then
      select exists(
        select 1 from public.orden_mesa_requerimientos m
        where m.orden_id=v_orden_id
          and m.estado='PENDIENTE'
          and m.created_at >= pg_catalog.clock_timestamp()-interval '20 seconds'
          and ( (v_area='IP' and 'ASIGNAR_NUEVA_IP'=any(m.acciones))
             or (v_area='ONU' and 'ACTIVAR_CAMBIAR_ONU'=any(m.acciones))
             or (v_area='REMOTO' and 'VERIFICAR_ACCESO_REMOTO'=any(m.acciones)) )
      ) into v_duplicado;
      if v_duplicado then return new; end if;
    end if;

    if v_responsable is not null then
      select pg_catalog.split_part(pg_catalog.btrim(r.nombre),' ',1)
        into v_actor from public.responsables r where r.id=v_responsable;
    end if;

    -- Confirmacion de ONU = evidencia en ERP, NO activacion Huawei.
    v_accion := case when TG_OP='INSERT' then 'NUEVA' else 'CAMBIO' end;
    perform realtime.send(
      pg_catalog.jsonb_build_object(
        'revision',pg_catalog.clock_timestamp()::text,
        'fuente','MESA',
        'area',v_area,
        'ot',v_ot,
        'grupo',v_grupo,
        'tipo',v_tipo,
        'estado',v_estado,
        'anterior',v_anterior,
        'actor',v_actor,
        'destino',v_destino,
        'destinatario',case when v_destino='TECNICO' then v_aceptado::text else null end,
        'acciones',pg_catalog.to_jsonb(v_acciones),
        'accion',v_accion
      ),
      'ot_changed',
      'disprotel:ot-eventos',
      true
    );
  exception when others then
    raise warning 'DISPROTEL: aviso de Mesa no enviado (SQLSTATE %)',SQLSTATE;
  end;
  return new;
end;
$$;

-- No se modifican los triggers existentes de IP ni autorizaciones de ONU.
drop trigger if exists trg_disprotel_mesa_realtime_ip on public.orden_ip_solicitudes;
create trigger trg_disprotel_mesa_realtime_ip
after insert or update of estado on public.orden_ip_solicitudes
for each row execute function public.disprotel_mesa_realtime_hito();

drop trigger if exists trg_disprotel_mesa_realtime_onu on public.orden_onu_solicitudes;
create trigger trg_disprotel_mesa_realtime_onu
after insert or update of estado on public.orden_onu_solicitudes
for each row execute function public.disprotel_mesa_realtime_hito();

drop trigger if exists trg_disprotel_mesa_realtime_remoto on public.orden_acceso_remoto;
create trigger trg_disprotel_mesa_realtime_remoto
after insert or update of estado on public.orden_acceso_remoto
for each row execute function public.disprotel_mesa_realtime_hito();

drop trigger if exists trg_disprotel_mesa_realtime_requerimiento on public.orden_mesa_requerimientos;
create trigger trg_disprotel_mesa_realtime_requerimiento
after insert or update of estado on public.orden_mesa_requerimientos
for each row execute function public.disprotel_mesa_realtime_hito();
