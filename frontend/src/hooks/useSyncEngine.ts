import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/db/schema.v16';
import { useNetworkStatus } from './useNetworkStatus';
import { useQueryClient } from '@tanstack/react-query';

export type SyncStatus = 'idle' | 'syncing' | 'done' | 'error';

export function useSyncEngine() {
  const { token } = useAuth();
  const { isOnline } = useNetworkStatus();
  const qc = useQueryClient();
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [pending, setPending] = useState(0);
  const isSyncing = useRef(false);

  // Mantener conteo de pendientes
  useEffect(() => {
    const update = async () => {
      const count = await db.sync_queue.where('status').equals('pending').count();
      setPending(count);
    };
    update();
    // Reevaluar cada vez que cambia la conexión
  }, [isOnline]);

  const sync = async () => {
    if (!token || !isOnline || isSyncing.current) return;
    isSyncing.current = true;
    setStatus('syncing');

    try {
      const items = await db.sync_queue.where('status').equals('pending').toArray();
      if (!items.length) {
        setStatus('idle');
        isSyncing.current = false;
        return;
      }

      // Marcar todos como 'syncing'
      await db.sync_queue
        .where('status').equals('pending')
        .modify({ status: 'syncing' });

      let hasErrors = false;

      for (const item of items) {
        try {
          let url = '';
          let body: Record<string, unknown> = item.data;

          if (item.tabla === 'form_instances') {
            url = `/api/form-instances/${item.record_id}`;
            body = {
              respuestas: item.data.respuestas,
              estado: item.data.estado,
            };
          } else if (item.tabla === 'work_orders') {
            url = `/api/work-orders/${item.record_id}`;
            body = {
              estado: item.data.estado,
              hallazgo: item.data.hallazgo,
              diagnostico: item.data.diagnostico,
              recomendaciones: item.data.recomendaciones,
              conclusiones: item.data.conclusiones,
            };
          } else if (item.tabla === 'work_order_assets') {
            url = `/api/work-orders/${item.data.work_order_id as string}`;
            body = {
              asset_updates: [{
                work_order_asset_id: item.record_id,
                estado: item.data.estado,
                notas: item.data.notas,
              }],
            };
          } else {
            // Tabla no soportada en v1 — skip
            await db.sync_queue.update(item.sync_queue_id, { status: 'synced' });
            continue;
          }

          const resp = await fetch(url, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
          });

          if (resp.ok) {
            await db.sync_queue.update(item.sync_queue_id, { status: 'synced' });
          } else {
            await db.sync_queue.update(item.sync_queue_id, {
              status: 'error',
              last_error: `HTTP ${resp.status}`,
              retry_count: (item.retry_count ?? 0) + 1,
            });
            hasErrors = true;
          }
        } catch (err) {
          await db.sync_queue.update(item.sync_queue_id, {
            status: 'error',
            last_error: String(err),
            retry_count: (item.retry_count ?? 0) + 1,
          });
          hasErrors = true;
        }
      }

      const remaining = await db.sync_queue.where('status').equals('pending').count();
      setPending(remaining);
      setStatus(hasErrors ? 'error' : 'done');

      // Invalidar queries después de sync exitoso
      if (!hasErrors) {
        qc.invalidateQueries({ queryKey: ['work-orders'] });
        qc.invalidateQueries({ queryKey: ['dashboard'] });
      }

      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      console.error('[useSyncEngine]', err);
      setStatus('error');
    } finally {
      isSyncing.current = false;
    }
  };

  // Auto-sync al recuperar conexión
  useEffect(() => {
    if (isOnline && pending > 0) {
      sync();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  return { sync, status, pending };
}
