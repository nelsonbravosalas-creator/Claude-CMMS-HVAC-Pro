/**
 * RBAC — Control de acceso basado en roles.
 *
 * La matriz de permisos vive como CÓDIGO TIPADO, no como prosa.
 * Fuente única de verdad para frontend (ocultar UI) y, a futuro, backend.
 *
 * Regla base: `programador` puede TODO (corto-circuito).
 * El resto se define explícitamente por permiso.
 *
 * Permisos como `recurso:accion` para que el set sea exhaustivo y autocompletable.
 */

export type Role =
  | 'programador'
  | 'administrador'
  | 'supervisor'
  | 'tecnico'
  | 'cliente'
  | 'proveedor';

export const ROLES: readonly Role[] = [
  'programador',
  'administrador',
  'supervisor',
  'tecnico',
  'cliente',
  'proveedor',
] as const;

export type Permission =
  // Administración
  | 'cliente:crear'
  | 'cliente:editar'
  | 'sucursal:crear'
  | 'sucursal:editar'
  // Usuarios & auditoría
  | 'usuario:crear'
  | 'usuario:editar_otros'
  | 'logs:ver'
  // Equipos
  | 'equipo:crear'
  | 'equipo:editar'
  | 'equipo:retirar'
  | 'equipo:ver_hoja_vida'
  // Órdenes de trabajo
  | 'ot:crear'
  | 'ot:emitir_checklist'
  | 'ot:firmar_informe'
  | 'ot:editar_informe'
  | 'ot:cerrar'
  // Tickets
  | 'ticket:crear'
  | 'ticket:cerrar'
  | 'ticket:asignar_responsable'
  | 'ticket:asignar_proveedor'
  // Mantenimiento preventivo
  | 'mp:crear'
  | 'mp:planificar'
  // Mi compañía
  | 'compania:editar_datos'
  // Reportes & sync
  | 'reporte:exportar_json'
  | 'sync:resolver_conflictos';

/**
 * Matriz: permiso → roles que lo tienen.
 * `programador` se OMITE a propósito (lo cubre el corto-circuito en `can`).
 * Derivada de FASE_1_ARQUITECTURA_Y_DISEÑO.md § 1.1.
 */
const MATRIX: Record<Permission, readonly Role[]> = {
  'cliente:crear': ['administrador'],
  'cliente:editar': ['administrador'],
  'sucursal:crear': ['administrador'],
  'sucursal:editar': ['administrador'],

  'usuario:crear': ['administrador', 'supervisor'],
  'usuario:editar_otros': ['administrador', 'supervisor'],
  'logs:ver': ['administrador'],

  'equipo:crear': ['administrador', 'supervisor', 'tecnico'],
  'equipo:editar': ['administrador', 'supervisor', 'tecnico'],
  'equipo:retirar': ['administrador', 'supervisor'],
  'equipo:ver_hoja_vida': ['administrador', 'supervisor', 'tecnico', 'cliente', 'proveedor'],

  'ot:crear': ['administrador', 'supervisor', 'tecnico', 'cliente'],
  'ot:emitir_checklist': ['administrador', 'supervisor', 'tecnico'],
  'ot:firmar_informe': ['administrador', 'supervisor', 'tecnico'],
  'ot:editar_informe': ['administrador', 'supervisor'],
  'ot:cerrar': ['administrador', 'supervisor'],

  'ticket:crear': ['administrador', 'supervisor', 'cliente'],
  'ticket:cerrar': ['administrador', 'supervisor', 'tecnico', 'cliente'],
  'ticket:asignar_responsable': ['administrador', 'supervisor', 'cliente'],
  'ticket:asignar_proveedor': ['administrador', 'supervisor', 'cliente'],

  'mp:crear': ['administrador', 'supervisor', 'cliente'],
  'mp:planificar': ['administrador', 'supervisor'],

  'compania:editar_datos': ['administrador'],

  'reporte:exportar_json': [], // SOLO programador (vía corto-circuito)
  'sync:resolver_conflictos': ['administrador'],
};

/**
 * ¿Puede `role` ejecutar `permission`?
 * `programador` siempre puede.
 */
export function can(role: Role, permission: Permission): boolean {
  if (role === 'programador') return true;
  return MATRIX[permission].includes(role);
}

/** Lista de permisos que tiene un rol (útil para precomputar UI). */
export function permissionsOf(role: Role): Permission[] {
  return (Object.keys(MATRIX) as Permission[]).filter((p) => can(role, p));
}
