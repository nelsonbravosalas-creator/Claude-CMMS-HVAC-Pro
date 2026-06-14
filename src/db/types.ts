/**
 * TIPOS TYPESCRIPT - CMMS HVAC PRO
 *
 * Archivo: src/db/types.ts
 * Descripción: Interfaces TypeScript para todas las 18 tablas de Dexie v16
 *
 * ✅ Sin `any`
 * ✅ Type-safe
 * ✅ Auto-complete en IDE
 */

// ============================================
// MAESTROS (Configuración global)
// ============================================

/**
 * Cliente - Empresa/Organización
 *
 * Campos:
 * - cliente_id: UUID único
 * - rut: Formato XX.XXX.XXX-X (único)
 * - moneda: CLP o USD para reportes financieros
 * - logo_url: Referencia a blob almacenado
 *
 * Auditoría:
 * - updated_by_user_id: Quién editó por última vez
 *
 * Estados permitidos:
 * - activo: En operación
 * - suspendido: Temporalmente deshabilitado
 * - cerrado: Permanentemente inactivo (no reversible)
 */
export interface Cliente {
  cliente_id: string;       // UUID
  nombre: string;           // Ej: "Plaza Central Mall"
  rut: string;              // XX.XXX.XXX-X (UNIQUE)
  razon_social: string;     // Para facturas y documentos
  direccion_sede: string;   // Dirección principal
  telefono: string;         // Teléfono general
  email: string;            // Email de contacto
  sitio_web?: string;       // www.empresa.cl (opcional)
  moneda: 'CLP' | 'USD';   // Moneda para reportes
  logo_url?: string;        // URL blob PNG/SVG (opcional)
  estado: 'activo' | 'suspendido' | 'cerrado';
  created_at: Date;
  updated_at: Date;
  updated_by_user_id?: string;  // FK users (auditoría)
}

/**
 * Sucursal - Ubicación física del cliente
 *
 * Relación:
 * - 1 Cliente → N Sucursales
 *
 * Campos especiales:
 * - codigo: Usado para generar TAG de equipos
 * - codigo_num: Correlativo para folio INF (RN-ACT-06)
 *
 * Ejemplo:
 * - codigo: "21-STK" → sucursal 21 de Santiago
 * - codigo_num: 1 → primera sucursal
 */
export interface Sucursal {
  sucursal_id: string;      // UUID
  cliente_id: string;       // FK clientes
  nombre: string;           // Ej: "Santiago Centro"
  codigo: string;           // Ej: "21-STK" (UNIQUE per cliente)
  direccion: string;
  ciudad: string;
  region: string;
  telefono?: string;
  email?: string;
  latitud?: number;         // Geolocalización
  longitud?: number;        // Geolocalización
  codigo_num: number;       // 1, 2, 3... (UNIQUE per cliente)
  estado: 'activo' | 'cerrado';
  created_at: Date;
  updated_at: Date;
}

/**
 * CatalogAssetType - Catálogo de tipos de equipos
 *
 * Ejemplos:
 * - "Split"
 * - "Central/Ducted"
 * - "Chiller"
 * - "VRF"
 * - "Equipo de Precisión"
 *
 * Campos dinámicos:
 * - Cada tipo tiene campos específicos (JSON)
 * - Split: capacidad_btu, voltaje
 * - Chiller: capacidad_tr, bombas, circuitos
 * - VRF: ue_count, ue_details
 *
 * codigo_num: Usado para generar TAG
 * - Ej: codigo_num=1 → "AC" (Aire Acondicionado)
 */
export interface CatalogAssetType {
  tipo_de_equipo_id: string;        // UUID
  cliente_id: string;               // FK clientes
  nombre: string;                   // "Split", "Chiller", etc.
  descripcion?: string;             // Descripción detallada
  codigo_num: number;               // Para TAG: 1=AC, 2=CHI, etc.
  campos_dinamicos: Record<string, any>;  // JSON con estructura específica
  categoria: string;                // "HVAC", "Eléctrico", etc.
  es_predefinido: boolean;          // true=default sistema, false=custom cliente
  estado: 'activo' | 'archivado';
  created_at: Date;
  updated_at: Date;
}

