-- ============================================================
-- FASE 0 — Script 2/3: Tablas nuevas (8) + migración de datos
-- CMMS HVAC PRO · Aplicar después de 001
-- Orden de creación respeta dependencias FK
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- form_categories — catálogo extensible de categorías de formulario
-- Decisión de entrevista: tabla propia (no enum) para que un admin
-- agregue UPS, Caldera, Generador, Vehículo… sin DDL (RN-FORM-03)
-- cliente_id NULL = categoría de sistema visible para todos los tenants
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS form_categories (
  uuid_sync    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id   uuid REFERENCES clientes(uuid_sync),
  nombre       text NOT NULL,
  descripcion  text,
  activo       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  captured_at  timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz,
  created_by   uuid REFERENCES users(uuid_sync),
  updated_by   uuid REFERENCES users(uuid_sync),
  server_seq   bigint GENERATED ALWAYS AS IDENTITY,
  UNIQUE (cliente_id, nombre)
);

-- Seed de categorías de sistema (v1 nativo: HVAC; el resto se
-- habilita por configuración cuando existan sus plantillas)
INSERT INTO form_categories (cliente_id, nombre, descripcion, captured_at, updated_at)
VALUES (NULL, 'HVAC', 'Informe HVAC nativo — checklist MP estándar', now(), now())
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- form_templates — Plantillas de checklist versionadas (RN-FORM-01/02)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS form_templates (
  uuid_sync         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id                text UNIQUE NULLS NOT DISTINCT,
  cliente_id        uuid NOT NULL REFERENCES clientes(uuid_sync),
  tipo_id           uuid REFERENCES catalog_asset_types(uuid_sync),  -- NULL = genérica
  categoria_id      uuid NOT NULL REFERENCES form_categories(uuid_sync),
  codigo            text NOT NULL,
  version           integer NOT NULL DEFAULT 1 CHECK (version > 0),
  nombre            text NOT NULL,
  campos_definicion jsonb NOT NULL,   -- FieldDef[]: tipo, requerido, opciones,
                                      -- rango_min/max, binding, es_hallazgo_si
  activo            boolean NOT NULL DEFAULT true,
  published_at      timestamptz,      -- NULL = borrador, no instanciable
  created_at        timestamptz NOT NULL DEFAULT now(),
  captured_at       timestamptz NOT NULL,
  updated_at        timestamptz NOT NULL,
  deleted_at        timestamptz,
  created_by        uuid REFERENCES users(uuid_sync),
  updated_by        uuid REFERENCES users(uuid_sync),
  server_seq        bigint GENERATED ALWAYS AS IDENTITY,
  UNIQUE (cliente_id, codigo, version)
);

-- ------------------------------------------------------------
-- form_instances — Informe por tag dentro de una OT (RN-FORM-01..09)
-- El folio `id` lo sella el servidor con formato
-- INF-{cod_sucursal}.{cod_tipo}-{tag_correlativo}-{folio_secuencial}
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS form_instances (
  uuid_sync        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id               text UNIQUE NULLS NOT DISTINCT,
  cliente_id       uuid NOT NULL REFERENCES clientes(uuid_sync),
  work_order_id    uuid NOT NULL REFERENCES work_orders(uuid_sync) ON DELETE CASCADE,
  asset_id         uuid NOT NULL REFERENCES assets(uuid_sync),
  template_id      uuid NOT NULL REFERENCES form_templates(uuid_sync),
  template_version integer NOT NULL,  -- congelada al instanciar (RN-FORM-01)
  estado           text NOT NULL CHECK (estado IN
                   ('borrador','en_progreso','completado','firmado','anulado'))
                   DEFAULT 'borrador',
  respuestas       jsonb,
  hallazgos_n      integer NOT NULL DEFAULT 0,   -- recalculado y sellado por servidor (RN-FORM-06)
  score            numeric(5,2),
  firmado_at       timestamptz,
  firma_hash       text,                          -- SHA-256 (RN-FORM-08)
  created_at       timestamptz NOT NULL DEFAULT now(),
  captured_at      timestamptz NOT NULL,
  updated_at       timestamptz NOT NULL,
  deleted_at       timestamptz,
  created_by       uuid REFERENCES users(uuid_sync),
  updated_by       uuid REFERENCES users(uuid_sync),
  server_seq       bigint GENERATED ALWAYS AS IDENTITY
);

-- ------------------------------------------------------------
-- work_order_assets — Unión OT ↔ N tags (RN-OT-09/10)
-- Cada fila vincula un activo a la OT y referencia su informe
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS work_order_assets (
  uuid_sync        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id       uuid NOT NULL REFERENCES clientes(uuid_sync),
  work_order_id    uuid NOT NULL REFERENCES work_orders(uuid_sync) ON DELETE CASCADE,
  asset_id         uuid NOT NULL REFERENCES assets(uuid_sync),
  form_instance_id uuid REFERENCES form_instances(uuid_sync),
  orden            smallint NOT NULL DEFAULT 0,
  estado           text NOT NULL CHECK (estado IN
                   ('pendiente','en_progreso','completado','omitido'))
                   DEFAULT 'pendiente',
  notas            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  captured_at      timestamptz NOT NULL,
  updated_at       timestamptz NOT NULL,
  deleted_at       timestamptz,
  created_by       uuid REFERENCES users(uuid_sync),
  updated_by       uuid REFERENCES users(uuid_sync),
  server_seq       bigint GENERATED ALWAYS AS IDENTITY,
  UNIQUE (work_order_id, asset_id)
);

