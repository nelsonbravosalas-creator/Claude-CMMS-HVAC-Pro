-- ============================================================
-- Sprint 5 — Script: Reconciliación de esquema `tickets`
-- CMMS HVAC PRO · Idempotente: seguro de re-ejecutar
--
-- El DDL base (000) quedó desalineado del modelo de dominio
-- (frontend/src/domain/tickets/ticket.machine.ts, db/types.ts) y de
-- FASE_1_REGLAS_DE_NEGOCIO_DETALLADO.md § RN-ENT-08/09:
--   - Falta el estado 'observado' (usado por la máquina de estados).
--   - `tipo`/`prioridad` usan un vocabulario distinto al del dominio.
--   - Faltan numero_correlativo, proveedor_asignado_id, closed_at.
--   - ticket_comments no registra el cambio de estado (estado_anterior/nuevo).
--
-- No se renombra ninguna columna existente (reportado_por, asignado_a,
-- contenido, adjunto_url): la API las alias en SELECT hacia los nombres
-- que espera el modelo TS, para minimizar el blast radius del cambio.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- tickets.estado — agregar 'observado' (RN-TICKET-01)
-- ------------------------------------------------------------
ALTER TABLE tickets
  DROP CONSTRAINT IF EXISTS tickets_estado_check;
ALTER TABLE tickets
  ADD CONSTRAINT tickets_estado_check CHECK (estado IN (
    'abierto', 'en_progreso', 'observado', 'resuelto', 'cerrado'
  ));

-- ------------------------------------------------------------
-- tickets.tipo — vocabulario alineado a RN-ENT-08
-- ------------------------------------------------------------
ALTER TABLE tickets
  DROP CONSTRAINT IF EXISTS tickets_tipo_check;
ALTER TABLE tickets
  ALTER COLUMN tipo SET DEFAULT 'correctivo';
ALTER TABLE tickets
  ADD CONSTRAINT tickets_tipo_check CHECK (tipo IN (
    'correctivo', 'preventivo', 'consulta'
  ));

-- ------------------------------------------------------------
-- tickets.prioridad — 'normal' → 'media' (RN-ENT-08)
-- ------------------------------------------------------------
UPDATE tickets SET prioridad = 'media' WHERE prioridad = 'normal';

ALTER TABLE tickets
  DROP CONSTRAINT IF EXISTS tickets_prioridad_check;
ALTER TABLE tickets
  ALTER COLUMN prioridad SET DEFAULT 'media';
ALTER TABLE tickets
  ADD CONSTRAINT tickets_prioridad_check CHECK (prioridad IN (
    'baja', 'media', 'alta', 'critica'
  ));

-- ------------------------------------------------------------
-- Columnas faltantes (RN-ENT-08)
-- ------------------------------------------------------------
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS numero_correlativo integer,
  ADD COLUMN IF NOT EXISTS proveedor_asignado_id uuid REFERENCES users(uuid_sync),
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

DO $$ BEGIN
  ALTER TABLE tickets
    ADD CONSTRAINT uq_tickets_cliente_numero UNIQUE (cliente_id, numero_correlativo);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE tickets
    ADD CONSTRAINT ck_tickets_titulo CHECK (length(titulo) >= 5);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE tickets
    ADD CONSTRAINT ck_tickets_descripcion CHECK (length(descripcion) >= 10);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------------
-- numero_correlativo — secuencia atómica por cliente (sin año, RN-ENT-08)
-- Tabla dedicada (no folio_sequences: ese contador es anual y con prefijo)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ticket_sequences (
  cliente_id   uuid PRIMARY KEY REFERENCES clientes(uuid_sync),
  last_numero  integer NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION assign_ticket_numero() RETURNS TRIGGER AS $$
DECLARE
  v_next integer;
BEGIN
  IF NEW.numero_correlativo IS NULL THEN
    INSERT INTO ticket_sequences (cliente_id, last_numero)
    VALUES (NEW.cliente_id, 1)
    ON CONFLICT (cliente_id)
    DO UPDATE SET last_numero = ticket_sequences.last_numero + 1
    RETURNING last_numero INTO v_next;

    NEW.numero_correlativo := v_next;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_ticket_numero ON tickets;
CREATE TRIGGER trg_assign_ticket_numero BEFORE INSERT ON tickets
  FOR EACH ROW EXECUTE FUNCTION assign_ticket_numero();

-- ------------------------------------------------------------
-- ticket_comments — registrar cambio de estado (RN-ENT-09)
-- Nota: `contenido`/`adjunto_url` se mantienen; la API los alias a
-- `texto`/`foto_url` (nombres del modelo TS) en sus SELECT.
-- ------------------------------------------------------------
ALTER TABLE ticket_comments
  ADD COLUMN IF NOT EXISTS estado_anterior text,
  ADD COLUMN IF NOT EXISTS estado_nuevo    text;

DO $$ BEGIN
  ALTER TABLE ticket_comments
    ADD CONSTRAINT ck_ticket_comments_estado_anterior CHECK (
      estado_anterior IS NULL OR estado_anterior IN (
        'abierto', 'en_progreso', 'observado', 'resuelto', 'cerrado'
      )
    );
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE ticket_comments
    ADD CONSTRAINT ck_ticket_comments_estado_nuevo CHECK (
      estado_nuevo IS NULL OR estado_nuevo IN (
        'abierto', 'en_progreso', 'observado', 'resuelto', 'cerrado'
      )
    );
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;

-- RN-VAL-TICKET-01: si hay cambio de estado, exigir evidencia
-- (texto ≥20 chars O foto_url). Comentarios sin cambio de estado quedan libres.
DO $$ BEGIN
  ALTER TABLE ticket_comments
    ADD CONSTRAINT ck_ticket_comments_evidencia CHECK (
      estado_nuevo IS NULL
      OR (contenido IS NOT NULL AND length(contenido) >= 20)
      OR adjunto_url IS NOT NULL
    );
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON ticket_comments (ticket_id, created_at);

-- ------------------------------------------------------------
-- protect_closed_ticket — Ticket cerrado es inmutable (análogo a
-- protect_signed_work_order)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION protect_closed_ticket() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.estado = 'cerrado' THEN
    RAISE EXCEPTION 'IMMUTABLE_CLOSED_TICKET: Ticket cerrado no puede modificarse';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_closed_ticket ON tickets;
CREATE TRIGGER trg_protect_closed_ticket BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION protect_closed_ticket();

COMMIT;
