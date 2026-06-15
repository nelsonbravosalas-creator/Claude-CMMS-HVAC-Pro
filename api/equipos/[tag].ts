/**
 * GET /api/equipos/:tag
 * Devuelve la ficha completa de un equipo por su TAG
 * Requiere autenticación (JWT Bearer o cookie cmms_refresh)
 * Usado por: QR scan → /qr/[tag] → esta API
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_db';
import { verifyToken, extractBearer } from '../_jwt';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ message: 'Método no permitido' });

  // Autenticación
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
        z.nombre   AS zona_nombre,
        z.codigo   AS zona_codigo,
        s.nombre   AS sucursal_nombre,
        s.codigo   AS sucursal_codigo,
        cat.nombre AS tipo_nombre
      FROM assets a
      LEFT JOIN zonas              z   ON z.uuid_sync  = a.zona_id
      LEFT JOIN sucursales         s   ON s.uuid_sync  = a.sucursal_id
      LEFT JOIN catalog_asset_types cat ON cat.uuid_sync = a.tipo_id
      WHERE a.tag        = ${tag}
        AND a.cliente_id = ${tokenPayload.cliente_id}
        AND a.deleted_at IS NULL
      LIMIT 1
    `;

    if (!rows[0]) {
      return res.status(404).json({ message: 'Equipo no encontrado' });
    }

    return res.status(200).json({ equipo: rows[0] });
  } catch (err) {
    console.error('[GET /api/equipos/[tag]]', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}
