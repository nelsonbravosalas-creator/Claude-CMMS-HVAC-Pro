import { useQuery } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema.v16';
import { useAuth } from '@/context/AuthContext';
import type { WorkOrder } from '@/db/types';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export interface OTFiltros {
  estado?: WorkOrder['estado'];
  tipo?: WorkOrder['tipo'];
  sucursal_id?: string;
}

interface OTListItem extends WorkOrder {
  sucursal_nombre?: string;
  tecnico_nombre?: string;
  total_assets: number;
  completados: number;
  omitidos: number;
}

interface OTListResponse {
  work_orders: OTListItem[];
}

async function fetchOTs(token: string | null, filtros: OTFiltros): Promise<OTListItem[]> {
  const params = new URLSearchParams();
  if (filtros.estado)     params.set('estado', filtros.estado);
  if (filtros.tipo)       params.set('tipo', filtros.tipo);
  if (filtros.sucursal_id) params.set('sucursal_id', filtros.sucursal_id);

  const res = await fetch(`${API_BASE}/api/work-orders?${params}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as OTListResponse;

  // Persistir en Dexie para disponibilidad offline
  await db.work_orders.bulkPut(
    data.work_orders.map(ot => ({
      ...ot,
      consumo_editado_manually: false,
      version: 1,
    })),
  );

  return data.work_orders;
}

export function useOTs(filtros: OTFiltros = {}) {
  const { user, token } = useAuth();

  const serverQuery = useQuery<OTListItem[], Error>({
    queryKey: ['work-orders', filtros],
    queryFn: () => fetchOTs(token, filtros),
    staleTime: 5 * 60 * 1000,
    enabled: navigator.onLine && !!user,
    retry: 1,
  });

  // Fallback offline: Dexie live query
  const dexieData = useLiveQuery(async () => {
    if (!user?.cliente_id) return [];
    // Usamos índice compuesto si tenemos estado
    if (filtros.estado) {
      return db.work_orders
        .where('[cliente_id+estado]')
        .equals([user.cliente_id, filtros.estado])
        .reverse()
        .toArray();
    }

    return db.work_orders
      .where('work_order_id')
      .startsWith('')
      .filter(wo => wo.cliente_id === user.cliente_id)
      .reverse()
      .sortBy('updated_at');
  }, [user?.cliente_id, filtros.estado]);

  return {
    data:      serverQuery.data ?? (dexieData as OTListItem[] | undefined) ?? [],
    isLoading: serverQuery.isLoading && !dexieData,
    isError:   serverQuery.isError,
    error:     serverQuery.error,
    isOffline: !navigator.onLine,
  };
}
