/**
 * Result<T> — Resultado explícito de una operación de negocio.
 *
 * En vez de lanzar excepciones para reglas de negocio (que son flujos
 * esperados, no errores de programa), devolvemos un valor explícito.
 * Esto hace los flujos auto-documentados y fáciles de testear.
 *
 * Uso:
 *   const r = ot.can('abierto', 'cerrado', 'tecnico', ctx);
 *   if (!r.ok) mostrarError(r.error);
 */

export type Result<T = void> =
  | { ok: true; value: T }
  | { ok: false; error: string; code?: string };

/** Éxito. Para flujos sin valor, llamar `ok()` sin argumentos. */
export function ok<T = void>(value?: T): Result<T> {
  return { ok: true, value: value as T };
}

/** Falla de regla de negocio, con mensaje legible y código opcional para i18n/telemetría. */
export function err(error: string, code?: string): Result<never> {
  return { ok: false, error, code };
}
