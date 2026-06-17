/**
 * CMMS HVAC PRO — Crear usuario administrador
 *
 * USO:
 *   node db/add-admin-user.js
 *
 * Requiere que .env.local exista con DATABASE_URL configurado.
 * Crea (o actualiza) el usuario nelson.bravo.salas@gmail.com con PIN 3517.
 */

'use strict';

const { readFileSync, existsSync } = require('fs');
const { join }                      = require('path');
const { createHash }                = require('crypto');
const { Client }                    = require('pg');

// Leer .env.local
const envFile = join(__dirname, '..', '.env.local');
if (existsSync(envFile)) {
  const lines = readFileSync(envFile, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && !process.env[key]) process.env[key] = val;
  }
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('\n[ERROR] DATABASE_URL no encontrada.');
  console.error('  Crea el archivo .env.local en la raiz del proyecto con:');
  console.error('  DATABASE_URL=postgresql://neondb_owner:PASS@host.neon.tech/neondb?sslmode=require\n');
  process.exit(1);
}

const EMAIL    = 'nelson.bravo.salas@gmail.com';
const NOMBRE   = 'Nelson Bravo';
const PASSWORD = '3517';  // PIN usado como contraseña
const ROL      = 'administrador';

async function main() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('\nConectando a Neon...');
    await client.connect();
    console.log('Conectado OK.\n');

    const passwordHash = createHash('sha256').update(PASSWORD).digest('hex');

    // Verificar si ya existe cliente demo
    const { rows: clientes } = await client.query(
      `SELECT uuid_sync FROM clientes LIMIT 1`
    );

    if (clientes.length === 0) {
      console.error('[ERROR] No hay clientes en la base de datos.');
      console.error('  Ejecuta primero: node db/run-migrations.js\n');
      process.exit(1);
    }

    const clienteId = clientes[0].uuid_sync;

    const { rows } = await client.query(`
      INSERT INTO users (cliente_id, nombre, email, password_hash, pin_hash, rol, estado)
      VALUES ($1, $2, $3, $4, $4, $5, 'activo')
      ON CONFLICT (email) DO UPDATE
        SET password_hash = EXCLUDED.password_hash,
            pin_hash      = EXCLUDED.pin_hash,
            estado        = 'activo',
            updated_at    = now()
      RETURNING uuid_sync, email, rol, estado
    `, [clienteId, NOMBRE, EMAIL, passwordHash, ROL]);

    const user = rows[0];
    console.log('Usuario creado/actualizado exitosamente:');
    console.log(`  Email    : ${user.email}`);
    console.log(`  Rol      : ${user.rol}`);
    console.log(`  Estado   : ${user.estado}`);
    console.log(`  UUID     : ${user.uuid_sync}`);
    console.log(`\n  Contraseña para login: ${PASSWORD}`);
    console.log('  (misma que tu PIN)\n');

  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('\n[ERROR]', err.message);
  process.exit(1);
});
