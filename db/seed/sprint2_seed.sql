-- ============================================================
-- CMMS HVAC PRO — Datos de prueba Sprint 2
-- Propósito: poblar Neon con OTs, equipos y form_templates
--            para probar OTListPage, OTDetailPage y FormInstancePage
-- Idempotente: usa ON CONFLICT DO NOTHING / UPDATE
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. CLIENTE DE PRUEBA
-- ─────────────────────────────────────────────────────────────
INSERT INTO clientes (uuid_sync, nombre, rut, email, plan, activo, captured_at, updated_at)
VALUES (
  '11111111-0000-0000-0000-000000000001',
  'Empresa Demo S.A.',
  '12.345.678-9',
  'admin@demo.cl',
  'professional',
  true,
  now(),
  now()
) ON CONFLICT (uuid_sync) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 2. SUCURSALES
-- ─────────────────────────────────────────────────────────────
INSERT INTO sucursales (uuid_sync, cliente_id, nombre, codigo, direccion, ciudad, activo, captured_at, updated_at)
VALUES
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
   'Santiago Centro', 'STK', 'Av. Libertador Bernardo O''Higgins 1234', 'Santiago', true, now(), now()),
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001',
   'Las Condes', 'LCO', 'Av. Apoquindo 5678', 'Las Condes', true, now(), now())
ON CONFLICT (uuid_sync) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 3. USUARIO TÉCNICO
-- ─────────────────────────────────────────────────────────────
-- Contraseña demo: "demo1234" (hash SHA-256 simplificado para dev)
INSERT INTO users (uuid_sync, cliente_id, email, nombre, rol, estado, password_hash, captured_at, updated_at)
VALUES
  ('33333333-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
   'tecnico@demo.cl', 'Juan Pérez', 'tecnico', 'activo',
   '3c9909afec25354d551dae21590bb26e38d53f2173b8d3dc3eee4c047e7ab1c1eb8b85103e3be7ba613b31bb5c9c36214dc9f14a42fd7a2fdb84856bca5c44c2',
   now(), now()),
  ('33333333-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001',
   'supervisor@demo.cl', 'María González', 'supervisor', 'activo',
   '3c9909afec25354d551dae21590bb26e38d53f2173b8d3dc3eee4c047e7ab1c1eb8b85103e3be7ba613b31bb5c9c36214dc9f14a42fd7a2fdb84856bca5c44c2',
   now(), now())
ON CONFLICT (uuid_sync) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 4. TIPOS DE EQUIPO
-- ─────────────────────────────────────────────────────────────
INSERT INTO catalog_asset_types (uuid_sync, cliente_id, nombre, descripcion, categoria, activo, captured_at, updated_at)
VALUES
  ('44444444-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
   'Split / Fan Coil', 'Unidad split mural o fan coil', 'HVAC', true, now(), now()),
  ('44444444-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001',
   'Chiller', 'Unidad enfriadora de agua', 'HVAC', true, now(), now()),
  ('44444444-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001',
   'VRF / VRV', 'Sistema de refrigerante variable', 'HVAC', true, now(), now())
ON CONFLICT (uuid_sync) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 5. EQUIPOS (ACTIVOS)
-- ─────────────────────────────────────────────────────────────
INSERT INTO assets (uuid_sync, cliente_id, sucursal_id, tipo_id, tag, nombre, marca, modelo, estado, criticidad, captured_at, updated_at)
VALUES
  ('55555555-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001',
   'STK.AC.001', 'Split Sala Servidores', 'Daikin', 'FTXS35K', 'operativo', 'critico', now(), now()),
  ('55555555-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001',
   'STK.AC.002', 'Split Recepción', 'Carrier', 'FP09G', 'operativo', 'no_critico', now(), now()),
  ('55555555-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000002',
   'STK.CHI.001', 'Chiller Torre Norte', 'Trane', 'CGAM060', 'operativo', 'critico', now(), now()),
  ('55555555-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000001',
   'LCO.AC.001', 'Split Gerencia', 'LG', 'S12ET', 'operativo', 'no_critico', now(), now()),
  ('55555555-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000003',
   'LCO.VRF.001', 'VRF Piso 3', 'Mitsubishi', 'PUHY-P200YNW', 'en_observacion', 'critico', now(), now())
ON CONFLICT (uuid_sync) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 6. CATEGORÍA FORM (HVAC ya existe en seed del 002, pero aseguramos)
-- ─────────────────────────────────────────────────────────────
INSERT INTO form_categories (uuid_sync, cliente_id, nombre, descripcion, activo, captured_at, updated_at)
VALUES
  ('66666666-0000-0000-0000-000000000001', NULL,
   'HVAC', 'Sistemas de climatización', true, now(), now())
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 7. FORM TEMPLATES
-- ─────────────────────────────────────────────────────────────

