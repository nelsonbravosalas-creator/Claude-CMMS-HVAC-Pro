-- ============================================================
-- CMMS HVAC PRO — Schema base completo (v0 → v7)
-- Ejecutar PRIMERO, antes de 001, 002, 003
-- Idempotente: usa CREATE TABLE IF NOT EXISTS y ADD COLUMN IF NOT EXISTS
-- ============================================================

BEGIN;

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- FUNCIÓN COMPARTIDA: set_timestamps
-- Usada por triggers de todas las tablas
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_timestamps() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at  := COALESCE(NEW.created_at, now());
    NEW.captured_at := COALESCE(NEW.captured_at, now());
    NEW.updated_at  := now();
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_at  := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- TABLA: clientes (tenants)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
  uuid_sync    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id           text UNIQUE,
  nombre       text NOT NULL,
  rut          text,
  email        text,
  telefono     text,
  direccion    text,
  logo_url     text,
  plan         text NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter','professional','enterprise')),
  activo       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  captured_at  timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz,
  server_seq   bigint GENERATED ALWAYS AS IDENTITY
);

-- ─────────────────────────────────────────────
-- TABLA: sucursales (branches por tenant)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sucursales (
  uuid_sync    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id           text UNIQUE NULLS NOT DISTINCT,
  cliente_id   uuid NOT NULL REFERENCES clientes(uuid_sync),
  nombre       text NOT NULL,
  codigo       text NOT NULL,
  direccion    text,
  ciudad       text,
  pais         text NOT NULL DEFAULT 'CL',
  latitud      numeric(10,7),
  longitud     numeric(10,7),
  activo       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  captured_at  timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz,
  created_by   uuid,
  server_seq   bigint GENERATED ALWAYS AS IDENTITY,
  UNIQUE (cliente_id, codigo)
);

-- ─────────────────────────────────────────────
-- TABLA: catalog_asset_types (tipos de equipo)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS catalog_asset_types (
  uuid_sync           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id                  text UNIQUE NULLS NOT DISTINCT,
  cliente_id          uuid NOT NULL REFERENCES clientes(uuid_sync),
  nombre              text NOT NULL,
  descripcion         text,
  campos_dinamicos    jsonb,
  icono               text,
  activo              boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  captured_at         timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz,
  created_by          uuid,
  server_seq          bigint GENERATED ALWAYS AS IDENTITY
);

-- ─────────────────────────────────────────────
-- TABLA: users
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  uuid_sync       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         text UNIQUE NULLS NOT DISTINCT,
  cliente_id      uuid REFERENCES clientes(uuid_sync),  -- NULL solo para programador
  nombre          text NOT NULL,
  email           text NOT NULL UNIQUE,
  password_hash   text NOT NULL,
  rol             text NOT NULL CHECK (rol IN ('programador','administrador','supervisor','tecnico','cliente','proveedor')),
  estado          text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo','suspendido')),
  activo          boolean NOT NULL DEFAULT true,
  telefono        text,
  avatar_url      text,
  pin_hash        text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  captured_at     timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  server_seq      bigint GENERATED ALWAYS AS IDENTITY
);

-- ─────────────────────────────────────────────
-- TABLA: zonas (áreas dentro de una sucursal)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zonas (
  uuid_sync    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  zona_id      text UNIQUE NULLS NOT DISTINCT,
  cliente_id   uuid NOT NULL REFERENCES clientes(uuid_sync),
  sucursal_id  uuid NOT NULL REFERENCES sucursales(uuid_sync),
  nombre       text NOT NULL,
  codigo       text NOT NULL,
  descripcion  text,
  tipo         text,
  latitud      numeric(10,7),
  longitud     numeric(10,7),
  estado       text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','cerrado')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  captured_at  timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz,
  server_seq   bigint GENERATED ALWAYS AS IDENTITY,
  UNIQUE (cliente_id, sucursal_id, codigo)
);

-- ─────────────────────────────────────────────
-- TABLA: assets (equipos — universal)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assets (
  uuid_sync            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tag                  text NOT NULL,       -- TAG canónico o PEND.<short> offline
  cliente_id           uuid NOT NULL REFERENCES clientes(uuid_sync),
  sucursal_id          uuid NOT NULL REFERENCES sucursales(uuid_sync),
  zona_id              uuid REFERENCES zonas(uuid_sync),
  tipo_id              uuid REFERENCES catalog_asset_types(uuid_sync),
  nombre               text NOT NULL,
  descripcion          text,
  marca                text,
  modelo               text,
  numero_serie         text,
  estado               text NOT NULL DEFAULT 'operativo'
                         CHECK (estado IN ('operativo','falla','mantenimiento','baja')),
  criticidad           text NOT NULL DEFAULT 'media'
                         CHECK (criticidad IN ('critica','alta','media','baja')),
  fecha_instalacion    date,
  fecha_garantia_vence date,
  variables_fijas_tipo jsonb,    -- campos dinámicos según tipo
  qr_url               text,     -- URL del QR generado
  foto_url             text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  captured_at          timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  deleted_at           timestamptz,
  created_by           uuid REFERENCES users(uuid_sync),
  updated_by           uuid REFERENCES users(uuid_sync),
  server_seq           bigint GENERATED ALWAYS AS IDENTITY,
  UNIQUE (cliente_id, tag)
);

