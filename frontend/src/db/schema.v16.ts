/**
 * DEXIE SCHEMA - CMMS HVAC PRO
 *
 * Archivo: src/db/schema.v16.ts
 * Descripción: Schema Dexie con 23 tablas indexadas y optimizadas
 *
 * Historial:
 *   v16 — 18 tablas (versión inicial Fase 0)
 *   v17 — +5 tablas: zonas, configuracion_cliente, inventory_items,
 *          inventory_movements, mp_plans (DT-3: modelo universal)
 *
 * Exporta: db (instancia de Dexie)
 *
 * Uso:
 * import { db } from '@/db/schema.v16'
 *
 * db.equipos.add({ ... })
 * db.work_orders.where('cliente_id').equals(id).toArray()
 */

import Dexie, { type Table } from 'dexie';
import * as T from './types';

/**
 * Clase CMSSHVACDatabase - Extends Dexie
 *
 * Define todas las tablas con tipos TypeScript
 * Dexie auto-genera métodos CRUD type-safe
 */
export class CMSSHVACDatabase extends Dexie {
  // ============================================
  // MAESTROS
  // ============================================

  clientes!: Table<T.Cliente>;
  sucursales!: Table<T.Sucursal>;
  catalog_asset_types!: Table<T.CatalogAssetType>;
  refrigerantes_catalogo!: Table<T.RefrigeranteCatalogo>;
  users!: Table<T.User>;

  // ============================================
  // DATOS OPERACIONALES
  // ============================================

  equipos!: Table<T.Equipo>;
  work_orders!: Table<T.WorkOrder>;
  work_order_assets!: Table<T.WorkOrderAsset>;
  form_instances!: Table<T.FormInstance>;
  tickets!: Table<T.Ticket>;
  ticket_comments!: Table<T.TicketComment>;

  // ============================================
  // SINCRONIZACIÓN
  // ============================================

  sync_queue!: Table<T.SyncQueueItem>;
  attachment_metadata!: Table<T.AttachmentMetadata>;
  sync_history!: Table<T.SyncHistory>;

  // ============================================
  // CACHÉ & PREFERENCIAS
  // ============================================

  kpi_cache!: Table<T.KPICache>;
  user_preferences!: Table<T.UserPreferences>;

  // ============================================
  // MODELO UNIVERSAL (v17)
  // ============================================

  zonas!: Table<T.Zona>;
  configuracion_cliente!: Table<T.ConfiguracionCliente>;
  inventory_items!: Table<T.InventoryItem>;
  inventory_movements!: Table<T.InventoryMovement>;
  mp_plans!: Table<T.MpPlan>;

  // ============================================
  // FORMULARIOS (v18)
  // ============================================

  form_templates!: Table<T.FormTemplate>;

