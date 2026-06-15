/**
 * OTListPage — Lista de Órdenes de Trabajo
 * Sprint 2: TanStack Query + Dexie fallback offline
 */

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { useOTs, type OTFiltros } from '@/hooks/useOTs';
import { SyncStatusBadge } from '@/components/shared/SyncStatusBadge';
import type { WorkOrder } from '@/db/types';

const ESTADO_COLOR: Record<string, string> = {
  abierto:     'var(--color-info)',
  en_progreso: 'var(--color-warning)',
  completado:  'var(--color-success)',
  cerrado:     'var(--color-fg-faint)',
};

const ESTADO_LABEL: Record<string, string> = {
  abierto:     'Abierto',
  en_progreso: 'En progreso',
  completado:  'Completado',
  cerrado:     'Cerrado',
};

const TIPO_ICON: Record<string, string> = {
  preventivo:         '◷',
  correctivo:         '◈',
  atencion_falla:     '◉',
  puesta_en_marcha:   '⊞',
  inspeccion_tecnica: '▣',
  instalacion_montaje:'◱',
  predictivo:         '◆',
};

const FILTROS: Array<{ label: string; estado?: WorkOrder['estado'] }> = [
  { label: 'Todas' },
  { label: 'En progreso', estado: 'en_progreso' },
  { label: 'Abiertas',    estado: 'abierto' },
  { label: 'Completadas', estado: 'completado' },
];

export function OTListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filtroActivo, setFiltroActivo] = useState<OTFiltros>({});

  const { data: ots, isLoading, isError, isOffline } = useOTs(filtroActivo);

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
        <div className="flex items-center gap-3">
          <SyncStatusBadge />
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
      </div>

      {/* Filtros rápidos */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTROS.map(f => {
          const activo = filtroActivo.estado === f.estado;
          return (
            <button
              key={f.label}
              onClick={() => setFiltroActivo(f.estado ? { estado: f.estado } : {})}
              className={[
                'px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide border transition-all',
                activo
                  ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] text-[var(--color-fg-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)]',
              ].join(' ')}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Estados de carga */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {isError && !isOffline && (
        <div className="text-center py-12 text-[var(--color-error)]">
          <p className="font-mono text-sm">Error al cargar las órdenes de trabajo</p>
        </div>
      )}

      {/* Lista */}
      {!isLoading && (
        <div className="space-y-3">
          {ots.length === 0 ? (
            <div className="text-center py-12 text-[var(--color-fg-muted)]">
              <p className="font-mono text-sm">No hay órdenes de trabajo</p>
            </div>
          ) : (
            ots.map(ot => {
              const total = (ot as any).total_assets ?? 0;
              const completados = (ot as any).completados ?? 0;
              const pct = total > 0 ? Math.round((completados / total) * 100) : 0;
              const folio = ot.folio ?? ot.folio_temporal ?? 'Sin folio';

              return (
                <div
                  key={ot.work_order_id}
                  onClick={() => navigate(`/app/ot/${ot.work_order_id}`)}
                  className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4 hover:border-[var(--color-border-strong)] transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[var(--color-primary)] text-sm flex-shrink-0">
                        {TIPO_ICON[ot.tipo] ?? '◈'}
                      </span>
                      <div className="min-w-0">
                        <div className="font-mono text-[10px] text-[var(--color-fg-faint)] mb-0.5">
                          {folio}
                          {!ot.folio && (
                            <span className="ml-2 text-[var(--color-warning)]">· pendiente sync</span>
                          )}
                        </div>
                        <div className="text-sm font-semibold text-[var(--color-fg)] truncate">
                          {ot.descripcion ?? `${ot.tipo} — ${(ot as any).sucursal_nombre ?? ''}`}
                        </div>
                      </div>
                    </div>
                    <div
                      className="flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wide border"
                      style={{
                        color:       ESTADO_COLOR[ot.estado],
                        borderColor: `${ESTADO_COLOR[ot.estado]}40`,
                        background:  `${ESTADO_COLOR[ot.estado]}12`,
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
                          width:      `${pct}%`,
                          background: pct === 100 ? 'var(--color-success)' : 'var(--color-primary)',
                        }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-[var(--color-fg-faint)] flex-shrink-0">
                      {completados}/{total} equipos
                      {(ot as any).sucursal_nombre && ` · ${(ot as any).sucursal_nombre}`}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {isOffline && (
        <p className="mt-4 text-center text-xs font-mono text-[var(--color-fg-faint)]">
          Mostrando datos locales (modo offline)
        </p>
      )}
    </div>
  );
}
