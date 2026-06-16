/**
 * GET  /api/work-orders              — Lista OTs (filtros: estado, tipo, sucursal_id)
 * GET  /api/work-orders?action=kpis  — KPIs para dashboard
 * POST /api/work-orders              — Crear nueva OT con sus equipos
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

  const { cliente_id } = payload;

  // ── KPIs para dashboard ───────────────────────────────────────────────────
  if (req.method === 'GET' && req.query.action === 'kpis') {
    try {
      const [kpis] = await sql`
        SELECT
          COUNT(*) FILTER (WHERE estado = 'abierto')                                             AS abiertas,
          COUNT(*) FILTER (WHERE estado = 'en_progreso')                                         AS en_progreso,
          COUNT(*) FILTER (WHERE estado = 'completado'
                            AND updated_at::date = CURRENT_DATE)                                 AS completadas_hoy,
          COUNT(*) FILTER (WHERE estado NOT IN ('completado','cerrado'))                          AS pendientes_total
        FROM work_orders
        WHERE cliente_id = ${cliente_id} AND deleted_at IS NULL
      `;

      const urgentes = await sql`
        SELECT
          wo.uuid_sync          AS work_order_id,
          wo.tipo,
          wo.estado,
          wo.descripcion,
          wo.updated_at,
          s.nombre              AS sucursal_nombre,
          u.nombre              AS tecnico_nombre,
          COUNT(woa.uuid_sync)  AS total_assets,
          COUNT(woa.uuid_sync) FILTER (WHERE woa.estado = 'completado') AS completados
        FROM work_orders wo
        LEFT JOIN sucursales s            ON s.uuid_sync = wo.sucursal_id
        LEFT JOIN users u                 ON u.uuid_sync = wo.tecnico_asignado_id
        LEFT JOIN work_order_assets woa   ON woa.work_order_id = wo.uuid_sync
                                         AND woa.deleted_at IS NULL
        WHERE wo.cliente_id = ${cliente_id}
          AND wo.deleted_at IS NULL
          AND wo.estado NOT IN ('completado', 'cerrado')
        GROUP BY wo.uuid_sync, s.nombre, u.nombre
        ORDER BY wo.updated_at DESC
        LIMIT 8
      `;

      return res.status(200).json({ kpis, urgentes });
    } catch (err) {
      console.error('[work-orders kpis]', err);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  // ── Lista OTs ─────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
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
      console.error('[work-orders list]', err);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  // ── Crear OT ──────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const body = req.body as {
      sucursal_id?: string;
      tipo?: string;
      descripcion?: string;
      tecnico_asignado_id?: string;
      asset_ids?: string[];
    };

    if (!body.sucursal_id || !body.tipo) {
      return res.status(400).json({ message: 'sucursal_id y tipo son requeridos' });
    }

    const tiposValidos = ['preventivo', 'correctivo', 'atencion_falla', 'puesta_en_marcha', 'inspeccion_tecnica', 'instalacion_montaje', 'predictivo'];
    if (!tiposValidos.includes(body.tipo)) {
      return res.status(400).json({ message: `tipo inválido. Válidos: ${tiposValidos.join(', ')}` });
    }

    try {
      const [wo] = await sql`
        INSERT INTO work_orders (
          cliente_id, sucursal_id, tipo, descripcion, tecnico_asignado_id, estado
        ) VALUES (
          ${cliente_id},
          ${body.sucursal_id},
          ${body.tipo},
          ${body.descripcion ?? null},
          ${body.tecnico_asignado_id ?? null},
          'abierto'
        )
        RETURNING
          uuid_sync AS work_order_id,
          sucursal_id, tipo, estado, descripcion, created_at
      `;

      // Vincular equipos
      if (body.asset_ids?.length) {
        for (let i = 0; i < body.asset_ids.length; i++) {
          await sql`
            INSERT INTO work_order_assets (work_order_id, asset_id, orden, estado)
            VALUES (${wo.work_order_id as string}, ${body.asset_ids[i]}, ${i + 1}, 'pendiente')
          `;
        }
      }

      return res.status(201).json({ work_order: wo });
    } catch (err) {
      console.error('[work-orders POST]', err);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  return res.status(405).json({ message: 'Método no permitido' });
}
