import { useState, useRef } from 'react';
import { Link } from 'react-router';
import QRCode from 'react-qr-code';
import {
  useEquipos,
  useCrearEquipo,
  useActualizarEquipo,
  useRetirarEquipo,
  type EquipoListItem,
} from '@/hooks/useEquipos';
import { useSucursales } from '@/hooks/useSucursales';
import { useTipos } from '@/hooks/useTipos';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/ui/Button';

interface FormData {
  sucursal_id: string;
  tipo_id: string;
  nombre: string;
  descripcion: string;
  marca: string;
  modelo: string;
  numero_serie: string;
  estado: string;
  criticidad: string;
  fecha_instalacion: string;
  fecha_garantia_vence: string;
}

const EMPTY: FormData = {
  sucursal_id: '', tipo_id: '', nombre: '', descripcion: '',
  marca: '', modelo: '', numero_serie: '',
  estado: 'operativo', criticidad: 'media',
  fecha_instalacion: '', fecha_garantia_vence: '',
};

const ESTADO_BADGE: Record<string, string> = {
  operativo:     'bg-green-500/15 text-green-400',
  falla:         'bg-red-500/15 text-red-400',
  mantenimiento: 'bg-yellow-500/15 text-yellow-400',
  baja:          'bg-zinc-500/15 text-zinc-400',
};

const CRITICA_BADGE: Record<string, string> = {
  critica: 'bg-red-500/15 text-red-400',
  alta:    'bg-orange-500/15 text-orange-400',
  media:   'bg-yellow-500/15 text-yellow-400',
  baja:    'bg-green-500/15 text-green-400',
};

