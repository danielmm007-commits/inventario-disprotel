import { createClient } from 'npm:@supabase/supabase-js@2.95.0';

const origin = 'https://danielmm007-commits.github.io';
const headers = {
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'content-type,x-user,x-pin',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}

async function sha256(text: string) {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function database() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const raw = Deno.env.get('SUPABASE_SECRET_KEYS');
  const key = raw
    ? JSON.parse(raw).default
    : Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!key) throw new Error('Clave de servidor no disponible');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function sessionUser(s: any, req: Request) {
  const usuario = String(req.headers.get('x-user') || '').trim().toLowerCase();
  const pin = String(req.headers.get('x-pin') || '').trim();
  if (!usuario || !pin) return null;
  const result = await s
    .from('responsables')
    .select('id,nombre,usuario,rol,perfil_config_id,es_admin_principal,activo,pin_hash_prueba')
    .ilike('usuario', usuario)
    .maybeSingle();
  if (result.error || !result.data?.activo || !result.data?.pin_hash_prueba) {
    return null;
  }
  if (await sha256(pin) !== result.data.pin_hash_prueba) return null;
  return result.data;
}

function canManage(user: any) {
  return Boolean(user?.es_admin_principal) ||
    normalize(user?.rol) === 'ADMINISTRADOR SUPREMO';
}

async function catalogKeys(s: any) {
  const result = await s.from('permisos_catalogo').select('clave').eq('activo', true);
  if (result.error) throw result.error;
  return new Set((result.data || []).map((row: any) => row.clave));
}

async function profilePermissions(s: any, profileId: string) {
  const result = await s
    .from('perfil_permisos')
    .select('permiso_clave,permitido')
    .eq('perfil_id', profileId);
  if (result.error) throw result.error;
  return result.data || [];
}

