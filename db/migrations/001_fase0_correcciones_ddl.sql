-- ============================================================
-- FASE 0 — Script 1/3: Correcciones al DDL existente (F1–F9)
-- CMMS HVAC PRO · Aplicar sobre branch Neon `migration-v6`
-- Idempotente: seguro de re-ejecutar
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- F1 — catalog_asset_types.nombre: UNIQUE global → por tenant
-- Dos clientes distintos deben poder tener un tipo "Chiller"
-- ------------------------------------------------------------
ALTER TABLE catalog_asset_types
  DROP CONSTRAINT IF EXISTS catalog_asset_types_nombre_key;

DO $$ BEGIN
  ALTER TABLE catalog_asset_types
    ADD CONSTRAINT uq_cat_tipos_cliente_nombre UNIQUE (cliente_id, nombre);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;

-- codigo_num: requerido por RN-ACT-06 para componer el Tag canónico
-- (segmento de 4 dígitos del tipo de equipo). No existía en el DDL v6.
ALTER TABLE catalog_asset_types
  ADD COLUMN IF NOT EXISTS codigo_num integer;

DO $$ BEGIN
  ALTER TABLE catalog_asset_types
    ADD CONSTRAINT uq_cat_tipos_cliente_codigo_num UNIQUE (cliente_id, codigo_num);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------------
-- F2 — mp_plans: columna `activo` (referenciada por idx_mp_proxima
-- pero ausente del DDL; sin ella el índice parcial falla al crearse)
-- ------------------------------------------------------------
ALTER TABLE mp_plans
  ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true;

DROP INDEX IF EXISTS idx_mp_proxima;
CREATE INDEX idx_mp_proxima ON mp_plans (proxima_ejecucion) WHERE activo = true;

-- ------------------------------------------------------------
-- F3 — work_orders: modelo multi-tag (RN-OT-09)
--   · asset_id deja de existir: la relación OT↔activos pasa por
--     work_order_assets (script 002)
--   · campos narrativos de RN-OT-07 (binding progresivo RN-OT-11)
--   · version para OCC en entidades firmables (§8.1)
-- ------------------------------------------------------------
ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS hallazgo        text,
  ADD COLUMN IF NOT EXISTS diagnostico     text,
  ADD COLUMN IF NOT EXISTS recomendaciones text,
  ADD COLUMN IF NOT EXISTS conclusiones    text,
  ADD COLUMN IF NOT EXISTS version         integer NOT NULL DEFAULT 1;

-- asset_id se elimina al final (después de migrar datos existentes
-- a work_order_assets — ver bloque de migración de datos en 002)
-- Aquí solo se relaja el NOT NULL para permitir la transición:
ALTER TABLE work_orders
  ALTER COLUMN asset_id DROP NOT NULL;

-- ------------------------------------------------------------
-- F4 — work_orders.tipo: enum completo (entrevista 2026-06-12)
-- `predictivo` se mantiene en el enum pero SIN funcionalidad en v1
-- (documentado en roadmap v2)
-- ------------------------------------------------------------
ALTER TABLE work_orders
  DROP CONSTRAINT IF EXISTS work_orders_tipo_check;
ALTER TABLE work_orders
  ADD CONSTRAINT work_orders_tipo_check CHECK (tipo IN (
    'preventivo',
    'correctivo',
    'predictivo',            -- roadmap v2: sin lógica específica en v1
    'atencion_falla',
    'puesta_en_marcha',
    'inspeccion_tecnica',
    'instalacion_montaje'
  ));

-- ------------------------------------------------------------
-- F5 — generate_folio(): completar prefijos de RN-FOL-02
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_folio(p_cliente_id uuid, p_entity_type text)
RETURNS text AS $$
DECLARE
  v_year       integer := EXTRACT(YEAR FROM NOW());
  v_next_folio integer;
  v_prefix     text;
BEGIN
  INSERT INTO folio_sequences (cliente_id, entity_type, year, last_folio)
  VALUES (p_cliente_id, p_entity_type, v_year, 1)
  ON CONFLICT (cliente_id, entity_type, year)
  DO UPDATE SET last_folio = folio_sequences.last_folio + 1
  RETURNING last_folio INTO v_next_folio;

  v_prefix := CASE p_entity_type
    WHEN 'work_orders'     THEN 'OT'
    WHEN 'assets'          THEN 'ACT'
    WHEN 'inventory_items' THEN 'REP'
    WHEN 'mp_plans'        THEN 'MP'
    ELSE 'FOL'
  END;

  RETURN format('%s-%s-%s', v_prefix, v_year, lpad(v_next_folio::text, 6, '0'));
