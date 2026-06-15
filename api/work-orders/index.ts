/**
 * GET /api/work-orders
 * Lista OTs del cliente autenticado, con conteo de assets.
 * Filtros opcionales: estado, tipo, sucursal_id
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

  const { cliente_id } = payload;
  const { estado, tipo, sucursal_id } = req.query;

  try {
    const rows = await sql`
      SELECT
        wo.uuid_sync          AS work_order_id,
        wo.cliente_id,
        wo.sucursal_id,
        s.nombre              AS sucursal_nombre,
        wo.tipo,
        wo.estado,
        wo.descripcion,
        wo.hallazgo,
        wo.diagnostico,
        wo.recomendaciones,
        wo.conclusiones,
        wo.created_at,
        wo.updated_at,
        u.nombre              AS tecnico_nombre,
        COUNT(woa.uuid_sync)  AS total_assets,
        COUNT(woa.uuid_sync) FILTER (WHERE woa.estado = 'completado') AS completados,
        COUNT(woa.uuid_sync) FILTER (WHERE woa.estado = 'omitido')    AS omitidos
      FROM work_orders wo
      LEFT JOIN sucursales s  ON s.uuid_sync = wo.sucursal_id
      LEFT JOIN users u       ON u.uuid_sync = wo.tecnico_asignado_id
      LEFT JOIN work_order_assets woa ON woa.work_order_id = wo.uuid_sync
                                     AND woa.deleted_at IS NULL
      WHERE wo.cliente_id = ${cliente_id}
        AND wo.deleted_at IS NULL
        ${estado ? sql`AND wo.estado = ${estado as string}` : sql``}
        ${tipo ? sql`AND wo.tipo = ${tipo as string}` : sql``}
        ${sucursal_id ? sql`AND wo.sucursal_id = ${sucursal_id as string}` : sql``}
      GROUP BY wo.uuid_sync, s.nombre, u.nombre
      ORDER BY wo.updated_at DESC
      LIMIT 100
    `;

    return res.status(200).json({ work_orders: rows });
  } catch (err) {
    console.error('[work-orders] Error:', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}
