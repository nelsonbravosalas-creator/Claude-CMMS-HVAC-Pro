import { useState } from 'react';
import { useUsuarios, useCrearUsuario, useActualizarUsuario, type Usuario } from '@/hooks/useUsuarios';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/ui/Button';

const ROLES = ['administrador', 'supervisor', 'tecnico', 'cliente', 'proveedor'] as const;
const ESTADOS = ['activo', 'inactivo', 'suspendido'] as const;

const ROL_BADGE: Record<string, string> = {
  administrador: 'bg-purple-500/15 text-purple-400',
  supervisor:    'bg-blue-500/15 text-blue-400',
  tecnico:       'bg-cyan-500/15 text-cyan-400',
  cliente:       'bg-green-500/15 text-green-400',
  proveedor:     'bg-orange-500/15 text-orange-400',
  programador:   'bg-pink-500/15 text-pink-400',
};

const ESTADO_BADGE: Record<string, string> = {
  activo:     'bg-green-500/15 text-green-400',
  inactivo:   'bg-zinc-500/15 text-zinc-400',
  suspendido: 'bg-red-500/15 text-red-400',
};

interface CrearForm {
  nombre: string;
  email: string;
  rol: string;
  password: string;
  pin: string;
  telefono: string;
}

interface EditarForm {
  nombre: string;
  rol: string;
  estado: string;
  telefono: string;
  new_password: string;
  new_pin: string;
}

const CREAR_EMPTY: CrearForm = { nombre: '', email: '', rol: 'tecnico', password: '', pin: '', telefono: '' };
const EDITAR_EMPTY: EditarForm = { nombre: '', rol: 'tecnico', estado: 'activo', telefono: '', new_password: '', new_pin: '' };

