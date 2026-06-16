import type { FormTemplateField } from '@/db/types';
import { detectarHallazgo } from '@/lib/forms/hallazgoDetector';

interface Props {
  field: FormTemplateField;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function SelectField({ field, value, onChange, disabled }: Props) {
  const esHallazgo = !!value && detectarHallazgo(field, value);

  return (
    <div className="space-y-1">
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={[
          'w-full px-3 py-2 rounded-lg text-sm border appearance-none',
          'bg-[var(--color-input)] focus:outline-none focus:ring-1 transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          esHallazgo
            ? 'border-[var(--color-error)] text-[var(--color-error)] focus:border-[var(--color-error)] focus:ring-[var(--color-error)]/30'
            : 'border-[var(--color-border)] text-[var(--color-fg)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/30',
        ].join(' ')}
      >
        <option value="">— Seleccione —</option>
        {field.opciones?.map(opcion => (
          <option key={opcion} value={opcion}>
            {opcion.charAt(0).toUpperCase() + opcion.slice(1).replace(/_/g, ' ')}
          </option>
        ))}
      </select>
      {esHallazgo && (
        <p className="text-[10px] font-mono text-[var(--color-error)]">⚠ Valor indica hallazgo</p>
      )}
    </div>
  );
}
