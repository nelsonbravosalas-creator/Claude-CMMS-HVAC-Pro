-- ============================================================
-- FASE 0 — Script 3/3: Funciones y triggers de las reglas nuevas
-- CMMS HVAC PRO · Aplicar después de 002
-- Cubre: RN-ACT-07, RN-OT-09/10/11, RN-FORM-06/07/08/09, RN-INV-04
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Sellado de timestamps en tablas nuevas (P-2 / RN-SYNC-02)
-- Reutiliza set_timestamps() existente
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_set_timestamps ON form_categories;
CREATE TRIGGER trg_set_timestamps BEFORE INSERT OR UPDATE ON form_categories
  FOR EACH ROW EXECUTE FUNCTION set_timestamps();

DROP TRIGGER IF EXISTS trg_set_timestamps ON form_templates;
CREATE TRIGGER trg_set_timestamps BEFORE INSERT OR UPDATE ON form_templates
  FOR EACH ROW EXECUTE FUNCTION set_timestamps();

DROP TRIGGER IF EXISTS trg_set_timestamps ON form_instances;
CREATE TRIGGER trg_set_timestamps BEFORE INSERT OR UPDATE ON form_instances
  FOR EACH ROW EXECUTE FUNCTION set_timestamps();

DROP TRIGGER IF EXISTS trg_set_timestamps ON work_order_assets;
CREATE TRIGGER trg_set_timestamps BEFORE INSERT OR UPDATE ON work_order_assets
  FOR EACH ROW EXECUTE FUNCTION set_timestamps();

DROP TRIGGER IF EXISTS trg_set_timestamps ON attachments;
CREATE TRIGGER trg_set_timestamps BEFORE INSERT OR UPDATE ON attachments
  FOR EACH ROW EXECUTE FUNCTION set_timestamps();

-- ------------------------------------------------------------
-- RN-ACT-07 — Sellado del Tag canónico por servidor
-- El cliente crea offline con tag provisional `PEND.<short>`;
-- al sincronizar, el servidor compone el tag definitivo:
--   {codigo_num sucursal 7d}.{codigo_num tipo 4d}.{correlativo 3d}
-- Overflow > 999 → amplía a 4 dígitos (TAG_SERIAL_OVERFLOW, no bloquea)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION assign_asset_tag() RETURNS TRIGGER AS $$
DECLARE
  v_suc_num  integer;
  v_tipo_num integer;
  v_seq      integer;
BEGIN
  -- Solo sella tags provisionales; tags manuales/legados se respetan (RN-ACT-01)
  IF NEW.tag IS NOT NULL AND NEW.tag NOT LIKE 'PEND.%' THEN
    RETURN NEW;
  END IF;

  SELECT codigo_num INTO v_suc_num  FROM sucursales          WHERE uuid_sync = NEW.sucursal_id;
  SELECT codigo_num INTO v_tipo_num FROM catalog_asset_types WHERE uuid_sync = NEW.tipo_id;

  IF v_suc_num IS NULL OR v_tipo_num IS NULL THEN
    RAISE EXCEPTION 'TAG_CONFIG_MISSING: sucursal o tipo sin codigo_num — no se puede componer el Tag canónico';
  END IF;

  INSERT INTO asset_tag_sequences (cliente_id, sucursal_id, tipo_id, last_seq)
  VALUES (NEW.cliente_id, NEW.sucursal_id, NEW.tipo_id, 1)
  ON CONFLICT (cliente_id, sucursal_id, tipo_id)
  DO UPDATE SET last_seq = asset_tag_sequences.last_seq + 1
  RETURNING last_seq INTO v_seq;

  -- lpad a 3; si v_seq > 999 lpad lo deja en 4 dígitos (overflow tolerado)
  NEW.tag := format('%s.%s.%s',
    lpad(v_suc_num::text, 7, '0'),
    lpad(v_tipo_num::text, 4, '0'),
    lpad(v_seq::text, 3, '0'));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_asset_tag ON assets;
CREATE TRIGGER trg_assign_asset_tag BEFORE INSERT ON assets
  FOR EACH ROW EXECUTE FUNCTION assign_asset_tag();

-- ------------------------------------------------------------
-- RN-FORM-09 — Folio del Informe
-- INF-{cod_sucursal}.{cod_tipo}-{tag_correlativo}-{folio_secuencial}
-- Ej: INF-STK-21.HVAC-003-004
--   · cod_sucursal: sucursales.codigo (prefijo legible)
--   · cod_tipo: nombre corto del tipo (catalog_asset_types.nombre)
--   · tag_correlativo: último segmento del tag canónico del activo
--   · folio_secuencial: informe_sequences por (cliente, sucursal, tipo)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION assign_informe_folio() RETURNS TRIGGER AS $$
DECLARE
  v_sucursal_id  uuid;
  v_tipo_id      uuid;
  v_suc_codigo   text;
  v_tipo_nombre  text;
  v_tag_corr     text;
  v_next         integer;
