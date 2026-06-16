/**
 * GET    /api/sucursales      — Lista sucursales del cliente
 * POST   /api/sucursales      — Crea nueva sucursal
 * PATCH  /api/sucursales?id=  — Actualiza sucursal  (rewrite desde /api/sucursales/:id)
 * DELETE /api/sucursales?id=  — Soft-delete sucursal (rewrite desde /api/sucursales/:id)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_db';
import { verifyToken, extractBearer } from './_jwt';

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

  const { cliente_id } = payload;
  const id = req.query.id as string | undefined;

  // ── Detalle / mutaciones por ID ──────────────────────────────────────────
  if (id) {
    if (req.method === 'PATCH') {
      const body = req.body as {
        nombre?: string;
        direccion?: string;
        ciudad?: string;
        region?: string;
        activo?: boolean;
      };
      try {
        const [updated] = await sql`
          UPDATE sucursales
          SET
            nombre    = COALESCE(${body.nombre ?? null}, nombre),
            direccion = COALESCE(${body.direccion ?? null}, direccion),
            ciudad    = COALESCE(${body.ciudad ?? null}, ciudad),
            region    = COALESCE(${body.region ?? null}, region),
            activo    = COALESCE(${body.activo ?? null}, activo),
            updated_at = now()
          WHERE uuid_sync  = ${id}
            AND cliente_id = ${cliente_id}
            AND deleted_at IS NULL
          RETURNING uuid_sync AS sucursal_id, nombre, codigo, ciudad, activo, updated_at
        `;
        if (!updated) return res.status(404).json({ message: 'Sucursal no encontrada' });
        return res.status(200).json({ sucursal: updated });
      } catch (err) {
        console.error('[PATCH /api/sucursales/:id]', err);
        return res.status(500).json({ message: 'Error interno del servidor' });
      }
    }

    if (req.method === 'DELETE') {
      try {
        const [deleted] = await sql`
          UPDATE sucursales
          SET activo = false, deleted_at = now(), updated_at = now()
          WHERE uuid_sync  = ${id}
            AND cliente_id = ${cliente_id}
            AND deleted_at IS NULL
          RETURNING uuid_sync AS sucursal_id
        `;
        if (!deleted) return res.status(404).json({ message: 'Sucursal no encontrada' });
        return res.status(200).json({ message: 'Sucursal desactivada' });
      } catch (err) {
        console.error('[DELETE /api/sucursales/:id]', err);
        return res.status(500).json({ message: 'Error interno del servidor' });
      }
    }

    return res.status(405).json({ message: 'Método no permitido' });
  }

  // ── Lista ────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const rows = await sql`
        SELECT
          uuid_sync   AS sucursal_id,
          nombre, codigo, direccion, ciudad, region, pais,
          latitud, longitud, activo, created_at, updated_at
        FROM sucursales
        WHERE cliente_id = ${cliente_id}
          AND deleted_at IS NULL
        ORDER BY codigo
      `;
      return res.status(200).json({ sucursales: rows });
    } catch (err) {
      console.error('[GET /api/sucursales]', err);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  // ── Crear ────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const body = req.body as {
      nombre?: string;
      codigo?: string;
      direccion?: string;
      ciudad?: string;
      region?: string;
      pais?: string;
      latitud?: number;
      longitud?: number;
    };

    if (!body.nombre || !body.codigo) {
      return res.status(400).json({ message: 'nombre y codigo son requeridos' });
    }

    const codigo = body.codigo.toUpperCase().replace(/[^A-Z0-9-]/g, '');

    try {
      const [created] = await sql`
        INSERT INTO sucursales (cliente_id, nombre, codigo, direccion, ciudad, region, pais, latitud, longitud)
        VALUES (
          ${cliente_id},
          ${body.nombre},
          ${codigo},
          ${body.direccion ?? null},
          ${body.ciudad ?? null},
          ${body.region ?? null},
          ${body.pais ?? 'CL'},
          ${body.latitud ?? null},
          ${body.longitud ?? null}
        )
        RETURNING uuid_sync AS sucursal_id, nombre, codigo, ciudad, region, activo, created_at
      `;
      return res.status(201).json({ sucursal: created });
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === '23505') {
        return res.status(409).json({ message: `El código "${body.codigo}" ya existe en este cliente` });
      }
      console.error('[POST /api/sucursales]', err);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  return res.status(405).json({ message: 'Método no permitido' });
}
