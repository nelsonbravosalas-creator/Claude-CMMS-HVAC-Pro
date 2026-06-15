/**
 * PATCH  /api/sucursales/:id  — Actualiza una sucursal
 * DELETE /api/sucursales/:id  — Desactiva (soft delete)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_db';
import { verifyToken, extractBearer } from '../_jwt';

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

  const { id } = req.query;
  const { cliente_id } = payload;

  if (!id || typeof id !== 'string') return res.status(400).json({ message: 'ID requerido' });

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
