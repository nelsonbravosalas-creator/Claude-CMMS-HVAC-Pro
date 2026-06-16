/**
 * Catálogo de recursos admin — enruta por query param ?resource=
 *
 * Rewrites en vercel.json lo invocan con:
 *   /api/tipos-equipo         → /api/catalog?resource=tipos-equipo
 *   /api/tipos-equipo/:id     → /api/catalog?resource=tipos-equipo&id=:id
 *   /api/usuarios             → /api/catalog?resource=usuarios
 *   /api/usuarios/:id         → /api/catalog?resource=usuarios&id=:id
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_db';
import { verifyToken, extractBearer } from './_jwt';

async function hashSha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Tipos de equipo ──────────────────────────────────────────────────────────

async function handleTipos(
  req: VercelRequest,
  res: VercelResponse,
  cliente_id: string,
  id?: string,
) {
  if (id) {
    if (req.method === 'PATCH') {
      const body = req.body as {
        nombre?: string;
        tipo_codigo?: string;
        descripcion?: string;
        categoria?: string;
        campos_dinamicos?: Record<string, unknown>;
        icono?: string;
        activo?: boolean;
      };
      try {
        const [updated] = await sql`
          UPDATE catalog_asset_types
          SET
            nombre           = COALESCE(${body.nombre ?? null}, nombre),
            tipo_codigo      = COALESCE(${body.tipo_codigo ?? null}, tipo_codigo),
            descripcion      = COALESCE(${body.descripcion ?? null}, descripcion),
            categoria        = COALESCE(${body.categoria ?? null}, categoria),
            campos_dinamicos = COALESCE(${body.campos_dinamicos ? JSON.stringify(body.campos_dinamicos) : null}::jsonb, campos_dinamicos),
            icono            = COALESCE(${body.icono ?? null}, icono),
            activo           = COALESCE(${body.activo ?? null}, activo),
            updated_at       = now()
          WHERE uuid_sync  = ${id}
            AND cliente_id = ${cliente_id}
            AND deleted_at IS NULL
          RETURNING uuid_sync AS tipo_de_equipo_id, nombre, tipo_codigo, activo, updated_at
        `;
        if (!updated) return res.status(404).json({ message: 'Tipo no encontrado' });
        return res.status(200).json({ tipo: updated });
      } catch (err) {
        console.error('[PATCH /api/tipos-equipo/:id]', err);
        return res.status(500).json({ message: 'Error interno del servidor' });
      }
    }

    if (req.method === 'DELETE') {
      try {
        const [archived] = await sql`
          UPDATE catalog_asset_types
          SET activo = false, deleted_at = now(), updated_at = now()
          WHERE uuid_sync  = ${id}
            AND cliente_id = ${cliente_id}
            AND deleted_at IS NULL
          RETURNING uuid_sync AS tipo_de_equipo_id
        `;
        if (!archived) return res.status(404).json({ message: 'Tipo no encontrado' });
        return res.status(200).json({ message: 'Tipo archivado' });
      } catch (err) {
        console.error('[DELETE /api/tipos-equipo/:id]', err);
        return res.status(500).json({ message: 'Error interno del servidor' });
      }
    }

    return res.status(405).json({ message: 'Método no permitido' });
  }

  if (req.method === 'GET') {
    try {
      const rows = await sql`
        SELECT
          uuid_sync        AS tipo_de_equipo_id,
          nombre, descripcion, tipo_codigo, categoria,
          campos_dinamicos, icono, activo, created_at, updated_at
        FROM catalog_asset_types
        WHERE cliente_id = ${cliente_id}
          AND deleted_at IS NULL
        ORDER BY nombre
      `;
      return res.status(200).json({ tipos: rows });
    } catch (err) {
      console.error('[GET /api/tipos-equipo]', err);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  if (req.method === 'POST') {
    const body = req.body as {
      nombre?: string;
      tipo_codigo?: string;
      descripcion?: string;
      categoria?: string;
      campos_dinamicos?: Record<string, unknown>;
      icono?: string;
    };

    if (!body.nombre) return res.status(400).json({ message: 'nombre es requerido' });

    const tipoCodigo = body.tipo_codigo
      ? body.tipo_codigo.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
      : body.nombre.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);

    try {
      const [created] = await sql`
        INSERT INTO catalog_asset_types
          (cliente_id, nombre, tipo_codigo, descripcion, categoria, campos_dinamicos, icono)
        VALUES (
          ${cliente_id},
          ${body.nombre},
          ${tipoCodigo},
          ${body.descripcion ?? null},
          ${body.categoria ?? 'General'},
          ${JSON.stringify(body.campos_dinamicos ?? {})}::jsonb,
          ${body.icono ?? null}
        )
        RETURNING
          uuid_sync AS tipo_de_equipo_id,
          nombre, tipo_codigo, descripcion, categoria, activo, created_at
      `;
      return res.status(201).json({ tipo: created });
    } catch (err) {
      console.error('[POST /api/tipos-equipo]', err);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  return res.status(405).json({ message: 'Método no permitido' });
}

// ── Usuarios ─────────────────────────────────────────────────────────────────

async function handleUsuarios(
  req: VercelRequest,
  res: VercelResponse,
  cliente_id: string,
  rol: string,
  id?: string,
) {
  if (!['administrador', 'programador'].includes(rol)) {
    return res.status(403).json({ message: 'Sin permiso para gestionar usuarios' });
  }

  if (id) {
    if (req.method !== 'PATCH') return res.status(405).json({ message: 'Método no permitido' });

    const body = req.body as {
      nombre?: string;
      rol?: string;
      estado?: string;
      telefono?: string;
      activo?: boolean;
      new_password?: string;
      new_pin?: string;
    };

    try {
      const passwordHash = body.new_password ? await hashSha256(body.new_password) : null;
      const pinHash = body.new_pin ? await hashSha256(body.new_pin) : null;

      const [updated] = await sql`
        UPDATE users
        SET
          nombre        = COALESCE(${body.nombre ?? null}, nombre),
          rol           = COALESCE(${body.rol ?? null}, rol),
          estado        = COALESCE(${body.estado ?? null}, estado),
          telefono      = COALESCE(${body.telefono ?? null}, telefono),
          activo        = COALESCE(${body.activo ?? null}, activo),
          password_hash = COALESCE(${passwordHash}, password_hash),
          pin_hash      = COALESCE(${pinHash}, pin_hash),
          updated_at    = now()
        WHERE uuid_sync  = ${id}
          AND cliente_id = ${cliente_id}
          AND deleted_at IS NULL
        RETURNING uuid_sync AS user_id, nombre, email, rol, estado, activo, updated_at
      `;
      if (!updated) return res.status(404).json({ message: 'Usuario no encontrado' });
      return res.status(200).json({ usuario: updated });
    } catch (err) {
      console.error('[PATCH /api/usuarios/:id]', err);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  if (req.method === 'GET') {
    try {
      const rows = await sql`
        SELECT
          uuid_sync  AS user_id,
          nombre, email, rol, estado, telefono, activo, last_login, created_at
        FROM users
        WHERE cliente_id = ${cliente_id}
          AND deleted_at IS NULL
        ORDER BY nombre
      `;
      return res.status(200).json({ usuarios: rows });
    } catch (err) {
      console.error('[GET /api/usuarios]', err);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  if (req.method === 'POST') {
    const body = req.body as {
      nombre?: string;
      email?: string;
      rol?: string;
      password?: string;
      pin?: string;
      telefono?: string;
    };

    if (!body.nombre || !body.email || !body.rol || !body.password) {
      return res.status(400).json({ message: 'nombre, email, rol y password son requeridos' });
    }

    const rolesValidos = ['administrador', 'supervisor', 'tecnico', 'cliente', 'proveedor'];
    if (!rolesValidos.includes(body.rol)) {
      return res.status(400).json({ message: `Rol inválido. Válidos: ${rolesValidos.join(', ')}` });
    }

    try {
      const passwordHash = await hashSha256(body.password);
      const pinHash = body.pin ? await hashSha256(body.pin) : null;

      const [created] = await sql`
        INSERT INTO users (cliente_id, nombre, email, rol, password_hash, pin_hash, telefono, estado, activo)
        VALUES (
          ${cliente_id},
          ${body.nombre},
          ${body.email.toLowerCase().trim()},
          ${body.rol},
          ${passwordHash},
          ${pinHash},
          ${body.telefono ?? null},
          'activo',
          true
        )
        RETURNING uuid_sync AS user_id, nombre, email, rol, estado, created_at
      `;
      return res.status(201).json({ usuario: created });
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === '23505') {
        return res.status(409).json({ message: `El email "${body.email}" ya está registrado` });
      }
      console.error('[POST /api/usuarios]', err);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  return res.status(405).json({ message: 'Método no permitido' });
}

// ── Dispatcher principal ──────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const rawToken = extractBearer(req.headers.authorization);
  if (!rawToken) return res.status(401).json({ message: 'No autenticado' });

  let payload;
  try {
    payload = await verifyToken(rawToken);
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }

  const { cliente_id, rol } = payload;
  const resource = req.query.resource as string | undefined;
  const id = req.query.id as string | undefined;

  if (resource === 'tipos-equipo') return handleTipos(req, res, cliente_id, id);
  if (resource === 'usuarios') return handleUsuarios(req, res, cliente_id, rol, id);

  return res.status(400).json({ message: 'Recurso no especificado' });
}
