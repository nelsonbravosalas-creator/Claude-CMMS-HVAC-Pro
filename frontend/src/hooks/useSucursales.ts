import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';

const API = import.meta.env.VITE_API_URL ?? '';

export interface Sucursal {
  sucursal_id: string;
  nombre: string;
  codigo: string;
  direccion?: string;
  ciudad?: string;
  region?: string;
  pais?: string;
  latitud?: number;
  longitud?: number;
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

export function useSucursales() {
  const { token } = useAuth();

  return useQuery<Sucursal[]>({
    queryKey: ['sucursales'],
    queryFn: async () => {
      const data = await apiFetch<{ sucursales: Sucursal[] }>('/api/sucursales', token);
      return data.sucursales;
    },
    enabled: !!token,
    staleTime: 10 * 60 * 1000,
  });
}

export function useCrearSucursal() {
  const { token } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: Omit<Sucursal, 'sucursal_id' | 'activo' | 'created_at' | 'updated_at'>) =>
      apiFetch<{ sucursal: Sucursal }>('/api/sucursales', token, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sucursales'] }),
  });
}

export function useActualizarSucursal() {
  const { token } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Sucursal> & { id: string }) =>
      apiFetch<{ sucursal: Sucursal }>(`/api/sucursales/${id}`, token, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sucursales'] }),
  });
}

export function useEliminarSucursal() {
  const { token } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ message: string }>(`/api/sucursales/${id}`, token, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sucursales'] }),
  });
}
