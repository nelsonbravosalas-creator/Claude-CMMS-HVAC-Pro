/**
 * GET /api/health
 * Verifica conectividad con la base de datos.
 * Útil para diagnosticar problemas de configuración en Vercel.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const checks: Record<string, string> = {
    database_url: process.env.DATABASE_URL ? 'configurado' : 'FALTANTE',
    jwt_secret: process.env.JWT_SECRET ? 'configurado' : 'usando valor por defecto',
  };

  try {
    await sql`SELECT 1 AS ok`;
    checks.database_connection = 'OK';
  } catch (err) {
    checks.database_connection = `ERROR: ${err instanceof Error ? err.message : String(err)}`;
  }

  const allOk = checks.database_url !== 'FALTANTE' && checks.database_connection === 'OK';

  return res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degradado',
    checks,
    timestamp: new Date().toISOString(),
  });
}
