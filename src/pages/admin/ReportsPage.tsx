import { useState } from 'react';
import { CalendarCheck, ClipboardList, Printer, Wallet } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { useOutlets } from '@/hooks/useOutlets';
import { attendanceService } from '@/services/attendanceService';
import { salesService } from '@/services/salesService';
import { inventoryService } from '@/services/inventoryService';
import { Card, PageHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/Feedback';
import { SHORTAGE_STATUS_LABEL, URGENCY_LABEL } from '@/components/ui/Badge';
import { OutletSelect } from '@/components/admin/OutletSelect';
import { PeriodFilter, defaultPeriod, periodLabel, periodToRange } from '@/components/ui/PeriodFilter';
import { PrintHeader } from '@/components/ui/PrintHeader';
import { formatDateShort, formatDateTime, formatNumber, formatRupiah, formatTime, jakartaDate } from '@/lib/format';
import type { DateRange } from '@/types';

type Kind = 'attendance' | 'sales' | 'stock';
const TITLES: Record<Kind, string> = {
  attendance: 'Laporan Absensi',
  sales: 'Laporan Penjualan',
  stock: 'Laporan Kekurangan Stok',
};

export default function ReportsPage() {
  const { outlets } = useOutlets();
  const [kind, setKind] = useState<Kind>('attendance');
  const [outletId, setOutletId] = useState('');
  const [period, setPeriod] = useState(defaultPeriod('month'));
  const range = periodToRange(period);
  const outletName = outletId ? outlets.find((o) => o.id === outletId)?.name ?? '—' : 'Semua Loket';

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cetak Laporan"
        subtitle="Pilih jenis laporan dan periode, lalu cetak dalam format A4."
        action={
          <Button icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>
            Print
          </Button>
        }
      />

      <div className="space-y-3 print:hidden">
        <Tabs<Kind>
          value={kind}
          onChange={setKind}
          items={[
            { value: 'attendance', label: 'Absensi', icon: <CalendarCheck className="h-4 w-4" /> },
            { value: 'sales', label: 'Penjualan', icon: <Wallet className="h-4 w-4" /> },
            { value: 'stock', label: 'Stok', icon: <ClipboardList className="h-4 w-4" /> },
          ]}
        />
        <div className="flex flex-wrap items-end gap-2">
          <PeriodFilter value={period} onChange={setPeriod} />
          <OutletSelect outlets={outlets} value={outletId} onChange={setOutletId} />
        </div>
      </div>

      <Card className="print-area p-5 print:border-0 print:p-0 print:shadow-none">
        <PrintHeader title={TITLES[kind]} lines={[`Periode: ${periodLabel(period)}`, `Loket: ${outletName}`]} />
        <div className="mb-4 print:hidden">
          <p className="font-bold">{TITLES[kind]}</p>
          <p className="text-sm text-ink-soft">
            {periodLabel(period)} · {outletName}
          </p>
        </div>
        {kind === 'attendance' && <AttendanceReport range={range} outletId={outletId} />}
        {kind === 'sales' && <SalesReport range={range} outletId={outletId} />}
        {kind === 'stock' && <StockReport range={range} outletId={outletId} />}
      </Card>
    </div>
  );
}

function AttendanceReport({ range, outletId }: { range: DateRange; outletId: string }) {
  const today = jakartaDate();
  const q = useAsync(() => attendanceService.list(range, { outletId: outletId || null }), [range.from, range.to, outletId]);
  if (q.loading) return <LoadingBlock />;
  if (q.error) return <ErrorState message={q.error} onRetry={q.reload} />;
  const rows = [...(q.data ?? [])].sort((a, b) => a.work_date.localeCompare(b.work_date) || (a.profile?.full_name ?? '').localeCompare(b.profile?.full_name ?? ''));
  if (!rows.length) return <EmptyState title="Tidak ada data absensi" />;
  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table className="table-base">
        <thead>
          <tr>
            <th>No</th>
            <th>Nama karyawan</th>
            <th>Loket</th>
            <th>Tanggal</th>
            <th>Jam masuk</th>
            <th>Jam pulang</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a, i) => (
            <tr key={a.id}>
              <td>{i + 1}</td>
              <td className="whitespace-nowrap">{a.profile?.full_name ?? '—'}</td>
              <td>{a.outlet?.name}</td>
              <td className="whitespace-nowrap">{formatDateShort(a.work_date)}</td>
              <td className="tabular-nums">{formatTime(a.check_in_at)}</td>
              <td className="tabular-nums">{formatTime(a.check_out_at)}</td>
              <td>{a.check_out_at ? 'Hadir' : a.work_date === today ? 'Sedang bekerja' : 'Tidak absen pulang'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-sm">Total catatan kehadiran: {rows.length}</p>
    </div>
  );
}