-- Template para Split/Fan Coil
INSERT INTO form_templates (
  uuid_sync, cliente_id, tipo_id, categoria_id, codigo, version, nombre,
  campos_definicion, activo, published_at, captured_at, updated_at
)
VALUES (
  '77777777-0000-0000-0000-000000000001',
  '11111111-0000-0000-0000-000000000001',
  '44444444-0000-0000-0000-000000000001',
  '66666666-0000-0000-0000-000000000001',
  'HVAC-SPLIT-MP-v1',
  1,
  'Checklist MP Split / Fan Coil',
  '[
    {"id":"temp_impulsion","nombre":"Temperatura de impulsión","tipo":"medicion","requerido":true,"rango_min":8,"rango_max":18,"unidad":"°C","binding":{"target":"hallazgo","mode":"append","prefix":"T° impulsión: ","suffix":"°C","solo_si_hallazgo":true},"orden":1},
    {"id":"temp_retorno","nombre":"Temperatura de retorno","tipo":"medicion","requerido":true,"rango_min":20,"rango_max":30,"unidad":"°C","binding":{"target":"hallazgo","mode":"append","prefix":"T° retorno: ","suffix":"°C","solo_si_hallazgo":true},"orden":2},
    {"id":"presion_baja","nombre":"Presión baja (aspiración)","tipo":"medicion","requerido":true,"rango_min":55,"rango_max":75,"unidad":"PSI","binding":{"target":"hallazgo","mode":"append","prefix":"P° baja: ","suffix":" PSI","solo_si_hallazgo":true},"orden":3},
    {"id":"presion_alta","nombre":"Presión alta (descarga)","tipo":"medicion","requerido":true,"rango_min":200,"rango_max":280,"unidad":"PSI","binding":{"target":"hallazgo","mode":"append","prefix":"P° alta: ","suffix":" PSI","solo_si_hallazgo":true},"orden":4},
    {"id":"estado_filtro","nombre":"Estado del filtro","tipo":"select","requerido":true,"opciones":["limpio","sucio","obstruido"],"es_hallazgo_si":["sucio","obstruido"],"binding":{"target":"recomendaciones","mode":"append","prefix":"Filtro en estado ","solo_si_hallazgo":true},"orden":5},
    {"id":"fugas_refrigerante","nombre":"¿Se detectaron fugas de refrigerante?","tipo":"checkbox","requerido":true,"es_hallazgo_si":[true],"binding":{"target":"hallazgo","mode":"append","prefix":"Fuga de refrigerante detectada","solo_si_hallazgo":true},"orden":6},
    {"id":"limpieza_evaporador","nombre":"Limpieza de evaporador","tipo":"select","requerido":true,"opciones":["realizada","pendiente","no_aplica"],"es_hallazgo_si":["pendiente"],"binding":{"target":"recomendaciones","mode":"append","prefix":"Limpieza evaporador: ","solo_si_hallazgo":true},"orden":7},
    {"id":"voltaje_compresor","nombre":"Voltaje de compresor","tipo":"medicion","requerido":false,"rango_min":208,"rango_max":240,"unidad":"V","orden":8},
    {"id":"observaciones","nombre":"Observaciones adicionales","tipo":"text","requerido":false,"placeholder":"Ingrese observaciones del equipo...","binding":{"target":"conclusiones","mode":"append"},"orden":9},
    {"id":"firma_tecnico","nombre":"Firma del técnico","tipo":"firma","requerido":true,"orden":10}
  ]'::jsonb,
  true,
  now(),
  now(),
  now()
) ON CONFLICT (uuid_sync) DO NOTHING;

