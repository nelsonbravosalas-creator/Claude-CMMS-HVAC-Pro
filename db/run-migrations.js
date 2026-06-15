/**
 * CMMS HVAC PRO — Migration Runner
 *
 * ANTES DE EJECUTAR:
 * 1. Crea el archivo .env.local en la RAIZ del proyecto (ya está en .gitignore)
 * 2. Escribe dentro: DATABASE_URL=postgresql://neondb_owner:PASS@host.neon.tech/neondb?sslmode=require
 * 3. Instala dependencias: desde PowerShell en la raiz, corre: npm install
 * 4. Ejecuta: node db/run-migrations.js
 */

'use strict';

const { readFileSync, existsSync } = require('fs');
const { join }                      = require('path');
const { createHash }                = require('crypto');
const { Client }                    = require('pg');

// ─── Leer .env.local ───────────────────────────────────────────
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

// ─── Migraciones en orden ─────────────────────────────────────
const MIGRATIONS_DIR = join(__dirname, 'migrations');
const migrations = [
  '000_base_schema.sql',
  '001_fase0_correcciones_ddl.sql',
  '002_fase0_tablas_nuevas.sql',
  '003_fase0_funciones_triggers.sql',
];

async function runMigrations() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('\nConectando a Neon...');
    await client.connect();
    console.log('Conectado OK.\n');

    for (const file of migrations) {
      const filePath = join(MIGRATIONS_DIR, file);
      if (!existsSync(filePath)) {
        console.log(`  OMITIDO : ${file} (no existe)`);
        continue;
      }
      const sql = readFileSync(filePath, 'utf8');
      process.stdout.write(`  Aplicando: ${file} ... `);
      try {
        await client.query(sql);
        console.log('OK');
      } catch (err) {
        console.log('ERROR');
        console.error(`\n  Fallo en ${file}:`);
        console.error(`  ${err.message}\n`);
        console.error('  Corrige el error y vuelve a ejecutar.\n');
        process.exit(1);
      }
    }

    console.log('\nTodas las migraciones aplicadas.\n');
    await seedInitialData(client);

  } finally {
    await client.end();
  }
}

async function seedInitialData(client) {
  const { rows } = await client.query(`SELECT count(*)::int AS n FROM clientes`);
  if (rows[0].n > 0) {
    console.log('La base de datos ya tiene datos — seed omitido.');
    return;
  }

  console.log('Creando datos de prueba...');

  // Cliente
  await client.query(`
    INSERT INTO clientes (id, nombre, plan, activo)
    VALUES ('demo-001', 'HVAC PRO Demo', 'professional', true)
    ON CONFLICT DO NOTHING
  `);
  const { rows: [{ uuid_sync: clienteId }] } = await client.query(
    `SELECT uuid_sync FROM clientes WHERE id = 'demo-001'`
  );

  // Sucursal
  await client.query(`
    INSERT INTO sucursales (cliente_id, nombre, codigo, codigo_num, activo)
    VALUES ($1, 'Casa Matriz', 'HQ', 1, true)
    ON CONFLICT DO NOTHING
  `, [clienteId]);
  const { rows: [{ uuid_sync: sucursalId }] } = await client.query(
    `SELECT uuid_sync FROM sucursales WHERE cliente_id = $1 LIMIT 1`, [clienteId]
  );

  // Zona
  await client.query(`
    INSERT INTO zonas (cliente_id, sucursal_id, nombre, codigo)
    VALUES ($1, $2, 'Piso 1', 'P1')
    ON CONFLICT DO NOTHING
  `, [clienteId, sucursalId]);
  const { rows: [{ uuid_sync: zonaId }] } = await client.query(
    `SELECT uuid_sync FROM zonas WHERE cliente_id = $1 LIMIT 1`, [clienteId]
  );

  // Tipo de equipo
  await client.query(`
    INSERT INTO catalog_asset_types (cliente_id, nombre, codigo_num, activo)
    VALUES ($1, 'Aire Acondicionado Split', 1001, true)
    ON CONFLICT DO NOTHING
  `, [clienteId]);
  const { rows: [{ uuid_sync: tipoId }] } = await client.query(
    `SELECT uuid_sync FROM catalog_asset_types WHERE cliente_id = $1 LIMIT 1`, [clienteId]
  );

  // Usuarios
  const adminHash = createHash('sha256').update('Admin1234!').digest('hex');
  const tecHash   = createHash('sha256').update('Tecnico123!').digest('hex');

  await client.query(`
    INSERT INTO users (cliente_id, nombre, email, password_hash, rol, estado)
    VALUES ($1, 'Administrador Demo', 'admin@demo.com', $2, 'administrador', 'activo')
    ON CONFLICT (email) DO NOTHING
  `, [clienteId, adminHash]);

  await client.query(`
    INSERT INTO users (cliente_id, nombre, email, password_hash, rol, estado)
    VALUES ($1, 'Tecnico Demo', 'tecnico@demo.com', $2, 'tecnico', 'activo')
    ON CONFLICT (email) DO NOTHING
  `, [clienteId, tecHash]);

  // Equipo de ejemplo (TAG manual antes de que exista el trigger)
  await client.query(`
    INSERT INTO assets (
      tag, cliente_id, sucursal_id, zona_id, tipo_id,
      nombre, marca, modelo, numero_serie, estado, criticidad
    )
    VALUES (
      'HQ.1001.0001', $1, $2, $3, $4,
      'Split Daikin Oficina Gerencia', 'Daikin', 'FTXS35LVMA', 'SN-DEMO-001',
      'operativo', 'alta'
    )
    ON CONFLICT DO NOTHING
  `, [clienteId, sucursalId, zonaId, tipoId]);

  console.log('\n  Datos creados exitosamente:');
  console.log('  - Cliente  : demo-001 / HVAC PRO Demo');
  console.log('  - Sucursal : Casa Matriz (HQ)');
  console.log('  - Zona     : Piso 1 (P1)');
  console.log('  - Tipo     : Aire Acondicionado Split (1001)');
  console.log('  - Admin    : admin@demo.com       / Admin1234!');
  console.log('  - Tecnico  : tecnico@demo.com     / Tecnico123!');
  console.log('  - Equipo   : TAG = HQ.1001.0001\n');
}

runMigrations().catch(err => {
  console.error('\n[ERROR]', err.message);
  process.exit(1);
});
