/**
 * TicketsListPage — Lista de Tickets (Sprint 5)
 * TanStack Query + Dexie fallback offline (mismo patrón que OTListPage)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { useTickets, type TicketFiltros } from '@/hooks/useTickets';
import { SyncStatusBadge } from '@/components/shared/SyncStatusBadge';
import type { Ticket } from '@/db/types';

const ESTADO_COLOR: Record<string, string> = {
  abierto:     'var(--color-info)',
  en_progreso: 'var(--color-warning)',
  observado:   'var(--color-error)',
  resuelto:    'var(--color-success)',
  cerrado:     'var(--color-fg-faint)',
};

const ESTADO_LABEL: Record<string, string> = {
  abierto:     'Abierto',
  en_progreso: 'En progreso',
  observado:   'Observado',
  resuelto:    'Resuelto',
  cerrado:     'Cerrado',
};

const PRIORIDAD_COLOR: Record<string, string> = {
  baja:     'var(--color-fg-faint)',
  media:    'var(--color-info)',
  alta:     'var(--color-warning)',
  critica:  'var(--color-error)',
};

const TIPO_LABEL: Record<string, string> = {
  correctivo: 'Correctivo',
  preventivo: 'Preventivo',
  consulta:   'Consulta',
};

const FILTROS: Array<{ label: string; estado?: Ticket['estado'] }> = [
  { label: 'Todos' },
  { label: 'Abiertos',     estado: 'abierto' },
  { label: 'En progreso',  estado: 'en_progreso' },
  { label: 'Observados',   estado: 'observado' },
  { label: 'Resueltos',    estado: 'resuelto' },
  { label: 'Cerrados',     estado: 'cerrado' },
];

const PUEDE_CREAR = ['programador', 'administrador', 'supervisor', 'cliente'];

export function TicketsListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filtroActivo, setFiltroActivo] = useState<TicketFiltros>({});

  const { data: tickets, isLoading, isError, isOffline } = useTickets(filtroActivo);

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-faint)] mb-1">
            Módulo
          </p>
          <h1 className="text-2xl font-bold text-[var(--color-fg)] tracking-wide">
            Tickets
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <SyncStatusBadge />
          {PUEDE_CREAR.includes(user?.rol ?? '') && (
            <button
              onClick={() => navigate('/app/tickets/nuevo')}
              className={[
                'px-5 py-2.5 rounded-lg font-bold text-sm tracking-widest uppercase',
                'bg-[var(--color-primary)] text-[var(--color-primary-fg)]',
                'hover:opacity-90 transition-opacity shadow-[var(--shadow-glow)]',
              ].join(' ')}
            >
              + Nuevo Ticket
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
            <div key={i} className="h-20 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {isError && !isOffline && (
        <div className="text-center py-12 text-[var(--color-error)]">
          <p className="font-mono text-sm">Error al cargar los tickets</p>
        </div>
      )}

      {/* Lista */}
      {!isLoading && (
        <div className="space-y-3">
          {tickets.length === 0 ? (
            <div className="text-center py-12 text-[var(--color-fg-muted)]">
              <p className="font-mono text-sm">No hay tickets</p>
            </div>
          ) : (
            tickets.map(t => (
              <div
                key={t.ticket_id}
                onClick={() => navigate(`/app/tickets/${t.ticket_id}`)}
                className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4 hover:border-[var(--color-border-strong)] transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] text-[var(--color-fg-faint)] mb-0.5">
                      #{t.numero_correlativo ?? '—'} · {TIPO_LABEL[t.tipo] ?? t.tipo}
                      {t.tag && ` · ${t.tag}`}
                    </div>
                    <div className="text-sm font-semibold text-[var(--color-fg)] truncate">
                      {t.titulo}
                    </div>
                  </div>
                  <div
                    className="flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wide border"
                    style={{
                      color:       ESTADO_COLOR[t.estado],
                      borderColor: `${ESTADO_COLOR[t.estado]}40`,
                      background:  `${ESTADO_COLOR[t.estado]}12`,
                    }}
                  >
                    {ESTADO_LABEL[t.estado]}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[10px] font-mono text-[var(--color-fg-faint)]">
                  <span
                    className="font-bold uppercase"
                    style={{ color: PRIORIDAD_COLOR[t.prioridad] }}
                  >
                    ● {t.prioridad}
                  </span>
                  {t.sucursal_nombre && <span>{t.sucursal_nombre}</span>}
                  {t.responsable_tecnico_nombre && <span>→ {t.responsable_tecnico_nombre}</span>}
                </div>
              </div>
            ))
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
