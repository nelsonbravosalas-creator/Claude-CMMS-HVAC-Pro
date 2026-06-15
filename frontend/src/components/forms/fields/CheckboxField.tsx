import type { FormTemplateField } from '@/db/types';
import { detectarHallazgo } from '@/lib/forms/hallazgoDetector';

interface Props {
  field: FormTemplateField;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export function CheckboxField({ field, value, onChange, disabled }: Props) {
  const esHallazgo = detectarHallazgo(field, value);

  return (
    <div className="flex items-center gap-3">
      <div
        onClick={() => !disabled && onChange(!value)}
        className={[
          'w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0',
          'transition-all cursor-pointer',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          value
            ? esHallazgo
              ? 'bg-[var(--color-error)] border-[var(--color-error)]'
              : 'bg-[var(--color-primary)] border-[var(--color-primary)]'
            : esHallazgo
              ? 'border-[var(--color-error)]'
              : 'border-[var(--color-border)] hover:border-[var(--color-primary)]',
        ].join(' ')}
      >
        {value && (
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className={[
        'text-sm select-none',
        esHallazgo ? 'text-[var(--color-error)]' : 'text-[var(--color-fg)]',
      ].join(' ')}>
        {value ? 'Sí' : 'No'}
        {esHallazgo && <span className="ml-2 text-[10px] font-mono">⚠ hallazgo</span>}
      </span>
    </div>
  );
}
