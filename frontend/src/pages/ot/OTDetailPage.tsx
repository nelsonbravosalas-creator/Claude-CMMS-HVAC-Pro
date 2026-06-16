/**
 * OTDetailPage — Detalle de una Orden de Trabajo
 * Muestra header, progreso y lista de equipos (work_order_assets)
 */

import { useParams, useNavigate } from 'react-router';
import { useOTDetail } from '@/hooks/useOTDetail';
import { SyncStatusBadge } from '@/components/shared/SyncStatusBadge';

const ESTADO_COLOR: Record<string, string> = {
  pendiente:   'var(--color-fg-faint)',
  en_progreso: 'var(--color-warning)',
  completado:  'var(--color-success)',
  omitido:     'var(--color-fg-faint)',
};

const ESTADO_ICON: Record<string, string> = {
  pendiente:   '⏳',
  en_progreso: '⚙',
  completado:  '✓',
  omitido:     '—',
};

const OT_TIPO_LABEL: Record<string, string> = {
  preventivo:          'Preventivo',
  correctivo:          'Correctivo',
  atencion_falla:      'Atención Falla',
  puesta_en_marcha:    'Puesta en Marcha',
  inspeccion_tecnica:  'Inspección Técnica',
  instalacion_montaje: 'Instalación/Montaje',
  predictivo:          'Predictivo',
};

const OT_ESTADO_LABEL: Record<string, string> = {
  abierto:     'Abierto',
  en_progreso: 'En progreso',
  completado:  'Completado',
  cerrado:     'Cerrado',
};

const OT_ESTADO_COLOR: Record<string, string> = {
  abierto:     'var(--color-info)',
  en_progreso: 'var(--color-warning)',
  completado:  'var(--color-success)',
  cerrado:     'var(--color-fg-faint)',
};

