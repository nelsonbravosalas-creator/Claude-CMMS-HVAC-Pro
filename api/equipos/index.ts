/**
 * GET  /api/equipos  — Lista equipos del cliente (filtros: sucursal_id, tipo_id, estado, criticidad)
 * POST /api/equipos  — Da de alta un nuevo equipo (auto-genera TAG)
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
    const { sucursal_id, tipo_id, estado, criticidad } = req.query as Record<string, string | undefined>;

    try {
      const rows = await sql`
        SELECT
          a.uuid_sync    AS equipo_id,
          a.tag,
          a.nombre,
          a.marca,
          a.modelo,
          a.numero_serie,
          a.estado,
          a.criticidad,
          a.fecha_instalacion,
          a.fecha_garantia_vence,
          a.variables_fijas_tipo,
          a.foto_url,
          a.created_at,
          s.uuid_sync    AS sucursal_id,
          s.nombre       AS sucursal_nombre,
          s.codigo       AS sucursal_codigo,
          cat.uuid_sync  AS tipo_de_equipo_id,
          cat.nombre     AS tipo_nombre,
          cat.tipo_codigo
        FROM assets a
        LEFT JOIN sucursales         s   ON s.uuid_sync  = a.sucursal_id
        LEFT JOIN catalog_asset_types cat ON cat.uuid_sync = a.tipo_id
        WHERE a.cliente_id = ${cliente_id}
          AND a.deleted_at IS NULL
          AND (${sucursal_id ?? null} IS NULL OR a.sucursal_id = ${sucursal_id ?? null}::uuid)
          AND (${tipo_id ?? null} IS NULL OR a.tipo_id = ${tipo_id ?? null}::uuid)
          AND (${estado ?? null} IS NULL OR a.estado = ${estado ?? null})
          AND (${criticidad ?? null} IS NULL OR a.criticidad = ${criticidad ?? null})
        ORDER BY a.tag
      `;
      return res.status(200).json({ equipos: rows });
    } catch (err) {
      console.error('[GET /api/equipos]', err);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  if (req.method === 'POST') {
    const body = req.body as {
      sucursal_id?: string;
      tipo_id?: string;
      nombre?: string;
      descripcion?: string;
      marca?: string;
      modelo?: string;
      numero_serie?: string;
      estado?: string;
      criticidad?: string;
      fecha_instalacion?: string;
      fecha_garantia_vence?: string;
      variables_fijas_tipo?: Record<string, unknown>;
    };

    if (!body.sucursal_id || !body.tipo_id || !body.nombre) {
      return res.status(400).json({ message: 'sucursal_id, tipo_id y nombre son requeridos' });
    }

    try {
      // Obtener datos de sucursal y tipo para generar TAG
      const [sucursal] = await sql`
        SELECT codigo FROM sucursales
        WHERE uuid_sync = ${body.sucursal_id} AND cliente_id = ${cliente_id} AND deleted_at IS NULL
      `;
      if (!sucursal) return res.status(400).json({ message: 'Sucursal no encontrada' });

      const [tipo] = await sql`
        SELECT tipo_codigo, nombre FROM catalog_asset_types
        WHERE uuid_sync = ${body.tipo_id} AND cliente_id = ${cliente_id} AND deleted_at IS NULL
      `;
      if (!tipo) return res.status(400).json({ message: 'Tipo de equipo no encontrado' });

      // Derivar código de tipo si no está configurado
      const tipoCodigo: string = (tipo.tipo_codigo as string | null)
        ?? (tipo.nombre as string).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);

      const tagPrefix = `${sucursal.codigo as string}.${tipoCodigo}`;

      // Calcular siguiente secuencia para este prefijo
      const [seqRow] = await sql`
        SELECT COUNT(*) AS total
        FROM assets
        WHERE cliente_id = ${cliente_id}
          AND tag LIKE ${tagPrefix + '.%'}
          AND deleted_at IS NULL
      `;
      const nextSeq = String(Number(seqRow.total) + 1).padStart(3, '0');
      const tag = `${tagPrefix}.${nextSeq}`;

      const [created] = await sql`
        INSERT INTO assets (
          cliente_id, sucursal_id, tipo_id, tag, nombre, descripcion,
          marca, modelo, numero_serie, estado, criticidad,
          fecha_instalacion, fecha_garantia_vence, variables_fijas_tipo
        ) VALUES (
          ${cliente_id},
          ${body.sucursal_id},
          ${body.tipo_id},
          ${tag},
          ${body.nombre},
          ${body.descripcion ?? null},
          ${body.marca ?? null},
          ${body.modelo ?? null},
          ${body.numero_serie ?? null},
          ${body.estado ?? 'operativo'},
          ${body.criticidad ?? 'media'},
          ${body.fecha_instalacion ?? null},
          ${body.fecha_garantia_vence ?? null},
          ${JSON.stringify(body.variables_fijas_tipo ?? {})}::jsonb
        )
        RETURNING
          uuid_sync AS equipo_id, tag, nombre, marca, modelo,
          estado, criticidad, created_at
      `;

      return res.status(201).json({ equipo: created });
    } catch (err) {
      console.error('[POST /api/equipos]', err);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  return res.status(405).json({ message: 'Método no permitido' });
}
