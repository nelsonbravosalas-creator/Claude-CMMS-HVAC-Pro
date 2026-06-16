/**
 * _db.ts — Conexión a Neon PostgreSQL
 * Compartido por todos los endpoints de api/
 *
 * Fallback placeholder URL prevents neon() from throwing at module load
 * when DATABASE_URL is absent during Vercel's build-phase module evaluation.
 * At query time the real DATABASE_URL is always available as a runtime env var.
 */
import { neon } from '@neondatabase/serverless';

export const sql = neon(process.env.DATABASE_URL ?? 'postgresql://build:build@placeholder/build');
