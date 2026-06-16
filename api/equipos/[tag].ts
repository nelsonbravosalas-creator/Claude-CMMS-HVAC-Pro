/**
 * GET    /api/equipos/:tag  — Ficha completa + OTs recientes
 * PATCH  /api/equipos/:tag  — Actualiza datos del equipo
 * DELETE /api/equipos/:tag  — Retira equipo (soft delete, estado=baja)
 * Usado por: QR scan, EquipoDetallePage, EquiposAdminPage
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_db';
import { verifyToken, extractBearer } from '../_jwt';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const rawToken = extractBearer(req.headers.authorization) ?? req.cookies?.cmms_refresh;
  if (!rawToken) return res.status(401).json({ message: 'Autenticación requerida' });

  let tokenPayload;
  try {
    tokenPayload = await verifyToken(rawToken);
  } catch {
    return res.status(401).json({ message: 'Token inválido' });
  }

  const { tag } = req.query as { tag?: string };
  if (!tag) return res.status(400).json({ message: 'TAG requerido' });

  const { cliente_id } = tokenPayload;

  if (req.method === 'GET') {
    try {
      const rows = await sql`
        SELECT
          a.tag,
          a.nombre,
          a.descripcion,
          a.marca,
          a.modelo,
          a.numero_serie,
          a.estado,
          a.criticidad,
          a.fecha_instalacion,
          a.fecha_garantia_vence,
          a.variables_fijas_tipo,
          a.foto_url,
          s.uuid_sync    AS sucursal_id,
          s.nombre       AS sucursal_nombre,
          s.codigo       AS sucursal_codigo,
          cat.uuid_sync  AS tipo_de_equipo_id,
          cat.nombre     AS tipo_nombre,
          cat.tipo_codigo,
          cat.campos_dinamicos
        FROM assets a
        LEFT JOIN sucursales          s   ON s.uuid_sync  = a.sucursal_id
        LEFT JOIN catalog_asset_types cat ON cat.uuid_sync = a.tipo_id
        WHERE a.tag        = ${tag}
          AND a.cliente_id = ${cliente_id}
          AND a.deleted_at IS NULL
        LIMIT 1
      `;

      if (!rows[0]) return res.status(404).json({ message: 'Equipo no encontrado' });

      // Últimas 10 OTs que incluyeron este equipo (JOIN a través de asset_id)
      const ots = await sql`
        SELECT
          wo.uuid_sync   AS work_order_id,
          wo.id          AS folio,
          wo.tipo,
          wo.estado,
          wo.fecha_programada,
          wo.updated_at,
          woa.estado     AS asset_estado
        FROM work_order_assets woa
        JOIN work_orders wo ON wo.uuid_sync = woa.work_order_id
        JOIN assets      a  ON a.uuid_sync  = woa.asset_id
        WHERE a.tag         = ${tag}
          AND wo.cliente_id = ${cliente_id}
          AND wo.deleted_at IS NULL
        ORDER BY wo.updated_at DESC
        LIMIT 10
      `;

      return res.status(200).json({ equipo: rows[0], ots });
    } catch (err) {
      console.error('[GET /api/equipos/:tag]', err);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  if (req.method === 'PATCH') {
    const body = req.body as {
      nombre?: string;
      descripcion?: string;
      marca?: string;
      modelo?: string;
      numero_serie?: string;
      estado?: string;
      criticidad?: string;
      fecha_instalacion?: string | null;
      fecha_garantia_vence?: string | null;
      variables_fijas_tipo?: Record<string, unknown>;
    };

    try {
      const [updated] = await sql`
        UPDATE assets
        SET
          nombre               = COALESCE(${body.nombre ?? null}, nombre),
          descripcion          = COALESCE(${body.descripcion ?? null}, descripcion),
          marca                = COALESCE(${body.marca ?? null}, marca),
          modelo               = COALESCE(${body.modelo ?? null}, modelo),
          numero_serie         = COALESCE(${body.numero_serie ?? null}, numero_serie),
          estado               = COALESCE(${body.estado ?? null}, estado),
          criticidad           = COALESCE(${body.criticidad ?? null}, criticidad),
          fecha_instalacion    = COALESCE(${body.fecha_instalacion ?? null}::date, fecha_instalacion),
          fecha_garantia_vence = COALESCE(${body.fecha_garantia_vence ?? null}::date, fecha_garantia_vence),
          variables_fijas_tipo = COALESCE(${body.variables_fijas_tipo ? JSON.stringify(body.variables_fijas_tipo) : null}::jsonb, variables_fijas_tipo),
          updated_at           = now()
        WHERE tag        = ${tag}
          AND cliente_id = ${cliente_id}
          AND deleted_at IS NULL
        RETURNING tag, nombre, estado, criticidad, updated_at
      `;
      if (!updated) return res.status(404).json({ message: 'Equipo no encontrado' });
      return res.status(200).json({ equipo: updated });
    } catch (err) {
      console.error('[PATCH /api/equipos/:tag]', err);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const [retired] = await sql`
        UPDATE assets
        SET estado = 'baja', deleted_at = now(), updated_at = now()
        WHERE tag        = ${tag}
          AND cliente_id = ${cliente_id}
          AND deleted_at IS NULL
        RETURNING tag
      `;
      if (!retired) return res.status(404).json({ message: 'Equipo no encontrado' });
      return res.status(200).json({ message: 'Equipo dado de baja' });
    } catch (err) {
      console.error('[DELETE /api/equipos/:tag]', err);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  return res.status(405).json({ message: 'Método no permitido' });
}