async function audit(s: any, rows: any[]) {
  if (!rows.length) return;
  const result = await s.from('permisos_auditoria').insert(rows);
  if (result.error) throw result.error;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return reply({ error: 'Método no permitido' }, 405);

  try {
    const s = database();
    const me = await sessionUser(s, req);
    if (!me) return reply({ error: 'Sesión no válida' }, 401);
    if (!canManage(me)) {
      return reply({ error: 'Solo un Administrador Supremo puede gestionar permisos' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '');

    if (action === 'bootstrap') {
      const [catalog, profiles, users] = await Promise.all([
        s.from('permisos_catalogo')
          .select('clave,categoria,categoria_nombre,nombre,descripcion,orden,critico')
          .eq('activo', true)
          .order('orden'),
        s.from('perfiles_config')
          .select('id,nombre,perfil_base,es_sistema,activo')
          .eq('activo', true)
          .order('es_sistema', { ascending: false })
          .order('nombre'),
        s.from('responsables')
          .select('id,codigo,nombre,rol,perfil_config_id,activo')
          .eq('activo', true)
          .eq('setup_visible', true)
          .or('setup_managed.eq.true,codigo.eq.ADM-DANIEL')
          .order('nombre'),
      ]);
      if (catalog.error) throw catalog.error;
      if (profiles.error) throw profiles.error;
      if (users.error) throw users.error;
      return reply({
        ok: true,
        catalog: catalog.data || [],
        profiles: profiles.data || [],
        users: users.data || [],
      });
    }

    if (action === 'get_profile') {
      const profileId = String(body?.profile_id || '');
      if (!profileId) return reply({ error: 'Perfil requerido' }, 400);
      return reply({
        ok: true,
        permissions: await profilePermissions(s, profileId),
      });
    }

    if (action === 'get_user') {
      const userId = String(body?.user_id || '');
      if (!userId) return reply({ error: 'Usuario requerido' }, 400);
      const userResult = await s
        .from('responsables')
        .select('id,nombre,rol,perfil_config_id')
        .eq('id', userId)
        .maybeSingle();
      if (userResult.error) throw userResult.error;
      if (!userResult.data) return reply({ error: 'Usuario no encontrado' }, 404);
      const overrides = await s
        .from('usuario_permisos')
        .select('permiso_clave,estado,motivo,updated_at')
        .eq('responsable_id', userId);
      if (overrides.error) throw overrides.error;
      const inherited = userResult.data.perfil_config_id
        ? await profilePermissions(s, userResult.data.perfil_config_id)
        : [];
      const inheritedMap = new Map(
        inherited.map((row: any) => [row.permiso_clave, Boolean(row.permitido)]),
      );
      const overrideMap = new Map(
        (overrides.data || []).map((row: any) => [row.permiso_clave, row.estado]),
      );
      const effective = [...new Set([
        ...inheritedMap.keys(),
        ...overrideMap.keys(),
      ])].map((key) => ({
        permiso_clave: key,
        heredado: inheritedMap.get(key) === true,
        excepcion: overrideMap.get(key) || 'HEREDADO',
        efectivo: overrideMap.get(key) === 'PERMITIDO' ||
          (overrideMap.get(key) !== 'BLOQUEADO' && inheritedMap.get(key) === true),
      }));
      return reply({
        ok: true,
        user: userResult.data,
        overrides: overrides.data || [],
        effective,
      });
    }

    if (action === 'save_profile') {
      const profileId = String(body?.profile_id || '');
      const changes = Array.isArray(body?.permissions) ? body.permissions : [];
      if (!profileId || !changes.length) {
        return reply({ error: 'Perfil y permisos requeridos' }, 400);
      }
      const valid = await catalogKeys(s);
      const filtered = changes.filter((change: any) =>
        valid.has(String(change?.clave || '')) && typeof change?.permitido === 'boolean'
      );
      if (filtered.length !== changes.length) {
        return reply({ error: 'La solicitud contiene permisos inválidos' }, 400);
      }
      const previous = await profilePermissions(s, profileId);
      const previousMap = new Map(
        previous.map((row: any) => [row.permiso_clave, Boolean(row.permitido)]),
      );
      const now = new Date().toISOString();
      const result = await s.from('perfil_permisos').upsert(
        filtered.map((change: any) => ({
          perfil_id: profileId,
          permiso_clave: change.clave,
          permitido: change.permitido,
          updated_at: now,
        })),
        { onConflict: 'perfil_id,permiso_clave' },
      );
      if (result.error) throw result.error;
      await audit(s, filtered
        .filter((change: any) => previousMap.get(change.clave) !== change.permitido)
        .map((change: any) => ({
          actor_id: me.id,
          objetivo_tipo: 'PERFIL',
          perfil_id: profileId,
          permiso_clave: change.clave,
          valor_anterior: String(previousMap.get(change.clave) ?? false),
          valor_nuevo: String(change.permitido),
          motivo: String(body?.motivo || '').trim() || null,
        })));
      return reply({ ok: true, saved: filtered.length });
    }

    if (action === 'save_user') {
      const userId = String(body?.user_id || '');
      const changes = Array.isArray(body?.permissions) ? body.permissions : [];
      if (!userId || !changes.length) {
        return reply({ error: 'Usuario y permisos requeridos' }, 400);
      }
      const valid = await catalogKeys(s);
      const allowedStates = new Set(['HEREDADO', 'PERMITIDO', 'BLOQUEADO']);
      const filtered = changes.map((change: any) => ({
        clave: String(change?.clave || ''),
        estado: normalize(change?.estado),
      })).filter((change: any) =>
        valid.has(change.clave) && allowedStates.has(change.estado)
      );
      if (filtered.length !== changes.length) {
        return reply({ error: 'La solicitud contiene permisos inválidos' }, 400);
      }
      const previous = await s
        .from('usuario_permisos')
        .select('permiso_clave,estado')
        .eq('responsable_id', userId);
      if (previous.error) throw previous.error;
      const previousMap = new Map(
        (previous.data || []).map((row: any) => [row.permiso_clave, row.estado]),
      );
      const inherited = filtered.filter((change: any) => change.estado === 'HEREDADO');
      if (inherited.length) {
        const removed = await s.from('usuario_permisos')
          .delete()
          .eq('responsable_id', userId)
          .in('permiso_clave', inherited.map((change: any) => change.clave));
        if (removed.error) throw removed.error;
      }
      const overrides = filtered.filter((change: any) => change.estado !== 'HEREDADO');
      if (overrides.length) {
        const saved = await s.from('usuario_permisos').upsert(
          overrides.map((change: any) => ({
            responsable_id: userId,
            permiso_clave: change.clave,
            estado: change.estado,
            motivo: String(body?.motivo || '').trim() || null,
            otorgado_por_id: me.id,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: 'responsable_id,permiso_clave' },
        );
        if (saved.error) throw saved.error;
      }
      await audit(s, filtered
        .filter((change: any) =>
          (previousMap.get(change.clave) || 'HEREDADO') !== change.estado
        )
        .map((change: any) => ({
          actor_id: me.id,
          objetivo_tipo: 'USUARIO',
          responsable_id: userId,
          permiso_clave: change.clave,
          valor_anterior: previousMap.get(change.clave) || 'HEREDADO',
          valor_nuevo: change.estado,
          motivo: String(body?.motivo || '').trim() || null,
        })));
      return reply({ ok: true, saved: filtered.length });
    }

    return reply({ error: 'Acción no soportada' }, 400);
  } catch (error) {
    return reply({ error: String((error as Error)?.message ?? error) }, 500);
  }
});
