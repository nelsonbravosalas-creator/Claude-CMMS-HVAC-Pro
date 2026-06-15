/**
 * GET /api/work-orders/:id
 * Detalle de una OT con sus work_order_assets y equipos asociados.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_db';
import { verifyToken, extractBearer } from '../_jwt';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ message: 'Método no permitido' });

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
    return res.status(400).json({ message: 'ID de OT requerido' });
  }

  try {
    // OT principal
    const [wo] = await sql`
      SELECT
        wo.uuid_sync        AS work_order_id,
        wo.cliente_id,
        wo.sucursal_id,
        s.nombre            AS sucursal_nombre,
        wo.tipo,
        wo.estado,
        wo.descripcion,
        wo.hallazgo,
        wo.diagnostico,
        wo.recomendaciones,
        wo.conclusiones,
        wo.created_at,
        wo.updated_at,
        u.uuid_sync         AS tecnico_asignado_user_id,
        u.nombre            AS tecnico_nombre
      FROM work_orders wo
      LEFT JOIN sucursales s ON s.uuid_sync = wo.sucursal_id
      LEFT JOIN users u      ON u.uuid_sync = wo.tecnico_asignado_id
      WHERE wo.uuid_sync = ${id}
        AND wo.cliente_id = ${cliente_id}
        AND wo.deleted_at IS NULL
    `;

    if (!wo) return res.status(404).json({ message: 'OT no encontrada' });

    // Assets vinculados con datos del equipo
    const assets = await sql`
      SELECT
        woa.uuid_sync           AS work_order_asset_id,
        woa.work_order_id,
        woa.asset_id,
        woa.form_instance_id,
        woa.orden,
        woa.estado,
        woa.notas,
        woa.updated_at,
        a.tag,
        a.nombre                AS equipo_nombre,
        a.marca,
        a.modelo,
        a.tipo_id,
        cat.nombre              AS tipo_nombre,
        a.estado                AS equipo_estado,
        a.criticidad
      FROM work_order_assets woa
      JOIN assets a             ON a.uuid_sync = woa.asset_id
      JOIN catalog_asset_types cat ON cat.uuid_sync = a.tipo_id
      WHERE woa.work_order_id = ${id}
        AND woa.deleted_at IS NULL
      ORDER BY woa.orden ASC
    `;

    return res.status(200).json({ work_order: wo, assets });
  } catch (err) {
    console.error('[work-orders/:id] Error:', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}
