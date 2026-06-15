import { useState } from 'react';
import { useSucursales, useCrearSucursal, useActualizarSucursal, useEliminarSucursal, type Sucursal } from '@/hooks/useSucursales';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/ui/Button';

interface FormData {
  nombre: string;
  codigo: string;
  ciudad: string;
  region: string;
  direccion: string;
  pais: string;
}

const EMPTY: FormData = { nombre: '', codigo: '', ciudad: '', region: '', direccion: '', pais: 'CL' };

export function ZonasPage() {
  const { data: sucursales = [], isLoading } = useSucursales();
  const crearMut = useCrearSucursal();
  const actualizarMut = useActualizarSucursal();
  const eliminarMut = useEliminarSucursal();

  const [modal, setModal] = useState<null | 'crear' | 'editar'>(null);
  const [editando, setEditando] = useState<Sucursal | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function abrirCrear() {
    setForm(EMPTY);
    setError('');
    setModal('crear');
  }

  function abrirEditar(s: Sucursal) {
    setEditando(s);
    setForm({ nombre: s.nombre, codigo: s.codigo, ciudad: s.ciudad ?? '', region: s.region ?? '', direccion: s.direccion ?? '', pais: s.pais ?? 'CL' });
    setError('');
    setModal('editar');
  }

  function cerrar() { setModal(null); setEditando(null); setError(''); }

  async function guardar() {
    setError('');
    if (!form.nombre.trim() || !form.codigo.trim()) { setError('Nombre y código son requeridos'); return; }
    try {
      if (modal === 'crear') {
        await crearMut.mutateAsync(form);
      } else if (editando) {
        await actualizarMut.mutateAsync({ id: editando.sucursal_id, ...form });
      }
      cerrar();
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  }

  async function toggleActivo(s: Sucursal) {
    await actualizarMut.mutateAsync({ id: s.sucursal_id, activo: !s.activo });
  }

  async function eliminar(id: string) {
    await eliminarMut.mutateAsync(id);
    setConfirmId(null);
  }

  const saving = crearMut.isPending || actualizarMut.isPending;

  return (
    <div className="p-4 lg:p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-faint)] mb-1">Admin</p>
          <h1 className="text-2xl font-bold text-[var(--color-fg)]">Zonas / Sucursales</h1>
        </div>
        <Button size="sm" onClick={abrirCrear}>+ Nueva Zona</Button>
      </div>

      {/* Tabla */}
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="h-40 flex items-center justify-center text-sm text-[var(--color-fg-muted)]">Cargando…</div>
        ) : sucursales.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center gap-2">
            <p className="text-[var(--color-fg-muted)] text-sm">Sin zonas registradas.</p>
            <button onClick={abrirCrear} className="text-[var(--color-primary)] text-sm hover:underline">+ Crear primera zona</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                {['Código', 'Nombre', 'Ciudad', 'Región', 'Estado', 'Acciones'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-faint)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sucursales.map(s => (
                <tr key={s.sucursal_id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface)] transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-[var(--color-primary)]">{s.codigo}</td>
                  <td className="px-4 py-3 text-[var(--color-fg)]">{s.nombre}</td>
                  <td className="px-4 py-3 text-[var(--color-fg-muted)]">{s.ciudad ?? '—'}</td>
                  <td className="px-4 py-3 text-[var(--color-fg-muted)]">{s.region ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.activo ? 'bg-green-500/15 text-green-400' : 'bg-zinc-500/15 text-zinc-400'}`}>
                      {s.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => abrirEditar(s)} className="text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors px-2 py-1 rounded hover:bg-[var(--color-border)]">
                        Editar
                      </button>
                      <button onClick={() => toggleActivo(s)} className="text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-warning)] transition-colors px-2 py-1 rounded hover:bg-[var(--color-border)]">
                        {s.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button onClick={() => setConfirmId(s.sucursal_id)} className="text-xs text-[var(--color-fg-muted)] hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-[var(--color-border)]">
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
      <Modal open={modal !== null} onClose={cerrar} title={modal === 'crear' ? 'Nueva Zona' : 'Editar Zona'}>
        <div className="p-6 space-y-4">
          {(['nombre', 'codigo', 'ciudad', 'region', 'direccion'] as const).map(field => (
            <div key={field}>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-faint)] mb-1.5">
                {field === 'nombre' ? 'Nombre *' : field === 'codigo' ? 'Código *' : field.charAt(0).toUpperCase() + field.slice(1)}
              </label>
              <input
                value={form[field]}
                onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                placeholder={field === 'codigo' ? 'Ej: STK, LCO, MIR' : ''}
                disabled={modal === 'editar' && field === 'codigo'}
                className="w-full h-10 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)] disabled:opacity-50"
              />
            </div>
          ))}
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={cerrar} fullWidth>Cancelar</Button>
            <Button onClick={guardar} loading={saving} fullWidth>
              {modal === 'crear' ? 'Crear Zona' : 'Guardar Cambios'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm eliminar */}
      <Modal open={!!confirmId} onClose={() => setConfirmId(null)} title="Confirmar eliminación" size="sm">
        <div className="p-6 space-y-4">
          <p className="text-sm text-[var(--color-fg-muted)]">¿Eliminar esta zona? Esta acción no se puede deshacer.</p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setConfirmId(null)} fullWidth>Cancelar</Button>
            <Button variant="danger" loading={eliminarMut.isPending} onClick={() => confirmId && eliminar(confirmId)} fullWidth>Eliminar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
