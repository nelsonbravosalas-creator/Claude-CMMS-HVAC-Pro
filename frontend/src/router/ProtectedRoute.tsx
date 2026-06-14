/**
 * ProtectedRoute — redirige a /login si no hay sesión.
 * Opcionalmente filtra por roles permitidos (redirige a /app/dashboard si el rol no aplica).
 */

import { Navigate, useLocation } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import type { User } from '@/db/types';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Si se define, solo estos roles pueden acceder. */
  roles?: User['rol'][];
}

export function ProtectedRoute({ children, roles }: Props) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--color-base)]">
        <span className="font-mono text-xs text-[var(--color-fg-faint)] animate-pulse tracking-widest uppercase">
          Verificando sesión…
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && user && !roles.includes(user.rol)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return <>{children}</>;
}
