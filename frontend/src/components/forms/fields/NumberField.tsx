import type { FormTemplateField } from '@/db/types';
import { detectarHallazgo } from '@/lib/forms/hallazgoDetector';

interface Props {
  field: FormTemplateField;
  value: number | '';
  onChange: (value: number | '') => void;
  disabled?: boolean;
}

export function NumberField({ field, value, onChange, disabled }: Props) {
  const esHallazgo = value !== '' && detectarHallazgo(field, value);

  const inputClass = [
    'w-full px-3 py-2 rounded-lg text-sm font-mono',
    'bg-[var(--color-input)] border',
    'focus:outline-none focus:ring-1 transition-colors',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    esHallazgo
      ? 'border-[var(--color-error)] text-[var(--color-error)] focus:border-[var(--color-error)] focus:ring-[var(--color-error)]/30'
      : 'border-[var(--color-border)] text-[var(--color-fg)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/30',
  ].join(' ');

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={e => onChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
          min={field.rango_min}
          max={field.rango_max}
          placeholder={field.placeholder ?? '0'}
          disabled={disabled}
          className={inputClass}
        />
        {field.unidad && (
          <span className="text-xs font-mono text-[var(--color-fg-muted)] flex-shrink-0">
            {field.unidad}
          </span>
        )}
      </div>
      {/* Indicador de rango */}
      {(field.rango_min !== undefined || field.rango_max !== undefined) && (
        <p className={[
          'text-[10px] font-mono',
          esHallazgo ? 'text-[var(--color-error)]' : 'text-[var(--color-fg-faint)]',
        ].join(' ')}>
          {esHallazgo ? '⚠ Fuera de rango' : ''}
          {!esHallazgo && `Rango: ${field.rango_min ?? '—'} — ${field.rango_max ?? '—'} ${field.unidad ?? ''}`}
        </p>
      )}
    </div>
  );
}