/**
 * RefrigeranteCatalogo - Catálogo de 15 refrigerantes Chile
 *
 * Datos precargados en sistema:
 * R-22, R-410A, R-407C, R-407F, R-290 (Propano), R-600a, R-32, etc.
 *
 * Campos técnicos:
 * - presion_sat_psi: Presión de saturación @ 46°C
 * - temp_sat_celsius: Temperatura de saturación
 *
 * Peligro:
 * - bajo: R-410A, R-407C (seguros)
 * - medio: R-422D, R-421A
 * - alto: R-290 (inflamable), R-717 (tóxico)
 */
export interface RefrigeranteCatalogo {
  refrigerante_id: string;          // UUID
  nombre: string;                   // "R-410A" (UNIQUE)
  presion_sat_psi: number;          // Presión @ 46°C
  temp_sat_celsius: number;         // Temperatura @ 46°C
  peligro_nivel: 'bajo' | 'medio' | 'alto';
  disponible_chile: boolean;        // ¿Disponible en Chile?
  creado_en: Date;
}

/**
 * User - Usuario del sistema
 *
 * Roles permitidos:
 * - programador: Acceso total, crea roles
 * - administrador: Gestiona cliente, sucursales, usuarios
 * - supervisor: Supervisa técnicos, edita reportes
 * - tecnico: Crea OT, emite checklist
 * - cliente: Crea tickets, lee informes
 * - proveedor: Accede a tickets asignados
 *
 * Seguridad:
 * - jwt_token_hash: Hash del JWT actual (para revocación)
 * - pin_hash: PBKDF2 hash del PIN (solo offline)
 * - push_subscription: Objeto VAPID para notificaciones
 *
 * Estados:
 * - activo: Puede loguear
 * - inactivo: No puede loguear (temporal)
 * - bloqueado: Intentos fallidos de login
 */
export interface User {
  user_id: string;                  // UUID
  cliente_id?: string;              // FK clientes (NULL si Programador)
  email: string;                    // Único en sistema
  nombre: string;
  rol: 'programador' | 'administrador' | 'supervisor' | 'tecnico' | 'cliente' | 'proveedor';
  estado: 'activo' | 'inactivo' | 'bloqueado';
  jwt_token_hash?: string;          // Hash para revocación
  pin_hash?: string;                // PBKDF2 hash para offline
  push_subscription?: Record<string, any>;  // Suscripción VAPID JSON
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
}

// ============================================
// DATOS OPERACIONALES
// ============================================

/**
 * Equipo (Asset / Tag) - Equipos HVAC
 *
 * Identificación:
 * - tag: {sucursal_codigo}.{tipo_codigo}.{seq}
 *   Ej: 21-STK.AC.001
 *   - 21-STK: Sucursal 21 (Santiago)
 *   - AC: Aire Acondicionado
 *   - 001: Correlativo
 *
 * - serie: Número de serie del fabricante (único)
 *
 * Especificaciones técnicas:
 * - capacidad_valor: Número (12000, 5, 20, etc.)
 * - capacidad_unidad: Unidad (BTU, kW, TR)
 * - voltaje: "220V" | "380/400V 3x"
 * - corriente_nominal: Amperios
 *
 * Ciclo de vida:
 * - fecha_instalacion: Cuándo se instaló
 * - vida_util_anos: Años esperados (5-15 típicamente)
 * - frecuencia_mantenimiento: Mensual, trimestral, etc.
 * - estado: Operativo, En Observación, En Falla, Mantenimiento, Retirado
 * - criticidad: Redundante/Standby, No Crítico, Crítico
 *
 * Campos personalizables por cliente:
 * - costo_compra: Precio de compra
 * - proveedor: Quién vendió
 * - garantia_anos: Años de garantía
 * - responsable_interno: Persona de contacto cliente
 *
 * Campos dinámicos:
 * - variables_dinamicas: JSON con campos específicos por tipo_de_equipo_id
 *   Ej Split: { capacidad_btu: 12000, tipo_split: "mural" }
 *   Ej Chiller: { capacidad_tr: 5, bombas: [...], circuitos: [...] }
 *
 * Imagen placa:
 * - tiene_placa: boolean (si false, imagen_placa_url puede ser NULL)
 * - imagen_placa_url: URL blob PNG/JPG
 */
