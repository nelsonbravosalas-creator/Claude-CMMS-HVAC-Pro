/**
 * GET /api/form-templates
 * Plantillas activas del cliente. Filtra por tipo_id si se pasa.
 * La respuesta mapea campos_definicion → campos para el frontend.
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
  const { tipo_id } = req.query;

  try {
    const rows = await sql`
      SELECT
        ft.uuid_sync        AS form_template_id,
        ft.cliente_id,
        ft.tipo_id,
        ft.categoria_id,
        fc.nombre           AS categoria,
        ft.codigo,
        ft.version,
        ft.nombre,
        ft.campos_definicion AS campos,
        ft.activo,
        ft.published_at,
        ft.created_at,
        ft.updated_at
      FROM form_templates ft
      LEFT JOIN form_categories fc ON fc.uuid_sync = ft.categoria_id
      WHERE ft.cliente_id = ${cliente_id}
        AND ft.activo = true
        AND ft.published_at IS NOT NULL
        AND ft.deleted_at IS NULL
        ${tipo_id ? sql`AND (ft.tipo_id = ${tipo_id as string} OR ft.tipo_id IS NULL)` : sql``}
      ORDER BY ft.tipo_id NULLS LAST, ft.version DESC
    `;

    return res.status(200).json({ form_templates: rows });
  } catch (err) {
    console.error('[form-templates] Error:', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}