  constructor() {
    super('cmmsHVACPRO');

    this.version(16).stores({
      // ============================================
      // MAESTROS
      // ============================================

      /**
       * Clientes
       * Búsquedas: estado, actualizaciones
       */
      clientes: 'cliente_id, estado, updated_at',

      /**
       * Sucursales
       * Búsquedas:
       * - [cliente_id+nombre] para unicidad
       * - [cliente_id+codigo] para búsqueda por código
       * - cliente_id para listar por cliente
       */
      sucursales:
        'sucursal_id, [cliente_id+nombre], [cliente_id+codigo], cliente_id, estado',

      /**
       * Tipos de equipo
       * Búsquedas:
       * - [cliente_id+nombre] para unicidad
       * - cliente_id para listar tipos del cliente
       */
      catalog_asset_types:
        'tipo_de_equipo_id, [cliente_id+nombre], cliente_id, estado',

      /**
       * Refrigerantes
       * Búsquedas: nombre (único), disponibilidad
       */
      refrigerantes_catalogo: 'refrigerante_id, nombre, disponible_chile',

      /**
       * Usuarios
       * Búsquedas:
       * - email para login
       * - [cliente_id+rol] para listar por cliente y rol
       * - estado para filtrar activos
       */
      users: 'user_id, email, [cliente_id+rol], cliente_id, estado',

      // ============================================
      // DATOS OPERACIONALES
      // ============================================

      /**
       * Equipos (Assets/Tags)
       * PK: tag (compuesto: {sucursal_codigo}.{tipo_codigo}.{seq})
       *
       * Búsquedas:
       * - [cliente_id+sucursal_id] para listar por sucursal
       * - [cliente_id+estado] para filtrar activos, con falla
       * - criticidad para equipos críticos
       * - updated_at para sincronización
       *
       * Ejemplos de queries:
       * - db.equipos.where('[cliente_id+sucursal_id]').equals(['cli-001', 'suc-001']).toArray()
       * - db.equipos.where('criticidad').equals('critico').toArray()
       */
      equipos:
        'tag, [cliente_id+sucursal_id], [cliente_id+estado], criticidad, updated_at',

      /**
       * Work Orders (OT)
       * PK: work_order_id
       *
       * Búsquedas:
       * - [cliente_id+sucursal_id] para listar por sucursal
       * - [cliente_id+estado] para filtrar por estado
       * - folio para búsqueda rápida
       * - tecnico_asignado_user_id para OT asignadas a técnico
       * - updated_at para sincronización
       *
       * Ejemplos:
       * - db.work_orders.where('[cliente_id+estado]').equals(['cli-001', 'en_progreso']).toArray()
       * - db.work_orders.where('tecnico_asignado_user_id').equals(uid).toArray()
       */
      work_orders:
        'work_order_id, [cliente_id+sucursal_id], [cliente_id+estado], folio, tecnico_asignado_user_id, updated_at',

      /**
       * Work Order Assets (Vinculación OT ↔ Equipos)
       * PK Composite: [work_order_id+tag]
       *
       * Búsquedas:
       * - estado para filtrar completados
       * - work_order_id para obtener assets de una OT
       * - tag para encontrar en qué OT está un equipo
       *
       * Ejemplos:
       * - db.work_order_assets.where('work_order_id').equals('ot-001').toArray()
       * - db.work_order_assets.where('[work_order_id+tag]').equals(['ot-001', '21-STK.AC.001']).first()
       */
      work_order_assets: '[work_order_id+tag], estado, work_order_id, tag',

      /**
       * Form Instances (Informes)
       * PK: form_instance_id
       *
       * Búsquedas:
       * - work_order_id para obtener formularios de una OT
       * - [work_order_id+work_order_asset_id] para formulario específico de equipo
       * - estado para filtrar completados/firmados
       * - updated_at para sincronización
       */
      form_instances:
        'form_instance_id, work_order_id, [work_order_id+work_order_asset_id], estado, updated_at',

      /**
       * Tickets (Incidencias)
       * PK: ticket_id
       *
       * Búsquedas:
       * - [cliente_id+numero_correlativo] para unicidad
       * - [cliente_id+estado] para listar por estado
       * - responsable_tecnico_user_id para asignados a técnico
       * - updated_at para sincronización
       *
       * Ejemplos:
       * - db.tickets.where('[cliente_id+estado]').equals(['cli-001', 'abierto']).toArray()
       * - db.tickets.where('responsable_tecnico_user_id').equals(uid).toArray()
       */
      tickets:
        'ticket_id, [cliente_id+numero_correlativo], [cliente_id+estado], estado, responsable_tecnico_user_id, updated_at',

      /**
       * Ticket Comments (Historial)
       * PK: ticket_comment_id
       *
       * Búsquedas:
       * - ticket_id para obtener comentarios de un ticket
       * - created_at para ordenamiento temporal
       */
      ticket_comments: 'ticket_comment_id, ticket_id, created_at',

      // ============================================
      // SINCRONIZACIÓN
      // ============================================

      /**
       * Sync Queue
       * PK Composite: [tabla+record_id]
       *
       * Búsquedas:
       * - status para obtener items pendientes
       * - next_retry para reintento exponencial
       * - created_at para debugging
       *
       * Ejemplos:
       * - db.sync_queue.where('status').equals('pending').toArray()
       * - db.sync_queue.where('status').anyOf(['pending', 'error']).and(item => !item.next_retry || item.next_retry <= new Date()).toArray()
       */
      sync_queue: '[tabla+record_id], status, next_retry, created_at',

      /**
       * Attachment Metadata (Fotos y Firmas)
       * PK: attachment_id
       *
       * Búsquedas:
       * - record_id para obtener attachments de un registro
       * - synced para limpiar después de sincronizar
       * - created_at para limpieza de caché
       */
      attachment_metadata: 'attachment_id, record_id, synced, created_at',

      /**
       * Sync History (Auditoría)
       * PK: sync_history_id
       *
       * Búsquedas:
       * - timestamp para debugging histórico
       */
      sync_history: 'sync_history_id, timestamp',

      // ============================================
      // CACHÉ & PREFERENCIAS
      // ============================================

      /**
       * KPI Cache
       * PK Composite: [cliente_id+periodo]
       *
       * Búsquedas:
       * - expires_at para limpieza automática de caché expirado
       *
       * Períodos: "2026-06" (mes), "2026-Q2" (trimestre), "2026" (año)
       */
      kpi_cache: '[cliente_id+periodo], expires_at',

      /**
       * User Preferences
       * PK: user_preferences_id
       *
       * Búsquedas:
       * - user_id para obtener preferencias de un usuario
       *
       * Almacena: theme, language, menu_order, menu_position, etc.
       */
      user_preferences: 'user_preferences_id, user_id'
    });

    // ============================================
    // V17 — Modelo Universal (DT-3)
    // ============================================
    // Solo se declaran las tablas NUEVAS. Las 18 tablas anteriores
    // no se mencionan → Dexie las conserva sin cambios.

    this.version(17).stores({
      /**
       * Zonas — reemplaza Sucursales en el modelo nuevo (SPEC-ASSET-UNIVERSAL.md)
       * PK: zona_id
       *
       * Búsquedas:
       * - [cliente_id+codigo] para unicidad y lookup por código de zona
       * - [cliente_id+estado] para listar zonas activas
       */
      zonas: 'zona_id, [cliente_id+codigo], [cliente_id+estado], cliente_id',

      /**
       * Configuración por cliente — key-value (SPEC-CONFIG-FLOWS.md)
       * PK Compuesta: [cliente_id+clave]
       *
       * Pull-only: el servidor es la fuente de verdad.
       * Helper: getConfig<T>(clienteId, clave, defaultValue)
       */
      configuracion_cliente: '[cliente_id+clave], cliente_id',

      /**
       * Items de inventario
       * PK: inventory_item_id
       *
       * Búsquedas:
       * - [cliente_id+codigo] unicidad + lookup SKU
       * - [cliente_id+sucursal_id] stock por zona
       * - stock_actual para alertas de stock bajo
       */
      inventory_items:
        'inventory_item_id, [cliente_id+codigo], [cliente_id+sucursal_id], cliente_id',

      /**
       * Movimientos de inventario — append-only (RN-INV-02)
       * PK: inventory_movement_id
       *
       * Búsquedas:
       * - inventory_item_id para historial del ítem
       * - referencia_ot para materiales consumidos en una OT
       * - created_at para auditoria cronológica
       */
      inventory_movements:
        'inventory_movement_id, inventory_item_id, referencia_ot, cliente_id, created_at',

      /**
       * Planes de Mantenimiento Preventivo (RN-MP)
       * PK: mp_plan_id
       *
       * Búsquedas:
       * - tag para planes de un activo
       * - [cliente_id+estado] para planes activos del tenant
       * - proxima_ejecucion para el scheduler diario
       */
      mp_plans:
        'mp_plan_id, tag, [cliente_id+estado], proxima_ejecucion, cliente_id',
    });

    // ============================================
    // V18 — Formularios dinámicos (RN-FORM)
    // ============================================
    // form_templates es pull-only: solo el servidor las crea/publica.
    // El cliente descarga y renderiza basado en tipo_id del activo.

    this.version(18).stores({
      /**
       * Form Templates — Plantillas de checklist por tipo de equipo
       * PK: form_template_id (= uuid_sync en BD)
       *
       * Búsquedas:
       * - [cliente_id+codigo] para lookup por código único
       * - [cliente_id+tipo_id] para cargar template del tipo del activo
       * - activo para filtrar plantillas publicadas
       * - updated_at para pull incremental
       */
      form_templates:
        'form_template_id, [cliente_id+codigo], [cliente_id+tipo_id], cliente_id, activo, updated_at',
    });

    // ============================================
    // HOOKS (Validaciones)
    // ============================================

    /**
     * Hook: Prevenir edición de campo 'tag' (inmutable)
     *
     * El tag es identificador único y no debe cambiar después de crear el equipo
     */
    this.equipos.hook('updating', (modifications, primKey) => {
      const mods = modifications as Partial<T.Equipo>;
      if (mods.tag !== undefined && mods.tag !== primKey) {
        throw new Error('❌ Campo tag es inmutable. No puede cambiar después de creado.');
      }
    });

    /**
     * Hook: Prevenir edición de campo 'created_at' (auditoría)
     */
    this.work_orders.hook('updating', (modifications) => {
      const mods = modifications as Partial<T.WorkOrder>;
      if (mods.created_at !== undefined) {
        throw new Error('❌ Campo created_at es inmutable.');
      }
    });
  }
}

// ============================================
// INSTANCIA GLOBAL
// ============================================

/**
 * Exportar instancia global de Dexie
 *
 * Uso en componentes:
 * import { db } from '@/db/schema.v16'
 *
 * const equipos = await db.equipos.where('cliente_id').equals(id).toArray()
 */
export const db = new CMSSHVACDatabase();

// ============================================
// INICIALIZACIÓN
// ============================================

/**
 * Función para inicializar DB
 *
 * Uso en main.tsx:
 * await initDatabase()
 */
export async function initDatabase(): Promise<void> {
  try {
    // Abrir DB (crea si no existe)
    await db.open();
    console.log('✅ Dexie v16 database initialized');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
}
