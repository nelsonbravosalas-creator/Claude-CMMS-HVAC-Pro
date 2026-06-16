/**
 * Hooks de Tickets (Sprint 5).
 *
 * Lectura: online-first (TanStack Query) con fallback a Dexie si no hay red.
 * Escritura (crear/transicionar/comentar/asignar): online-only — las
 * transiciones exigen validación de evidencia y el límite de devueltas
 * semanales en servidor, por lo que no tiene sentido encolarlas para
 * sincronización offline como sí ocurre con los checklists de OT.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema.v16';
import { useAuth } from '@/context/AuthContext';
import type { Ticket, TicketComment } from '@/db/types';

const API = import.meta.env.VITE_API_URL ?? '';

export interface TicketListItem extends Ticket {
  sucursal_nombre?: string;
  equipo_nombre?: string;
  responsable_tecnico_nombre?: string;
  proveedor_asignado_nombre?: string;
  creador_nombre?: string;
}

export interface TicketCommentItem extends TicketComment {
  creador_nombre?: string;
}

export interface TicketFiltros {
  estado?: Ticket['estado'];
  tipo?: Ticket['tipo'];
  prioridad?: Ticket['prioridad'];
  responsable_tecnico_id?: string;
  tag?: string;
}

async function apiFetch<T>(path: string, token: string | null, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers ?? {}),
    },
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function buildQuery(filtros: TicketFiltros): string {
  const params = new URLSearchParams();
  if (filtros.estado)                 params.set('estado', filtros.estado);
  if (filtros.tipo)                   params.set('tipo', filtros.tipo);
  if (filtros.prioridad)              params.set('prioridad', filtros.prioridad);
  if (filtros.responsable_tecnico_id) params.set('responsable_tecnico_id', filtros.responsable_tecnico_id);
  if (filtros.tag)                    params.set('tag', filtros.tag);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useTickets(filtros: TicketFiltros = {}) {
  const { user, token } = useAuth();

  const serverQuery = useQuery<TicketListItem[], Error>({
    queryKey: ['tickets', filtros],
    queryFn: async () => {
      const data = await apiFetch<{ tickets: TicketListItem[] }>(`/api/tickets${buildQuery(filtros)}`, token);
      await db.tickets.bulkPut(data.tickets);
      return data.tickets;
    },
    enabled: navigator.onLine && !!user,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const dexieData = useLiveQuery(async () => {
    if (!user?.cliente_id) return [];
    if (filtros.estado) {
      return db.tickets
        .where('[cliente_id+estado]')
        .equals([user.cliente_id, filtros.estado])
        .reverse()
        .toArray();
    }
    return db.tickets
      .where('ticket_id')
      .startsWith('')
      .filter(t => t.cliente_id === user.cliente_id)
      .reverse()
      .sortBy('updated_at');
  }, [user?.cliente_id, filtros.estado]);

  return {
    data:      serverQuery.data ?? (dexieData as TicketListItem[] | undefined) ?? [],
    isLoading: serverQuery.isLoading && !dexieData,
    isError:   serverQuery.isError,
    error:     serverQuery.error,
    isOffline: !navigator.onLine,
  };
}

export function useTicketDetail(ticketId: string | undefined) {
  const { token } = useAuth();

  const serverQuery = useQuery<{ ticket: TicketListItem; comments: TicketCommentItem[] }, Error>({
    queryKey: ['ticket-detail', ticketId],
    queryFn: async () => {
      const data = await apiFetch<{ ticket: TicketListItem; comments: TicketCommentItem[] }>(
        `/api/tickets/${ticketId}`,
        token,
      );
      await db.tickets.put(data.ticket);
      await db.ticket_comments.bulkPut(data.comments);
      return data;
    },
    enabled: !!ticketId && navigator.onLine,
    staleTime: 30 * 1000,
  });

  const dexieTicket = useLiveQuery(
    () => (ticketId ? db.tickets.get(ticketId) : undefined),
    [ticketId],
  );
  const dexieComments = useLiveQuery(
    () => (ticketId ? db.ticket_comments.where('ticket_id').equals(ticketId).sortBy('created_at') : []),
    [ticketId],
  );

  return {
    ticket:    serverQuery.data?.ticket ?? (dexieTicket as TicketListItem | undefined),
    comments:  serverQuery.data?.comments ?? (dexieComments as TicketCommentItem[] | undefined) ?? [],
    isLoading: serverQuery.isLoading && !dexieTicket,
    isError:   serverQuery.isError,
    isOffline: !navigator.onLine,
  };
}

export interface CrearTicketBody {
  sucursal_id: string;
  titulo: string;
  descripcion: string;
  tipo?: string;
  prioridad?: string;
  tag?: string;
  responsable_tecnico_id?: string;
}

export function useCrearTicket() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CrearTicketBody) =>
      apiFetch<{ ticket: { ticket_id: string } }>('/api/tickets', token, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  });
}

export function useTransicionarTicket() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, to, texto, foto_url }: {
      ticketId: string; to: string; texto?: string; foto_url?: string;
    }) =>
      apiFetch(`/api/tickets/${ticketId}?action=transicionar`, token, {
        method: 'PATCH',
        body: JSON.stringify({ to, texto, foto_url }),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['ticket-detail', vars.ticketId] });
    },
  });
}

export function useComentarTicket() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, texto, foto_url }: { ticketId: string; texto?: string; foto_url?: string }) =>
      apiFetch(`/api/tickets/${ticketId}?action=comentar`, token, {
        method: 'PATCH',
        body: JSON.stringify({ texto, foto_url }),
      }),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['ticket-detail', vars.ticketId] }),
  });
}

export function useAsignarTicket() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, ...body }: {
      ticketId: string; responsable_tecnico_id?: string; proveedor_asignado_id?: string;
    }) =>
      apiFetch(`/api/tickets/${ticketId}?action=asignar`, token, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['ticket-detail', vars.ticketId] });
    },
  });
}
