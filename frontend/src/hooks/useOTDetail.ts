import { useQuery } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema.v16';
import { useAuth } from '@/context/AuthContext';
import type { WorkOrder, WorkOrderAsset } from '@/db/types';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

interface OTAssetDetail extends WorkOrderAsset {
  tag: string;
  equipo_nombre: string;
  marca?: string;
  modelo?: string;
  tipo_id: string;
  tipo_nombre: string;
  equipo_estado: string;
  criticidad: string;
}

interface OTDetailResponse {
  work_order: WorkOrder & { sucursal_nombre?: string; tecnico_nombre?: string };
  assets: OTAssetDetail[];
}

async function fetchOTDetail(workOrderId: string, token: string | null): Promise<OTDetailResponse> {
  const res = await fetch(`${API_BASE}/api/work-orders/${workOrderId}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as OTDetailResponse;

  // Persistir en Dexie
  await db.work_orders.put({ ...data.work_order, consumo_editado_manually: false, version: 1 });
  await db.work_order_assets.bulkPut(data.assets);

  return data;
}

export function useOTDetail(workOrderId: string | undefined) {
  const { token } = useAuth();

  const serverQuery = useQuery<OTDetailResponse, Error>({
    queryKey: ['work-order-detail', workOrderId],
    queryFn: () => fetchOTDetail(workOrderId!, token),
    enabled: !!workOrderId && navigator.onLine,
    staleTime: 2 * 60 * 1000,
  });

  // Fallback offline
  const dexieWO = useLiveQuery(
    () => (workOrderId ? db.work_orders.get(workOrderId) : undefined),
    [workOrderId],
  );

  const dexieAssets = useLiveQuery(
    () => (workOrderId
      ? db.work_order_assets.where('work_order_id').equals(workOrderId).sortBy('orden')
      : []),
    [workOrderId],
  );

  return {
    workOrder: serverQuery.data?.work_order ?? dexieWO,
    assets:    (serverQuery.data?.assets as OTAssetDetail[] | undefined) ?? (dexieAssets as OTAssetDetail[] | undefined) ?? [],
    isLoading: serverQuery.isLoading && !dexieWO,
    isError:   serverQuery.isError,
  };
}
