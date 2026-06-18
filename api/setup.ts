/**
 * POST /api/setup
 * Ejecuta las migraciones y crea el usuario administrador.
 * PROTEGIDO con SETUP_SECRET para evitar ejecuciones no autorizadas.
 * Usar una sola vez; desactivar después.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_db';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

const SETUP_SECRET = process.env.SETUP_SECRET ?? 'cmms-setup-2026';

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Método no permitido' });

  const { secret } = req.body as { secret?: string };
  if (secret !== SETUP_SECRET) {
    return res.status(403).json({ message: 'Secret incorrecto' });
  }

  const log: string[] = [];

  try {
    // ── 1. Extensiones ────────────────────────────────────────────
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
    log.push('✓ uuid-ossp extension');

    // ── 2. Tabla clientes ─────────────────────────────────────────
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

    // ── 3. Tabla sucursales ───────────────────────────────────────
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

    // ── 4. Tabla users ────────────────────────────────────────────
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

    // ── 5. Cliente demo ───────────────────────────────────────────
    await sql`
      INSERT INTO clientes (id, nombre, plan, activo)
      VALUES ('demo-001', 'HVAC PRO Demo', 'professional', true)
      ON CONFLICT (id) DO NOTHING
    `;
    log.push('✓ cliente demo');

    const clientes = await sql`SELECT uuid_sync FROM clientes WHERE id = 'demo-001'`;
    const clienteId = (clientes[0] as { uuid_sync: string }).uuid_sync;

    // ── 6. Sucursal demo ──────────────────────────────────────────
    await sql`
      INSERT INTO sucursales (cliente_id, nombre, codigo, activo)
      VALUES (${clienteId}, 'Casa Matriz', 'HQ', true)
      ON CONFLICT DO NOTHING
    `;
    log.push('✓ sucursal demo');

    // ── 7. Usuario administrador ──────────────────────────────────
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
    console.error('[/api/setup]', err);
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      log,
    });
  }
}
