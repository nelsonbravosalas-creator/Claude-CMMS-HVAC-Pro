/**
 * Máquina de estados — Ticket (Incidencia).
 *
 * Flujo: abierto → en_progreso → resuelto → cerrado
 *                       ↓            ↑
 *                   observado ───────┘   (el cliente devuelve)
 *
 * Reglas (RN-TICKET-01):
 *  - Crear (→ abierto) y avanzar a `en_progreso`: cualquiera.
 *  - Transiciones "sensibles" exigen EVIDENCIA: texto ≥ 20 chars O foto.
 *  - El cliente puede devolver (→ observado) desde en_progreso o resuelto.
 *  - Cerrar lo permiten administrador, supervisor, técnico y cliente
 *    (reconciliado con permiso `ticket:cerrar`).
 */

import { createStateMachine, type Transition } from '../shared/stateMachine';
import { ok, err, type Result } from '../shared/result';
import type { Role } from '../permissions/permissions';

export type TicketState = 'abierto' | 'en_progreso' | 'observado' | 'resuelto' | 'cerrado';

/** Contexto: evidencia adjunta al cambio de estado. */
export interface TicketContext {
  evidencia?: { texto?: string; foto?: boolean };
}

const MIN_TEXTO = 20;

/** Guarda reutilizable: exige texto ≥ 20 chars O una foto. */
function requireEvidence(ctx: TicketContext): Result {
  const texto = ctx.evidencia?.texto?.trim() ?? '';
  const foto = ctx.evidencia?.foto ?? false;
  if (texto.length >= MIN_TEXTO || foto) return ok();
  return err(
    `Se requiere un comentario de al menos ${MIN_TEXTO} caracteres o una foto.`,
    'EVIDENCIA_REQUERIDA',
  );
}

const cerrarRoles = ['administrador', 'supervisor', 'tecnico', 'cliente'] as const;

const transitions: readonly Transition<TicketState, TicketContext>[] = [
  { from: 'abierto', to: 'en_progreso', roles: 'any' },

  { from: 'en_progreso', to: 'resuelto', roles: ['supervisor', 'cliente'], guard: requireEvidence },
  { from: 'en_progreso', to: 'observado', roles: ['cliente'], guard: requireEvidence },

  { from: 'resuelto', to: 'observado', roles: ['cliente'], guard: requireEvidence },
  { from: 'resuelto', to: 'cerrado', roles: cerrarRoles }, // evidencia opcional al cerrar conforme

  // El cliente devuelve → vuelve a manos del técnico/supervisor.
  { from: 'observado', to: 'en_progreso', roles: 'any' },
  { from: 'observado', to: 'resuelto', roles: ['administrador', 'cliente'], guard: requireEvidence },
  { from: 'observado', to: 'cerrado', roles: cerrarRoles, guard: requireEvidence },
];

export const ticketMachine = createStateMachine(transitions);

/**
 * Estados alcanzables desde `from` que `role` puede iniciar, ignorando el
 * guard de evidencia (esa validación ocurre al confirmar, con el texto/foto
 * que ingrese el usuario). Útil para pintar los botones de acción disponibles.
 */
export function transicionesDisponibles(from: TicketState, role: Role): TicketState[] {
  const evidenciaSatisfecha: TicketContext = { evidencia: { texto: 'x'.repeat(MIN_TEXTO) } };
  return ticketMachine.next(from).filter(
    to => ticketMachine.can(from, to, role, evidenciaSatisfecha).ok,
  );
}
