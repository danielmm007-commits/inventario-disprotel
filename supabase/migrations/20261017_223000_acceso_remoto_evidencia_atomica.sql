-- DISPROTEL · Revisión, no aplicado en producción.
-- La captura de acceso remoto se guarda como versión única vigente.
-- La transición de foto, solicitud, rectificaciones e historial es atómica.
create or replace function public.disprotel_guardar_evidencia_remota_soporte_v2(
 p_orden_id uuid,
 p_actor_id uuid,
 p_storage_path text,
 p_mime text,
 p_tamano integer,
 p_motivo text default null
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
 v_orden public.ordenes_trabajo%rowtype;
 v_acceso public.orden_acceso_remoto%rowtype;
 v_antigua uuid;
 v_nueva uuid;
 v_ahora timestamptz := clock_timestamp();
 v_rectificacion boolean;
 v_requerimiento record;
 v_resultado jsonb;
 v_prueba jsonb;
 v_rectificaciones jsonb;
 v_ids uuid[] := array[]::uuid[];
begin
 if p_actor_id is null or p_orden_id is null then
   raise exception 'Identidad y OT obligatorias' using errcode='22023';
 end if;
 if p_storage_path is null or left(p_storage_path,length(p_orden_id::text)+15) <> p_orden_id::text||'/acceso-remoto-' then
   raise exception 'Ruta de evidencia remota inválida' using errcode='22023';
 end if;
 if p_mime not in ('image/jpeg','image/png','image/webp') or p_tamano not between 1 and 5242880 then
   raise exception 'Formato o tamaño de imagen inválido' using errcode='22023';
 end if;

 select * into v_orden from public.ordenes_trabajo where id=p_orden_id for update;
 if not found or v_orden.estado<>'EN_PROCESO' or
   v_orden.tipo_trabajo not in ('SOPORTE_TECNICO','CAMBIO_EQUIPOS','REUBICACION') then
   raise exception 'El soporte no está habilitado para evidencias' using errcode='P0001';
 end if;
 select * into v_acceso from public.orden_acceso_remoto
  where orden_id=p_orden_id for update;
 if not found then raise exception 'Primero solicita verificación de acceso remoto' using errcode='P0001'; end if;
 v_rectificacion := v_acceso.estado='CONFIRMADO';
 v_antigua := v_acceso.soporte_evidencia_id;
 if v_rectificacion and (v_antigua is null or length(trim(coalesce(p_motivo,'')))<6) then
   raise exception 'Una captura confirmada solo se corrige con motivo válido' using errcode='P0001';
 end if;
 if not v_rectificacion and v_acceso.estado not in ('PENDIENTE','SOLICITADO','REQUIERE_CORRECCION') then
   raise exception 'No se puede subir evidencia para este estado de acceso' using errcode='P0001';
 end if;

 -- El trigger versiona cualquier evidencia anterior, sin eliminar sus bytes.
 insert into public.soporte_evidencias(
    orden_id,tipo_foto,storage_path_original,storage_path_vista,mime_type,
    tamano_bytes,fecha_hora_captura,tomada_por_id,registrado_por_id,es_actual
 ) values (
    p_orden_id,'ACCESO_REMOTO',p_storage_path,null,p_mime,
    p_tamano,v_ahora,p_actor_id,p_actor_id,true
 ) returning id into v_nueva;

 update public.orden_acceso_remoto
    set soporte_evidencia_id=v_nueva,evidencia_id=null,updated_at=v_ahora
    where id=v_acceso.id;

 if v_rectificacion then
   for v_requerimiento in
     select id,resultado from public.orden_mesa_requerimientos
      where orden_id=p_orden_id and estado='ATENDIDO'
        and acciones=array['VERIFICAR_ACCESO_REMOTO']::text[]
        and resultado->'verificacion_acceso_remoto'->>'evidencia_id'=v_antigua::text
      for update
   loop
      v_resultado := coalesce(v_requerimiento.resultado,'{}'::jsonb);
      v_prueba := coalesce(v_resultado->'verificacion_acceso_remoto','{}'::jsonb)
         || jsonb_build_object('evidencia_id',v_nueva,'rectificada_at',v_ahora,
            'rectificada_por_id',p_actor_id);
      v_rectificaciones := case
         when jsonb_typeof(v_resultado->'rectificaciones_acceso_remoto')='array'
         then v_resultado->'rectificaciones_acceso_remoto'
         else '[]'::jsonb end;
      v_resultado := v_resultado || jsonb_build_object(
        'verificacion_acceso_remoto',v_prueba,
        'rectificaciones_acceso_remoto',v_rectificaciones||
          jsonb_build_array(jsonb_build_object('anterior_id',v_antigua,
            'nueva_id',v_nueva,'motivo',left(trim(p_motivo),400),
            'registrado_por_id',p_actor_id,'registrado_at',v_ahora))
      );
      update public.orden_mesa_requerimientos
        set resultado=v_resultado,updated_at=v_ahora where id=v_requerimiento.id;
      v_ids:=array_append(v_ids,v_requerimiento.id);
   end loop;
   insert into public.orden_historial(orden_id,evento,detalle,realizado_por_id)
     values(p_orden_id,'EVIDENCIA_ACCESO_REMOTO_RECTIFICADA',
       jsonb_build_object('evidencia_anterior_id',v_antigua,
         'evidencia_nueva_id',v_nueva,'motivo',left(trim(p_motivo),400),
         'requerimientos_actualizados',to_jsonb(v_ids)),
       p_actor_id);
 else
   insert into public.orden_historial(orden_id,evento,detalle,realizado_por_id)
     values(p_orden_id,'EVIDENCIA_ACCESO_REMOTO_GUARDADA',
       jsonb_build_object('evidencia_id',v_nueva,'origen','SOPORTE'),
       p_actor_id);
 end if;

 return jsonb_build_object('ok',true,'evidencia_id',v_nueva,
   'rectificada',v_rectificacion,'evidencia_anterior_id',v_antigua);
end;
$$;

revoke all on function public.disprotel_guardar_evidencia_remota_soporte_v2(uuid,uuid,text,text,integer,text)
  from public, anon, authenticated;
grant execute on function public.disprotel_guardar_evidencia_remota_soporte_v2(uuid,uuid,text,text,integer,text)
  to service_role;
