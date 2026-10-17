-- DISPROTEL · Preparación NO aplicada a producción.
-- Una sola foto activa por tipo de proceso. Las versiones anteriores se conservan.
alter table public.soporte_evidencias
  add column if not exists es_actual boolean not null default true,
  add column if not exists reemplaza_a_id uuid,
  add column if not exists reemplazada_at timestamptz;

-- El check antiguo solo acepta SERIAL/EQUIPO/TRABAJO/OTRA;
-- el frontend vigente y la Edge Function aceptan más categorías.
alter table public.soporte_evidencias
  drop constraint if exists soporte_evidencias_tipo_foto_check;
alter table public.soporte_evidencias
  add constraint soporte_evidencias_tipo_foto_check
  check (tipo_foto in (
    'SERIAL','EQUIPO','TRABAJO','OTRA',
    'FACHADA','DANO_ENCONTRADO','EQUIPO_INSTALADO',
    'TEST_VELOCIDAD','TV_CANALES','MATERIAL','ADICIONAL','ACCESO_REMOTO'
  ));

-- Reconocer únicamente fotos OTRA vinculadas explícitamente a acceso remoto.
-- No reasignar otras fotografías OTRA sin referencia técnica verificable.
with ids_remoto as (
  select soporte_evidencia_id id from public.orden_acceso_remoto
    where soporte_evidencia_id is not null
  union
  select nullif(resultado->'verificacion_acceso_remoto'->>'evidencia_id','')::uuid
    from public.orden_mesa_requerimientos
    where resultado->'verificacion_acceso_remoto'->>'evidencia_origen'='SOPORTE'
)
update public.soporte_evidencias e set
  tipo_foto='ACCESO_REMOTO',
  es_actual=exists(
    select 1 from public.orden_acceso_remoto ar
      where ar.soporte_evidencia_id=e.id and ar.estado='CONFIRMADO'
  ),
  reemplazada_at=case when exists(
    select 1 from public.orden_acceso_remoto ar
      where ar.soporte_evidencia_id=e.id and ar.estado='CONFIRMADO'
  ) then null else coalesce(e.reemplazada_at,now()) end
where (e.id in (select id from ids_remoto where id is not null)
       or e.storage_path_original like (e.orden_id::text||'/acceso-remoto-%'))
  and e.tipo_foto='OTRA';

-- Resguardar un único resultado vigente por OT / tipo sin tocar Storage.
with orden as (
  select id,
         row_number() over (
            partition by orden_id,tipo_foto
            order by fecha_hora_captura desc,created_at desc,id desc
         ) n
  from public.soporte_evidencias
  where es_actual and tipo_foto not in ('OTRA','ADICIONAL','ACCESO_REMOTO')
)
update public.soporte_evidencias e
 set es_actual=false,reemplazada_at=coalesce(e.reemplazada_at,now())
from orden
where e.id=orden.id and orden.n>1;

create or replace function public.disprotel_versionar_evidencia_soporte()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $v$
declare v_old uuid;
begin
 if new.es_actual is distinct from true
    or new.tipo_foto in ('ADICIONAL','OTRA') then return new; end if;
 -- Serializar dos cargas simultáneas del mismo proceso.
 perform pg_advisory_xact_lock(hashtext(new.orden_id::text),hashtext(new.tipo_foto));
 select id into v_old from public.soporte_evidencias
  where orden_id=new.orden_id and tipo_foto=new.tipo_foto and es_actual
  order by fecha_hora_captura desc,created_at desc,id desc limit 1 for update;
 if v_old is not null then
    update public.soporte_evidencias
      set es_actual=false,reemplazada_at=clock_timestamp()
    where orden_id=new.orden_id and tipo_foto=new.tipo_foto and es_actual;
    new.reemplaza_a_id := v_old;
 end if;
 return new;
end;
$v$;

drop trigger if exists trg_disprotel_versionar_evidencia_soporte on public.soporte_evidencias;
create trigger trg_disprotel_versionar_evidencia_soporte
before insert on public.soporte_evidencias
for each row execute function public.disprotel_versionar_evidencia_soporte();

create unique index if not exists soporte_evidencia_unica_vigente_proceso
on public.soporte_evidencias(orden_id,tipo_foto)
where es_actual and tipo_foto not in ('ADICIONAL','OTRA');

create index if not exists soporte_evidencias_orden_vigente_idx
on public.soporte_evidencias(orden_id,es_actual,tipo_foto,created_at desc);
