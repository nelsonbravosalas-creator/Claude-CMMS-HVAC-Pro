import type { FormTemplateField } from '@/db/types';
import { TextField } from './fields/TextField';
import { NumberField } from './fields/NumberField';
import { MedicionField } from './fields/MedicionField';
import { SelectField } from './fields/SelectField';
import { CheckboxField } from './fields/CheckboxField';
import { DateField } from './fields/DateField';
import { SignaturePad } from './fields/SignaturePad';
import { PhotoCapture } from './fields/PhotoCapture';

interface Props {
  field: FormTemplateField;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

export function FieldRenderer({ field, value, onChange, disabled }: Props) {
  const wrap = (children: React.ReactNode) => (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-1">
        <label className="text-sm font-medium text-[var(--color-fg)]">
          {field.nombre}
        </label>
        {field.requerido && (
          <span className="text-[10px] text-[var(--color-error)] font-mono">*</span>
        )}
      </div>
      {children}
    </div>
  );

  switch (field.tipo) {
    case 'text':
      return wrap(
        <TextField
          field={field}
          value={(value as string) ?? ''}
          onChange={v => onChange(v)}
          disabled={disabled}
        />
      );

    case 'number':
      return wrap(
        <NumberField
          field={field}
          value={value === '' || value === undefined || value === null ? '' : (value as number)}
          onChange={v => onChange(v)}
          disabled={disabled}
        />
      );

    case 'medicion':
      return wrap(
        <MedicionField
          field={field}
          value={value === '' || value === undefined || value === null ? '' : (value as number)}
          onChange={v => onChange(v)}
          disabled={disabled}
        />
      );

    case 'select':
      return wrap(
        <SelectField
          field={field}
          value={(value as string) ?? ''}
          onChange={v => onChange(v)}
          disabled={disabled}
        />
      );

    case 'checkbox':
      return wrap(
        <CheckboxField
          field={field}
          value={Boolean(value)}
          onChange={v => onChange(v)}
          disabled={disabled}
        />
      );

    case 'date':
      return wrap(
        <DateField
          field={field}
          value={(value as string) ?? ''}
          onChange={v => onChange(v)}
          disabled={disabled}
        />
      );

    case 'firma':
      return wrap(
        <SignaturePad
          value={(value as string) ?? ''}
          onChange={v => onChange(v)}
          disabled={disabled}
        />
      );

    case 'foto':
      return wrap(
        <PhotoCapture
          value={(value as string) ?? ''}
          onChange={v => onChange(v)}
          disabled={disabled}
        />
      );

    default:
      return null;
  }
}