export interface Equipo {
  tag: string;                      // {sucursal_codigo}.{tipo_codigo}.{seq} (PK)
  cliente_id: string;               // FK clientes (tenancy)
  sucursal_id: string;              // FK sucursales
  tipo_de_equipo_id: string;        // FK catalog_asset_types

  // Identificación
  nombre: string;                   // "Aire Split 12000 BTU"
  marca?: string;                   // "ANWO"
  modelo?: string;                  // "GES12E"
  serie?: string;                   // "SN12345678" (UNIQUE)

  // Especificaciones técnicas
  refrigerante_id?: string;         // FK refrigerantes_catalogo
  capacidad_valor?: number;         // 12000 | 5 | 20
  capacidad_unidad: 'BTU' | 'kW' | 'TR';
  voltaje?: string;                 // "220V" | "380/400V 3x"
  corriente_nominal?: number;       // Amperios
  potencia_kw?: number;             // kW

  // Campos dinámicos (por tipo_de_equipo_id)
  variables_dinamicas: Record<string, any>;  // JSON {capacidad_btu, circuitos, ue_list, etc.}

  // Ciclo de vida
  fecha_instalacion?: Date;
  vida_util_anos?: number;          // Años esperados
  frecuencia_mantenimiento: 'unico' | 'mensual' | 'bimestral' | 'trimestral' | 'semestral' | 'anual';

  // Estado & Criticidad
  criticidad: 'redundante' | 'no_critico' | 'critico';
  estado: 'operativo' | 'en_observacion' | 'en_falla' | 'mantenimiento' | 'retirado';

  // Ubicación
  ubicacion?: string;               // "Oficina 3, segundo piso"
  area?: string;                    // "Administración"
  region?: string;                  // "Metropolitana"
  responsable_interno?: string;     // Nombre de contacto cliente

  // Personalizables por cliente
  costo_compra?: number;
  proveedor?: string;
  garantia_anos?: number;

  // Imagen placa
  imagen_placa_url?: string;        // Blob URL PNG/JPG
  tiene_placa: boolean;             // Si false, imagen_placa_url puede ser NULL

  // Auditoría
  created_at: Date;
  updated_at: Date;
  created_by_user_id?: string;      // FK users
}

/**
 * WorkOrder (Orden de Trabajo) - OT
 *
 * Relación:
 * - 1 WorkOrder → N WorkOrderAssets (equipos)
 * - 1 WorkOrderAsset → 1 FormInstance (informe)
 *
 * Identificación:
 * - folio: INF-{cod_sucursal}.{cod_tipo}-{tag_corr}-{seq}
 *   Ej: INF-21-STK.AC-001-000042
 * - folio_temporal: OT-{uuid-corto} (mientras offline)
 *
 * Tipos:
 * - preventivo: Mantenimiento planificado
 * - correctivo: Reparación por falla
 * - atencion_falla: Emergencia
 * - puesta_en_marcha: Instalación inicial
 * - inspeccion_tecnica: Revisión sin intervención
 * - instalacion_montaje: Instalación nueva
 * - predictivo: (sin funcionalidad v1, roadmap v2)
 *
 * Estados:
 * - abierto: Recién creada
 * - en_progreso: Técnico trabajando
 * - completado: Todos los form_instances completados + firmado
 * - cerrado: Supervisión finalizó
 *
 * Narrativos (se auto-pueblan vía binding):
 * - hallazgo: Lo que se encontró
 * - diagnostico: Causa raíz
 * - recomendaciones: Qué hacer
 * - conclusiones: Resumen final
 *
 * Consumo energético:
 * - consumo_kwh: kWh consumidos (auto-calculado o manual)
 * - consumo_editado_manually: Si user lo editó
 * - horas_operacion: Duración OT en horas
 */