BEGIN
  IF NEW.id IS NOT NULL THEN RETURN NEW; END IF;

  SELECT a.sucursal_id, a.tipo_id, split_part(a.tag, '.', 3)
    INTO v_sucursal_id, v_tipo_id, v_tag_corr
  FROM assets a WHERE a.uuid_sync = NEW.asset_id;

  SELECT s.codigo INTO v_suc_codigo FROM sucursales s WHERE s.uuid_sync = v_sucursal_id;
  SELECT t.nombre INTO v_tipo_nombre FROM catalog_asset_types t WHERE t.uuid_sync = v_tipo_id;

  INSERT INTO informe_sequences (cliente_id, sucursal_id, tipo_id, last_folio)
  VALUES (NEW.cliente_id, v_sucursal_id, v_tipo_id, 1)
  ON CONFLICT (cliente_id, sucursal_id, tipo_id)
  DO UPDATE SET last_folio = informe_sequences.last_folio + 1
  RETURNING last_folio INTO v_next;

  NEW.id := format('INF-%s.%s-%s-%s',
    COALESCE(v_suc_codigo, 'SUC'),
    COALESCE(upper(v_tipo_nombre), 'EQ'),
    COALESCE(NULLIF(v_tag_corr, ''), '000'),
    lpad(v_next::text, 3, '0'));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_informe_folio ON form_instances;
CREATE TRIGGER trg_assign_informe_folio BEFORE INSERT ON form_instances
  FOR EACH ROW EXECUTE FUNCTION assign_informe_folio();

-- ------------------------------------------------------------
-- RN-OT-11 — Al completar un informe, su work_order_asset avanza
-- (el binding narrativo lo compone el CLIENTE — RN-FORM-05;
-- el servidor solo mantiene coherente el estado de la unión)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_form_instance_complete() RETURNS TRIGGER AS $$
BEGIN
  UPDATE work_order_assets
  SET estado = 'completado'
  WHERE work_order_id = NEW.work_order_id
    AND asset_id = NEW.asset_id
    AND estado <> 'completado';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_form_instance_complete ON form_instances;
CREATE TRIGGER trg_form_instance_complete AFTER UPDATE OF estado ON form_instances
  FOR EACH ROW WHEN (NEW.estado = 'completado')
  EXECUTE FUNCTION handle_form_instance_complete();

-- ------------------------------------------------------------
-- RN-OT-10 — La OT no pasa a `completada` con tags pendientes
-- Valida el invariante en el servidor (la UI ya lo bloquea)
-- `omitido` cuenta como resuelto (tag excluido con justificación)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_ot_all_assets_done() RETURNS TRIGGER AS $$
DECLARE
  v_pendientes integer;
BEGIN
  IF NEW.estado = 'completada' AND OLD.estado IS DISTINCT FROM 'completada' THEN
    SELECT count(*) INTO v_pendientes
    FROM work_order_assets
    WHERE work_order_id = NEW.uuid_sync
      AND deleted_at IS NULL
      AND estado NOT IN ('completado', 'omitido');

    IF v_pendientes > 0 THEN
      RAISE EXCEPTION 'CHECKLIST_INCOMPLETE: % tag(s) sin completar en la OT', v_pendientes;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_ot_completable ON work_orders;
CREATE TRIGGER trg_check_ot_completable BEFORE UPDATE OF estado ON work_orders
  FOR EACH ROW EXECUTE FUNCTION check_ot_all_assets_done();

-- ------------------------------------------------------------
-- RN-FORM-08 — Instancia firmada es inmutable (Informe Cerrado)
-- Análogo a protect_signed_work_order
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION protect_signed_form_instance() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.estado = 'firmado' THEN
    RAISE EXCEPTION 'IMMUTABLE_SIGNED_FORM: Informe firmado no puede modificarse';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_signed_form ON form_instances;
CREATE TRIGGER trg_protect_signed_form BEFORE UPDATE ON form_instances
  FOR EACH ROW EXECUTE FUNCTION protect_signed_form_instance();

-- ------------------------------------------------------------
-- Al firmar la OT → sus informes pasan a `firmado` (RN-FORM-08)
-- Sella firmado_at; firma_hash la calcula la API antes del UPDATE
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION seal_form_instances_on_ot_sign() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado = 'firmada' AND OLD.estado IS DISTINCT FROM 'firmada' THEN
    UPDATE form_instances
    SET estado = 'firmado', firmado_at = now()
    WHERE work_order_id = NEW.uuid_sync
      AND estado = 'completado'
      AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_seal_forms_on_sign ON work_orders;
CREATE TRIGGER trg_seal_forms_on_sign AFTER UPDATE OF estado ON work_orders
  FOR EACH ROW EXECUTE FUNCTION seal_form_instances_on_ot_sign();

-- ------------------------------------------------------------
-- RN-INV-04 — Alerta stock_bajo a admins y supervisores del tenant
-- Inserta en notifications; el servicio web push (Fase 3) la envía
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_stock_bajo() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock_actual < NEW.stock_minimo
     AND OLD.stock_actual >= OLD.stock_minimo THEN
    INSERT INTO notifications (cliente_id, destinatario_id, tipo, payload)
    SELECT NEW.cliente_id, u.uuid_sync, 'stock_bajo',
           jsonb_build_object(
             'inventory_item_id', NEW.uuid_sync,
             'codigo', NEW.codigo,
             'nombre', NEW.nombre,
             'stock_actual', NEW.stock_actual,
             'stock_minimo', NEW.stock_minimo)
    FROM users u
    WHERE u.cliente_id = NEW.cliente_id
      AND u.rol IN ('administrador', 'supervisor')
      AND u.activo = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_stock_bajo ON inventory_items;
CREATE TRIGGER trg_notify_stock_bajo AFTER UPDATE OF stock_actual ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION notify_stock_bajo();

COMMIT;