-- Template genérico para otros tipos
INSERT INTO form_templates (
  uuid_sync, cliente_id, tipo_id, categoria_id, codigo, version, nombre,
  campos_definicion, activo, published_at, captured_at, updated_at
)
VALUES (
  '77777777-0000-0000-0000-000000000002',
  '11111111-0000-0000-0000-000000000001',
  NULL,
  '66666666-0000-0000-0000-000000000001',
  'GENERICO-INSPECCION-v1',
  1,
  'Checklist Inspección General',
  '[
    {"id":"estado_general","nombre":"Estado general del equipo","tipo":"select","requerido":true,"opciones":["bueno","regular","malo","critico"],"es_hallazgo_si":["malo","critico"],"binding":{"target":"hallazgo","mode":"set","prefix":"Estado general: ","solo_si_hallazgo":true},"orden":1},
    {"id":"requiere_ot_correctiva","nombre":"¿Requiere OT correctiva?","tipo":"checkbox","requerido":true,"es_hallazgo_si":[true],"binding":{"target":"recomendaciones","mode":"set","prefix":"Equipo requiere orden de trabajo correctiva","solo_si_hallazgo":true},"orden":2},
    {"id":"observaciones","nombre":"Observaciones","tipo":"text","requerido":false,"placeholder":"Describa lo observado...","binding":{"target":"conclusiones","mode":"append"},"orden":3},
    {"id":"foto_equipo","nombre":"Foto del equipo","tipo":"foto","requerido":false,"orden":4},
    {"id":"firma_tecnico","nombre":"Firma del técnico","tipo":"firma","requerido":true,"orden":5}
  ]'::jsonb,
  true,
  now(),
  now(),
  now()
) ON CONFLICT (uuid_sync) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 8. ÓRDENES DE TRABAJO (3 OTs con distintos estados)
-- ─────────────────────────────────────────────────────────────
INSERT INTO work_orders (
  uuid_sync, cliente_id, sucursal_id, tipo, estado, descripcion,
  tecnico_asignado_id, captured_at, updated_at
)
VALUES
  -- OT 1: en_progreso (con 1/3 assets completado)
  ('88888888-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000001',
   'preventivo', 'en_progreso',
   'Mantenimiento Preventivo Mensual — Sucursal Santiago Centro',
   '33333333-0000-0000-0000-000000000001',
   now() - interval '2 hours', now() - interval '2 hours'),
  -- OT 2: abierto (no iniciado)
  ('88888888-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000001',
   'correctivo', 'abierto',
   'Revisión falla compresor Split recepción',
   '33333333-0000-0000-0000-000000000001',
   now() - interval '1 day', now() - interval '1 day'),
  -- OT 3: completado
  ('88888888-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000002',
   'preventivo', 'completado',
   'MP Trimestral Las Condes — VRF Piso 3',
   '33333333-0000-0000-0000-000000000001',
   now() - interval '3 days', now() - interval '3 days')
ON CONFLICT (uuid_sync) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 9. WORK ORDER ASSETS (equipos por OT)
-- ─────────────────────────────────────────────────────────────

-- OT 1: 3 activos (1 completado, 2 pendientes)
INSERT INTO work_order_assets (uuid_sync, cliente_id, work_order_id, asset_id, orden, estado, captured_at, updated_at)
VALUES
  ('99999999-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
   '88888888-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001',
   1, 'completado', now(), now()),
  ('99999999-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001',
   '88888888-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000002',
   2, 'en_progreso', now(), now()),
  ('99999999-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001',
   '88888888-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000003',
   3, 'pendiente', now(), now())
ON CONFLICT (uuid_sync) DO NOTHING;

-- OT 2: 1 activo pendiente
INSERT INTO work_order_assets (uuid_sync, cliente_id, work_order_id, asset_id, orden, estado, captured_at, updated_at)
VALUES
  ('99999999-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001',
   '88888888-0000-0000-0000-000000000002', '55555555-0000-0000-0000-000000000002',
   1, 'pendiente', now(), now())
ON CONFLICT (uuid_sync) DO NOTHING;

-- OT 3: 2 activos completados
INSERT INTO work_order_assets (uuid_sync, cliente_id, work_order_id, asset_id, orden, estado, captured_at, updated_at)
VALUES
  ('99999999-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001',
   '88888888-0000-0000-0000-000000000003', '55555555-0000-0000-0000-000000000004',
   1, 'completado', now(), now()),
  ('99999999-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000001',
   '88888888-0000-0000-0000-000000000003', '55555555-0000-0000-0000-000000000005',
   2, 'completado', now(), now())
ON CONFLICT (uuid_sync) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 10. FORM INSTANCE en_progreso (para probar FormInstancePage)
-- ─────────────────────────────────────────────────────────────
INSERT INTO form_instances (
  uuid_sync, cliente_id, work_order_id, asset_id, template_id, template_version,
  estado, respuestas, hallazgos_n, captured_at, updated_at
)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  '11111111-0000-0000-0000-000000000001',
  '88888888-0000-0000-0000-000000000001',
  '55555555-0000-0000-0000-000000000002',
  '77777777-0000-0000-0000-000000000001',
  1,
  'en_progreso',
  '{"temp_impulsion": 12, "estado_filtro": "sucio"}',
  1,
  now(),
  now()
) ON CONFLICT (uuid_sync) DO NOTHING;

-- Vincular form_instance al work_order_asset en_progreso
UPDATE work_order_assets
SET form_instance_id = 'aaaaaaaa-0000-0000-0000-000000000001'
WHERE uuid_sync = '99999999-0000-0000-0000-000000000002';

COMMIT;

-- ─────────────────────────────────────────────────────────────
-- NOTA DE USO:
-- 1. Ejecutar DESPUÉS de las 3 migraciones (000, 001, 002, 003)
-- 2. Usuario de prueba: tecnico@demo.cl (o supervisor@demo.cl)
-- 3. Requiere configurar DATABASE_URL en .env.local
-- Ejecutar: node db/run-migrations.js  (aplica todas las migraciones)
-- Luego:    psql $DATABASE_URL -f db/seed/sprint2_seed.sql
-- ─────────────────────────────────────────────────────────────
