import { useMemo, useState } from 'react';
import { Eye, Landmark, ShoppingBag, Wallet } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { useOutlets } from '@/hooks/useOutlets';
import { salesService } from '@/services/salesService';
import { Card, PageHeader, StatCard } from '@/components/ui/Card';
import { Select } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { SalesStatusBadge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/Feedback';
import { OutletSelect } from '@/components/admin/OutletSelect';
import { SalesReportDetailModal } from '@/components/admin/SalesReportDetailModal';
import { PeriodFilter, defaultPeriod, periodLabel, periodToRange } from '@/components/ui/PeriodFilter';
import { formatDateShort, formatNumber, formatRupiah } from '@/lib/format';
import type { DailySalesReport, SalesReportStatus } from '@/types';

export default function SalesReportsPage() {
  const { outlets } = useOutlets();
  const [outletId, setOutletId] = useState('');
  const [status, setStatus] = useState<SalesReportStatus | ''>('');
  const [period, setPeriod] = useState(defaultPeriod('day'));
  const [detail, setDetail] = useState<DailySalesReport | null>(null);
  const range = periodToRange(period);

  const q = useAsync(() => salesService.list(range, { outletId: outletId || null }), [range.from, range.to, outletId]);
  const rows = useMemo(() => (q.data ?? []).filter((r) => !status || r.status === status), [q.data, status]);

  const totals = rows.reduce(
    (s, r) => ({ income: s.income + r.actual_income, est: s.est + r.estimated_total, items: s.items + r.total_items, capital: s.capital + r.safe_capital }),
    { income: 0, est: 0, items: 0, capital: 0 },
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Laporan Penjualan" subtitle={`Periode ${periodLabel(period)}`} />

      <div className="flex flex-wrap items-end gap-2">
        <PeriodFilter value={period} onChange={setPeriod} />
        <OutletSelect outlets={outlets} value={outletId} onChange={setOutletId} />
        <div className="w-48">
          <Select value={status} onChange={(e) => setStatus(e.target.value as SalesReportStatus | '')} aria-label="Status laporan">
            <option value="">Semua status</option>
            <option value="submitted">Menunggu verifikasi</option>
            <option value="verified">Terverifikasi</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pemasukan aktual" value={formatRupiah(totals.income)} icon={<Wallet className="h-5 w-5" />} />
        <StatCard label="Estimasi produk" value={formatRupiah(totals.est)} icon={<Wallet className="h-5 w-5" />} tone="neutral" />
        <StatCard label="Produk terjual" value={formatNumber(totals.items)} icon={<ShoppingBag className="h-5 w-5" />} tone="success" />
        <StatCard
          label={period.mode === 'day' ? 'Total modal brankas' : 'Jumlah laporan'}
          value={period.mode === 'day' ? formatRupiah(totals.capital) : formatNumber(rows.length)}
          icon={<Landmark className="h-5 w-5" />}
          tone="warning"
        />
      </div>

      {q.error && <ErrorState message={q.error} onRetry={q.reload} />}

      <Card>
        {q.loading ? (
          <LoadingBlock />
        ) : rows.length === 0 ? (
          <EmptyState title="Tidak ada laporan" description="Belum ada laporan penjualan pada filter ini." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Karyawan</th>
                  <th>Loket</th>
                  <th className="text-right">Produk</th>
                  <th className="text-right">Estimasi</th>
                  <th className="text-right">Pemasukan aktual</th>
                  <th className="text-right">Modal brankas</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap">{formatDateShort(r.report_date)}</td>
                    <td className="whitespace-nowrap font-medium">{r.profile?.full_name ?? '—'}</td>
                    <td className="whitespace-nowrap">{r.outlet?.name}</td>
                    <td className="text-right tabular-nums">{formatNumber(r.total_items)}</td>
                    <td className="text-right tabular-nums text-ink-soft">{formatRupiah(r.estimated_total)}</td>
                    <td className="text-right font-semibold tabular-nums">{formatRupiah(r.actual_income)}</td>
                    <td className="text-right tabular-nums">{formatRupiah(r.safe_capital)}</td>
                    <td>
                      <SalesStatusBadge status={r.status} />
                    </td>
                    <td className="text-right">
                      <Button size="sm" variant="secondary" icon={<Eye className="h-4 w-4" />} onClick={() => setDetail(r)}>
                        Detail
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <SalesReportDetailModal report={detail} onClose={() => setDetail(null)} onChanged={q.reload} />
    </div>
  );
}