-- ─────────────────────────────────────────────
-- TABLA: folio_sequences (numeración secuencial)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS folio_sequences (
  cliente_id   uuid NOT NULL REFERENCES clientes(uuid_sync),
  entity_type  text NOT NULL,
  year         integer NOT NULL,
  last_folio   integer NOT NULL DEFAULT 0,
  PRIMARY KEY (cliente_id, entity_type, year)
);

-- ─────────────────────────────────────────────
-- TABLA: work_orders (órdenes de trabajo)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS work_orders (
  uuid_sync        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id               text UNIQUE NULLS NOT DISTINCT,
  cliente_id       uuid NOT NULL REFERENCES clientes(uuid_sync),
  sucursal_id      uuid NOT NULL REFERENCES sucursales(uuid_sync),
  asset_id         uuid REFERENCES assets(uuid_sync),  -- legacy, se eliminará en 002
  asignado_a       uuid REFERENCES users(uuid_sync),
  creado_por       uuid REFERENCES users(uuid_sync),
  tipo             text NOT NULL DEFAULT 'preventivo'
                     CHECK (tipo IN ('preventivo','correctivo','predictivo',
                                     'atencion_falla','puesta_en_marcha',
                                     'inspeccion_tecnica','instalacion_montaje')),
  estado           text NOT NULL DEFAULT 'abierto'
                     CHECK (estado IN ('abierto','en_progreso','completada','firmada','cerrada','anulada')),
  prioridad        text NOT NULL DEFAULT 'normal'
                     CHECK (prioridad IN ('baja','normal','alta','critica')),
  descripcion      text NOT NULL,
  observaciones    text,
  firma_digital    text,
  fecha_programada timestamptz,
  fecha_inicio     timestamptz,
  fecha_fin        timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  captured_at      timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz,
  server_seq       bigint GENERATED ALWAYS AS IDENTITY
);

-- ─────────────────────────────────────────────
-- TABLA: tickets (soporte / fallas)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
  uuid_sync        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id               text UNIQUE NULLS NOT DISTINCT,
  cliente_id       uuid NOT NULL REFERENCES clientes(uuid_sync),
  sucursal_id      uuid NOT NULL REFERENCES sucursales(uuid_sync),
  asset_id         uuid REFERENCES assets(uuid_sync),
  reportado_por    uuid REFERENCES users(uuid_sync),
  asignado_a       uuid REFERENCES users(uuid_sync),
  titulo           text NOT NULL,
  descripcion      text NOT NULL,
  estado           text NOT NULL DEFAULT 'abierto'
                     CHECK (estado IN ('abierto','en_progreso','resuelto','cerrado','cancelado')),
  prioridad        text NOT NULL DEFAULT 'normal'
                     CHECK (prioridad IN ('baja','normal','alta','critica')),
  tipo             text NOT NULL DEFAULT 'falla'
                     CHECK (tipo IN ('falla','consulta','mejora','garantia')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  captured_at      timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz,
  server_seq       bigint GENERATED ALWAYS AS IDENTITY
);

-- ─────────────────────────────────────────────
-- TABLA: ticket_comments
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_comments (
  uuid_sync    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id    uuid NOT NULL REFERENCES tickets(uuid_sync) ON DELETE CASCADE,
  cliente_id   uuid NOT NULL REFERENCES clientes(uuid_sync),
  autor_id     uuid NOT NULL REFERENCES users(uuid_sync),
  contenido    text NOT NULL,
  adjunto_url  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  captured_at  timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  server_seq   bigint GENERATED ALWAYS AS IDENTITY
);

-- ─────────────────────────────────────────────
-- TABLA: inventory_items (repuestos / materiales)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_items (
  uuid_sync      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id             text UNIQUE NULLS NOT DISTINCT,
  cliente_id     uuid NOT NULL REFERENCES clientes(uuid_sync),
  sucursal_id    uuid NOT NULL REFERENCES sucursales(uuid_sync),
  nombre         text NOT NULL,
  descripcion    text,
  codigo         text NOT NULL,
  unidad         text NOT NULL DEFAULT 'unidad',
  stock_actual   numeric(10,2) NOT NULL DEFAULT 0,
  stock_minimo   numeric(10,2) NOT NULL DEFAULT 0,
  stock_maximo   numeric(10,2),
  ubicacion      text,
  costo_unitario numeric(12,2),
  proveedor      text,
  estado         text NOT NULL DEFAULT 'activo'
                   CHECK (estado IN ('activo','descontinuado')),
  activo         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  captured_at    timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz,
  created_by     uuid REFERENCES users(uuid_sync),
  server_seq     bigint GENERATED ALWAYS AS IDENTITY,
  UNIQUE (cliente_id, codigo)
);

