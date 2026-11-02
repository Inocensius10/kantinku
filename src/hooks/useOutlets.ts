import { outletService } from '@/services/outletService';
import { useAsync } from './useAsync';

export function useOutlets(opts: { activeOnly?: boolean } = {}) {
  const { data, loading, error, reload } = useAsync(() => outletService.list(opts), [opts.activeOnly]);
  return { outlets: data ?? [], loading, error, reload };
}
