import { useMemo, useState } from 'react';
import { Store, Wallet } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { useOutlets } from '@/hooks/useOutlets';
import { salesService } from '@/services/salesService';
import { StatCard } from '@/components/ui/Card';
import { Select } from '@/components/ui/Field';
import { ErrorState, LoadingBlock } from '@/components/ui/Feedback';
import { IncomeAreaChart, OutletBarChart } from '@/components/charts/Charts';
import { dateRangeList, formatDateAxis, formatRupiah, jakartaDate, shiftDate } from '@/lib/format';

/**
 * Grafik pendapatan bersih (cash + QRIS + EDC − modal brankas) dari SEMUA laporan,
 * dapat dilihat oleh semua user aktif. Data diambil dari RPC agregat
 * `sales_daily_summary`, sehingga rincian laporan pribadi tetap terlindungi.
 */
export function NetIncomeOverview({
  days,
  height = 240,
  showOutletBreakdown = true,
  refreshKey = 0,
}: {
  days: number;
  height?: number;
  showOutletBreakdown?: boolean;
  /** Ubah nilainya untuk memuat ulang data (mis. setelah laporan dikirim). */
  refreshKey?: number;
}) {
  const today = jakartaDate();
  const from = shiftDate(today, -(days - 1));
  const { outlets } = useOutlets();
  const [outletId, setOutletId] = useState('');

  const q = useAsync(() => salesService.dailySummary({ from, to: today }), [from, today, refreshKey]);
  const rows = useMemo(() => (q.data ?? []).filter((r) => !outletId || r.outlet_id === outletId), [q.data, outletId]);

  const chart = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.report_date, (m.get(r.report_date) ?? 0) + r.net_income);
    return dateRangeList(from, today).map((d) => ({ label: formatDateAxis(d), value: m.get(d) ?? 0 }));
  }, [rows, from, today]);

  const byOutlet = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of q.data ?? []) m.set(r.outlet_id, (m.get(r.outlet_id) ?? 0) + r.net_income);
    return outlets.filter((o) => o.is_active || m.has(o.id)).map((o) => ({ name: o.name, income: m.get(o.id) ?? 0 }));
  }, [q.data, outlets]);

  const todayTotal = rows.filter((r) => r.report_date === today).reduce((s, r) => s + r.net_income, 0);
  const periodTotal = rows.reduce((s, r) => s + r.net_income, 0);
  const scope = outletId ? `Loket ${outlets.find((o) => o.id === outletId)?.name ?? ''}` : 'Semua loket';

  if (q.loading) return <LoadingBlock />;
  if (q.error) return <ErrorState message={q.error} onRetry={q.reload} />;

  return (
    <div className="space-y-4">
      <div className="w-full sm:w-56">
        <Select value={outletId} onChange={(e) => setOutletId(e.target.value)} aria-label="Pilih loket">
          <option value="">Semua loket</option>
          {outlets.map((o) => (
            <option key={o.id} value={o.id}>
              Loket {o.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Bersih hari ini" value={formatRupiah(todayTotal)} icon={<Wallet className="h-5 w-5" />} hint={scope} />
        <StatCard label={`Bersih ${days} hari`} value={formatRupiah(periodTotal)} icon={<Store className="h-5 w-5" />} tone="success" hint={scope} />
      </div>

      <IncomeAreaChart data={chart} height={height} name={`Pendapatan bersih · ${scope}`} />

      {showOutletBreakdown && !outletId && byOutlet.length > 1 && (
        <div>
          <p className="mb-2 text-sm font-semibold">Perbandingan antar-loket ({days} hari)</p>
          <OutletBarChart data={byOutlet} height={220} />
        </div>
      )}
    </div>
  );
}
