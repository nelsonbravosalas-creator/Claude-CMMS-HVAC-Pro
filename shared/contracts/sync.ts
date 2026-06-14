/**
 * CMMS HVAC PRO — Contratos de sincronización (P-7: fuente única de verdad)
 * Fase 0 — actualizado con entidades del modelo multi-tag + formularios
 *
 * Importado por el cliente (src/sync) y por la API (api/sync).
 */
import { z } from 'zod';

/**
 * Entidades sincronizables y su dirección:
 *   ↕ bidireccional · ↑ solo push · ↓ solo pull
 *
 *   clientes             ↕ (write solo programador)
 *   sucursales           ↕
 *   users                ↓ (altas/ediciones online-only — RN-SEG-04)
 *   catalog_asset_types  ↓
 *   assets               ↕
 *   work_orders          ↕
 *   work_order_assets    ↕  ← nuevo (RN-OT-09)
 *   form_categories      ↓  ← nuevo (catálogo extensible, admin)
 *   form_templates       ↓  ← nuevo (publicación server-side — RN-FORM-01)
 *   form_instances       ↕  ← nuevo (informes por tag — RN-FORM-09)
 *   inventory_items      ↕
 *   inventory_movements  ↑ (append-only — RN-INV-02)
 *   attachments          ↕ (solo metadatos; binario por pipeline D-04)
 *   mp_plans             ↕
 *   notifications        ↓ (las genera el servidor)
 */
export const SyncEntityEnum = z.enum([
  'clientes',
  'sucursales',
  'users',
  'catalog_asset_types',
  'assets',
  'work_orders',
  'work_order_assets',
  'form_categories',
  'form_templates',
  'form_instances',
  'inventory_items',
  'inventory_movements',
  'attachments',
  'mp_plans',
  'notifications',
]);
export type SyncEntity = z.infer<typeof SyncEntityEnum>;

/** Entidades que el cliente NUNCA puede pushear (el servidor rechaza con FORBIDDEN) */
export const PULL_ONLY_ENTITIES: ReadonlySet<SyncEntity> = new Set([
  'users',
  'catalog_asset_types',
  'form_categories',
  'form_templates',
  'notifications',
] as const);

export const SyncItemBaseSchema = z.object({
  uuid_sync: z.string().uuid(),
  _entity: SyncEntityEnum,
  _op: z.enum(['insert', 'update', 'delete']),
  cliente_id: z.string().uuid(),
  captured_at: z.string().datetime(),
});

export const SyncPushRequestSchema = z.object({
  batch_uuid: z.string().uuid(),
  items: z.array(SyncItemBaseSchema.passthrough()).max(50),
});

export const SyncPushResponseSchema = z.object({
  accepted: z.array(z.string().uuid()),
  rejected_temp: z.array(
    z.object({
      uuid_sync: z.string().uuid(),
      code: z.string(),
      message: z.string(),
    }),
  ),
  rejected_permanent: z.array(
    z.object({
      uuid_sync: z.string().uuid(),
      code: z.string(),
      message: z.string(),
    }),
  ),
  server_seq: z.number().int(),
});

export const SyncPullResponseSchema = z.object({
  items: z.array(SyncItemBaseSchema.passthrough()),
  server_seq: z.number().int(),
  has_more: z.boolean(),
});

export type SyncPushRequest = z.infer<typeof SyncPushRequestSchema>;
export type SyncPushResponse = z.infer<typeof SyncPushResponseSchema>;
export type SyncPullResponse = z.infer<typeof SyncPullResponseSchema>;

// ────────────────────────────────────────────────────────────────────
// Esquemas del motor de formularios (RN-FORM)
// ────────────────────────────────────────────────────────────────────

/** Destinos de binding hacia los cuadros narrativos de la OT (RN-FORM-05) */
export const BindingTargetEnum = z.enum([
  'hallazgo',
  'diagnostico',
  'recomendaciones',
  'conclusiones',
]);

