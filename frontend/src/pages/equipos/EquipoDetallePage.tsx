import { useParams, Link } from 'react-router';
import { useEquipoDetalle } from '@/hooks/useEquipos';

const ESTADO_BADGE: Record<string, { label: string; cls: string }> = {
  operativo:     { label: 'Operativo',  cls: 'bg-green-500/15 text-green-400 border-green-500/30' },
  falla:         { label: 'Falla',      cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
  mantenimiento: { label: 'Mantención', cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  baja:          { label: 'Baja',       cls: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' },
};

const CRITICA_BADGE: Record<string, { label: string; cls: string }> = {
  critica: { label: 'Crítica', cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
  alta:    { label: 'Alta',    cls: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  media:   { label: 'Media',   cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  baja:    { label: 'Baja',    cls: 'bg-green-500/15 text-green-400 border-green-500/30' },
};

const OT_ESTADO_CLS: Record<string, string> = {
  abierta:    'text-blue-400',
  en_proceso: 'text-yellow-400',
  cerrada:    'text-green-400',
  cancelada:  'text-zinc-400',
};

function InfoField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-faint)] mb-0.5">{label}</p>
      <p className="text-sm text-[var(--color-fg)]">{value}</p>
    </div>
  );
}

export function EquipoDetallePage() {
  const { tag } = useParams<{ tag: string }>();
  const { data, isLoading, error } = useEquipoDetalle(tag);

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl space-y-4">
        <div className="h-8 w-48 rounded bg-[var(--color-surface)] animate-pulse" />
        <div className="h-40 rounded-xl bg-[var(--color-surface)] animate-pulse" />
        <div className="h-64 rounded-xl bg-[var(--color-surface)] animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 lg:p-8 flex flex-col items-center gap-3">
        <p className="text-[var(--color-fg-muted)]">Equipo no encontrado o sin acceso.</p>
        <Link to="/app/equipos" className="text-[var(--color-primary)] text-sm hover:underline">
          ← Volver a Equipos
        </Link>
      </div>
    );
  }

  const { equipo: eq, ots } = data;
  const estadoBadge = ESTADO_BADGE[eq.estado] ?? { label: eq.estado, cls: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' };
  const criticaBadge = CRITICA_BADGE[eq.criticidad] ?? { label: eq.criticidad, cls: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' };

  const varTecnicas = eq.variables_fijas_tipo
    ? Object.entries(eq.variables_fijas_tipo).filter(([, v]) => v !== null && v !== '')
    : [];

  return (
    <div className="p-4 lg:p-8 max-w-4xl space-y-6">
      {/* Breadcrumb */}
      <Link to="/app/equipos" className="text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-primary)] transition-colors">
        ← Equipos
      </Link>

      {/* Header */}
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6">
        <div className="flex flex-wrap items-start gap-3 mb-4">
          <span className="font-mono text-lg font-bold text-[var(--color-primary)] tracking-wide">
            {eq.tag}
          </span>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${estadoBadge.cls}`}>
            {estadoBadge.label}
          </span>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${criticaBadge.cls}`}>
            Criticidad {criticaBadge.label}
          </span>
        </div>
        <h1 className="text-xl font-bold text-[var(--color-fg)] mb-1">{eq.nombre}</h1>
        {eq.descripcion && (
          <p className="text-sm text-[var(--color-fg-muted)]">{eq.descripcion}</p>
        )}

        {/* Grid de datos básicos */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-6 pt-4 border-t border-[var(--color-border)]">
          <InfoField label="Sucursal" value={eq.sucursal_nombre} />
          <InfoField label="Tipo" value={eq.tipo_nombre} />
          <InfoField label="Marca" value={eq.marca} />
          <InfoField label="Modelo" value={eq.modelo} />
          <InfoField label="N° Serie" value={eq.numero_serie} />
          <InfoField
            label="Instalación"
            value={eq.fecha_instalacion ? new Date(eq.fecha_instalacion).toLocaleDateString('es-CL') : undefined}
          />
          <InfoField
            label="Garantía vence"
            value={eq.fecha_garantia_vence ? new Date(eq.fecha_garantia_vence).toLocaleDateString('es-CL') : undefined}
          />
        </div>
      </div>

      {/* Variables técnicas */}
      {varTecnicas.length > 0 && (
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-faint)] mb-4">
            Variables Técnicas
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {varTecnicas.map(([key, val]) => (
              <InfoField
                key={key}
                label={key.replace(/_/g, ' ')}
                value={String(val)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Historial de OTs */}
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-faint)] mb-4">
          Historial OT ({ots.length})
        </p>
        {ots.length === 0 ? (
          <p className="text-sm text-[var(--color-fg-muted)]">Sin órdenes de trabajo registradas.</p>
        ) : (
          <div className="space-y-2">
            {ots.map(ot => (
              <Link
                key={ot.work_order_id}
                to={`/app/ot/${ot.work_order_id}`}
                className="flex items-center justify-between gap-4 p-3 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs text-[var(--color-primary)]">
                    {ot.folio ?? 'OT'}
                  </span>
                  <span className="text-sm text-[var(--color-fg)] capitalize truncate">
                    {ot.tipo?.replace('_', ' ') ?? '—'}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs font-medium capitalize ${OT_ESTADO_CLS[ot.estado] ?? 'text-[var(--color-fg-muted)]'}`}>
                    {ot.estado?.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-[var(--color-fg-faint)]">
                    {new Date(ot.updated_at).toLocaleDateString('es-CL')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
