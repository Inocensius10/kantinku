import { Store } from 'lucide-react';
import { Select } from '@/components/ui/Field';
import type { Outlet } from '@/types';

/** Filter loket: '' = semua loket */
export function OutletSelect({
  outlets,
  value,
  onChange,
  allLabel = 'Semua Loket',
  className = 'w-48',
}: {
  outlets: Outlet[];
  value: string;
  onChange: (v: string) => void;
  allLabel?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Store className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ink-soft" />
      <Select className="pl-9" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Filter loket">
        <option value="">{allLabel}</option>
        {outlets.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
            {!o.is_active ? ' (nonaktif)' : ''}
          </option>
        ))}
      </Select>
    </div>
  );
}
