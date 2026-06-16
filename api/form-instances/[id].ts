/**
 * GET  /api/form-instances/:id  — Cargar instancia con sus respuestas
 * PATCH /api/form-instances/:id  — Guardar respuestas parciales (auto-save)
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

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'ID requerido' });
  }

  if (req.method === 'GET') {
    try {
      const [fi] = await sql`
        SELECT
          fi.uuid_sync        AS form_instance_id,
          fi.cliente_id,
          fi.work_order_id,
          fi.asset_id,
          fi.template_id,
          fi.template_version,
          fi.estado,
          fi.respuestas,
          fi.hallazgos_n,
          fi.score,
          fi.created_at,
          fi.updated_at,
          a.tag,
          a.nombre            AS equipo_nombre,
          a.tipo_id
        FROM form_instances fi
        JOIN assets a ON a.uuid_sync = fi.asset_id
        WHERE fi.uuid_sync = ${id}
          AND fi.cliente_id = ${cliente_id}
          AND fi.deleted_at IS NULL
      `;

      if (!fi) return res.status(404).json({ message: 'Formulario no encontrado' });
      return res.status(200).json({ form_instance: fi });
    } catch (err) {
      console.error('[form-instances/:id GET] Error:', err);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  if (req.method === 'PATCH') {
    const body = req.body as { respuestas?: Record<string, unknown>; estado?: string };

    if (!body.respuestas && !body.estado) {
      return res.status(400).json({ message: 'Se requiere respuestas o estado' });
    }

    try {
      // Solo se puede actualizar si no está firmado
      const [existing] = await sql`
        SELECT estado FROM form_instances
        WHERE uuid_sync = ${id} AND cliente_id = ${cliente_id} AND deleted_at IS NULL
      `;

      if (!existing) return res.status(404).json({ message: 'Formulario no encontrado' });
      if (existing.estado === 'firmado') {
        return res.status(409).json({ message: 'IMMUTABLE_SIGNED_FORM', code: 'IMMUTABLE_SIGNED_FORM' });
      }

      const nuevoEstado = body.estado ?? existing.estado;

      const [updated] = await sql`
        UPDATE form_instances
        SET
          respuestas = COALESCE(${JSON.stringify(body.respuestas ?? {})}::jsonb, respuestas),
          estado     = ${nuevoEstado},
          updated_at = now()
        WHERE uuid_sync = ${id}
          AND cliente_id = ${cliente_id}
        RETURNING uuid_sync AS form_instance_id, estado, respuestas, updated_at
      `;

      return res.status(200).json({ form_instance: updated });
    } catch (err) {
      console.error('[form-instances/:id PATCH] Error:', err);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  return res.status(405).json({ message: 'Método no permitido' });
}
