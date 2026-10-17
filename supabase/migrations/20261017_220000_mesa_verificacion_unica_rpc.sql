-- DISPROTEL · Propuesta para revisión. NO ejecutar hasta autorizar despliegue.
-- Reutiliza la misma fila lógica para repetir potencia / acceso remoto.
-- Preserva la comprobación anterior y su captura en orden_historial y Storage.
create or replace function public.disprotel_reiniciar_verificacion_mesa_v2(
  p_orden_id uuid,
  p_requerimiento_id uuid,
  p_actor_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_orden public.ordenes_trabajo%rowtype;
  v_req public.orden_mesa_requerimientos%rowtype;
  v_acceso public.orden_acceso_remoto%rowtype;
  v_accion text;
  v_reciente uuid;
  v_ahora timestamptz := clock_timestamp();
  v_ronda integer;
  v_snapshot_acceso jsonb := null;
begin
  if p_orden_id is null or p_requerimiento_id is null or p_actor_id is null then
    raise exception 'Parámetros obligatorios' using errcode='22023';
  end if;

  select * into v_orden from public.ordenes_trabajo
   where id=p_orden_id for update;
  if not found then raise exception 'OT no encontrada' using errcode='P0002'; end if;
  if v_orden.estado <> 'EN_PROCESO'
     or coalesce(v_orden.tipo_trabajo,'') like 'INSTALACION%' then
    raise exception 'Solo se repiten verificaciones de soportes en proceso' using errcode='P0001';
  end if;

  select * into v_req from public.orden_mesa_requerimientos
   where id=p_requerimiento_id and orden_id=p_orden_id for update;
  if not found then raise exception 'Requerimiento no encontrado' using errcode='P0002'; end if;
  v_accion := case when cardinality(v_req.acciones)=1 then v_req.acciones[1] else null end;
  if v_req.estado <> 'ATENDIDO' or v_accion not in ('VERIFICAR_POTENCIA','VERIFICAR_ACCESO_REMOTO') then
    raise exception 'Esta verificación no se puede repetir' using errcode='P0001';
  end if;
  select id into v_reciente from public.orden_mesa_requerimientos
    where orden_id=p_orden_id and acciones=array[v_accion]::text[]
    order by solicitado_at desc,id desc limit 1;
  if v_reciente is distinct from v_req.id then
    raise exception 'Solo se puede repetir la última comprobación' using errcode='P0001';
  end if;
  if exists(select 1 from public.orden_mesa_requerimientos
            where orden_id=p_orden_id and estado='PENDIENTE'
              and acciones=array[v_accion]::text[]) then
    raise exception 'Ya existe una verificación pendiente' using errcode='P0001';
  end if;

  if v_accion='VERIFICAR_ACCESO_REMOTO' then
    select * into v_acceso from public.orden_acceso_remoto
     where orden_id=p_orden_id for update;
    if not found or v_acceso.estado<>'CONFIRMADO'
      or (v_acceso.soporte_evidencia_id is null and v_acceso.evidencia_id is null) then
      raise exception 'El acceso remoto debe estar confirmado con evidencia' using errcode='P0001';
    end if;
    v_snapshot_acceso := to_jsonb(v_acceso);
  end if;

  v_ronda := greatest(2,coalesce(nullif(v_req.resultado->>'ronda','')::integer,1)+1);

  -- Auditoría primero. Si alguna escritura posterior falla, toda la transacción se revierte.
  insert into public.orden_historial(orden_id,evento,detalle,realizado_por_id)
    values(p_orden_id,'MESA_TECNICA_VERIFICACION_REINICIADA',
     jsonb_build_object(
       'requerimiento_id',v_req.id,
       'accion',v_accion,
       'ronda_anterior',v_ronda-1,
       'solicitado_at_anterior',v_req.solicitado_at,
       'atendido_at_anterior',v_req.atendido_at,
       'resultado_anterior',coalesce(v_req.resultado,'{}'::jsonb),
       'acceso_remoto_anterior',v_snapshot_acceso,
       'sin_borrado_de_evidencia',true
     ),p_actor_id);

  update public.orden_mesa_requerimientos set
    estado='PENDIENTE',
    solicitado_por_id=p_actor_id,
    solicitado_at=v_ahora,
    atendido_por_id=null,
    atendido_at=null,
    canal_resolucion=null,
    resultado=jsonb_build_object('ronda',v_ronda,'repeticion_iniciada_at',v_ahora),
    updated_at=v_ahora
   where id=v_req.id and orden_id=p_orden_id;

  if v_accion='VERIFICAR_ACCESO_REMOTO' then
    update public.orden_acceso_remoto set
      estado='SOLICITADO',
      soporte_evidencia_id=null,evidencia_id=null,
      confirmado_at=null,confirmado_por_id=null,
      observacion=null,solicitado_at=v_ahora,updated_at=v_ahora
    where id=v_acceso.id;
  end if;

  return jsonb_build_object('ok',true,'requerimiento_id',v_req.id,
    'nuevo_requerimiento_id',v_req.id,'ronda',v_ronda,
    'accion',v_accion,'estado','PENDIENTE','fila_reutilizada',true);
end;
$fn$;

-- La Edge Function activa usa service role; el cliente web no puede ejecutar la RPC.
revoke all on function public.disprotel_reiniciar_verificacion_mesa_v2(uuid,uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.disprotel_reiniciar_verificacion_mesa_v2(uuid,uuid,uuid)
  to service_role;