export interface WorkOrder {
  work_order_id: string;            // UUID (PK)
  cliente_id: string;               // FK clientes
  sucursal_id: string;              // FK sucursales

  // Identificación
  folio?: string;                   // INF-21-STK.AC-001-000042 (asignado por servidor)
  folio_temporal?: string;          // OT-abc123def (offline)

  // Tipo & Estado
  tipo: 'preventivo' | 'correctivo' | 'atencion_falla' | 'puesta_en_marcha' | 'inspeccion_tecnica' | 'instalacion_montaje' | 'predictivo';
  estado: 'abierto' | 'en_progreso' | 'completado' | 'cerrado';

  // Contenido
  descripcion?: string;             // "Mantenimiento mensual"
  tecnico_asignado_user_id?: string;  // FK users
  supervisor_user_id?: string;      // FK users

  // Narrativos (auto-poblados vía binding)
  hallazgo?: string;
  diagnostico?: string;
  recomendaciones?: string;
  conclusiones?: string;

  // Consumo energético
  consumo_kwh?: number;
  consumo_editado_manually: boolean;
  horas_operacion?: number;

  // Control
  version: number;                  // Incrementa con cada edición
  created_at: Date;
  updated_at: Date;
  created_by_user_id?: string;      // FK users
  closed_at?: Date;
}

/**
 * WorkOrderAsset - Vinculación OT ↔ Equipos (relación N-N)
 *
 * Permite que 1 OT tenga N equipos
 *
 * Ejemplo:
 * - OT-001 para mantenimiento preventivo de sucursal
 *   - WOA: 21-STK.AC.001 (Split)
 *   - WOA: 21-STK.CHI.001 (Chiller)
 *   - WOA: 21-STK.VRF.001 (VRF)
 *
 * Estados por tag:
 * - pendiente: Sin empezar
 * - en_progreso: Técnico trabajando
 * - completado: form_instance lleno + firmado
 *
 * Regla crítica (RN-OT-10):
 * OT solo cierra cuando TODOS los WOA están en 'completado'
 */
export interface WorkOrderAsset {
  work_order_asset_id: string;      // UUID (PK)
  work_order_id: string;            // FK work_orders
  cliente_id: string;               // FK clientes (denormalizado para queries)
  tag: string;                      // FK equipos

  // Estado por tag
  estado: 'pendiente' | 'en_progreso' | 'completado';

  // Referencia a informe
  form_instance_id?: string;        // FK form_instances

  // Orden dentro de OT
  orden: number;

  created_at: Date;
  updated_at: Date;
}

/**
 * FormInstance - Instancia de formulario (informe)
 *
 * Relación:
 * - 1 WorkOrderAsset → 1 FormInstance
 *
 * Flujo:
 * 1. Técnico selecciona equipo (tag)
 * 2. Sistema carga form_template según tipo_de_equipo_id
 * 3. Técnico completa campos
 * 4. Técnico firma digitalmente (canvas → PNG)
 * 5. FormInstance.estado = 'firmado'
 * 6. Binding engine auto-puebla narrativos OT
 *
 * Datos:
 * - datos: JSON con respuestas a cada campo
 * - firma_digital: PNG data URL (canvas signature)
 *
 * Estados:
 * - borrador: Incompleto
 * - completado: Todos campos rellenados
 * - firmado: Firma digital presente
 */
export interface FormInstance {
  form_instance_id: string;         // UUID (PK)
  work_order_id: string;            // FK work_orders
  work_order_asset_id?: string;     // FK work_order_assets
  cliente_id: string;               // FK clientes
  tag?: string;                     // Referencia equipo

  // Template usado
  form_template_id?: string;        // FK form_templates (futuro)

  // Datos del formulario
  datos: Record<string, any>;       // JSON {campo1: valor1, campo2: valor2, ...}

