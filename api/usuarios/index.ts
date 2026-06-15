/**
 * GET  /api/usuarios  — Lista usuarios del cliente
 * POST /api/usuarios  — Crea nuevo usuario con password y PIN opcionales
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

  const rawToken = extractBearer(req.headers.authorization);
  if (!rawToken) return res.status(401).json({ message: 'No autenticado' });

  let payload;
  try {
    payload = await verifyToken(rawToken);
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }

  // Solo administrador y programador pueden gestionar usuarios
  if (!['administrador', 'programador'].includes(payload.rol)) {
    return res.status(403).json({ message: 'Sin permiso para gestionar usuarios' });
  }

  const { cliente_id } = payload;

  if (req.method === 'GET') {
    try {
      const rows = await sql`
        SELECT
          uuid_sync  AS user_id,
          nombre,
          email,
          rol,
          estado,
          telefono,
          activo,
          last_login,
          created_at
        FROM users
        WHERE cliente_id = ${cliente_id}
          AND deleted_at IS NULL
        ORDER BY nombre
      `;
      return res.status(200).json({ usuarios: rows });
    } catch (err) {
      console.error('[GET /api/usuarios]', err);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  if (req.method === 'POST') {
    const body = req.body as {
      nombre?: string;
      email?: string;
      rol?: string;
      password?: string;
      pin?: string;
      telefono?: string;
    };

    if (!body.nombre || !body.email || !body.rol || !body.password) {
      return res.status(400).json({ message: 'nombre, email, rol y password son requeridos' });
    }

    const rolesValidos = ['administrador', 'supervisor', 'tecnico', 'cliente', 'proveedor'];
    if (!rolesValidos.includes(body.rol)) {
      return res.status(400).json({ message: `Rol inválido. Válidos: ${rolesValidos.join(', ')}` });
    }

    try {
      const passwordHash = await hashSha256(body.password);
      const pinHash = body.pin ? await hashSha256(body.pin) : null;

      const [created] = await sql`
        INSERT INTO users (cliente_id, nombre, email, rol, password_hash, pin_hash, telefono, estado, activo)
        VALUES (
          ${cliente_id},
          ${body.nombre},
          ${body.email.toLowerCase().trim()},
          ${body.rol},
          ${passwordHash},
          ${pinHash},
          ${body.telefono ?? null},
          'activo',
          true
        )
        RETURNING uuid_sync AS user_id, nombre, email, rol, estado, created_at
      `;
      return res.status(201).json({ usuario: created });
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === '23505') {
        return res.status(409).json({ message: `El email "${body.email}" ya está registrado` });
      }
      console.error('[POST /api/usuarios]', err);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  return res.status(405).json({ message: 'Método no permitido' });
}