-- ─────────────────────────────────────────────
-- TABLA: inventory_movements
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_movements (
  uuid_sync           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id          uuid NOT NULL REFERENCES clientes(uuid_sync),
  inventory_item_id   uuid NOT NULL REFERENCES inventory_items(uuid_sync),
  tipo                text NOT NULL
                        CHECK (tipo IN ('entrada','salida','ajuste','devolucion','baja')),
  cantidad            numeric(10,2) NOT NULL CHECK (cantidad != 0),
  stock_despues       numeric(10,2),
  referencia_ot       text,
  notas               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  captured_at         timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid REFERENCES users(uuid_sync),
  server_seq          bigint GENERATED ALWAYS AS IDENTITY
);

-- Trigger inventario
DROP TRIGGER IF EXISTS trg_apply_inventory_movement ON inventory_movements;
CREATE OR REPLACE FUNCTION apply_inventory_movement() RETURNS TRIGGER AS $$
DECLARE v_stock numeric(10,2);
BEGIN
  SELECT stock_actual INTO v_stock FROM inventory_items
  WHERE uuid_sync = NEW.inventory_item_id FOR UPDATE;
  IF v_stock IS NULL THEN
    RAISE EXCEPTION 'FK_VIOLATION: inventory_item % no existe', NEW.inventory_item_id;
  END IF;
  IF NEW.tipo IN ('entrada','devolucion') THEN v_stock := v_stock + ABS(NEW.cantidad);
  ELSIF NEW.tipo IN ('salida','baja') THEN v_stock := v_stock - ABS(NEW.cantidad);
  ELSIF NEW.tipo = 'ajuste' THEN v_stock := v_stock + NEW.cantidad;
  END IF;
  UPDATE inventory_items SET stock_actual = v_stock WHERE uuid_sync = NEW.inventory_item_id;
  NEW.stock_despues := v_stock;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_apply_inventory_movement BEFORE INSERT ON inventory_movements
  FOR EACH ROW EXECUTE FUNCTION apply_inventory_movement();

-- ─────────────────────────────────────────────
-- TABLA: mp_plans (planes de mantenimiento preventivo)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mp_plans (
  uuid_sync          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id                 text UNIQUE NULLS NOT DISTINCT,
  cliente_id         uuid NOT NULL REFERENCES clientes(uuid_sync),
  tag                text NOT NULL,
  nombre             text NOT NULL,
  descripcion        text,
  frecuencia_dias    integer NOT NULL CHECK (frecuencia_dias > 0),
  alerta_dias_antes  integer NOT NULL DEFAULT 7,
  proxima_ejecucion  date NOT NULL,
  ultima_ejecucion   date,
  form_template_id   uuid,
  estado             text NOT NULL DEFAULT 'activo'
                       CHECK (estado IN ('activo','pausado','cancelado')),
  created_at         timestamptz NOT NULL DEFAULT now(),
  captured_at        timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz,
  server_seq         bigint GENERATED ALWAYS AS IDENTITY
);

-- ─────────────────────────────────────────────
-- TABLA: configuracion_cliente (config por tenant)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS configuracion_cliente (
  uuid_sync          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id         uuid NOT NULL REFERENCES clientes(uuid_sync),
  clave              text NOT NULL,
  valor              jsonb,
  updated_at         timestamptz NOT NULL DEFAULT now(),
  updated_by         uuid REFERENCES users(uuid_sync),
  UNIQUE (cliente_id, clave)
);

-- ─────────────────────────────────────────────
-- TABLA: sync_queue (cola de sincronización offline)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sync_queue (
  uuid_sync      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id     uuid NOT NULL REFERENCES clientes(uuid_sync),
  user_id        uuid REFERENCES users(uuid_sync),
  tabla          text NOT NULL,
  record_id      text NOT NULL,
  operacion      text NOT NULL CHECK (operacion IN ('INSERT','UPDATE','DELETE')),
  data           jsonb NOT NULL,
  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','processing','synced','error')),
  retry_count    integer NOT NULL DEFAULT 0,
  error_msg      text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  processed_at   timestamptz,
  server_seq     bigint GENERATED ALWAYS AS IDENTITY
);

-- ─────────────────────────────────────────────
-- TRIGGER: protect_signed_work_order
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION protect_signed_work_order() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.estado IN ('firmada','cerrada') THEN
    RAISE EXCEPTION 'IMMUTABLE_SIGNED_OT: OT firmada no puede modificarse';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_signed_ot ON work_orders;
CREATE TRIGGER trg_protect_signed_ot BEFORE UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION protect_signed_work_order();

-- ─────────────────────────────────────────────
-- ÍNDICES principales
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_assets_cliente     ON assets (cliente_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assets_tag         ON assets (cliente_id, tag);
CREATE INDEX IF NOT EXISTS idx_wo_cliente         ON work_orders (cliente_id, estado) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wo_asignado        ON work_orders (asignado_a) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_email        ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_cliente      ON users (cliente_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_cliente    ON tickets (cliente_id, estado) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inv_cliente        ON inventory_items (cliente_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mp_proxima         ON mp_plans (proxima_ejecucion);
CREATE INDEX IF NOT EXISTS idx_sync_status        ON sync_queue (status, created_at);

COMMIT;
