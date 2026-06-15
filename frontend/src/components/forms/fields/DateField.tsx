import type { FormTemplateField } from '@/db/types';

interface Props {
  field: FormTemplateField;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function DateField({ field, value, onChange, disabled }: Props) {
  return (
    <input
      type="date"
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      placeholder={field.placeholder}
      className={[
        'w-full px-3 py-2 rounded-lg text-sm',
        'bg-[var(--color-input)] border border-[var(--color-border)]',
        'text-[var(--color-fg)]',
        'focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'transition-colors',
        // Fix date input appearance in dark themes
        '[color-scheme:light] dark:[color-scheme:dark]',
      ].join(' ')}
    />
  );
}
