/**
 * Máquina de estados — Orden de Trabajo (OT).
 *
 * Flujo: abierto → en_progreso → completado → cerrado
 *
 * Regla crítica (RN-OT-10/11):
 *  - OT pasa a `completado` SOLO si TODOS sus equipos (work_order_assets)
 *    están completados Y todos los informes están firmados.
 *  - El folio definitivo lo asigna el backend; offline usa folio temporal.
 */

import { createStateMachine, type Transition } from '../shared/stateMachine';
import { ok, err } from '../shared/result';

export type WorkOrderState = 'abierto' | 'en_progreso' | 'completado' | 'cerrado';

/** Contexto necesario para validar las guardas de la OT. */
export interface WorkOrderContext {
  totalAssets: number;
  completedAssets: number;
  allSigned: boolean;
}

const transitions: readonly Transition<WorkOrderState, WorkOrderContext>[] = [
  {
    from: 'abierto',
    to: 'en_progreso',
    roles: ['administrador', 'supervisor'], // asignan técnico e inician
  },
  {
    from: 'en_progreso',
    to: 'completado',
    roles: ['administrador', 'supervisor', 'tecnico'],
    guard: (ctx) => {
      if (ctx.totalAssets === 0) return err('La OT no tiene equipos asignados.', 'OT_SIN_ASSETS');
      if (ctx.completedAssets < ctx.totalAssets) {
        const faltan = ctx.totalAssets - ctx.completedAssets;
        return err(`Faltan ${faltan} equipo(s) por completar.`, 'OT_ASSETS_PENDIENTES');
      }
      if (!ctx.allSigned) return err('Hay informes sin firmar.', 'OT_INFORMES_SIN_FIRMAR');
      return ok();
    },
  },
  {
    from: 'completado',
    to: 'cerrado',
    roles: ['administrador', 'supervisor'], // validación final
  },
];

export const workOrderMachine = createStateMachine(transitions);
