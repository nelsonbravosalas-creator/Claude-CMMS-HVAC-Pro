import type { FormTemplateField } from '@/db/types';

interface Props {
  field: FormTemplateField;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TextField({ field, value, onChange, disabled }: Props) {
  return (
    <textarea
      rows={2}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={field.placeholder ?? `Ingrese ${field.nombre.toLowerCase()}...`}
      disabled={disabled}
      className={[
        'w-full px-3 py-2 rounded-lg text-sm resize-none',
        'bg-[var(--color-input)] border border-[var(--color-border)]',
        'text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)]',
        'focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'transition-colors',
      ].join(' ')}
    />
  );
}