  // Estado & Firma
  estado: 'borrador' | 'completado' | 'firmado';
  firma_digital?: string;           // PNG data URL
  fecha_firma?: Date;
  usuario_firma_user_id?: string;   // FK users

  // Auditoría
  created_at: Date;
  updated_at: Date;
}

/**
 * Ticket (Incidencia)
 *
 * Relación:
 * - N Tickets pueden estar asociados a 1 Equipo
 *
 * Estados (máquina de estados):
 * abierto → en_progreso → resuelto → cerrado
 *             ↓           ↑
 *          observado ────┘
 *
 * Regla crítica (RN-TICKET-01):
 * - En progreso → resuelto: Requiere evidencia (texto ≥20 chars O foto)
 * - En progreso → observado: Cliente devuelve
 * - Resuelto → observado: Cliente requiere ajustes
 * - Observado → resuelto: Admin/cliente acepta
 * - Observado → cerrado: Admin cierra definitivamente
 * - Resuelto → cerrado: Admin cierra
 *
 * Tipos:
 * - correctivo: Reparación
 * - preventivo: Mantenimiento
 * - consulta: Pregunta/asesoramiento
 *
 * Prioridad:
 * - baja: Sin urgencia
 * - media: Estándar
 * - alta: Pronto
 * - critica: Inmediato
 */
export interface Ticket {
  ticket_id: string;                // UUID (PK)
  cliente_id: string;               // FK clientes
  sucursal_id: string;              // FK sucursales

  // Identificación
  numero_correlativo: number;       // Secuencial por cliente (UNIQUE per cliente)
  titulo: string;                   // Mín 5 caracteres
  descripcion: string;              // Mín 10 caracteres

  // Clasificación
  tipo: 'correctivo' | 'preventivo' | 'consulta';
  prioridad: 'baja' | 'media' | 'alta' | 'critica';

  // Equipos asociados
  tag?: string;                     // FK equipos (opcional)

  // Asignación
  responsable_tecnico_user_id?: string;  // FK users
  proveedor_asignado_user_id?: string;   // FK users

  // Estado
  estado: 'abierto' | 'en_progreso' | 'observado' | 'resuelto' | 'cerrado';

  // Auditoría
  creador_user_id: string;          // FK users
  created_at: Date;
  updated_at: Date;
  closed_at?: Date;
}

/**
 * TicketComment - Historial de cambios + Evidencia
 *
 * Cada cambio de estado → nuevo comment
 *
 * Evidencia requerida (RN-TICKET-01):
 * - texto: Mín 20 caracteres (si presente)
 * - foto_url: Blob URL (si presente)
 * - Al menos uno requerido para transiciones "importantes"
 *
 * Ejemplo:
 * {
 *   estado_anterior: 'en_progreso',
 *   estado_nuevo: 'observado',
 *   texto: 'Cliente solicita aumentar capacidad BTU',
 *   foto_url: 'blob:...'
 * }
 */
export interface TicketComment {
  ticket_comment_id: string;        // UUID (PK)
  ticket_id: string;                // FK tickets

  // Cambio de estado
  estado_anterior?: 'abierto' | 'en_progreso' | 'observado' | 'resuelto' | 'cerrado';
  estado_nuevo?: 'abierto' | 'en_progreso' | 'observado' | 'resuelto' | 'cerrado';

  // Evidencia
  texto?: string;                   // Mín 20 caracteres si presente
  foto_url?: string;                // Blob URL PNG/JPG

  // Auditoría
  creador_user_id: string;          // FK users
  created_at: Date;
}

// ============================================
// SINCRONIZACIÓN
// ============================================

/**
 * SyncQueueItem - Cola de sincronización
 *
 * Flujo:
 * 1. Usuario offline crea/edita registro
 * 2. Sistema agrega a sync_queue (status='pending')
 * 3. Conexión se restaura
 * 4. SW detecta online → inicia sync
 * 5. Upload a servidor
 * 6. Si OK: status='synced'
 * 7. Si error: status='error', reintento exponencial
 *
 * Reintento:
 * - retry_count incrementa
 * - next_retry = NOW + 2^retry_count (1s, 2s, 4s, ..., max 5min)
 */