function SalesReport({ range, outletId }: { range: DateRange; outletId: string }) {
  const q = useAsync(() => salesService.list(range, { outletId: outletId || null }), [range.from, range.to, outletId]);
  if (q.loading) return <LoadingBlock />;
  if (q.error) return <ErrorState message={q.error} onRetry={q.reload} />;
  const rows = [...(q.data ?? [])].sort((a, b) => a.report_date.localeCompare(b.report_date));
  if (!rows.length) return <EmptyState title="Tidak ada laporan penjualan" />;
  const tot = rows.reduce(
    (s, r) => ({ items: s.items + r.total_items, est: s.est + r.estimated_total, income: s.income + r.actual_income, capital: s.capital + r.safe_capital }),
    { items: 0, est: 0, income: 0, capital: 0 },
  );
  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table className="table-base">
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Nama karyawan</th>
            <th>Loket</th>
            <th>Rincian produk</th>
            <th className="text-right">Jumlah</th>
            <th className="text-right">Harga</th>
            <th className="text-right">Total penjualan</th>
            <th className="text-right">Pemasukan aktual</th>
            <th className="text-right">Modal brankas</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const items = r.items ?? [];
            return (
              <tr key={r.id}>
                <td className="whitespace-nowrap">{formatDateShort(r.report_date)}</td>
                <td className="whitespace-nowrap">{r.profile?.full_name ?? '—'}</td>
                <td>{r.outlet?.name}</td>
                <td>
                  {items.length ? items.map((i) => <div key={i.id}>{i.product_name}</div>) : '—'}
                </td>
                <td className="text-right tabular-nums">
                  {items.map((i) => (
                    <div key={i.id}>{formatNumber(i.quantity)}</div>
                  ))}
                </td>
                <td className="text-right tabular-nums">
                  {items.map((i) => (
                    <div key={i.id} className="whitespace-nowrap">
                      {formatRupiah(i.unit_price)}
                    </div>
                  ))}
                </td>
                <td className="text-right tabular-nums">
                  {items.map((i) => (
                    <div key={i.id} className="whitespace-nowrap">
                      {formatRupiah(i.subtotal)}
                    </div>
                  ))}
                  <div className="mt-1 whitespace-nowrap border-t border-line pt-1 font-semibold">{formatRupiah(r.estimated_total)}</div>
                </td>
                <td className="whitespace-nowrap text-right font-semibold tabular-nums">{formatRupiah(r.actual_income)}</td>
                <td className="whitespace-nowrap text-right tabular-nums">{formatRupiah(r.safe_capital)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="font-bold">
            <td colSpan={4} className="px-4 py-3">
              Total ({rows.length} laporan)
            </td>
            <td className="px-4 py-3 text-right tabular-nums">{formatNumber(tot.items)}</td>
            <td />
            <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatRupiah(tot.est)}</td>
            <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatRupiah(tot.income)}</td>
            <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatRupiah(tot.capital)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function StockReport({ range, outletId }: { range: DateRange; outletId: string }) {
  const q = useAsync(() => inventoryService.list({ range, outletId: outletId || null, status: 'all' }), [range.from, range.to, outletId]);
  if (q.loading) return <LoadingBlock />;
  if (q.error) return <ErrorState message={q.error} onRetry={q.reload} />;
  const rows = [...(q.data ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (!rows.length) return <EmptyState title="Tidak ada laporan stok" />;
  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table className="table-base">
        <thead>
          <tr>
            <th>Tanggal laporan</th>
            <th>Nama karyawan</th>
            <th>Loket</th>
            <th>Bahan baku</th>
            <th>Urgensi</th>
            <th>Keterangan</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="whitespace-nowrap">{formatDateTime(r.created_at)}</td>
              <td className="whitespace-nowrap">{r.profile?.full_name ?? '—'}</td>
              <td>{r.outlet?.name}</td>
              <td>
                {(r.items ?? []).map((i) => (
                  <div key={i.id} className="whitespace-nowrap">
                    {i.item_name}
                    {i.quantity_needed != null ? ` (${formatNumber(i.quantity_needed)} ${i.unit ?? ''})` : ''}
                  </div>
                ))}
              </td>
              <td className={r.urgency === 'emergency' ? 'font-bold text-danger' : ''}>{URGENCY_LABEL[r.urgency]}</td>
              <td>
                {(r.items ?? [])
                  .filter((i) => i.description)
                  .map((i) => (
                    <div key={i.id}>
                      {i.item_name}: {i.description}
                    </div>
                  ))}
                {r.notes && <div>Catatan: {r.notes}</div>}
                {r.admin_notes && <div className="italic">Tindak lanjut: {r.admin_notes}</div>}
              </td>
              <td className="whitespace-nowrap">{SHORTAGE_STATUS_LABEL[r.status]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
