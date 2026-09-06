do $$
declare
  v_sql text;
  v_name text;
begin
  foreach v_name in array array[
    'ajustar_cantidad_item_instalacion',
    'eliminar_item_instalacion',
    'reemplazar_modelo_onu_item_instalacion',
    'reemplazar_serial_item_instalacion'
  ]
  loop
    select pg_get_functiondef(p.oid) into v_sql
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = v_name
    limit 1;

    if v_sql is null then
      raise exception 'No existe %', v_name;
    end if;

    v_sql := replace(v_sql,
      'select id into v_origen_id from ubicaciones where activo=true and upper(ubicacion)=upper(v_tecnico.unidad_grupo) limit 1;',
      'v_origen_id := public.obtener_minibodega_tecnico(p_tecnico_id);');

    v_sql := replace(v_sql,
      'select id into v_origen_id
  from public.ubicaciones
  where activo=true and upper(ubicacion)=upper(v_tecnico.unidad_grupo)
  limit 1;',
      'v_origen_id := public.obtener_minibodega_tecnico(p_tecnico_id);');

    v_sql := replace(v_sql,
      'select id into v_origen_id from public.ubicaciones where activo=true and upper(ubicacion)=upper(v_tecnico.unidad_grupo) limit 1;',
      'v_origen_id := public.obtener_minibodega_tecnico(p_tecnico_id);');

    execute v_sql;
  end loop;
end $$;
