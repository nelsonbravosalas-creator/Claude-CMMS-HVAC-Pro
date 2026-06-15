/**
 * _db.ts — Conexión a Neon PostgreSQL
 * Compartido por todos los endpoints de api/
 */
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está configurada en las variables de entorno de Vercel');
}

export const sql = neon(process.env.DATABASE_URL);
