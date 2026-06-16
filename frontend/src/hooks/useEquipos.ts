import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';

const API = import.meta.env.VITE_API_URL ?? '';

export interface EquipoListItem {
  equipo_id: string;
  tag: string;
  nombre: string;
  marca?: string;
  modelo?: string;
  numero_serie?: string;
  estado: string;
  criticidad: string;
  sucursal_id?: string;
  sucursal_nombre?: string;
  sucursal_codigo?: string;
  tipo_de_equipo_id?: string;
  tipo_nombre?: string;
  tipo_codigo?: string;
  created_at: string;
}

export interface EquipoDetalle extends EquipoListItem {
  descripcion?: string;
  fecha_instalacion?: string;
  fecha_garantia_vence?: string;
  variables_fijas_tipo?: Record<string, unknown>;
  foto_url?: string;
  campos_dinamicos?: Record<string, unknown>;
}

export interface OTHistorial {
  work_order_id: string;
  folio?: string;
  tipo: string;
  estado: string;
  fecha_programada?: string;
  updated_at: string;
  asset_estado: string;
}

export interface FiltrosEquipos {
  sucursal_id?: string;
  tipo_id?: string;
  estado?: string;
  criticidad?: string;
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

export function useEquipos(filtros?: FiltrosEquipos) {
  const { token } = useAuth();
  const params = new URLSearchParams();
  if (filtros?.sucursal_id) params.set('sucursal_id', filtros.sucursal_id);
  if (filtros?.tipo_id)     params.set('tipo_id', filtros.tipo_id);
  if (filtros?.estado)      params.set('estado', filtros.estado);
  if (filtros?.criticidad)  params.set('criticidad', filtros.criticidad);
  const qs = params.toString();

  return useQuery<EquipoListItem[]>({
    queryKey: ['equipos', filtros],
    queryFn: async () => {
      const data = await apiFetch<{ equipos: EquipoListItem[] }>(`/api/equipos${qs ? '?' + qs : ''}`, token);
      return data.equipos;
    },
    enabled: !!token,
    staleTime: 3 * 60 * 1000,
  });
}

export function useEquipoDetalle(tag: string | undefined) {
  const { token } = useAuth();

  return useQuery<{ equipo: EquipoDetalle; ots: OTHistorial[] }>({
    queryKey: ['equipo-detalle', tag],
    queryFn: async () => {
      const data = await apiFetch<{ equipo: EquipoDetalle; ots: OTHistorial[] }>(
        `/api/equipos/${encodeURIComponent(tag!)}`,
        token,
      );
      return data;
    },
    enabled: !!token && !!tag,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCrearEquipo() {
  const { token } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      sucursal_id: string;
      tipo_id: string;
      nombre: string;
      descripcion?: string;
      marca?: string;
      modelo?: string;
      numero_serie?: string;
      estado?: string;
      criticidad?: string;
      fecha_instalacion?: string;
      fecha_garantia_vence?: string;
      variables_fijas_tipo?: Record<string, unknown>;
    }) =>
      apiFetch<{ equipo: EquipoListItem }>('/api/equipos', token, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipos'] }),
  });
}

export function useActualizarEquipo() {
  const { token } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ tag, ...body }: Partial<EquipoDetalle> & { tag: string }) =>
      apiFetch<{ equipo: EquipoListItem }>(`/api/equipos/${encodeURIComponent(tag)}`, token, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['equipos'] });
      qc.invalidateQueries({ queryKey: ['equipo-detalle', vars.tag] });
    },
  });
}

export function useRetirarEquipo() {
  const { token } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (tag: string) =>
      apiFetch<{ message: string }>(`/api/equipos/${encodeURIComponent(tag)}`, token, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipos'] }),
  });
}
