import { useQuery } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/db/schema.v16';

interface DashboardKPIs {
  abiertas: number;
  en_progreso: number;
  completadas_hoy: number;
  pendientes_total: number;
}

interface UrgentOT {
  work_order_id: string;
  tipo: string;
  estado: string;
  descripcion?: string;
  updated_at: string;
  sucursal_nombre?: string;
  tecnico_nombre?: string;
  total_assets: number;
  completados: number;
}

interface DashboardData {
  kpis: DashboardKPIs;
  urgentes: UrgentOT[];
}

async function fetchDashboard(token: string): Promise<DashboardData> {
  const res = await fetch('/api/dashboard', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Error al cargar dashboard');
  return res.json() as Promise<DashboardData>;
}

export function useDashboard() {
  const { token } = useAuth();

  const serverQuery = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => fetchDashboard(token!),
    enabled: !!token && navigator.onLine,
    staleTime: 60 * 1000,
    retry: 1,
  });

  // Fallback offline desde Dexie
  const offlineKPIs = useLiveQuery(async () => {
    const wos = await db.work_orders.toArray();
    const today = new Date().toDateString();
    return {
      abiertas: wos.filter(w => w.estado === 'abierto').length,
      en_progreso: wos.filter(w => w.estado === 'en_progreso').length,
      completadas_hoy: wos.filter(w =>
        w.estado === 'completado' && new Date(w.updated_at).toDateString() === today
      ).length,
      pendientes_total: wos.filter(w => !['completado', 'cerrado'].includes(w.estado)).length,
    };
  });

  const offlineUrgentes = useLiveQuery(async () => {
    return db.work_orders
      .filter(w => !['completado', 'cerrado'].includes(w.estado))
      .reverse()
      .sortBy('updated_at')
      .then(rows => rows.slice(0, 8).map(w => ({
        work_order_id: w.work_order_id,
        tipo: w.tipo,
        estado: w.estado,
        descripcion: w.descripcion,
        updated_at: w.updated_at.toISOString(),
        sucursal_nombre: undefined as string | undefined,
        tecnico_nombre: undefined as string | undefined,
        total_assets: 0,
        completados: 0,
      })));
  });

  const data: DashboardData | undefined = serverQuery.data ?? (
    offlineKPIs && offlineUrgentes
      ? { kpis: offlineKPIs, urgentes: offlineUrgentes }
      : undefined
  );

  return {
    data,
    isLoading: serverQuery.isLoading && !offlineKPIs,
    isOffline: !navigator.onLine,
  };
}
