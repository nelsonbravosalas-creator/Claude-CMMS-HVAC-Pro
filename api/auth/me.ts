/**
 * GET    /api/auth/me       — Verifica token y devuelve el usuario actual
 * DELETE /api/auth/me       — Logout: limpia cookie de sesión
 * (rewrite: /api/auth/logout → /api/auth/me?action=logout)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken, extractBearer } from '../_jwt';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Logout: limpia cookie sin necesitar JWT
  if (req.method === 'DELETE' || req.query.action === 'logout') {
    res.setHeader('Set-Cookie', 'cmms_refresh=; HttpOnly; Path=/; Max-Age=0');
    return res.status(200).json({ message: 'Sesión cerrada' });
  }

  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.cmms_refresh;
  const rawToken = extractBearer(authHeader) ?? cookieToken;

  if (!rawToken) return res.status(401).json({ message: 'No autenticado' });

  try {
    const payload = await verifyToken(rawToken);
    return res.status(200).json({
      token: rawToken,
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

