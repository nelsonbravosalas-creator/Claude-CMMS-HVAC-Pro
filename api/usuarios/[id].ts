/**
 * PATCH /api/usuarios/:id  — Actualiza usuario (rol, estado, reset password/PIN)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_db';
import { verifyToken, extractBearer } from '../_jwt';

async function hashSha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PATCH') return res.status(405).json({ message: 'Método no permitido' });

  const rawToken = extractBearer(req.headers.authorization);
  if (!rawToken) return res.status(401).json({ message: 'No autenticado' });

  let payload;
  try {
    payload = await verifyToken(rawToken);
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }

  if (!['administrador', 'programador'].includes(payload.rol)) {
    return res.status(403).json({ message: 'Sin permiso para modificar usuarios' });
  }

  const { id } = req.query;
  const { cliente_id } = payload;
  if (!id || typeof id !== 'string') return res.status(400).json({ message: 'ID requerido' });

  const body = req.body as {
    nombre?: string;
    rol?: string;
    estado?: string;
    telefono?: string;
    activo?: boolean;
    new_password?: string;
    new_pin?: string;
  };

  try {
    const passwordHash = body.new_password ? await hashSha256(body.new_password) : null;
    const pinHash = body.new_pin ? await hashSha256(body.new_pin) : null;

    const [updated] = await sql`
      UPDATE users
      SET
        nombre        = COALESCE(${body.nombre ?? null}, nombre),
        rol           = COALESCE(${body.rol ?? null}, rol),
        estado        = COALESCE(${body.estado ?? null}, estado),
        telefono      = COALESCE(${body.telefono ?? null}, telefono),
        activo        = COALESCE(${body.activo ?? null}, activo),
        password_hash = COALESCE(${passwordHash}, password_hash),
        pin_hash      = COALESCE(${pinHash}, pin_hash),
        updated_at    = now()
      WHERE uuid_sync  = ${id}
        AND cliente_id = ${cliente_id}
        AND deleted_at IS NULL
      RETURNING uuid_sync AS user_id, nombre, email, rol, estado, activo, updated_at
    `;
    if (!updated) return res.status(404).json({ message: 'Usuario no encontrado' });
    return res.status(200).json({ usuario: updated });
  } catch (err) {
    console.error('[PATCH /api/usuarios/:id]', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}