export const FieldBindingSchema = z.object({
  target: BindingTargetEnum,
  modo: z.enum(['set', 'append', 'lista']),
});

/** Definición de campo de una plantilla (form_templates.campos_definicion[]) */
export const FormFieldDefSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  tipo: z.enum(['text', 'number', 'select', 'boolean', 'date', 'check', 'medicion', 'foto']),
  requerido: z.boolean(),
  opciones: z.array(z.string()).optional(),
  unidad: z.string().optional(),
  rango_min: z.number().optional(),
  rango_max: z.number().optional(),
  /** Valor (o expresión simple) que marca el campo como hallazgo — RN-FORM-06 */
  es_hallazgo_si: z.union([z.string(), z.number(), z.boolean()]).optional(),
  binding: FieldBindingSchema.optional(),
});
export type FormFieldDef = z.infer<typeof FormFieldDefSchema>;

export const FormTemplateSchema = z.object({
  uuid_sync: z.string().uuid(),
  cliente_id: z.string().uuid(),
  tipo_id: z.string().uuid().nullable(), // NULL = plantilla genérica
  categoria_id: z.string().uuid(),
  codigo: z.string().min(1),
  version: z.number().int().positive(),
  nombre: z.string().min(1),
  campos_definicion: z.array(FormFieldDefSchema),
  activo: z.boolean(),
  published_at: z.string().datetime().nullable(),
});

export const FormInstanceEstadoEnum = z.enum([
  'borrador',
  'en_progreso',
  'completado',
  'firmado',
  'anulado',
]);

export const FormInstanceSchema = z.object({
  uuid_sync: z.string().uuid(),
  id: z.string().nullable(), // folio INF-... — solo lo escribe el servidor
  cliente_id: z.string().uuid(),
  work_order_id: z.string().uuid(),
  // 'tag' es el PK del activo en Dexie ({zona}.{tipo}.{seq}). Renombrado desde
  // asset_id (UUID) para alinearse con types.ts y schema.v16.ts — BUG-03 fix.
  tag: z.string().min(1),
  template_id: z.string().uuid(),
  template_version: z.number().int().positive(),
  estado: FormInstanceEstadoEnum,
  respuestas: z.record(z.union([z.string(), z.number(), z.boolean()])).nullable(),
  hallazgos_n: z.number().int().nonnegative(),
  score: z.number().nullable(),
});

export const WorkOrderAssetEstadoEnum = z.enum([
  'pendiente',
  'en_progreso',
  'completado',
  'omitido',
]);

export const WorkOrderAssetSchema = z.object({
  uuid_sync: z.string().uuid(),
  cliente_id: z.string().uuid(),
  work_order_id: z.string().uuid(),
  // 'tag' reemplaza a asset_id (UUID) para alinearse con types.ts — BUG-03 fix.
  tag: z.string().min(1),
  form_instance_id: z.string().uuid().nullable(),
  orden: z.number().int().nonnegative(),
  estado: WorkOrderAssetEstadoEnum,
  notas: z.string().nullable(),
});

/** Tipos de OT — `predictivo` reservado, sin funcionalidad en v1 (roadmap v2) */
export const WorkOrderTipoEnum = z.enum([
  'preventivo',
  'correctivo',
  'predictivo',
  'atencion_falla',
  'puesta_en_marcha',
  'inspeccion_tecnica',
  'instalacion_montaje',
]);

// ────────────────────────────────────────────────────────────────────
// Web push (v1 — decisión de entrevista)
// ────────────────────────────────────────────────────────────────────

export const PushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});
export type PushSubscriptionPayload = z.infer<typeof PushSubscriptionSchema>;

export const NotificationTipoEnum = z.enum([
  'stock_bajo',
  'ot_asignada',
  'mp_vence',
  'hallazgo_critico',
  'sync_error',
]);
