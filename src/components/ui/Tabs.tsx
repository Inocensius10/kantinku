import type { ReactNode } from 'react';

export function Tabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: Array<{ value: T; label: string; icon?: ReactNode; count?: number }>;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-white p-1 ring-1 ring-line/70 print:hidden">
      {items.map((it) => (
        <button
          key={it.value}
          onClick={() => onChange(it.value)}
          className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
            value === it.value ? 'bg-brand text-cream shadow-sm' : 'text-ink-soft hover:bg-cream-light hover:text-ink'
          }`}
        >
          {it.icon}
          {it.label}
          {it.count !== undefined && it.count > 0 && (
            <span
              className={`rounded-full px-1.5 text-[11px] ${value === it.value ? 'bg-cream/20 text-cream' : 'bg-cream text-brand'}`}
            >
              {it.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
