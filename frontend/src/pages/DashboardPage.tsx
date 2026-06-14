/**
 * DashboardPage — placeholder Sprint 1
 * Se reemplaza con KPIs reales en Sprint 6.
 */

import { useAuth } from '@/context/AuthContext';

const ROL_LABEL: Record<string, string> = {
  programador: 'Programador',
  administrador: 'Administrador',
  supervisor: 'Supervisor',
  tecnico: 'Técnico',
  cliente: 'Cliente',
  proveedor: 'Proveedor',
};

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-faint)] mb-1">
          {ROL_LABEL[user?.rol ?? ''] ?? ''}
        </p>
        <h1 className="text-2xl font-bold text-[var(--color-fg)] tracking-wide">
          Bienvenido, {user?.nombre ?? 'Usuario'}
        </h1>
        <p className="text-sm text-[var(--color-fg-muted)] mt-1">
          {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPI cards — placeholder */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'OT Activas', value: '—', icon: '◈', color: 'var(--color-primary)' },
          { label: 'MP Pendientes', value: '—', icon: '◷', color: 'var(--color-warning)' },
          { label: 'Tickets Abiertos', value: '—', icon: '◉', color: 'var(--color-info)' },
          { label: 'Disponibilidad', value: '—', icon: '⬡', color: 'var(--color-success)' },
        ].map(({ label, value, icon, color }) => (
          <div
            key={label}
            className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-faint)]">
                {label}
              </span>
              <span style={{ color }} className="text-base">
                {icon}
              </span>
            </div>
            <div className="text-2xl font-bold" style={{ color }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Estado del sistema */}
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse" />
          <span className="font-mono text-xs text-[var(--color-fg-muted)] uppercase tracking-widest">
            Sistema operativo
          </span>
        </div>
        <p className="text-sm text-[var(--color-fg-muted)]">
          El dashboard con KPIs en tiempo real, MTBF, MTBM y gráficos de tendencia estará disponible en el Sprint 6.
          Por ahora, accede a los módulos desde el menú lateral.
        </p>
      </div>
    </div>
  );
}
