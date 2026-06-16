import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useSucursales, type Sucursal } from '@/hooks/useSucursales';
import { useEquipos, type EquipoListItem } from '@/hooks/useEquipos';
import { useUsuarios, type Usuario } from '@/hooks/useUsuarios';

const TIPOS = [
  { value: 'preventivo', label: 'Preventivo' },
  { value: 'correctivo', label: 'Correctivo' },
  { value: 'atencion_falla', label: 'Atención de Falla' },
  { value: 'inspeccion_tecnica', label: 'Inspección Técnica' },
  { value: 'puesta_en_marcha', label: 'Puesta en Marcha' },
  { value: 'instalacion_montaje', label: 'Instalación / Montaje' },
  { value: 'predictivo', label: 'Predictivo' },
];

interface CreateOTBody {
  sucursal_id: string;
  tipo: string;
  descripcion?: string;
  tecnico_asignado_id?: string;
  asset_ids: string[];
}

function useCrearOT() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateOTBody) => {
      const res = await fetch('/api/work-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(err.message ?? 'Error al crear la OT');
      }
      return res.json() as Promise<{ work_order: { work_order_id: string } }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work-orders'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function CreateOTPage() {
  const navigate = useNavigate();
  const { data: sucursalesData } = useSucursales();
  const { data: usuariosData } = useUsuarios();

  const [sucursalId, setSucursalId] = useState('');
  const [tipo, setTipo] = useState('preventivo');
  const [descripcion, setDescripcion] = useState('');
  const [tecnicoId, setTecnicoId] = useState('');
  const [assetIds, setAssetIds] = useState<string[]>([]);

  const { data: equiposData } = useEquipos(
    sucursalId ? { sucursal_id: sucursalId } : undefined,
  );

  const { mutate: crear, isPending, error } = useCrearOT();

  const sucursales: Sucursal[] = sucursalesData ?? [];
  const equipos: EquipoListItem[] = equiposData ?? [];
  const tecnicos: Usuario[] = (usuariosData ?? []).filter(
    (u: Usuario) => ['tecnico', 'supervisor', 'administrador'].includes(u.rol),
  );

  const toggleAsset = (id: string) => {
    setAssetIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sucursalId || !tipo) return;
    crear(
      {
        sucursal_id: sucursalId,
        tipo,
        descripcion: descripcion || undefined,
        tecnico_asignado_id: tecnicoId || undefined,
        asset_ids: assetIds,
      },
      {
        onSuccess: data => {
          navigate(`/app/ot/${data.work_order.work_order_id}`);
        },
      },
    );
  };

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] mb-4 flex items-center gap-1"
        >
          ← Volver
        </button>
        <h1 className="text-2xl font-bold text-[var(--color-fg)]">Nueva Orden de Trabajo</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sucursal */}
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-muted)] block mb-2">
            Sucursal *
          </label>
          <select
            required
            value={sucursalId}
            onChange={e => { setSucursalId(e.target.value); setAssetIds([]); }}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-primary)]"
          >
            <option value="">Seleccionar sucursal…</option>
            {sucursales.map(s => (
              <option key={s.sucursal_id} value={s.sucursal_id}>
                {s.codigo} — {s.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Tipo */}
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-muted)] block mb-2">
            Tipo de trabajo *
          </label>
          <select
            required
            value={tipo}
            onChange={e => setTipo(e.target.value)}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-primary)]"
          >
            {TIPOS.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Descripción */}
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-muted)] block mb-2">
            Descripción
          </label>
          <textarea
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            rows={3}
            placeholder="Ej: Mantenimiento preventivo mensual aires acondicionados"
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)] focus:outline-none focus:border-[var(--color-primary)] resize-none"
          />
        </div>

        {/* Técnico asignado */}
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-muted)] block mb-2">
            Técnico asignado
          </label>
          <select
            value={tecnicoId}
            onChange={e => setTecnicoId(e.target.value)}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-primary)]"
          >
            <option value="">Sin asignar</option>
            {tecnicos.map(u => (
              <option key={u.user_id} value={u.user_id}>
                {u.nombre} ({u.rol})
              </option>
            ))}
          </select>
        </div>

        {/* Equipos */}
        {sucursalId && (
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-muted)] block mb-2">
              Equipos a incluir ({assetIds.length} seleccionados)
            </label>
            <div className="border border-[var(--color-border)] rounded-lg overflow-hidden max-h-56 overflow-y-auto">
              {equipos.length === 0 ? (
                <p className="px-4 py-3 text-sm text-[var(--color-fg-muted)]">
                  No hay equipos en esta sucursal
                </p>
              ) : (
                equipos.map(eq => (
                  <label
                    key={eq.equipo_id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--color-surface-raised)] cursor-pointer border-b border-[var(--color-border)] last:border-0"
                  >
                    <input
                      type="checkbox"
                      checked={assetIds.includes(eq.equipo_id)}
                      onChange={() => toggleAsset(eq.equipo_id)}
                      className="accent-[var(--color-primary)]"
                    />
                    <div>
                      <span className="font-mono text-xs text-[var(--color-primary)]">
                        {eq.tag}
                      </span>
                      <span className="text-xs text-[var(--color-fg-muted)] ml-2">
                        {eq.nombre}
                      </span>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-[var(--color-error)]">
            {(error as Error).message}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-raised)] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending || !sucursalId}
            className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold disabled:opacity-50 transition-opacity"
          >
            {isPending ? 'Creando…' : 'Crear OT'}
          </button>
        </div>
      </form>
    </div>
  );
}
