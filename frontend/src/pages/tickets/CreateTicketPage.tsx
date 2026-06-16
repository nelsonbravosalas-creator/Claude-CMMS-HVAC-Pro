import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useSucursales, type Sucursal } from '@/hooks/useSucursales';
import { useEquipos, type EquipoListItem } from '@/hooks/useEquipos';
import { useUsuarios, type Usuario } from '@/hooks/useUsuarios';
import { useCrearTicket } from '@/hooks/useTickets';

const TIPOS = [
  { value: 'correctivo', label: 'Correctivo' },
  { value: 'preventivo', label: 'Preventivo' },
  { value: 'consulta', label: 'Consulta' },
];

const PRIORIDADES = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Crítica' },
];

export function CreateTicketPage() {
  const navigate = useNavigate();
  const { data: sucursalesData } = useSucursales();
  const { data: usuariosData } = useUsuarios();

  const [sucursalId, setSucursalId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState('correctivo');
  const [prioridad, setPrioridad] = useState('media');
  const [tag, setTag] = useState('');
  const [responsableId, setResponsableId] = useState('');

  const { data: equiposData } = useEquipos(
    sucursalId ? { sucursal_id: sucursalId } : undefined,
  );

  const { mutate: crear, isPending, error } = useCrearTicket();

  const sucursales: Sucursal[] = sucursalesData ?? [];
  const equipos: EquipoListItem[] = equiposData ?? [];
  const tecnicos: Usuario[] = (usuariosData ?? []).filter(
    (u: Usuario) => ['tecnico', 'supervisor', 'administrador'].includes(u.rol),
  );

  const tituloValido = titulo.trim().length >= 5;
  const descripcionValida = descripcion.trim().length >= 10;
  const puedeEnviar = !!sucursalId && tituloValido && descripcionValida;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!puedeEnviar) return;
    crear(
      {
        sucursal_id: sucursalId,
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        tipo,
        prioridad,
        tag: tag || undefined,
        responsable_tecnico_id: responsableId || undefined,
      },
      {
        onSuccess: data => {
          navigate(`/app/tickets/${data.ticket.ticket_id}`);
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
        <h1 className="text-2xl font-bold text-[var(--color-fg)]">Nuevo Ticket</h1>
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
            onChange={e => { setSucursalId(e.target.value); setTag(''); }}
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

        {/* Título */}
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-muted)] block mb-2">
            Título *
          </label>
          <input
            type="text"
            required
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            placeholder="Ej: Aire acondicionado sin enfriar"
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)] focus:outline-none focus:border-[var(--color-primary)]"
          />
          {titulo.length > 0 && !tituloValido && (
            <p className="mt-1 text-xs text-[var(--color-error)]">Mínimo 5 caracteres</p>
          )}
        </div>

        {/* Descripción */}
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-muted)] block mb-2">
            Descripción *
          </label>
          <textarea
            required
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            rows={4}
            placeholder="Describa el problema o solicitud con el mayor detalle posible"
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)] focus:outline-none focus:border-[var(--color-primary)] resize-none"
          />
          {descripcion.length > 0 && !descripcionValida && (
            <p className="mt-1 text-xs text-[var(--color-error)]">Mínimo 10 caracteres</p>
          )}
        </div>

        {/* Tipo y prioridad */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-muted)] block mb-2">
              Tipo
            </label>
            <select
              value={tipo}
              onChange={e => setTipo(e.target.value)}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-primary)]"
            >
              {TIPOS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-muted)] block mb-2">
              Prioridad
            </label>
            <select
              value={prioridad}
              onChange={e => setPrioridad(e.target.value)}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-primary)]"
            >
              {PRIORIDADES.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Equipo asociado (opcional) */}
        {sucursalId && (
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-muted)] block mb-2">
              Equipo asociado (opcional)
            </label>
            <select
              value={tag}
              onChange={e => setTag(e.target.value)}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="">Ninguno</option>
              {equipos.map(eq => (
                <option key={eq.equipo_id} value={eq.tag}>
                  {eq.tag} — {eq.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Responsable asignado */}
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-muted)] block mb-2">
            Responsable técnico (opcional)
          </label>
          <select
            value={responsableId}
            onChange={e => setResponsableId(e.target.value)}
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
            disabled={isPending || !puedeEnviar}
            className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold disabled:opacity-50 transition-opacity"
          >
            {isPending ? 'Creando…' : 'Crear Ticket'}
          </button>
        </div>
      </form>
    </div>
  );
}
