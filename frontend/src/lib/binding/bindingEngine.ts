import type { FormTemplate, WorkOrder } from '@/db/types';
import { detectarHallazgo } from '@/lib/forms/hallazgoDetector';

type NarrativoKey = 'hallazgo' | 'diagnostico' | 'recomendaciones' | 'conclusiones';

/**
 * Aplica el binding de las respuestas de un checklist hacia los narrativos de la OT.
 * Retorna las actualizaciones parciales a aplicar sobre la OT (RN-FORM-05).
 *
 * Modos:
 * - set:    sobreescribe el campo narrativo con el texto compuesto
 * - append: agrega al narrativo una nueva línea "- texto"
 * - lista:  agrega al narrativo una nueva línea "• texto"
 */
export function aplicarBinding(
  template: FormTemplate,
  respuestas: Record<string, unknown>,
  otActual: Partial<WorkOrder>,
): Partial<WorkOrder> {
  const updates: Partial<WorkOrder> = {};

  // Acumular actualizaciones agrupadas por target
  const acumulados: Record<NarrativoKey, string[]> = {
    hallazgo:         [],
    diagnostico:      [],
    recomendaciones:  [],
    conclusiones:     [],
  };

  const camposOrdenados = [...template.campos].sort((a, b) => a.orden - b.orden);

  for (const campo of camposOrdenados) {
    if (!campo.binding) continue;

    const valor = respuestas[campo.id];
    if (valor === undefined || valor === null || valor === '') continue;

    const { target, mode, prefix = '', suffix = '', solo_si_hallazgo } = campo.binding;

    if (solo_si_hallazgo && !detectarHallazgo(campo, valor)) continue;

    const texto = `${prefix}${String(valor)}${suffix}`.trim();
    if (!texto) continue;

    if (mode === 'set') {
      // set sobreescribe directo — acumulamos el último
      acumulados[target] = [texto];
    } else {
      acumulados[target].push(texto);
    }
  }

  // Componer actualizaciones con los valores actuales de la OT
  for (const [target, lineas] of Object.entries(acumulados) as [NarrativoKey, string[]][]) {
    if (lineas.length === 0) continue;

    const camposDelTarget = camposOrdenados.filter(c => c.binding?.target === target);
    const modoDelTarget   = camposDelTarget[0]?.binding?.mode ?? 'append';
    const actual          = (otActual[target] as string | undefined) ?? '';

    if (modoDelTarget === 'set') {
      updates[target] = lineas[lineas.length - 1];
    } else if (modoDelTarget === 'lista') {
      const nuevas = lineas.map(l => `• ${l}`).join('\n');
      updates[target] = actual ? `${actual}\n${nuevas}` : nuevas;
    } else {
      const nuevas = lineas.map(l => `- ${l}`).join('\n');
      updates[target] = actual ? `${actual}\n${nuevas}` : nuevas;
    }
  }

  return updates;
}
