/**
 * GET  /api/admin        — Health check: verifica DB y env vars
 * POST /api/admin        — Setup: crea tablas y usuario administrador (requiere SETUP_SECRET)
 *
 * /api/health redirige aquí via rewrite en vercel.json
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_db';
import { createHash } from 'crypto';

const SETUP_SECRET = process.env.SETUP_SECRET ?? 'cmms-setup-2026';

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

// ── GET /api/admin — health check ────────────────────────────────────────────

async function handleHealth(res: VercelResponse) {
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

// ── POST /api/admin — one-shot setup ─────────────────────────────────────────

async function handleSetup(req: VercelRequest, res: VercelResponse) {
  const { secret } = req.body as { secret?: string };
  if (secret !== SETUP_SECRET) {
    return res.status(403).json({ message: 'Secret incorrecto' });
  }

  const log: string[] = [];

  try {
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
    log.push('✓ uuid-ossp extension');

    await sql`
      CREATE TABLE IF NOT EXISTS clientes (
        uuid_sync   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        id          text UNIQUE,
        nombre      text NOT NULL,
        rut         text,
        email       text,
        plan        text NOT NULL DEFAULT 'basic',
        activo      boolean NOT NULL DEFAULT true,
        captured_at timestamptz NOT NULL DEFAULT now(),
        updated_at  timestamptz NOT NULL DEFAULT now()
      )
    `;
    log.push('✓ tabla clientes');

    await sql`
      CREATE TABLE IF NOT EXISTS sucursales (
        uuid_sync   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        cliente_id  uuid NOT NULL REFERENCES clientes(uuid_sync),
        nombre      text NOT NULL,
        codigo      text,
        codigo_num  integer,
        direccion   text,
        ciudad      text,
        activo      boolean NOT NULL DEFAULT true,
        captured_at timestamptz NOT NULL DEFAULT now(),
        updated_at  timestamptz NOT NULL DEFAULT now()
      )
    `;
    log.push('✓ tabla sucursales');

    await sql`
      CREATE TABLE IF NOT EXISTS users (
        uuid_sync     uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id       text UNIQUE NULLS NOT DISTINCT,
        cliente_id    uuid REFERENCES clientes(uuid_sync),
        nombre        text NOT NULL,
        email         text NOT NULL UNIQUE,
        password_hash text NOT NULL,
        pin_hash      text,
        rol           text NOT NULL DEFAULT 'tecnico'
          CHECK (rol IN ('programador','administrador','supervisor','tecnico','cliente','proveedor')),
        estado        text NOT NULL DEFAULT 'activo'
          CHECK (estado IN ('activo','inactivo','suspendido')),
        activo        boolean NOT NULL DEFAULT true,
        telefono      text,
        avatar_url    text,
        captured_at   timestamptz NOT NULL DEFAULT now(),
        updated_at    timestamptz NOT NULL DEFAULT now()
      )
    `;
    log.push('✓ tabla users');

    await sql`
      INSERT INTO clientes (id, nombre, plan, activo)
      VALUES ('demo-001', 'HVAC PRO Demo', 'professional', true)
      ON CONFLICT (id) DO NOTHING
    `;
    log.push('✓ cliente demo');

    const clientes = await sql`SELECT uuid_sync FROM clientes WHERE id = 'demo-001'`;
    const clienteId = (clientes[0] as { uuid_sync: string }).uuid_sync;

    await sql`
      INSERT INTO sucursales (cliente_id, nombre, codigo, activo)
      VALUES (${clienteId}, 'Casa Matriz', 'HQ', true)
      ON CONFLICT DO NOTHING
    `;
    log.push('✓ sucursal demo');

    const pwHash = hashPassword('3517');
    await sql`
      INSERT INTO users (cliente_id, nombre, email, password_hash, pin_hash, rol, estado)
      VALUES (
        ${clienteId},
        'Nelson Bravo',
        'nelson.bravo.salas@gmail.com',
        ${pwHash},
        ${pwHash},
        'administrador',
        'activo'
      )
      ON CONFLICT (email) DO UPDATE
        SET password_hash = EXCLUDED.password_hash,
            pin_hash      = EXCLUDED.pin_hash,
            estado        = 'activo',
            updated_at    = now()
    `;
    log.push('✓ usuario nelson.bravo.salas@gmail.com creado (contraseña: 3517)');

    return res.status(200).json({ ok: true, log });

  } catch (err) {
    console.error('[/api/admin setup]', err);
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      log,
    });
  }
}

// ── Handler principal ─────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET') return handleHealth(res);
  if (req.method === 'POST') return handleSetup(req, res);
  return res.status(405).json({ message: 'Método no permitido' });
}
