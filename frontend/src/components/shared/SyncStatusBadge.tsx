import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema.v16';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import type { SyncStatus } from '@/hooks/useSyncEngine';

interface Props {
  syncStatus?: SyncStatus;
  pendingCount?: number;
}

export function SyncStatusBadge({ syncStatus, pendingCount: pendingProp }: Props = {}) {
  const { isOnline } = useNetworkStatus();

  const dbPending = useLiveQuery(
    () => db.sync_queue.where('status').equals('pending').count(),
    [],
    0,
  );

  const pending = pendingProp ?? dbPending ?? 0;

  if (!isOnline) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 text-[var(--color-error)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-error)] animate-pulse" />
        Sin conexión
      </span>
    );
  }

  if (syncStatus === 'syncing') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-pulse" />
        Sincronizando…
      </span>
    );
  }

  if (syncStatus === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 text-[var(--color-error)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-error)]" />
        Error sync
      </span>
    );
  }

  if (pending > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 text-[var(--color-warning)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-warning)] animate-pulse" />
        {pending} pendiente{pending !== 1 ? 's' : ''}
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