-- ------------------------------------------------------------
-- attachments — metadatos de binarios en Object Storage (ADR-006/D-04)
-- El binario nunca toca esta tabla ni /api/sync
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attachments (
  uuid_sync    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id   uuid NOT NULL REFERENCES clientes(uuid_sync),
  entity_type  text NOT NULL CHECK (entity_type IN
               ('work_order','asset','form_instance','cliente','user')),
  entity_uuid  uuid NOT NULL,
  storage_key  text,                -- NULL hasta confirm del pipeline sign→PUT→confirm
  thumb_url    text,
  filename     text NOT NULL,
  mime_type    text NOT NULL,
  size_bytes   integer NOT NULL CHECK (size_bytes > 0),
  uploaded_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  captured_at  timestamptz NOT NULL,
  updated_at   timestamptz NOT NULL,
  deleted_at   timestamptz,
  created_by   uuid REFERENCES users(uuid_sync),
  server_seq   bigint GENERATED ALWAYS AS IDENTITY
);

-- ------------------------------------------------------------
-- notifications — alertas in-app + web push v1 (entrevista)
-- Solo pull (↓); las genera el servidor
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  uuid_sync       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id      uuid NOT NULL REFERENCES clientes(uuid_sync),
  destinatario_id uuid NOT NULL REFERENCES users(uuid_sync),
  tipo            text NOT NULL CHECK (tipo IN
                  ('stock_bajo','ot_asignada','mp_vence','hallazgo_critico','sync_error')),
  payload         jsonb NOT NULL,
  leida           boolean NOT NULL DEFAULT false,
  push_enviado_at timestamptz,      -- sellado por el servicio web push
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  server_seq      bigint GENERATED ALWAYS AS IDENTITY
);

-- ------------------------------------------------------------
-- asset_tag_sequences — correlativo del Tag canónico (RN-ACT-07)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS asset_tag_sequences (
  cliente_id  uuid NOT NULL REFERENCES clientes(uuid_sync),
  sucursal_id uuid NOT NULL REFERENCES sucursales(uuid_sync),
  tipo_id     uuid NOT NULL REFERENCES catalog_asset_types(uuid_sync),
  last_seq    integer NOT NULL DEFAULT 0,
  PRIMARY KEY (cliente_id, sucursal_id, tipo_id)
);

-- ------------------------------------------------------------
-- informe_sequences — folio INF por (sucursal × tipo) (RN-FORM-09)
-- No reinicia entre OTs: secuencia histórica del equipo en la sucursal
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS informe_sequences (
  cliente_id  uuid NOT NULL REFERENCES clientes(uuid_sync),
  sucursal_id uuid NOT NULL REFERENCES sucursales(uuid_sync),
  tipo_id     uuid NOT NULL REFERENCES catalog_asset_types(uuid_sync),
  last_folio  integer NOT NULL DEFAULT 0,
  PRIMARY KEY (cliente_id, sucursal_id, tipo_id)
);

-- ============================================================
-- MIGRACIÓN DE DATOS: work_orders.asset_id → work_order_assets
-- (solo si existen OT legadas con asset_id poblado)
-- ============================================================
INSERT INTO work_order_assets
  (cliente_id, work_order_id, asset_id, estado, captured_at, updated_at)
SELECT
  wo.cliente_id,
  wo.uuid_sync,
  wo.asset_id,
  CASE WHEN wo.estado IN ('completada','firmada') THEN 'completado'
       WHEN wo.estado = 'en_progreso'             THEN 'en_progreso'
       ELSE 'pendiente' END,
  COALESCE(wo.captured_at, now()),
  now()
FROM work_orders wo
WHERE wo.asset_id IS NOT NULL
ON CONFLICT (work_order_id, asset_id) DO NOTHING;

-- Una vez migrado, eliminar la columna legacy (F3 final)
ALTER TABLE work_orders DROP COLUMN IF EXISTS asset_id;

-- ============================================================
-- ÍNDICES de las tablas nuevas
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_woa_wo        ON work_order_assets (work_order_id);
CREATE INDEX IF NOT EXISTS idx_woa_asset     ON work_order_assets (asset_id);
CREATE INDEX IF NOT EXISTS idx_woa_seq       ON work_order_assets (server_seq);
CREATE INDEX IF NOT EXISTS idx_fi_wo         ON form_instances (work_order_id);
CREATE INDEX IF NOT EXISTS idx_fi_asset      ON form_instances (asset_id);
CREATE INDEX IF NOT EXISTS idx_fi_estado     ON form_instances (estado) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fi_seq        ON form_instances (server_seq);
CREATE INDEX IF NOT EXISTS idx_ft_cliente    ON form_templates (cliente_id) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_ft_seq        ON form_templates (server_seq);
CREATE INDEX IF NOT EXISTS idx_att_entity    ON attachments (entity_type, entity_uuid);
CREATE INDEX IF NOT EXISTS idx_att_seq       ON attachments (server_seq);
CREATE INDEX IF NOT EXISTS idx_notif_dest    ON notifications (destinatario_id) WHERE leida = false;
CREATE INDEX IF NOT EXISTS idx_notif_seq     ON notifications (server_seq);

COMMIT;
