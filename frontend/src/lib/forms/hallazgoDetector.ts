import type { FormTemplateField } from '@/db/types';

/**
 * Detecta si el valor de un campo constituye un hallazgo (RN-FORM-06).
 *
 * Lógica:
 * - number/medicion: hallazgo si valor está fuera de rango_min/rango_max
 * - select/checkbox: hallazgo si el valor aparece en es_hallazgo_si[]
 * - text/date/firma/foto: no generan hallazgos automáticos
 */
export function detectarHallazgo(
  field: FormTemplateField,
  value: unknown,
): boolean {
  if (value === undefined || value === null || value === '') return false;

  if (field.tipo === 'number' || field.tipo === 'medicion') {
    const num = typeof value === 'string' ? parseFloat(value) : (value as number);
    if (isNaN(num)) return false;
    if (field.rango_min !== undefined && num < field.rango_min) return true;
    if (field.rango_max !== undefined && num > field.rango_max) return true;
    return false;
  }

  if (field.es_hallazgo_si && field.es_hallazgo_si.length > 0) {
    return field.es_hallazgo_si.includes(value as string | number | boolean);
  }

  return false;
}

/** Cuenta cuántos campos tienen hallazgo en un conjunto de respuestas */
export function contarHallazgos(
  campos: FormTemplateField[],
  respuestas: Record<string, unknown>,
): number {
  return campos.reduce((count, campo) => {
    return count + (detectarHallazgo(campo, respuestas[campo.id]) ? 1 : 0);
  }, 0);
}

/** Calcula el score (% de campos requeridos completos) */
export function calcularScore(
  campos: FormTemplateField[],
  respuestas: Record<string, unknown>,
): number {
  const requeridos = campos.filter(c => c.requerido && c.tipo !== 'firma' && c.tipo !== 'foto');
  if (requeridos.length === 0) return 100;
  const completados = requeridos.filter(c => {
    const v = respuestas[c.id];
    return v !== undefined && v !== null && v !== '';
  });
  return Math.round((completados.length / requeridos.length) * 100);
}

/** Verifica si todos los campos requeridos están completos */
export function todosRequeridosCompletos(
  campos: FormTemplateField[],
  respuestas: Record<string, unknown>,
  firmaDigital?: string | null,
): boolean {
  return campos.every(campo => {
    if (!campo.requerido) return true;
    if (campo.tipo === 'firma') return !!firmaDigital;
    const v = respuestas[campo.id];
    return v !== undefined && v !== null && v !== '';
  });
}