export function EquiposAdminPage() {
  const { data: equipos = [], isLoading } = useEquipos();
  const { data: sucursales = [] } = useSucursales();
  const { data: tipos = [] } = useTipos();
  const crearMut = useCrearEquipo();
  const actualizarMut = useActualizarEquipo();
  const retirarMut = useRetirarEquipo();

  const [modal, setModal] = useState<null | 'crear' | 'editar' | 'qr' | 'confirmar'>(null);
  const [editando, setEditando] = useState<EquipoListItem | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [error, setError] = useState('');
  const [nuevoTag, setNuevoTag] = useState('');
  const [tagARetirar, setTagARetirar] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  function abrirCrear() { setForm(EMPTY); setError(''); setModal('crear'); }

  function abrirEditar(eq: EquipoListItem) {
    setEditando(eq);
    setForm({
      sucursal_id: eq.sucursal_id ?? '',
      tipo_id: eq.tipo_de_equipo_id ?? '',
      nombre: eq.nombre,
      descripcion: '',
      marca: eq.marca ?? '',
      modelo: eq.modelo ?? '',
      numero_serie: eq.numero_serie ?? '',
      estado: eq.estado,
      criticidad: eq.criticidad,
      fecha_instalacion: '',
      fecha_garantia_vence: '',
    });
    setError('');
    setModal('editar');
  }

  function cerrar() { setModal(null); setEditando(null); setError(''); }

  async function guardar() {
    setError('');
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return; }
    if (modal === 'crear' && (!form.sucursal_id || !form.tipo_id)) {
      setError('Sucursal y tipo de equipo son requeridos'); return;
    }
    try {
      if (modal === 'crear') {
        const { equipo } = await crearMut.mutateAsync({
          sucursal_id: form.sucursal_id,
          tipo_id: form.tipo_id,
          nombre: form.nombre,
          descripcion: form.descripcion || undefined,
          marca: form.marca || undefined,
          modelo: form.modelo || undefined,
          numero_serie: form.numero_serie || undefined,
          estado: form.estado,
          criticidad: form.criticidad,
          fecha_instalacion: form.fecha_instalacion || undefined,
          fecha_garantia_vence: form.fecha_garantia_vence || undefined,
        });
        setNuevoTag(equipo.tag);
        setModal('qr');
      } else if (editando) {
        await actualizarMut.mutateAsync({
          tag: editando.tag,
          nombre: form.nombre,
          marca: form.marca || undefined,
          modelo: form.modelo || undefined,
          numero_serie: form.numero_serie || undefined,
          estado: form.estado,
          criticidad: form.criticidad,
        });
        cerrar();
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  }

  function handlePrint() {
    const win = window.open('', '_blank', 'width=400,height=400');
    if (!win || !printRef.current) return;
    const svg = printRef.current.innerHTML;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etiqueta ${nuevoTag}</title>
        <style>
          body { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0; font-family:monospace; background:#fff; }
          h2 { font-size:20px; margin-bottom:8px; }
          p { font-size:11px; color:#666; }
        </style>
      </head>
      <body>
        ${svg}
        <h2 style="margin-top:12px">${nuevoTag}</h2>
        <p>CMMS HVAC Pro</p>
        <script>window.onload=()=>{window.print();window.close();}<\/script>
      </body>
      </html>
    `);
    win.document.close();
  }

  const saving = crearMut.isPending || actualizarMut.isPending;

  return (
    <div className="p-4 lg:p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-faint)] mb-1">Admin</p>
          <h1 className="text-2xl font-bold text-[var(--color-fg)]">Alta de Equipos</h1>
          <p className="text-sm text-[var(--color-fg-muted)] mt-0.5">
            {isLoading ? 'Cargando…' : `${equipos.length} equipos registrados`}
          </p>
        </div>
        <Button size="sm" onClick={abrirCrear}>+ Nuevo Equipo</Button>
      </div>

      {/* Tabla */}
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="h-40 flex items-center justify-center text-sm text-[var(--color-fg-muted)]">Cargando…</div>
        ) : equipos.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center gap-2">
            <p className="text-[var(--color-fg-muted)] text-sm">Sin equipos registrados.</p>
            <button onClick={abrirCrear} className="text-[var(--color-primary)] text-sm hover:underline">+ Registrar primer equipo</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  {['TAG', 'Nombre', 'Tipo', 'Sucursal', 'Estado', 'Criticidad', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-faint)] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {equipos.map(eq => (
                  <tr key={eq.tag} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface)] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-[var(--color-primary)] whitespace-nowrap">{eq.tag}</td>
                    <td className="px-4 py-3 text-[var(--color-fg)] max-w-[180px] truncate">{eq.nombre}</td>
                    <td className="px-4 py-3 text-[var(--color-fg-muted)] whitespace-nowrap">{eq.tipo_nombre ?? '—'}</td>
                    <td className="px-4 py-3 text-[var(--color-fg-muted)] whitespace-nowrap">{eq.sucursal_codigo ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${ESTADO_BADGE[eq.estado] ?? 'bg-zinc-500/15 text-zinc-400'}`}>
                        {eq.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${CRITICA_BADGE[eq.criticidad] ?? 'bg-zinc-500/15 text-zinc-400'}`}>
                        {eq.criticidad}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link to={`/app/equipos/${encodeURIComponent(eq.tag)}`} className="text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] px-2 py-1 rounded hover:bg-[var(--color-border)] transition-colors">
                          Ver
                        </Link>
                        <button onClick={() => abrirEditar(eq)} className="text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] px-2 py-1 rounded hover:bg-[var(--color-border)] transition-colors">
                          Editar
                        </button>
                        <button onClick={() => { setNuevoTag(eq.tag); setModal('qr'); }} className="text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-primary)] px-2 py-1 rounded hover:bg-[var(--color-border)] transition-colors">
                          QR
                        </button>
                        {eq.estado !== 'baja' && (
                          <button onClick={() => { setTagARetirar(eq.tag); setModal('confirmar'); }} className="text-xs text-[var(--color-fg-muted)] hover:text-red-400 px-2 py-1 rounded hover:bg-[var(--color-border)] transition-colors">
                            Retirar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal crear/editar */}
      <Modal open={modal === 'crear' || modal === 'editar'} onClose={cerrar} title={modal === 'crear' ? 'Nuevo Equipo' : 'Editar Equipo'} size="lg">
        <div className="p-6 space-y-4">
          {modal === 'crear' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-faint)] mb-1.5">Sucursal *</label>
                <select
                  value={form.sucursal_id}
                  onChange={e => setForm(p => ({ ...p, sucursal_id: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="">Seleccionar…</option>
                  {sucursales.filter(s => s.activo).map(s => (
                    <option key={s.sucursal_id} value={s.sucursal_id}>{s.codigo} — {s.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-faint)] mb-1.5">Tipo de Equipo *</label>
                <select
                  value={form.tipo_id}
                  onChange={e => setForm(p => ({ ...p, tipo_id: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="">Seleccionar…</option>
                  {tipos.filter(t => t.activo).map(t => (
                    <option key={t.tipo_de_equipo_id} value={t.tipo_de_equipo_id}>[{t.tipo_codigo ?? '?'}] {t.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-faint)] mb-1.5">Nombre *</label>
            <input
              value={form.nombre}
              onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej: Split Sala de Servidores"
              className="w-full h-10 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {(['marca', 'modelo', 'numero_serie'] as const).map(f => (
              <div key={f} className={f === 'numero_serie' ? 'col-span-2 sm:col-span-1' : ''}>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-faint)] mb-1.5">
                  {f === 'numero_serie' ? 'N° Serie' : f.charAt(0).toUpperCase() + f.slice(1)}
                </label>
                <input
                  value={form[f]}
                  onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-faint)] mb-1.5">Estado</label>
              <select value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]">
                <option value="operativo">Operativo</option>
                <option value="falla">Falla</option>
                <option value="mantenimiento">Mantención</option>
                <option value="baja">Baja</option>
              </select>
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-faint)] mb-1.5">Criticidad</label>
              <select value={form.criticidad} onChange={e => setForm(p => ({ ...p, criticidad: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]">
                <option value="critica">Crítica</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>
          </div>

          {modal === 'crear' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-faint)] mb-1.5">Fecha Instalación</label>
                <input type="date" value={form.fecha_instalacion} onChange={e => setForm(p => ({ ...p, fecha_instalacion: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]" />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-faint)] mb-1.5">Vence Garantía</label>
                <input type="date" value={form.fecha_garantia_vence} onChange={e => setForm(p => ({ ...p, fecha_garantia_vence: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]" />
              </div>
            </div>
          )}

          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={cerrar} fullWidth>Cancelar</Button>
            <Button onClick={guardar} loading={saving} fullWidth>
              {modal === 'crear' ? 'Registrar Equipo' : 'Guardar Cambios'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal QR */}
      <Modal open={modal === 'qr'} onClose={() => { setModal(null); setNuevoTag(''); }} title="Etiqueta QR" size="sm">
        <div className="p-6 flex flex-col items-center gap-4">
          <p className="text-sm text-[var(--color-fg-muted)] text-center">
            Imprime y pega esta etiqueta en el equipo.
          </p>
          <div ref={printRef} className="bg-white p-4 rounded-xl">
            <QRCode value={nuevoTag} size={180} />
          </div>
          <p className="font-mono text-lg font-bold text-[var(--color-fg)]">{nuevoTag}</p>
          <div className="flex gap-3 w-full">
            <Button variant="secondary" onClick={() => { setModal(null); setNuevoTag(''); }} fullWidth>Cerrar</Button>
            <Button onClick={handlePrint} fullWidth>Imprimir Etiqueta</Button>
          </div>
        </div>
      </Modal>

      {/* Modal confirmar retirar */}
      <Modal open={modal === 'confirmar'} onClose={() => setModal(null)} title="Retirar equipo" size="sm">
        <div className="p-6 space-y-4">
          <p className="text-sm text-[var(--color-fg-muted)]">
            ¿Retirar el equipo <strong className="font-mono text-[var(--color-primary)]">{tagARetirar}</strong>? Se marcará como "baja" y no aparecerá en el inventario activo.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setModal(null)} fullWidth>Cancelar</Button>
            <Button
              variant="danger"
              loading={retirarMut.isPending}
              onClick={() => retirarMut.mutateAsync(tagARetirar).then(() => setModal(null))}
              fullWidth
            >
              Retirar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
