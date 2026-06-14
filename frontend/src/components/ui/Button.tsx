/**
 * Button — componente CANÓNICO del design system.
 *
 * Este archivo fija el patrón que TODOS los demás componentes del sistema
 * deben seguir: variantes por mapa de tokens, tamaños mobile-first con
 * targets táctiles ≥ 44px, estado de carga, foco accesible, forwardRef.
 *
 * Mobile-first: el tamaño por defecto ('md') mide h-11 (44px) — apto para
 * dedo en terreno. 'lg' (56px) para acciones primarias en pantallas táctiles.
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Ocupa todo el ancho del contenedor (común en formularios mobile). */
  fullWidth?: boolean;
  /** Muestra spinner y deshabilita la interacción. */
  loading?: boolean;
  /** Icono a la izquierda del texto. */
  leftIcon?: ReactNode;
  /** Icono a la derecha del texto. */
  rightIcon?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-fg hover:bg-primary-hover shadow-[var(--shadow-glow)] focus-visible:ring-primary',
  secondary:
    'bg-card text-fg border border-[var(--color-border-strong)] hover:bg-surface focus-visible:ring-primary',
  ghost:
    'bg-transparent text-fg-muted hover:bg-card hover:text-fg focus-visible:ring-primary',
  danger:
    'bg-danger text-danger-fg hover:brightness-110 focus-visible:ring-danger',
  success:
    'bg-success text-success-fg hover:brightness-110 focus-visible:ring-success',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',       // 44px — target táctil mínimo
  lg: 'h-14 px-6 text-base gap-2.5',   // 56px — acción primaria mobile
  icon: 'h-11 w-11',                   // botón cuadrado de icono
};

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', fullWidth, loading, leftIcon, rightIcon, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        // base
        'inline-flex items-center justify-center select-none font-medium rounded-[var(--radius-lg)]',
        'transition-[background-color,box-shadow,filter] duration-150 outline-none',
        'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-base)]',
        'active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? <Spinner /> : leftIcon}
      {size !== 'icon' && children}
      {!loading && rightIcon}
    </button>
  );
});
