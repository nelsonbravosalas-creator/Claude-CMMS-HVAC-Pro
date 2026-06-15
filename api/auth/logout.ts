/**
 * POST /api/auth/logout
 * Limpia la cookie de sesión
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Set-Cookie', 'cmms_refresh=; HttpOnly; Path=/; Max-Age=0');
  return res.status(200).json({ message: 'Sesión cerrada' });
}
