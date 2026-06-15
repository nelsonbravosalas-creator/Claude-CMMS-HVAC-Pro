import { useState } from 'react';
import { useTipos, useCrearTipo, useActualizarTipo, useEliminarTipo, type TipoEquipo } from '@/hooks/useTipos';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/ui/Button';

interface FormData {
  nombre: string;
  tipo_codigo: string;
  descripcion: string;
  categoria: string;
}

const EMPTY: FormData = { nombre: '', tipo_codigo: '', descripcion: '', categoria: 'HVAC' };

const CATEGORIAS = ['HVAC', 'Eléctrico', 'Mecánico', 'Hidráulico', 'Refrigeración', 'Electrónico', 'General'];

export function TiposEquipoPage() {
  const { data: tipos = [], isLoading } = useTipos();
  const crearMut = useCrearTipo();
  const actualizarMut = useActualizarTipo();
  const eliminarMut = useEliminarTipo();

  const [modal, setModal] = useState<null | 'crear' | 'editar'>(null);
  const [editando, setEditando] = useState<TipoEquipo | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function abrirCrear() {
    setForm(EMPTY);
    setError('');
    setModal('crear');
  }

  function abrirEditar(t: TipoEquipo) {
    setEditando(t);
    setForm({
      nombre: t.nombre,
      tipo_codigo: t.tipo_codigo ?? '',
      descripcion: t.descripcion ?? '',
      categoria: t.categoria ?? 'HVAC',
    });
    setError('');
    setModal('editar');
  }

  function cerrar() { setModal(null); setEditando(null); setError(''); }

  async function guardar() {
    setError('');
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return; }
    try {
      if (modal === 'crear') {
        await crearMut.mutateAsync(form);
      } else if (editando) {
        await actualizarMut.mutateAsync({ id: editando.tipo_de_equipo_id, ...form });
      }
      cerrar();
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  }

  async function toggleActivo(t: TipoEquipo) {
    await actualizarMut.mutateAsync({ id: t.tipo_de_equipo_id, activo: !t.activo });
  }

  const saving = crearMut.isPending || actualizarMut.isPending;

  return (
    <div className="p-4 lg:p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-faint)] mb-1">Admin</p>
          <h1 className="text-2xl font-bold text-[var(--color-fg)]">Tipos de Equipo</h1>
        </div>
        <Button size="sm" onClick={abrirCrear}>+ Nuevo Tipo</Button>
      </div>

      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="h-40 flex items-center justify-center text-sm text-[var(--color-fg-muted)]">Cargando…</div>
        ) : tipos.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center gap-2">
            <p className="text-[var(--color-fg-muted)] text-sm">Sin tipos registrados.</p>
            <button onClick={abrirCrear} className="text-[var(--color-primary)] text-sm hover:underline">+ Crear primer tipo</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                {['Código TAG', 'Nombre', 'Categoría', 'Estado', 'Acciones'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-faint)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tipos.map(t => (
                <tr key={t.tipo_de_equipo_id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface)] transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-[var(--color-primary)]">{t.tipo_codigo ?? '—'}</td>
                  <td className="px-4 py-3 text-[var(--color-fg)]">{t.nombre}</td>
                  <td className="px-4 py-3 text-[var(--color-fg-muted)]">{t.categoria ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${t.activo ? 'bg-green-500/15 text-green-400' : 'bg-zinc-500/15 text-zinc-400'}`}>
                      {t.activo ? 'Activo' : 'Archivado'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => abrirEditar(t)} className="text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors px-2 py-1 rounded hover:bg-[var(--color-border)]">
                        Editar
                      </button>
                      <button onClick={() => toggleActivo(t)} className="text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-warning)] transition-colors px-2 py-1 rounded hover:bg-[var(--color-border)]">
                        {t.activo ? 'Archivar' : 'Activar'}
                      </button>
                      <button onClick={() => setConfirmId(t.tipo_de_equipo_id)} className="text-xs text-[var(--color-fg-muted)] hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-[var(--color-border)]">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal crear/editar */}
      <Modal open={modal !== null} onClose={cerrar} title={modal === 'crear' ? 'Nuevo Tipo de Equipo' : 'Editar Tipo'}>
        <div className="p-6 space-y-4">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-faint)] mb-1.5">Nombre *</label>
            <input
              value={form.nombre}
              onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej: Split / Fan Coil"
              className="w-full h-10 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-faint)] mb-1.5">
              Código TAG (max 6 letras)
            </label>
            <input
              value={form.tipo_codigo}
              onChange={e => setForm(p => ({ ...p, tipo_codigo: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))}
              placeholder="Ej: AC, CHI, VRF (auto si vacío)"
              maxLength={6}
              className="w-full h-10 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm font-mono text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]"
            />
            <p className="text-[10px] text-[var(--color-fg-faint)] mt-1">Se usa en el TAG del equipo: SUCURSAL.{form.tipo_codigo || 'COD'}.001</p>
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-faint)] mb-1.5">Categoría</label>
            <select
              value={form.categoria}
              onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
              className="w-full h-10 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]"
            >
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-faint)] mb-1.5">Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)] resize-none"
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={cerrar} fullWidth>Cancelar</Button>
            <Button onClick={guardar} loading={saving} fullWidth>
              {modal === 'crear' ? 'Crear Tipo' : 'Guardar Cambios'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm eliminar */}
      <Modal open={!!confirmId} onClose={() => setConfirmId(null)} title="Archivar tipo" size="sm">
        <div className="p-6 space-y-4">
          <p className="text-sm text-[var(--color-fg-muted)]">¿Archivar este tipo de equipo? Los equipos existentes no se modificarán.</p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setConfirmId(null)} fullWidth>Cancelar</Button>
            <Button variant="danger" loading={eliminarMut.isPending} onClick={() => confirmId && eliminarMut.mutateAsync(confirmId).then(() => setConfirmId(null))} fullWidth>
              Archivar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
