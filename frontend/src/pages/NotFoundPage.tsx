/**
 * NotFoundPage — 404
 */

import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div className="min-h-dvh bg-[var(--color-base)] flex flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="font-mono text-[80px] font-bold text-[var(--color-border-strong)] leading-none">
        404
      </div>
      <h1 className="text-xl font-bold text-[var(--color-fg)]">Página no encontrada</h1>
      <p className="text-sm text-[var(--color-fg-muted)] max-w-xs">
        La ruta que buscas no existe o no tienes permisos para acceder.
      </p>
      <Link
        to="/app/dashboard"
        className="px-6 py-2.5 rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-fg)] font-bold text-sm tracking-widest uppercase hover:opacity-90 transition-opacity"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