export interface SyncQueueItem {
  sync_queue_id: string;            // UUID (PK)
  tabla: string;                    // 'work_orders', 'form_instances', etc. (PK composite)
  record_id: string;                // UUID del registro (PK composite)
  data: Record<string, any>;        // Copia de datos a subir

  status: 'pending' | 'syncing' | 'synced' | 'error' | 'conflicted';

  retry_count: number;
  next_retry?: Date;
  last_error?: string;

  created_at: Date;
}

/**
 * AttachmentMetadata - Metadatos de fotos y firmas
 *
 * Almacenamiento:
 * - blob: Guardado en IndexedDB
 * - filename: Para referencia
 * - synced: Si fue enviado al servidor
 *
 * Tipos:
 * - foto: Imagen de equipo (JPEG comprimido)
 * - firma: Firma digital (PNG)
 *
 * Limpieza:
 * - Después de sincronizar, blob se puede descartar (URL blob:// expira)
 */
export interface AttachmentMetadata {
  attachment_id: string;            // UUID (PK)
  tabla: string;                    // 'work_orders', 'form_instances'
  record_id: string;
  tipo: 'foto' | 'firma';
  filename: string;                 // "wo-001_foto_1718198400.jpg"
  blob?: Blob;                      // Almacenado en IndexedDB
  tamaño_bytes: number;
  created_at: Date;
  synced: boolean;
}

/**
 * SyncHistory - Historial de sincronizaciones
 *
 * Para debugging y auditoría
 *
 * Ejemplo:
 * {
 *   status: 'success',
 *   items_uploaded: 42,
 *   items_downloaded: 15,
 *   timestamp: 2026-06-13T15:30:00Z
 * }
 */
export interface SyncHistory {
  sync_history_id: string;          // UUID (PK)
  status: 'success' | 'error' | 'partial';
  items_uploaded: number;
  items_downloaded: number;
  timestamp: Date;
  last_error?: string;
}

// ============================================
// CACHÉ & PREFERENCIAS
// ============================================

/**
 * KPICache - Caché materializada de indicadores
 *
 * Actualización:
 * - Nightly job (2 AM) calcula KPI
 * - Frontend Lee desde caché (instant)
 * - TTL: 24 horas
 *
 * Périodos soportados:
 * - "2026-06" (mes)
 * - "2026-Q2" (trimestre)
 * - "2026" (año)
 */
export interface KPICache {
  kpi_cache_id: string;             // UUID (PK)
  cliente_id: string;               // FK clientes (PK composite)
  periodo: string;                  // "2026-06" | "2026-Q2" | "2026" (PK composite)

  // Indicadores
  mtbf_horas?: number;
  mtbm_horas?: number;
  mtbr_horas?: number;
  disponibilidad_pct?: number;
  consumo_kwh_total?: number;

  // Control
  cached_at: Date;
  expires_at: Date;
}

/**
 * UserPreferences - Preferencias del usuario
 *
 * Almacenamiento local + sincronización
 *
 * Campos:
 * - theme: Tema actual
 * - menu_order: Orden de módulos (arrastra para reordenar)
 * - menu_position: Menú left o right
 * - push_enabled: Notificaciones habilitadas
 */
export interface UserPreferences {
  user_preferences_id: string;      // UUID (PK)
  user_id: string;                  // FK users

  // UI Preferences
  theme: 'light' | 'dark' | 'cyberpunk';
  language: 'es' | 'en';

  // Notifications
  push_enabled: boolean;
  email_alerts: boolean;

  // Menu
  menu_order: string[];             // Ej: ["dashboard", "ot", "equipos", "tickets"]
  menu_position: 'left' | 'right';

  // Extensible
  datos: Record<string, any>;       // Para futuros campos

  updated_at: Date;
}
