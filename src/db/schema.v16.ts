/**
 * CMMS HVAC PRO — Dexie Schema v16
 * Fase 0 — Reconciliación del modelo (entrevista 2026-06-12)
 *
 * Cambios vs v15:
 *  - work_orders: SIN asset_id (modelo multi-tag RN-OT-09);
 *    + hallazgo/diagnostico/recomendaciones/conclusiones + version
 *  - NUEVAS: work_order_assets, form_categories, form_templates,
 *    form_instances, attachments, notifications
 *  - users: + push_subscription (web push v1)
 *
 * Convención de índices Dexie: primer campo = primary key (no ++ porque
 * uuid_sync se genera con crypto.randomUUID() en el cliente — RN-ID-01).
 * Los campos compuestos [a+b] crean índices compuestos.
 */

export const DB_NAME = 'CMMS_LocalDB';
export const DB_VERSION = 16;

export const SCHEMA_V16 = {
  // ── Catálogos del tenant (↓ pull / ↕) ─────────────────────────────
  clientes:
    'uuid_sync, id, rut, estado, sync_status',
  sucursales:
    'uuid_sync, id, cliente_id, codigo, sync_status',
  users:
    'uuid_sync, id, cliente_id, email, rol',
  catalog_asset_types:
    'uuid_sync, id, cliente_id, nombre, sync_status',

  // ── Activos ───────────────────────────────────────────────────────
  assets:
    'uuid_sync, id, cliente_id, sucursal_id, tipo_id, tag, estado_operativo, sync_status',

  // ── Órdenes de Trabajo (multi-tag) ────────────────────────────────
  work_orders:
    'uuid_sync, id, cliente_id, estado, tipo, tecnico_id, mp_plan_id, sync_status',
  work_order_assets:
    'uuid_sync, work_order_id, asset_id, form_instance_id, estado, [work_order_id+asset_id], sync_status',

  // ── Motor de formularios modulares (RN-FORM) ──────────────────────
  form_categories:
    'uuid_sync, cliente_id, nombre',                       // ↓ pull only
  form_templates:
    'uuid_sync, id, cliente_id, tipo_id, categoria_id, [codigo+version], activo', // ↓ pull only
  form_instances:
    'uuid_sync, id, cliente_id, work_order_id, asset_id, template_id, estado, sync_status', // ↕

  // ── Inventario ────────────────────────────────────────────────────
  inventory_items:
    'uuid_sync, id, cliente_id, sucursal_id, codigo, sync_status',
  inventory_movements:
    'uuid_sync, id, cliente_id, inventory_item_id, referencia_ot, tipo, sync_status', // ↑ push only

  // ── Mantenimiento Preventivo ──────────────────────────────────────
  mp_plans:
    'uuid_sync, id, cliente_id, asset_id, activo, proxima_ejecucion, sync_status',

  // ── Binarios y notificaciones ─────────────────────────────────────
  attachments:
    'uuid_sync, cliente_id, [entity_type+entity_uuid], sync_status',
  notifications:
    'uuid_sync, destinatario_id, tipo, leida',             // ↓ pull only

  // ── Infraestructura local (⊘ no sincroniza) ───────────────────────
  sync_queue:
    '++seq, uuid_sync, entity, status, retry_count',
  blobs_outbox:
    '++seq, attachment_uuid, status',
  settings:
    'key',                                                  // last_server_seq, prefs
} as const;

// 18 tablas: 15 de negocio + 3 de infraestructura local

/**
 * Migración v15 → v16
 * Uso en dexie.ts:
 *
 *   db.version(16).stores(SCHEMA_V16).upgrade(upgradeToV16);
 */
export async function upgradeToV16(tx: any): Promise<void> {
  // 1. work_orders legadas: mover asset_id a work_order_assets
  const workOrders = await tx.table('work_orders').toArray();
  const now = new Date().toISOString();

  for (const wo of workOrders) {
    if (wo.asset_id) {
      await tx.table('work_order_assets').add({
        uuid_sync: crypto.randomUUID(),
        cliente_id: wo.cliente_id,
        work_order_id: wo.uuid_sync,
        asset_id: wo.asset_id,
        form_instance_id: null,
        orden: 0,
        estado:
          wo.estado === 'completada' || wo.estado === 'firmada'
            ? 'completado'
            : wo.estado === 'en_progreso'
              ? 'en_progreso'
              : 'pendiente',
        notas: null,
        captured_at: wo.captured_at ?? now,
        updated_at: wo.updated_at ?? now,
        sync_status: wo.sync_status === 'synced' ? 'pending_insert' : wo.sync_status,
        retry_count: 0,
        last_error: null,
      });

      // 2. limpiar el campo legacy y agregar narrativos + version
      await tx.table('work_orders').update(wo.uuid_sync, {
        asset_id: undefined,
        hallazgo: wo.hallazgo ?? null,
        diagnostico: wo.diagnostico ?? null,
        recomendaciones: wo.recomendaciones ?? null,
        conclusiones: wo.conclusiones ?? null,
        version: wo.version ?? 1,
      });
    }
  }

  // 3. users: campo push_subscription (se puebla al suscribir el SW)
  await tx
    .table('users')
    .toCollection()
    .modify((u: any) => {
      if (u.push_subscription === undefined) u.push_subscription = null;
    });
}
