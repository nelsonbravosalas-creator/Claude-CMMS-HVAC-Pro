import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';

const API = import.meta.env.VITE_API_URL ?? '';

export interface TipoEquipo {
  tipo_de_equipo_id: string;
  nombre: string;
  tipo_codigo?: string;
  descripcion?: string;
  categoria?: string;
  campos_dinamicos?: Record<string, unknown>;
  icono?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
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

export function useTipos() {
  const { token } = useAuth();

  return useQuery<TipoEquipo[]>({
    queryKey: ['tipos-equipo'],
    queryFn: async () => {
      const data = await apiFetch<{ tipos: TipoEquipo[] }>('/api/tipos-equipo', token);
      return data.tipos;
    },
    enabled: !!token,
    staleTime: 15 * 60 * 1000,
  });
}

export function useCrearTipo() {
  const { token } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: Pick<TipoEquipo, 'nombre' | 'tipo_codigo' | 'descripcion' | 'categoria' | 'campos_dinamicos'>) =>
      apiFetch<{ tipo: TipoEquipo }>('/api/tipos-equipo', token, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tipos-equipo'] }),
  });
}

export function useActualizarTipo() {
  const { token } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: Partial<TipoEquipo> & { id: string }) =>
      apiFetch<{ tipo: TipoEquipo }>(`/api/tipos-equipo/${id}`, token, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tipos-equipo'] }),
  });
}

export function useEliminarTipo() {
  const { token } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ message: string }>(`/api/tipos-equipo/${id}`, token, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tipos-equipo'] }),
  });
}
