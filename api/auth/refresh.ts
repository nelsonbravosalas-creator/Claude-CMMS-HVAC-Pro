/**
 * GET /api/auth/refresh
 * Renueva el JWT desde la cookie httpOnly (cmms_refresh).
 * Llamado por loginWithPin después de verificar el PIN en localStorage.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken, signToken, extractBearer } from '../_jwt';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ message: 'Método no permitido' });

  const cookieToken = req.cookies?.cmms_refresh;
  const headerToken = extractBearer(req.headers.authorization);
  const rawToken = headerToken ?? cookieToken;

  if (!rawToken) return res.status(401).json({ message: 'No autenticado' });

  try {
    const payload = await verifyToken(rawToken);

    const newToken = await signToken({
      user_id: payload.user_id,
      cliente_id: payload.cliente_id,
      nombre: payload.nombre,
      email: payload.email,
      rol: payload.rol,
    });

    res.setHeader('Set-Cookie', [
      `cmms_refresh=${newToken}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400${
        process.env.NODE_ENV === 'production' ? '; Secure' : ''
      }`,
    ]);

    return res.status(200).json({
      token: newToken,
      user: {
        user_id: payload.user_id,
        cliente_id: payload.cliente_id,
        nombre: payload.nombre,
        email: payload.email,
        rol: payload.rol,
      },
    });
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
}
