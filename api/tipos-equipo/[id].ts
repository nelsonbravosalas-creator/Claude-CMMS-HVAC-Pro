/**
 * PATCH  /api/tipos-equipo/:id  — Actualiza tipo de equipo
 * DELETE /api/tipos-equipo/:id  — Archiva tipo
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
