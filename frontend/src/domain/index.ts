/**
 * Capa de Dominio — Reglas de negocio puras del CMMS HVAC PRO.
 *
 * Sin React, sin Dexie, sin red. Solo lógica testeable y reusable.
 * Punto de entrada único: `import { ... } from '@/domain'`.
 */

export * from './shared/result';
export * from './shared/stateMachine';
export * from './permissions/permissions';
export * from './workOrders/workOrder.machine';
export * from './tickets/ticket.machine';
