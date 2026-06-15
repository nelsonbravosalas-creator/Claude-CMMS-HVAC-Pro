/**
 * POST /api/auth/login
 * Body: { email: string, password: string }
 * Response: { token: string, user: { user_id, cliente_id, nombre, email, rol, estado } }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_db';
import { signToken } from '../_jwt';
import { createHash } from 'crypto';

function hashPassword(password: string): string {
  // SHA-256 simple — en producción usar bcrypt con salt almacenado
  return createHash('sha256').update(password).digest('hex');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Método no permitido' });

  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return res.status(400).json({ message: 'Email y contraseña requeridos' });
  }

  try {
    const rows = await sql`
      SELECT user_id, cliente_id, nombre, email, rol, estado, password_hash
      FROM users
      WHERE email = ${email.toLowerCase().trim()}
      LIMIT 1
    `;

    const user = rows[0] as {
      user_id: string;
      cliente_id: string;
      nombre: string;
      email: string;
      rol: string;
      estado: string;
      password_hash: string;
    } | undefined;

    if (!user) {
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    if (user.estado !== 'activo') {
      return res.status(403).json({ message: 'Usuario inactivo' });
    }

    if (user.password_hash !== hashPassword(password)) {
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    const token = await signToken({
      user_id: user.user_id,
      cliente_id: user.cliente_id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
    });

    // Cookie httpOnly para refresh (opcional)
    res.setHeader('Set-Cookie', [
      `cmms_refresh=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400${
        process.env.NODE_ENV === 'production' ? '; Secure' : ''
      }`,
    ]);

    return res.status(200).json({
      token,
      user: {
        user_id: user.user_id,
        cliente_id: user.cliente_id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        estado: user.estado,
      },
    });
  } catch (err) {
    console.error('[/api/auth/login]', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}
