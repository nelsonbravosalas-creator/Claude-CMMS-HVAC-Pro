import { useState, useMemo } from 'react';
import { Link } from 'react-router';
import { useEquipos } from '@/hooks/useEquipos';
import { useSucursales } from '@/hooks/useSucursales';
import { useTipos } from '@/hooks/useTipos';

const ESTADO_BADGE: Record<string, { label: string; cls: string }> = {
  operativo:     { label: 'Operativo',    cls: 'bg-green-500/15 text-green-400 border-green-500/30' },
  falla:         { label: 'Falla',        cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
  mantenimiento: { label: 'Mantención',   cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  baja:          { label: 'Baja',         cls: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' },
};

const CRITICA_BADGE: Record<string, { label: string; cls: string }> = {
  critica: { label: 'Crítica', cls: 'bg-red-500/15 text-red-400' },
  alta:    { label: 'Alta',    cls: 'bg-orange-500/15 text-orange-400' },
  media:   { label: 'Media',   cls: 'bg-yellow-500/15 text-yellow-400' },
  baja:    { label: 'Baja',    cls: 'bg-green-500/15 text-green-400' },
};

export function EquiposPage() {
  const [busqueda, setBusqueda] = useState('');
  const [sucursalId, setSucursalId] = useState('');
  const [tipoId, setTipoId] = useState('');
  const [estado, setEstado] = useState('');

  const { data: equipos = [], isLoading } = useEquipos({ sucursal_id: sucursalId || undefined, tipo_id: tipoId || undefined, estado: estado || undefined });
  const { data: sucursales = [] } = useSucursales();
  const { data: tipos = [] } = useTipos();

  const filtrados = useMemo(() => {
    if (!busqueda.trim()) return equipos;
    const q = busqueda.toLowerCase();
    return equipos.filter(e =>
      e.tag.toLowerCase().includes(q) ||
      e.nombre.toLowerCase().includes(q) ||
      (e.marca ?? '').toLowerCase().includes(q) ||
      (e.modelo ?? '').toLowerCase().includes(q),
    );
  }, [equipos, busqueda]);

  return (
    <div className="p-4 lg:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-faint)] mb-1">
          Inventario
        </p>
        <h1 className="text-2xl font-bold text-[var(--color-fg)]">Equipos</h1>
        <p className="text-sm text-[var(--color-fg-muted)] mt-0.5">
          {isLoading ? 'Cargando…' : `${filtrados.length} equipos`}
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="search"
          placeholder="Buscar por TAG, nombre, marca…"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="flex-1 min-w-[220px] h-10 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-fg)] text-sm placeholder:text-[var(--color-fg-faint)] outline-none focus:border-[var(--color-primary)]"
        />
        <select
          value={sucursalId}
          onChange={e => setSucursalId(e.target.value)}
          className="h-10 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]"
        >
          <option value="">Todas las sucursales</option>
          {sucursales.map(s => (
            <option key={s.sucursal_id} value={s.sucursal_id}>{s.codigo} — {s.nombre}</option>
          ))}
        </select>
        <select
          value={tipoId}
          onChange={e => setTipoId(e.target.value)}
          className="h-10 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]"
        >
          <option value="">Todos los tipos</option>
          {tipos.map(t => (
            <option key={t.tipo_de_equipo_id} value={t.tipo_de_equipo_id}>{t.nombre}</option>
          ))}
        </select>
        <select
          value={estado}
          onChange={e => setEstado(e.target.value)}
          className="h-10 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]"
        >
          <option value="">Todos los estados</option>
          <option value="operativo">Operativo</option>
          <option value="falla">Falla</option>
          <option value="mantenimiento">Mantención</option>
          <option value="baja">Baja</option>
        </select>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-36 rounded-xl bg-[var(--color-surface)] animate-pulse" />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-center">
          <span className="text-4xl">◈</span>
          <p className="text-[var(--color-fg-muted)] text-sm">No se encontraron equipos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map(eq => {
            const estadoBadge = ESTADO_BADGE[eq.estado] ?? { label: eq.estado, cls: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' };
            const criticaBadge = CRITICA_BADGE[eq.criticidad] ?? { label: eq.criticidad, cls: 'bg-zinc-500/15 text-zinc-400' };
            return (
              <Link
                key={eq.tag}
                to={`/app/equipos/${encodeURIComponent(eq.tag)}`}
                className="group block bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4 hover:border-[var(--color-primary)] transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="font-mono text-xs font-bold text-[var(--color-primary)] tracking-wide">
                    {eq.tag}
                  </span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${estadoBadge.cls}`}>
                    {estadoBadge.label}
                  </span>
                </div>
                <p className="text-sm font-semibold text-[var(--color-fg)] mb-1 line-clamp-2 group-hover:text-[var(--color-primary)] transition-colors">
                  {eq.nombre}
                </p>
                {(eq.marca || eq.modelo) && (
                  <p className="text-xs text-[var(--color-fg-muted)] mb-3">
                    {[eq.marca, eq.modelo].filter(Boolean).join(' · ')}
                  </p>
                )}
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-[var(--color-border)]">
                  <span className="text-[10px] text-[var(--color-fg-faint)] truncate">
                    {eq.sucursal_codigo} · {eq.tipo_nombre}
                  </span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${criticaBadge.cls}`}>
                    {criticaBadge.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
