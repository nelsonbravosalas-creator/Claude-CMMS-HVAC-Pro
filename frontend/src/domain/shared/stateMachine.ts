/**
 * Máquina de estados genérica.
 *
 * Modela un flujo de negocio como un conjunto explícito de transiciones.
 * Reutilizada por Órdenes de Trabajo y Tickets (DRY / modular).
 *
 * Cada transición declara:
 *  - from / to     : estados origen y destino
 *  - roles         : quién puede ejecutarla (o 'any')
 *  - guard?        : validación extra dependiente del contexto (ej: evidencia, assets completos)
 *
 * Una transición no declarada = inválida por defecto (seguridad por diseño).
 */

import { ok, err, type Result } from './result';
import type { Role } from '../permissions/permissions';

export interface Transition<S extends string, Ctx> {
  from: S;
  to: S;
  roles: readonly Role[] | 'any';
  /** Validación adicional. Devuelve ok() o err(motivo). */
  guard?: (ctx: Ctx) => Result;
}

export interface StateMachine<S extends string, Ctx> {
  /** ¿Es válida la transición `from → to` para `role` en este `ctx`? */
  can(from: S, to: S, role: Role, ctx: Ctx): Result;
  /** Estados alcanzables desde `from` (para pintar botones disponibles). */
  next(from: S): S[];
  /** ¿`state` es terminal (sin salidas)? */
  isTerminal(state: S): boolean;
}

export function createStateMachine<S extends string, Ctx = void>(
  transitions: readonly Transition<S, Ctx>[],
): StateMachine<S, Ctx> {
  return {
    can(from, to, role, ctx) {
      const t = transitions.find((x) => x.from === from && x.to === to);
      if (!t) return err(`Transición inválida: ${from} → ${to}`, 'INVALID_TRANSITION');
      if (t.roles !== 'any' && !t.roles.includes(role)) {
        return err(`El rol "${role}" no puede ${from} → ${to}`, 'FORBIDDEN_ROLE');
      }
      return t.guard ? t.guard(ctx) : ok();
    },
    next(from) {
      return transitions.filter((t) => t.from === from).map((t) => t.to);
    },
    isTerminal(state) {
      return !transitions.some((t) => t.from === state);
    },
  };
}
