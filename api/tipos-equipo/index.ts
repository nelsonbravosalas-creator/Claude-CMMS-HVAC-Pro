/**
 * GET  /api/tipos-equipo  — Lista tipos de equipo del cliente
 * POST /api/tipos-equipo  — Crea un nuevo tipo
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

  if (req.method === 'GET') {
    try {
      const rows = await sql`
        SELECT
          uuid_sync        AS tipo_de_equipo_id,
          nombre,
          descripcion,
          tipo_codigo,
          categoria,
          campos_dinamicos,
          icono,
          activo,
          created_at,
          updated_at
        FROM catalog_asset_types
        WHERE cliente_id = ${cliente_id}
          AND deleted_at IS NULL
        ORDER BY nombre
      `;
      return res.status(200).json({ tipos: rows });
    } catch (err) {
      console.error('[GET /api/tipos-equipo]', err);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  if (req.method === 'POST') {
    const body = req.body as {
      nombre?: string;
      tipo_codigo?: string;
      descripcion?: string;
      categoria?: string;
      campos_dinamicos?: Record<string, unknown>;
      icono?: string;
    };

    if (!body.nombre) return res.status(400).json({ message: 'nombre es requerido' });

    // Derivar tipo_codigo si no se especifica: primeras 3 letras en mayúscula sin espacios
    const tipoCodigo = body.tipo_codigo
      ? body.tipo_codigo.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
      : body.nombre.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);

    try {
      const [created] = await sql`
        INSERT INTO catalog_asset_types
          (cliente_id, nombre, tipo_codigo, descripcion, categoria, campos_dinamicos, icono)
        VALUES (
          ${cliente_id},
          ${body.nombre},
          ${tipoCodigo},
          ${body.descripcion ?? null},
          ${body.categoria ?? 'General'},
          ${JSON.stringify(body.campos_dinamicos ?? {})}::jsonb,
          ${body.icono ?? null}
        )
        RETURNING
          uuid_sync AS tipo_de_equipo_id,
          nombre, tipo_codigo, descripcion, categoria, activo, created_at
      `;
      return res.status(201).json({ tipo: created });
    } catch (err) {
      console.error('[POST /api/tipos-equipo]', err);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  return res.status(405).json({ message: 'Método no permitido' });
}