export function UsuariosPage() {
  const { data: usuarios = [], isLoading } = useUsuarios();
  const crearMut = useCrearUsuario();
  const actualizarMut = useActualizarUsuario();

  const [modal, setModal] = useState<null | 'crear' | 'editar'>(null);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [crearForm, setCrearForm] = useState<CrearForm>(CREAR_EMPTY);
  const [editarForm, setEditarForm] = useState<EditarForm>(EDITAR_EMPTY);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  function abrirCrear() { setCrearForm(CREAR_EMPTY); setError(''); setShowPass(false); setModal('crear'); }

  function abrirEditar(u: Usuario) {
    setEditando(u);
    setEditarForm({ nombre: u.nombre, rol: u.rol, estado: u.estado, telefono: u.telefono ?? '', new_password: '', new_pin: '' });
    setError('');
    setModal('editar');
  }

  function cerrar() { setModal(null); setEditando(null); setError(''); }

  async function guardarCrear() {
    setError('');
    const { nombre, email, rol, password } = crearForm;
    if (!nombre.trim() || !email.trim() || !rol || !password) {
      setError('Nombre, email, rol y contraseña son requeridos');
      return;
    }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    if (crearForm.pin && !/^\d{4,6}$/.test(crearForm.pin)) { setError('El PIN debe ser de 4 a 6 dígitos numéricos'); return; }
    try {
      await crearMut.mutateAsync({ ...crearForm, pin: crearForm.pin || undefined, telefono: crearForm.telefono || undefined });
      cerrar();
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  }

  async function guardarEditar() {
    setError('');
    if (!editando) return;
    if (editarForm.new_password && editarForm.new_password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    if (editarForm.new_pin && !/^\d{4,6}$/.test(editarForm.new_pin)) { setError('El PIN debe ser de 4 a 6 dígitos'); return; }
    try {
      await actualizarMut.mutateAsync({
        id: editando.user_id,
        nombre: editarForm.nombre,
        rol: editarForm.rol,
        estado: editarForm.estado,
        telefono: editarForm.telefono || undefined,
        new_password: editarForm.new_password || undefined,
        new_pin: editarForm.new_pin || undefined,
      });
      cerrar();
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  }

  const saving = crearMut.isPending || actualizarMut.isPending;

  return (
    <div className="p-4 lg:p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-faint)] mb-1">Admin</p>
          <h1 className="text-2xl font-bold text-[var(--color-fg)]">Usuarios</h1>
          <p className="text-sm text-[var(--color-fg-muted)] mt-0.5">
            {isLoading ? 'Cargando…' : `${usuarios.length} usuarios`}
          </p>
        </div>
        <Button size="sm" onClick={abrirCrear}>+ Nuevo Usuario</Button>
      </div>

      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="h-40 flex items-center justify-center text-sm text-[var(--color-fg-muted)]">Cargando…</div>
        ) : usuarios.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center gap-2">
            <p className="text-[var(--color-fg-muted)] text-sm">Sin usuarios registrados.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                {['Nombre', 'Email', 'Rol', 'Estado', 'Teléfono', 'Último acceso', 'Acciones'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-faint)] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.user_id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface)] transition-colors">
                  <td className="px-4 py-3 font-medium text-[var(--color-fg)]">{u.nombre}</td>
                  <td className="px-4 py-3 text-[var(--color-fg-muted)] text-xs">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${ROL_BADGE[u.rol] ?? 'bg-zinc-500/15 text-zinc-400'}`}>
                      {u.rol}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${ESTADO_BADGE[u.estado] ?? 'bg-zinc-500/15 text-zinc-400'}`}>
                      {u.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-fg-muted)] text-xs">{u.telefono ?? '—'}</td>
                  <td className="px-4 py-3 text-[var(--color-fg-muted)] text-xs">
                    {u.last_login ? new Date(u.last_login).toLocaleDateString('es-CL') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => abrirEditar(u)} className="text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors px-2 py-1 rounded hover:bg-[var(--color-border)]">
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Crear */}
      <Modal open={modal === 'crear'} onClose={cerrar} title="Nuevo Usuario" size="md">
        <div className="p-6 space-y-4">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-faint)] mb-1.5">Nombre completo *</label>
            <input value={crearForm.nombre} onChange={e => setCrearForm(p => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej: Juan Pérez"
              className="w-full h-10 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]" />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-faint)] mb-1.5">Email *</label>
            <input type="email" value={crearForm.email} onChange={e => setCrearForm(p => ({ ...p, email: e.target.value }))}
              placeholder="usuario@empresa.cl"
              className="w-full h-10 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-faint)] mb-1.5">Rol *</label>
              <select value={crearForm.rol} onChange={e => setCrearForm(p => ({ ...p, rol: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)] capitalize">
                {ROLES.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-faint)] mb-1.5">Teléfono</label>
              <input value={crearForm.telefono} onChange={e => setCrearForm(p => ({ ...p, telefono: e.target.value }))}
                placeholder="+56 9 xxxx xxxx"
                className="w-full h-10 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-faint)] mb-1.5">Contraseña *</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={crearForm.password}
                  onChange={e => setCrearForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Mín. 6 caracteres"
                  className="w-full h-10 px-3 pr-9 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]" />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-fg-faint)] hover:text-[var(--color-fg)]">
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-faint)] mb-1.5">
                PIN offline (opcional)
              </label>
              <input type="password" inputMode="numeric" pattern="\d*" maxLength={6}
                value={crearForm.pin} onChange={e => setCrearForm(p => ({ ...p, pin: e.target.value.replace(/\D/g, '') }))}
                placeholder="4-6 dígitos"
                className="w-full h-10 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm font-mono text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]" />
              <p className="text-[10px] text-[var(--color-fg-faint)] mt-1">Para acceso offline en terreno</p>
            </div>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={cerrar} fullWidth>Cancelar</Button>
            <Button onClick={guardarCrear} loading={saving} fullWidth>Crear Usuario</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Editar */}
      <Modal open={modal === 'editar'} onClose={cerrar} title={`Editar — ${editando?.nombre}`} size="md">
        <div className="p-6 space-y-4">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-faint)] mb-1.5">Nombre</label>
            <input value={editarForm.nombre} onChange={e => setEditarForm(p => ({ ...p, nombre: e.target.value }))}
              className="w-full h-10 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-faint)] mb-1.5">Rol</label>
              <select value={editarForm.rol} onChange={e => setEditarForm(p => ({ ...p, rol: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]">
                {ROLES.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-faint)] mb-1.5">Estado</label>
              <select value={editarForm.estado} onChange={e => setEditarForm(p => ({ ...p, estado: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]">
                {ESTADOS.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-faint)] mb-1.5">Teléfono</label>
            <input value={editarForm.telefono} onChange={e => setEditarForm(p => ({ ...p, telefono: e.target.value }))}
              className="w-full h-10 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]" />
          </div>
          <div className="pt-2 border-t border-[var(--color-border)]">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-faint)] mb-3">Resetear credenciales (opcional)</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[var(--color-fg-muted)] mb-1.5">Nueva contraseña</label>
                <input type="password" value={editarForm.new_password}
                  onChange={e => setEditarForm(p => ({ ...p, new_password: e.target.value }))}
                  placeholder="Dejar vacío = sin cambio"
                  className="w-full h-10 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]" />
              </div>
              <div>
                <label className="block text-xs text-[var(--color-fg-muted)] mb-1.5">Nuevo PIN offline</label>
                <input type="password" inputMode="numeric" pattern="\d*" maxLength={6}
                  value={editarForm.new_pin}
                  onChange={e => setEditarForm(p => ({ ...p, new_pin: e.target.value.replace(/\D/g, '') }))}
                  placeholder="4-6 dígitos"
                  className="w-full h-10 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm font-mono text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]" />
              </div>
            </div>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={cerrar} fullWidth>Cancelar</Button>
            <Button onClick={guardarEditar} loading={saving} fullWidth>Guardar Cambios</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
