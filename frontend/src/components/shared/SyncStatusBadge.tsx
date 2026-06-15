import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema.v16';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function SyncStatusBadge() {
  const { isOnline } = useNetworkStatus();

  const pendingCount = useLiveQuery(
    () => db.sync_queue.where('status').equals('pending').count(),
    [],
    0,
  );

  if (!isOnline) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 text-[var(--color-error)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-error)] animate-pulse" />
        Sin conexión
      </span>
    );
  }

  if (pendingCount && pendingCount > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 text-[var(--color-warning)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-warning)] animate-pulse" />
        {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest border border-[var(--color-success)]/40 bg-[var(--color-success)]/10 text-[var(--color-success)]">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
      Sincronizado
    </span>
  );
}
