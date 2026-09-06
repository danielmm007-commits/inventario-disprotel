create or replace function public.obtener_minibodega_tecnico(p_tecnico_id uuid)
returns uuid
language plpgsql
security definer
set search_path to public
as $$
declare
  v_tecnico record;
  v_id uuid;
  v_grupo_norm text;
  v_bodega_norm text;
begin
  select id, nombre, unidad_grupo, bodega_asociada, activo
    into v_tecnico
  from public.responsables
  where id = p_tecnico_id;

  if not found or not coalesce(v_tecnico.activo, false) then
    raise exception 'Técnico no válido';
  end if;

  v_bodega_norm := upper(translate(trim(coalesce(v_tecnico.bodega_asociada, '')), 'ÁÉÍÓÚáéíóú', 'AEIOUaeiou'));

  if v_bodega_norm <> '' then
    select u.id into v_id
    from public.ubicaciones u
    where coalesce(u.activo, false) = true
      and coalesce(u.permite_stock, false) = true
      and upper(translate(trim(u.ubicacion), 'ÁÉÍÓÚáéíóú', 'AEIOUaeiou')) = v_bodega_norm
    limit 1;

    if v_id is not null then
      return v_id;
    end if;
  end if;

  v_grupo_norm := upper(translate(trim(coalesce(v_tecnico.unidad_grupo, '')), 'ÁÉÍÓÚáéíóú', 'AEIOUaeiou'));

  select u.id into v_id
  from public.ubicaciones u
  where coalesce(u.activo, false) = true
    and coalesce(u.permite_stock, false) = true
    and (
      (v_grupo_norm like '%CAMIONETA%' and upper(translate(u.ubicacion, 'ÁÉÍÓÚáéíóú', 'AEIOUaeiou')) like '%CAMIONETA%')
      or (v_grupo_norm like '%FURGONETA%' and upper(translate(u.ubicacion, 'ÁÉÍÓÚáéíóú', 'AEIOUaeiou')) like '%FURGONETA%')
      or (v_grupo_norm like '%SAQUISILI%' and upper(translate(u.ubicacion, 'ÁÉÍÓÚáéíóú', 'AEIOUaeiou')) like '%SAQUISILI%')
      or upper(translate(trim(u.ubicacion), 'ÁÉÍÓÚáéíóú', 'AEIOUaeiou')) = v_grupo_norm
    )
  order by case
    when v_grupo_norm like '%CAMIONETA%' and upper(translate(u.ubicacion, 'ÁÉÍÓÚáéíóú', 'AEIOUaeiou')) = 'CAMIONETA TOYOTA' then 0
    else 1
  end, u.ubicacion
  limit 1;

  if v_id is null then
    raise exception 'No existe minibodega asociada al técnico % (%). Configura bodega_asociada.', v_tecnico.nombre, v_tecnico.unidad_grupo;
  end if;

  return v_id;
end;
$$;

do $$
declare
  v_sql text;
begin
  select pg_get_functiondef(p.oid) into v_sql
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'guardar_articulos_orden_instalacion'
  limit 1;

  if v_sql is null then
    raise exception 'No existe guardar_articulos_orden_instalacion';
  end if;

  v_sql := replace(v_sql,
    'select id into v_origen_id from ubicaciones where activo=true and upper(ubicacion)=upper(v_tecnico.unidad_grupo) limit 1;
  if v_origen_id is null then raise exception ''No existe minibodega para el grupo %'',v_tecnico.unidad_grupo; end if;',
    'v_origen_id := public.obtener_minibodega_tecnico(p_tecnico_id);');

  execute v_sql;

  select pg_get_functiondef(p.oid) into v_sql
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'agregar_articulos_orden_instalacion'
  limit 1;

  if v_sql is null then
    raise exception 'No existe agregar_articulos_orden_instalacion';
  end if;

  v_sql := replace(v_sql,
    'select id into v_origen_id from ubicaciones where activo=true and upper(ubicacion)=upper(v_tecnico.unidad_grupo) limit 1;
  select id into v_destino_id from ubicaciones where activo=true and upper(ubicacion)=''CLIENTE'' limit 1;
  if v_origen_id is null or v_destino_id is null then raise exception ''Ubicaciones de inventario incompletas''; end if;',
    'v_origen_id := public.obtener_minibodega_tecnico(p_tecnico_id);
  select id into v_destino_id from ubicaciones where activo=true and upper(ubicacion)=''CLIENTE'' limit 1;
  if v_destino_id is null then raise exception ''Ubicaciones de inventario incompletas''; end if;');

  execute v_sql;
end $$;