export function OTDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { workOrder: wo, assets, isLoading } = useOTDetail(id);

  if (isLoading && !wo) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl space-y-4">
        <div className="h-24 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl animate-pulse" />
        <div className="h-12 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl animate-pulse" />
        <div className="h-48 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!wo) {
    return (
      <div className="p-6 lg:p-8 text-center">
        <p className="text-[var(--color-fg-muted)] font-mono">OT no encontrada</p>
        <button
          onClick={() => navigate('/app/ot')}
          className="mt-4 text-[var(--color-primary)] text-sm underline"
        >
          Volver a la lista
        </button>
      </div>
    );
  }

  const total = assets.length;
  const completados = assets.filter(a => a.estado === 'completado').length;
  const omitidos = assets.filter(a => a.estado === 'omitido').length;
  const pct = total > 0 ? Math.round((completados / total) * 100) : 0;
  const folio = wo.folio ?? wo.folio_temporal ?? 'Sin folio';

  return (
    <div className="p-6 lg:p-8 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/app/ot')}
            className="text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] font-mono mb-2 flex items-center gap-1"
          >
            ← Órdenes de Trabajo
          </button>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-faint)] mb-0.5">
            {folio}
          </p>
          <h1 className="text-xl font-bold text-[var(--color-fg)]">
            {wo.descripcion ?? OT_TIPO_LABEL[wo.tipo]}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-[var(--color-fg-muted)]">
              {OT_TIPO_LABEL[wo.tipo]}
            </span>
            <span className="text-[var(--color-fg-faint)]">·</span>
            <span
              className="text-xs font-mono font-bold px-2 py-0.5 rounded-full border"
              style={{
                color:       OT_ESTADO_COLOR[wo.estado],
                borderColor: `${OT_ESTADO_COLOR[wo.estado]}40`,
                background:  `${OT_ESTADO_COLOR[wo.estado]}12`,
              }}
            >
              {OT_ESTADO_LABEL[wo.estado]}
            </span>
          </div>
        </div>
        <SyncStatusBadge />
      </div>

      {/* Progreso global */}
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-[var(--color-fg)]">Progreso</span>
          <span className="font-mono text-sm text-[var(--color-fg-muted)]">
            {completados}/{total} equipos · {pct}%
          </span>
        </div>
        <div className="h-2.5 bg-[var(--color-border)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width:      `${pct}%`,
              background: pct === 100 ? 'var(--color-success)' : 'var(--color-primary)',
            }}
          />
        </div>
        {omitidos > 0 && (
          <p className="mt-2 text-xs text-[var(--color-fg-faint)] font-mono">
            {omitidos} equipo{omitidos !== 1 ? 's' : ''} omitido{omitidos !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Lista de equipos */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--color-fg-secondary)] uppercase tracking-widest mb-3">
          Equipos ({total})
        </h2>
        <div className="space-y-2">
          {assets.map(asset => {
            const canOpen = asset.estado !== 'omitido';
            return (
              <div
                key={asset.work_order_asset_id}
                onClick={() => canOpen && navigate(`/app/ot/${wo.work_order_id}/assets/${asset.work_order_asset_id}/form`)}
                className={[
                  'flex items-center gap-4 p-4 rounded-xl border transition-all',
                  'bg-[var(--color-card)] border-[var(--color-border)]',
                  canOpen ? 'cursor-pointer hover:border-[var(--color-border-strong)]' : 'opacity-60',
                ].join(' ')}
              >
                {/* Estado icon */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{
                    background: `${ESTADO_COLOR[asset.estado]}20`,
                    color:       ESTADO_COLOR[asset.estado],
                  }}
                >
                  {ESTADO_ICON[asset.estado]}
                </div>

                {/* Info equipo */}
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[10px] text-[var(--color-fg-faint)] mb-0.5">
                    {asset.tag}
                    {asset.criticidad === 'critico' && (
                      <span className="ml-2 text-[var(--color-error)] font-bold">◉ CRÍTICO</span>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-[var(--color-fg)] truncate">
                    {(asset as any).equipo_nombre ?? asset.tag}
                  </div>
                  <div className="text-xs text-[var(--color-fg-muted)] mt-0.5">
                    {(asset as any).tipo_nombre} · {(asset as any).marca} {(asset as any).modelo}
                  </div>
                </div>

                {/* Acción */}
                {canOpen && (
                  <div className="flex-shrink-0">
                    <span
                      style={{
                        color:        'white',
                        background:   asset.estado === 'completado' ? 'var(--color-success)' : 'var(--color-primary)',
                        borderColor:  'transparent',
                        padding:      '0.375rem 0.75rem',
                        borderRadius: '0.5rem',
                        fontSize:     '0.75rem',
                        fontWeight:   600,
                        display:      'inline-block',
                      }}
                    >
                      {asset.estado === 'completado' ? 'Ver informe' : asset.estado === 'en_progreso' ? 'Continuar' : 'Iniciar'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Narrativos OT (auto-poblados por binding) */}
      {(wo.hallazgo || wo.diagnostico || wo.recomendaciones || wo.conclusiones) && (
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4 space-y-4">
          <h2 className="text-sm font-semibold text-[var(--color-fg-secondary)] uppercase tracking-widest">
            Narrativos del Informe
          </h2>
          {wo.hallazgo && (
            <div>
              <p className="text-xs font-mono text-[var(--color-fg-faint)] uppercase mb-1">Hallazgos</p>
              <p className="text-sm text-[var(--color-fg)] whitespace-pre-line">{wo.hallazgo}</p>
            </div>
          )}
          {wo.diagnostico && (
            <div>
              <p className="text-xs font-mono text-[var(--color-fg-faint)] uppercase mb-1">Diagnóstico</p>
              <p className="text-sm text-[var(--color-fg)] whitespace-pre-line">{wo.diagnostico}</p>
            </div>
          )}
          {wo.recomendaciones && (
            <div>
              <p className="text-xs font-mono text-[var(--color-fg-faint)] uppercase mb-1">Recomendaciones</p>
              <p className="text-sm text-[var(--color-fg)] whitespace-pre-line">{wo.recomendaciones}</p>
            </div>
          )}
          {wo.conclusiones && (
            <div>
              <p className="text-xs font-mono text-[var(--color-fg-faint)] uppercase mb-1">Conclusiones</p>
              <p className="text-sm text-[var(--color-fg)] whitespace-pre-line">{wo.conclusiones}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