END;
$$ LANGUAGE plpgsql;

-- Triggers de folio para las entidades que faltaban
CREATE OR REPLACE FUNCTION assign_entity_folio() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := generate_folio(NEW.cliente_id, TG_TABLE_NAME::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_folio ON assets;
CREATE TRIGGER trg_assign_folio BEFORE INSERT ON assets
  FOR EACH ROW EXECUTE FUNCTION assign_entity_folio();

DROP TRIGGER IF EXISTS trg_assign_folio ON inventory_items;
CREATE TRIGGER trg_assign_folio BEFORE INSERT ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION assign_entity_folio();

DROP TRIGGER IF EXISTS trg_assign_folio ON mp_plans;
CREATE TRIGGER trg_assign_folio BEFORE INSERT ON mp_plans
  FOR EACH ROW EXECUTE FUNCTION assign_entity_folio();

-- ------------------------------------------------------------
-- F6 — Eliminar trigger huérfano sobre tabla `reports` inexistente
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_assign_report_folio ON work_orders;
DROP FUNCTION IF EXISTS assign_report_folio();

-- ------------------------------------------------------------
-- F7 — apply_inventory_movement: FOR UPDATE contra race condition
-- (el spec §12.5 promete "FOR UPDATE previene race" pero el trigger
-- original no lo tenía — el stock podía corromperse en concurrencia)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION apply_inventory_movement() RETURNS TRIGGER AS $$
DECLARE
  v_stock numeric(10,2);
BEGIN
  -- Lock pesimista de la fila del ítem: serializa movimientos concurrentes
  SELECT stock_actual INTO v_stock
  FROM inventory_items
  WHERE uuid_sync = NEW.inventory_item_id
  FOR UPDATE;

  IF v_stock IS NULL THEN
    RAISE EXCEPTION 'FK_VIOLATION: inventory_item % no existe', NEW.inventory_item_id;
  END IF;

  -- entrada/devolucion/ajuste(+) suman; salida/baja restan;
  -- ajuste puede ser ± según signo de cantidad (RN-INV-05: cantidad != 0)
  IF NEW.tipo IN ('entrada', 'devolucion') THEN
    v_stock := v_stock + ABS(NEW.cantidad);
  ELSIF NEW.tipo IN ('salida', 'baja') THEN
    v_stock := v_stock - ABS(NEW.cantidad);
  ELSIF NEW.tipo = 'ajuste' THEN
    v_stock := v_stock + NEW.cantidad;
  END IF;

  UPDATE inventory_items
  SET stock_actual = v_stock
  WHERE uuid_sync = NEW.inventory_item_id;

  NEW.stock_despues := v_stock;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- (el trigger trg_apply_inventory_movement existente sigue apuntando
-- a esta función; CREATE OR REPLACE basta)

-- ------------------------------------------------------------
-- F8 — Bootstrap multi-tenant: cliente_id NULL solo para `programador`
-- Resuelve la FK circular clientes ↔ users
-- ------------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE users
    ADD CONSTRAINT chk_users_cliente_por_rol
    CHECK (cliente_id IS NOT NULL OR rol = 'programador');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------------
-- F9 — users.push_subscription: web push en v1 (entrevista)
-- Guarda la suscripción PushSubscription serializada del navegador
-- ------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS push_subscription jsonb;

-- ------------------------------------------------------------
-- Extra (gap detectado): sucursales.codigo_num para RN-ACT-06
-- (segmento de 7 dígitos del Tag canónico; `codigo` text se mantiene
-- como prefijo legible p.ej. "STK-21" usado en folios INF)
-- ------------------------------------------------------------
ALTER TABLE sucursales
  ADD COLUMN IF NOT EXISTS codigo_num integer;

DO $$ BEGIN
  ALTER TABLE sucursales
    ADD CONSTRAINT uq_sucursales_cliente_codigo_num UNIQUE (cliente_id, codigo_num);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;

COMMIT;
