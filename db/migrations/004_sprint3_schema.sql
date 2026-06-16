-- ============================================================
-- CMMS HVAC PRO — Sprint 3: Admin module schema additions
-- Idempotente: usa ADD COLUMN IF NOT EXISTS
-- ============================================================

BEGIN;

-- Agrega tipo_codigo a catalog_asset_types para generación de TAG
-- Ej: "AC", "CHI", "VRF", "UPS", "GEN"
ALTER TABLE catalog_asset_types
  ADD COLUMN IF NOT EXISTS tipo_codigo text;

-- Agrega categoria a catalog_asset_types (puede no existir en base)
ALTER TABLE catalog_asset_types
  ADD COLUMN IF NOT EXISTS categoria text;

-- Agrega region a sucursales (para formulario completo)
ALTER TABLE sucursales
  ADD COLUMN IF NOT EXISTS region text;

-- Índice para búsqueda de assets por sucursal
CREATE INDEX IF NOT EXISTS idx_assets_sucursal
  ON assets (cliente_id, sucursal_id)
  WHERE deleted_at IS NULL;

-- Índice para búsqueda de assets por tipo
CREATE INDEX IF NOT EXISTS idx_assets_tipo
  ON assets (cliente_id, tipo_id)
  WHERE deleted_at IS NULL;

COMMIT;
