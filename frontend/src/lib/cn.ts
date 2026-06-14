import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * cn — combina clases condicionales (clsx) y resuelve conflictos de
 * utilidades Tailwind (tailwind-merge). Estándar del design system.
 *
 *   cn('px-4 py-2', isActive && 'bg-primary', className)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
