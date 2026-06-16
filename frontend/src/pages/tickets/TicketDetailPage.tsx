/**
 * TicketDetailPage — Detalle de un Ticket (Sprint 5)
 * Info + timeline de comentarios + botones de transición de estado
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { useTicketDetail, useTransicionarTicket, useComentarTicket, useAsignarTicket } from '@/hooks/useTickets';
import { ticketMachine, transicionesDisponibles, type TicketState } from '@/domain/tickets/ticket.machine';
import { can, type Role } from '@/domain/permissions/permissions';
import { useUsuarios, type Usuario } from '@/hooks/useUsuarios';
import { SyncStatusBadge } from '@/components/shared/SyncStatusBadge';

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
  baja:    'var(--color-fg-faint)',
  media:   'var(--color-info)',
  alta:    'var(--color-warning)',
  critica: 'var(--color-error)',
};

const TIPO_LABEL: Record<string, string> = {
  correctivo: 'Correctivo',
  preventivo: 'Preventivo',
  consulta:   'Consulta',
};

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const rol = (user?.rol ?? 'cliente') as Role;

  const { ticket, comments, isLoading } = useTicketDetail(id);
  const { data: usuariosData } = useUsuarios();
  const transicionar = useTransicionarTicket();
  const comentar = useComentarTicket();
  const asignar = useAsignarTicket();

  const [accionPendiente, setAccionPendiente] = useState<TicketState | null>(null);
  const [texto, setTexto] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [reasignando, setReasignando] = useState(false);
  const [responsableId, setResponsableId] = useState('');
  const [proveedorId, setProveedorId] = useState('');

  if (isLoading && !ticket) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl space-y-4">
        <div className="h-20 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl animate-pulse" />
        <div className="h-32 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-6 lg:p-8 text-center">
        <p className="text-[var(--color-fg-muted)] font-mono">Ticket no encontrado</p>
        <button
          onClick={() => navigate('/app/tickets')}
          className="mt-4 text-[var(--color-primary)] text-sm underline"
        >
          Volver a la lista
        </button>
      </div>
    );
  }

  const usuarios: Usuario[] = usuariosData ?? [];
  const tecnicos = usuarios.filter(u => ['tecnico', 'supervisor', 'administrador'].includes(u.rol));
  const proveedores = usuarios.filter(u => u.rol === 'proveedor');

  const estado = ticket.estado as TicketState;
  const opcionesTransicion = transicionesDisponibles(estado, rol);

  const requiereEvidencia = (to: TicketState): boolean => {
    const r = ticketMachine.can(estado, to, rol, {});
    return !r.ok && r.code === 'EVIDENCIA_REQUERIDA';
  };

  const handleClickTransicion = (to: TicketState) => {
    if (requiereEvidencia(to)) {
      setAccionPendiente(to);
      setTexto('');
      setFotoUrl('');
    } else {
      transicionar.mutate({ ticketId: ticket.ticket_id, to });
    }
  };

  const confirmarTransicion = () => {
    if (!accionPendiente) return;
    transicionar.mutate(
      { ticketId: ticket.ticket_id, to: accionPendiente, texto: texto || undefined, foto_url: fotoUrl || undefined },
      { onSuccess: () => setAccionPendiente(null) },
    );
  };

  const handleComentar = () => {
    if (!nuevoComentario.trim()) return;
    comentar.mutate(
      { ticketId: ticket.ticket_id, texto: nuevoComentario.trim() },
      { onSuccess: () => setNuevoComentario('') },
    );
  };

  const handleAsignar = () => {
    asignar.mutate(
      { ticketId: ticket.ticket_id, responsable_tecnico_id: responsableId || undefined, proveedor_asignado_id: proveedorId || undefined },
      { onSuccess: () => setReasignando(false) },
    );
  };

  const puedeAsignar = can(rol, 'ticket:asignar_responsable') || can(rol, 'ticket:asignar_proveedor');

  return (
    <div className="p-6 lg:p-8 max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/app/tickets')}
            className="text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] font-mono mb-2 flex items-center gap-1"
          >
            ← Tickets
          </button>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-faint)] mb-0.5">
            #{ticket.numero_correlativo ?? '—'} · {TIPO_LABEL[ticket.tipo] ?? ticket.tipo}
            {ticket.tag && ` · ${ticket.tag}`}
          </p>
          <h1 className="text-xl font-bold text-[var(--color-fg)]">{ticket.titulo}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span
              className="text-xs font-mono font-bold px-2 py-0.5 rounded-full border"
              style={{
                color:       ESTADO_COLOR[ticket.estado],
                borderColor: `${ESTADO_COLOR[ticket.estado]}40`,
                background:  `${ESTADO_COLOR[ticket.estado]}12`,
              }}
            >
              {ESTADO_LABEL[ticket.estado]}
            </span>
            <span className="text-[var(--color-fg-faint)]">·</span>
            <span className="text-xs font-mono font-bold" style={{ color: PRIORIDAD_COLOR[ticket.prioridad] }}>
              ● {ticket.prioridad}
            </span>
          </div>
        </div>
        <SyncStatusBadge />
      </div>

      {/* Info */}
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4 space-y-3">
        <p className="text-sm text-[var(--color-fg)] whitespace-pre-line">{ticket.descripcion}</p>
        <div className="grid grid-cols-2 gap-3 text-xs font-mono text-[var(--color-fg-muted)] pt-2 border-t border-[var(--color-border)]">
          {ticket.sucursal_nombre && <span>Sucursal: {ticket.sucursal_nombre}</span>}
          {ticket.equipo_nombre && <span>Equipo: {ticket.equipo_nombre}</span>}
          {ticket.creador_nombre && <span>Creado por: {ticket.creador_nombre}</span>}
          <span>Creado: {new Date(ticket.created_at).toLocaleString('es-CL')}</span>
          {ticket.responsable_tecnico_nombre && <span>Responsable: {ticket.responsable_tecnico_nombre}</span>}
          {ticket.proveedor_asignado_nombre && <span>Proveedor: {ticket.proveedor_asignado_nombre}</span>}
        </div>

        {puedeAsignar && estado !== 'cerrado' && (
          <div className="pt-2 border-t border-[var(--color-border)]">
            {!reasignando ? (
              <button
                onClick={() => setReasignando(true)}
                className="text-xs text-[var(--color-primary)] hover:underline font-mono"
              >
                Reasignar responsable / proveedor
              </button>
            ) : (
              <div className="space-y-2">
                <select
                  value={responsableId}
                  onChange={e => setResponsableId(e.target.value)}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-fg)]"
                >
                  <option value="">Mantener responsable actual</option>
                  {tecnicos.map(u => (
                    <option key={u.user_id} value={u.user_id}>{u.nombre} ({u.rol})</option>
                  ))}
                </select>
                <select
                  value={proveedorId}
                  onChange={e => setProveedorId(e.target.value)}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-fg)]"
                >
                  <option value="">Mantener proveedor actual</option>
                  {proveedores.map(u => (
                    <option key={u.user_id} value={u.user_id}>{u.nombre}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => setReasignando(false)}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-fg-muted)]"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAsignar}
                    disabled={asignar.isPending}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-xs font-semibold disabled:opacity-50"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Acciones de transición */}
      {opcionesTransicion.length > 0 && (
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-[var(--color-fg-secondary)] uppercase tracking-widest">
            Acciones
          </h2>
          <div className="flex gap-2 flex-wrap">
            {opcionesTransicion.map(to => (
              <button
                key={to}
                onClick={() => handleClickTransicion(to)}
                disabled={transicionar.isPending}
                className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition-opacity"
                style={{
                  background: ESTADO_COLOR[to],
                  color: 'white',
                }}
              >
                → {ESTADO_LABEL[to]}
              </button>
            ))}
          </div>

          {accionPendiente && (
            <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
              <p className="text-xs text-[var(--color-fg-muted)]">
                Esta transición requiere un comentario de al menos 20 caracteres o una foto.
              </p>
              <textarea
                value={texto}
                onChange={e => setTexto(e.target.value)}
                rows={3}
                placeholder="Describa la evidencia…"
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)] resize-none"
              />
              <input
                type="url"
                value={fotoUrl}
                onChange={e => setFotoUrl(e.target.value)}
                placeholder="URL de foto (opcional)"
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)]"
              />
              {transicionar.isError && (
                <p className="text-xs text-[var(--color-error)]">{(transicionar.error as Error).message}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setAccionPendiente(null)}
                  className="flex-1 px-3 py-2 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-fg-muted)]"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarTransicion}
                  disabled={transicionar.isPending || (texto.trim().length < 20 && !fotoUrl)}
                  className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-primary)] text-white text-xs font-semibold disabled:opacity-50"
                >
                  Confirmar → {ESTADO_LABEL[accionPendiente]}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Timeline de comentarios */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--color-fg-secondary)] uppercase tracking-widest mb-3">
          Historial ({comments.length})
        </h2>
        <div className="space-y-3">
          {comments.length === 0 ? (
            <p className="text-sm text-[var(--color-fg-muted)] font-mono">Sin comentarios aún</p>
          ) : (
            comments.map(c => (
              <div
                key={c.ticket_comment_id}
                className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-semibold text-[var(--color-fg)]">
                    {c.creador_nombre ?? 'Usuario'}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--color-fg-faint)]">
                    {new Date(c.created_at).toLocaleString('es-CL')}
                  </span>
                </div>
                {c.estado_nuevo && (
                  <p className="text-[10px] font-mono uppercase tracking-wide text-[var(--color-primary)] mb-1.5">
                    {c.estado_anterior ? `${ESTADO_LABEL[c.estado_anterior]} → ` : ''}{ESTADO_LABEL[c.estado_nuevo]}
                  </p>
                )}
                {c.texto && <p className="text-sm text-[var(--color-fg)] whitespace-pre-line">{c.texto}</p>}
                {c.foto_url && (
                  <a
                    href={c.foto_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block mt-2 text-xs text-[var(--color-primary)] underline"
                  >
                    Ver foto adjunta
                  </a>
                )}
              </div>
            ))
          )}
        </div>

        {estado !== 'cerrado' && (
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={nuevoComentario}
              onChange={e => setNuevoComentario(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleComentar()}
              placeholder="Agregar comentario…"
              className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)]"
            />
            <button
              onClick={handleComentar}
              disabled={comentar.isPending || !nuevoComentario.trim()}
              className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold disabled:opacity-50"
            >
              Enviar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
