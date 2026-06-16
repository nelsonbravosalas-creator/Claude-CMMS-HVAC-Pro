import type { FormTemplateField } from '@/db/types';
import { detectarHallazgo } from '@/lib/forms/hallazgoDetector';

interface Props {
  field: FormTemplateField;
  value: number | '';
  onChange: (value: number | '') => void;
  disabled?: boolean;
}

export function MedicionField({ field, value, onChange, disabled }: Props) {
  const esHallazgo = value !== '' && detectarHallazgo(field, value);
  const hasRange   = field.rango_min !== undefined && field.rango_max !== undefined;

  // Calcula posición en barra de rango visual
  const pct = hasRange && value !== ''
    ? Math.max(0, Math.min(100,
        ((Number(value) - field.rango_min!) / (field.rango_max! - field.rango_min!)) * 100,
      ))
    : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={e => onChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
          min={field.rango_min}
          max={field.rango_max}
          placeholder="0.0"
          disabled={disabled}
          className={[
            'flex-1 px-3 py-2 rounded-lg text-sm font-mono border',
            'bg-[var(--color-input)] focus:outline-none focus:ring-1 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            esHallazgo
              ? 'border-[var(--color-error)] text-[var(--color-error)] focus:border-[var(--color-error)] focus:ring-[var(--color-error)]/30'
              : 'border-[var(--color-border)] text-[var(--color-fg)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/30',
          ].join(' ')}
        />
        {field.unidad && (
          <span className="text-sm font-mono font-bold text-[var(--color-fg-muted)] flex-shrink-0 w-12 text-center">
            {field.unidad}
          </span>
        )}
      </div>

      {/* Barra visual de rango */}
      {hasRange && (
        <div className="space-y-1">
          <div className="relative h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
            {/* Zona normal (verde) */}
            <div
              className="absolute inset-0 rounded-full"
              style={{ background: 'var(--color-success)', opacity: 0.2 }}
            />
            {/* Indicador de valor */}
            {pct !== null && (
              <div
                className="absolute top-0 h-full w-1.5 rounded-full -translate-x-1/2 transition-all"
                style={{
                  left:       `${pct}%`,
                  background: esHallazgo ? 'var(--color-error)' : 'var(--color-success)',
                }}
              />
            )}
          </div>
          <div className="flex justify-between text-[9px] font-mono text-[var(--color-fg-faint)]">
            <span>{field.rango_min} {field.unidad}</span>
            {esHallazgo && (
              <span className="text-[var(--color-error)] font-bold">⚠ FUERA DE RANGO</span>
            )}
            <span>{field.rango_max} {field.unidad}</span>
          </div>
        </div>
      )}
    </div>
  );
}
