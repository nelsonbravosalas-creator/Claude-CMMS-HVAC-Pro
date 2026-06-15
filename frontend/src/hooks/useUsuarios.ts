import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';

const API = import.meta.env.VITE_API_URL ?? '';

export interface Usuario {
  user_id: string;
  nombre: string;
  email: string;
  rol: string;
  estado: string;
  telefono?: string;
  activo: boolean;
  last_login?: string;
  created_at: string;
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

export function useUsuarios() {
  const { token } = useAuth();
  return useQuery<Usuario[]>({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const data = await apiFetch<{ usuarios: Usuario[] }>('/api/usuarios', token);
      return data.usuarios;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCrearUsuario() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      nombre: string;
      email: string;
      rol: string;
      password: string;
      pin?: string;
      telefono?: string;
    }) =>
      apiFetch<{ usuario: Usuario }>('/api/usuarios', token, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}

export function useActualizarUsuario() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Usuario> & { id: string; new_password?: string; new_pin?: string }) =>
      apiFetch<{ usuario: Usuario }>(`/api/usuarios/${id}`, token, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}
