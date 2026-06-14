/**
 * OTListPage — Lista de Órdenes de Trabajo del técnico/supervisor
 *
 * Sprint 1: estructura y layout
 * Sprint 2: conectar con TanStack Query + Dexie
 */

import { useAuth } from '@/context/AuthContext';

const ESTADO_COLOR: Record<string, string> = {
  abierto: 'var(--color-info)',
  en_progreso: 'var(--color-warning)',
  completado: 'var(--color-success)',
  cerrado: 'var(--color-fg-faint)',
};

const ESTADO_LABEL: Record<string, string> = {
  abierto: 'Abierto',
  en_progreso: 'En progreso',
  completado: 'Completado',
  cerrado: 'Cerrado',
};

// Datos de demostración (se reemplaza en Sprint 2 con TanStack Query)
const MOCK_OT = [
  { id: 'OT-2026-000001', tipo: 'preventivo', estado: 'en_progreso', descripcion: 'Mantenimiento mensual UPS sala servidores', tags: 3, completados: 1, fecha: '2026-06-14' },
  { id: 'OT-2026-000002', tipo: 'correctivo', estado: 'abierto', descripcion: 'Falla compresor split oficina gerencia', tags: 1, completados: 0, fecha: '2026-06-13' },
  { id: 'OT-2026-000003', tipo: 'preventivo', estado: 'completado', descripcion: 'MP trimestral sistema VRF piso 2', tags: 5, completados: 5, fecha: '2026-06-10' },
];

const TIPO_ICON: Record<string, string> = {
  preventivo: '◷',
  correctivo: '◈',
  atencion_falla: '◉',
  puesta_en_marcha: '⊞',
  inspeccion_tecnica: '▣',
  instalacion_montaje: '◱',
};

export function OTListPage() {
  const { user } = useAuth();

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-faint)] mb-1">
            Módulo
          </p>
          <h1 className="text-2xl font-bold text-[var(--color-fg)] tracking-wide">
            Órdenes de Trabajo
          </h1>
        </div>
        {/* Solo supervisores y superiores crean OT directamente aquí */}
        {['programador', 'administrador', 'supervisor'].includes(user?.rol ?? '') && (
          <button
            className={[
              'px-5 py-2.5 rounded-lg font-bold text-sm tracking-widest uppercase',
              'bg-[var(--color-primary)] text-[var(--color-primary-fg)]',
              'hover:opacity-90 transition-opacity shadow-[var(--shadow-glow)]',
            ].join(' ')}
          >
            + Nueva OT
          </button>
        )}
      </div>

      {/* Filtros rápidos */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['Todas', 'En progreso', 'Abiertas', 'Completadas'].map(f => (
          <button
            key={f}
            className={[
              'px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide border transition-all',
              f === 'Todas'
                ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]'
                : 'border-[var(--color-border)] text-[var(--color-fg-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)]',
            ].join(' ')}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {MOCK_OT.map(ot => {
          const pct = ot.tags > 0 ? Math.round((ot.completados / ot.tags) * 100) : 0;
          return (
            <div
              key={ot.id}
              className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4 hover:border-[var(--color-border-strong)] transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[var(--color-primary)] text-sm flex-shrink-0">
                    {TIPO_ICON[ot.tipo] ?? '◈'}
                  </span>
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] text-[var(--color-fg-faint)] mb-0.5">
                      {ot.id}
                    </div>
                    <div className="text-sm font-semibold text-[var(--color-fg)] truncate">
                      {ot.descripcion}
                    </div>
                  </div>
                </div>
                <div
                  className="flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wide border"
                  style={{
                    color: ESTADO_COLOR[ot.estado],
                    borderColor: `${ESTADO_COLOR[ot.estado]}40`,
                    background: `${ESTADO_COLOR[ot.estado]}12`,
                  }}
                >
                  {ESTADO_LABEL[ot.estado]}
                </div>
              </div>

              {/* Progreso */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: pct === 100 ? 'var(--color-success)' : 'var(--color-primary)',
                    }}
                  />
                </div>
                <span className="font-mono text-[10px] text-[var(--color-fg-faint)] flex-shrink-0">
                  {ot.completados}/{ot.tags} tags · {ot.fecha}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Nota sprint */}
      <p className="mt-6 text-xs text-[var(--color-fg-faint)] font-mono text-center">
        Sprint 2: datos reales desde Dexie + TanStack Query
      </p>
    </div>
  );
}
