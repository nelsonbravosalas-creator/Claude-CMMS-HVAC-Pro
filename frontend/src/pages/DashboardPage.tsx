import { useAuth } from '@/context/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import { useSyncEngine } from '@/hooks/useSyncEngine';
import { SyncStatusBadge } from '@/components/shared/SyncStatusBadge';
import { Link } from 'react-router';

const ROL_LABEL: Record<string, string> = {
  programador: 'Programador',
  administrador: 'Administrador',
  supervisor: 'Supervisor',
  tecnico: 'Técnico',
  cliente: 'Cliente',
  proveedor: 'Proveedor',
};

const TIPO_LABEL: Record<string, string> = {
  preventivo: 'Preventivo',
  correctivo: 'Correctivo',
  atencion_falla: 'Atención Falla',
  puesta_en_marcha: 'Puesta en Marcha',
  inspeccion_tecnica: 'Inspección',
  instalacion_montaje: 'Instalación',
  predictivo: 'Predictivo',
};

const ESTADO_COLOR: Record<string, string> = {
  abierto: 'var(--color-info)',
  en_progreso: 'var(--color-warning)',
  completado: 'var(--color-success)',
  cerrado: 'var(--color-fg-faint)',
};

export function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, isOffline } = useDashboard();
  const { status: syncStatus, pending: pendingSync } = useSyncEngine();

  const kpis = data?.kpis;
  const urgentes = data?.urgentes ?? [];

  const kpiCards = [
    {
      label: 'OT Abiertas',
      value: kpis ? String(kpis.abiertas) : '—',
      icon: '◈',
      color: 'var(--color-info)',
    },
    {
      label: 'En Progreso',
      value: kpis ? String(kpis.en_progreso) : '—',
      icon: '◷',
      color: 'var(--color-warning)',
    },
    {
      label: 'Completadas Hoy',
      value: kpis ? String(kpis.completadas_hoy) : '—',
      icon: '✓',
      color: 'var(--color-success)',
    },
    {
      label: 'Total Pendiente',
      value: kpis ? String(kpis.pendientes_total) : '—',
      icon: '⬡',
      color: 'var(--color-primary)',
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-faint)] mb-1">
            {ROL_LABEL[user?.rol ?? ''] ?? ''}
          </p>
          <h1 className="text-2xl font-bold text-[var(--color-fg)] tracking-wide">
            Bienvenido, {user?.nombre ?? 'Usuario'}
          </h1>
          <p className="text-sm text-[var(--color-fg-muted)] mt-1">
            {new Date().toLocaleDateString('es-CL', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isOffline && (
            <span className="font-mono text-[10px] text-[var(--color-fg-faint)] uppercase tracking-widest">
              offline
            </span>
          )}
          <SyncStatusBadge syncStatus={syncStatus} pendingCount={pendingSync} />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiCards.map(({ label, value, icon, color }) => (
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
            <div
              className={`text-2xl font-bold transition-opacity ${isLoading ? 'opacity-30' : ''}`}
              style={{ color }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* OTs activas */}
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
          <span className="font-mono text-xs uppercase tracking-widest text-[var(--color-fg-muted)]">
            OTs Activas
          </span>
          <Link
            to="/app/ot"
            className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-primary)] hover:underline"
          >
            Ver todas →
          </Link>
        </div>

        {isLoading && !urgentes.length ? (
          <div className="p-8 text-center text-[var(--color-fg-faint)] text-sm">
            Cargando…
          </div>
        ) : urgentes.length === 0 ? (
          <div className="p-8 text-center text-[var(--color-fg-faint)] text-sm">
            No hay OTs activas
          </div>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {urgentes.map(ot => {
              const pct = ot.total_assets > 0
                ? Math.round((ot.completados / ot.total_assets) * 100)
                : 0;
              return (
                <li key={ot.work_order_id}>
                  <Link
                    to={`/app/ot/${ot.work_order_id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-[var(--color-surface-raised)] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className="font-mono text-[10px] uppercase tracking-widest"
                          style={{ color: ESTADO_COLOR[ot.estado] ?? 'var(--color-fg-muted)' }}
                        >
                          {ot.estado.replace('_', ' ')}
                        </span>
                        <span className="text-[var(--color-fg-faint)] text-[10px]">·</span>
                        <span className="font-mono text-[10px] text-[var(--color-fg-faint)] uppercase">
                          {TIPO_LABEL[ot.tipo] ?? ot.tipo}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--color-fg)] truncate">
                        {ot.descripcion ?? 'Sin descripción'}
                      </p>
                      <p className="text-xs text-[var(--color-fg-muted)] mt-0.5">
                        {ot.sucursal_nombre ?? '—'}
                        {ot.tecnico_nombre ? ` · ${ot.tecnico_nombre}` : ''}
                      </p>
                    </div>
                    {ot.total_assets > 0 && (
                      <div className="ml-4 text-right shrink-0">
                        <span className="font-mono text-xs text-[var(--color-fg-muted)]">
                          {pct}%
                        </span>
                        <div className="w-16 h-1 bg-[var(--color-border)] rounded-full mt-1">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: 'var(--color-primary)',
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
