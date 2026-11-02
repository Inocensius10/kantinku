import { endOfMonth, jakartaDate, MONTHS_ID, formatDateShort } from '@/lib/format';
import type { DateRange } from '@/types';
import { Input, Select } from './Field';

export type PeriodMode = 'day' | 'month' | 'year' | 'range';

export interface PeriodValue {
  mode: PeriodMode;
  day: string;
  month: string; // YYYY-MM
  year: string; // YYYY
  from: string;
  to: string;
}

export function defaultPeriod(mode: PeriodMode = 'month'): PeriodValue {
  const today = jakartaDate();
  return { mode, day: today, month: today.slice(0, 7), year: today.slice(0, 4), from: `${today.slice(0, 7)}-01`, to: today };
}

export function periodToRange(p: PeriodValue): DateRange {
  switch (p.mode) {
    case 'day':
      return { from: p.day, to: p.day };
    case 'month':
      return { from: `${p.month}-01`, to: endOfMonth(`${p.month}-01`) };
    case 'year':
      return { from: `${p.year}-01-01`, to: `${p.year}-12-31` };
    case 'range':
      return p.from <= p.to ? { from: p.from, to: p.to } : { from: p.to, to: p.from };
  }
}

export function periodLabel(p: PeriodValue): string {
  switch (p.mode) {
    case 'day':
      return formatDateShort(p.day);
    case 'month': {
      const [y, m] = p.month.split('-').map(Number);
      return `${MONTHS_ID[m - 1]} ${y}`;
    }
    case 'year':
      return `Tahun ${p.year}`;
    case 'range': {
      const r = periodToRange(p);
      return `${formatDateShort(r.from)} – ${formatDateShort(r.to)}`;
    }
  }
}

export function PeriodFilter({
  value,
  onChange,
  modes = ['day', 'month', 'year', 'range'],
}: {
  value: PeriodValue;
  onChange: (v: PeriodValue) => void;
  modes?: PeriodMode[];
}) {
  const labels: Record<PeriodMode, string> = { day: 'Tanggal', month: 'Bulan', year: 'Tahun', range: 'Rentang' };
  const currentYear = Number(jakartaDate().slice(0, 4));
  const years = Array.from({ length: 6 }, (_, i) => String(currentYear - i));
  const set = (patch: Partial<PeriodValue>) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="w-32">
        <Select value={value.mode} onChange={(e) => set({ mode: e.target.value as PeriodMode })} aria-label="Jenis periode">
          {modes.map((m) => (
            <option key={m} value={m}>
              {labels[m]}
            </option>
          ))}
        </Select>
      </div>
      {value.mode === 'day' && (
        <Input type="date" className="w-44" value={value.day} max={jakartaDate()} onChange={(e) => e.target.value && set({ day: e.target.value })} aria-label="Tanggal" />
      )}
      {value.mode === 'month' && (
        <Input type="month" className="w-44" value={value.month} onChange={(e) => e.target.value && set({ month: e.target.value })} aria-label="Bulan" />
      )}
      {value.mode === 'year' && (
        <div className="w-32">
          <Select value={value.year} onChange={(e) => set({ year: e.target.value })} aria-label="Tahun">
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </div>
      )}
      {value.mode === 'range' && (
        <>
          <Input type="date" className="w-40" value={value.from} onChange={(e) => e.target.value && set({ from: e.target.value })} aria-label="Dari tanggal" />
          <span className="pb-2.5 text-sm text-ink-soft">s/d</span>
          <Input type="date" className="w-40" value={value.to} onChange={(e) => e.target.value && set({ to: e.target.value })} aria-label="Sampai tanggal" />
        </>
      )}
    </div>
  );
}
