import { useQuery } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema.v16';
import { useAuth } from '@/context/AuthContext';
import type { FormTemplate } from '@/db/types';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

interface FormTemplatesResponse {
  form_templates: FormTemplate[];
}

async function fetchFormTemplates(
  _clienteId: string,
  token: string | null,
  tipoId?: string,
): Promise<FormTemplate[]> {
  const params = new URLSearchParams();
  if (tipoId) params.set('tipo_id', tipoId);

  const res = await fetch(`${API_BASE}/api/form-templates?${params}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as FormTemplatesResponse;

  // Persistir en Dexie para uso offline
  await db.form_templates.bulkPut(data.form_templates);

  return data.form_templates;
}

/** Retorna la plantilla más específica para un tipo de equipo.
 *  Prioridad: plantilla específica del tipo > plantilla genérica (tipo_id = null) */
export function useFormTemplate(tipoId: string | undefined) {
  const { user, token } = useAuth();

  const serverQuery = useQuery<FormTemplate[], Error>({
    queryKey: ['form-templates', tipoId],
    queryFn: () => fetchFormTemplates(user!.cliente_id!, token, tipoId),
    enabled: !!user?.cliente_id && navigator.onLine,
    staleTime: 30 * 60 * 1000, // 30 min — plantillas no cambian frecuentemente
  });

  const dexieTemplate = useLiveQuery(async () => {
    if (!user?.cliente_id || !tipoId) return undefined;
    // Buscar plantilla específica del tipo
    const especifica = await db.form_templates
      .where('[cliente_id+tipo_id]')
      .equals([user.cliente_id, tipoId])
      .filter(t => t.activo)
      .first();
    if (especifica) return especifica;
    // Fallback: plantilla genérica (sin tipo_id asociado)
    return db.form_templates
      .where('cliente_id')
      .equals(user.cliente_id)
      .filter(t => t.activo && !t.tipo_id)
      .first();
  }, [user?.cliente_id, tipoId]);

  // La plantilla más adecuada del servidor (específica primero, genérica como fallback)
  const serverTemplate = serverQuery.data?.find(t => t.tipo_id === tipoId)
    ?? serverQuery.data?.find(t => !t.tipo_id);

  return {
    template:  serverTemplate ?? dexieTemplate,
    isLoading: serverQuery.isLoading && !dexieTemplate,
    isError:   serverQuery.isError,
  };
}

/** Lista todas las plantillas del cliente (para admin) */
export function useFormTemplates() {
  const { user, token } = useAuth();

  return useQuery<FormTemplate[], Error>({
    queryKey: ['form-templates-all'],
    queryFn: () => fetchFormTemplates(user!.cliente_id!, token),
    enabled: !!user?.cliente_id && navigator.onLine,
    staleTime: 30 * 60 * 1000,
  });
}
