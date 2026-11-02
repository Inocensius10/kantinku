import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertOctagon, ClipboardList, Eye, ShoppingBag, UserCheck, UserX, Users, Wallet } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { useOutlets } from '@/hooks/useOutlets';
import { useAvatarUrls } from '@/hooks/useAvatarUrls';
import { profileService } from '@/services/profileService';
import { attendanceService } from '@/services/attendanceService';
import { salesService } from '@/services/salesService';
import { inventoryService } from '@/services/inventoryService';
import { Card, CardHeader, PageHeader, StatCard } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Field';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, SalesStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/Feedback';
import { OutletSelect } from '@/components/admin/OutletSelect';
import { SalesReportDetailModal } from '@/components/admin/SalesReportDetailModal';
import { IncomeAreaChart, OutletBarChart, ProductBarChart, TrendLineChart } from '@/components/charts/Charts';
import {
  dateRangeList,
  formatDateAxis,
  formatDateLong,
  formatDateShort,
  formatDistance,
  formatNumber,
  formatRupiah,
  formatTime,
  jakartaDate,
  shiftDate,
  startOfWeek,
} from '@/lib/format';
import type { DailySalesReport } from '@/types';

const WEEKS = 8;

export default function AdminDashboardPage() {
  const { outlets } = useOutlets();
  const [outletId, setOutletId] = useState('');
  const [date, setDate] = useState(jakartaDate());
  const [days, setDays] = useState(7);
  const [detail, setDetail] = useState<DailySalesReport | null>(null);

  const rangeFrom = shiftDate(date, -(days - 1));
  const weeksFrom = shiftDate(startOfWeek(date), -7 * (WEEKS - 1));
  const fetchFrom = rangeFrom < weeksFrom ? rangeFrom : weeksFrom;

  // Data diambil untuk semua loket lalu difilter di klien agar grafik perbandingan antar-loket tetap lengkap.
  const q = useAsync(async () => {
    const [employees, attendance, reports, openShortages, emergencies] = await Promise.all([
      profileService.listProfiles({ role: 'employee', status: 'active' }),
      attendanceService.list({ from: date, to: date }),
      salesService.list({ from: fetchFrom, to: date }),
      inventoryService.countOpen({ outletId: outletId || null }),
      inventoryService.list({ status: 'open', outletId: outletId || null }),
    ]);
    return { employees, attendance, reports, openShortages, emergencyCount: emergencies.filter((e) => e.urgency === 'emergency').length };
  }, [date, fetchFrom, outletId]);

  const d = q.data;
  const inOutlet = <T extends { outlet_id: string | null }>(rows: T[]) => (outletId ? rows.filter((r) => r.outlet_id === outletId) : rows);

  const employees = useMemo(() => inOutlet(d?.employees ?? []), [d, outletId]); // eslint-disable-line react-hooks/exhaustive-deps
  const attendance = useMemo(() => inOutlet(d?.attendance ?? []), [d, outletId]); // eslint-disable-line react-hooks/exhaustive-deps
  const allReports = d?.reports ?? [];
  const reports = useMemo(() => inOutlet(allReports), [allReports, outletId]); // eslint-disable-line react-hooks/exhaustive-deps
  const dayReports = reports.filter((r) => r.report_date === date);

  const attByUser = new Map(attendance.map((a) => [a.user_id, a]));
  const presentCount = employees.filter((e) => attByUser.has(e.id)).length;
  const absentCount = employees.length - presentCount;
  const incomeToday = dayReports.reduce((s, r) => s + r.actual_income, 0);
  const itemsToday = dayReports.reduce((s, r) => s + r.total_items, 0);

  const avatarUrls = useAvatarUrls(employees.map((e) => e.avatar_path));

  // ---- Grafik ----
  const rangeReports = reports.filter((r) => r.report_date >= rangeFrom);
  const dailyChart = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rangeReports) m.set(r.report_date, (m.get(r.report_date) ?? 0) + r.actual_income);
    return dateRangeList(rangeFrom, date).map((dt) => ({ label: formatDateAxis(dt), value: m.get(dt) ?? 0 }));
  }, [rangeReports, rangeFrom, date]);

  const productChart = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rangeReports) for (const it of r.items ?? []) m.set(it.product_name, (m.get(it.product_name) ?? 0) + it.quantity);
    return [...m.entries()].map(([name, quantity]) => ({ name, quantity })).sort((a, b) => b.quantity - a.quantity).slice(0, 12);
  }, [rangeReports]);

  const outletChart = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of allReports) if (r.report_date >= rangeFrom) m.set(r.outlet_id, (m.get(r.outlet_id) ?? 0) + r.actual_income);
    return outlets.filter((o) => o.is_active || m.has(o.id)).map((o) => ({ name: o.name, income: m.get(o.id) ?? 0 }));
  }, [allReports, outlets, rangeFrom]);

  const weeklyChart = useMemo(() => {
    const series = outletId ? [outlets.find((o) => o.id === outletId)?.name ?? 'Loket'] : outlets.filter((o) => o.is_active).map((o) => o.name);
    const nameById = new Map(outlets.map((o) => [o.id, o.name]));
    const weeks = Array.from({ length: WEEKS }, (_, i) => shiftDate(startOfWeek(date), -7 * (WEEKS - 1 - i)));
    return {
      series,
      data: weeks.map((w) => {
        const row: Record<string, number | string> = { label: formatDateShort(w).replace(/ \d{4}$/, '') };
        for (const s of series) row[s] = 0;
        for (const r of reports) {
          if (r.report_date >= w && r.report_date <= shiftDate(w, 6) && r.report_date <= date) {
            const n = nameById.get(r.outlet_id) ?? 'Lainnya';
            if (n in row) row[n] = (row[n] as number) + r.actual_income;
          }
        }
        return row;
      }),
    };
  }, [reports, outlets, outletId, date]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard Admin"
        subtitle={formatDateLong(date)}
        action={
          <>
            <OutletSelect outlets={outlets} value={outletId} onChange={setOutletId} />
            <Input type="date" className="w-44" value={date} max={jakartaDate()} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Tanggal" />
          </>
        }
      />

      {q.error && <ErrorState message={q.error} onRetry={q.reload} />}

      {!!d?.emergencyCount && (
        <Link
          to="/admin/stok"
          className="flex items-center gap-3 rounded-2xl border border-danger/40 bg-danger/10 p-4 text-danger transition hover:bg-danger/15"
        >
          <AlertOctagon className="h-6 w-6 shrink-0 animate-pulse" />
          <div className="flex-1">
            <p className="font-bold">{d.emergencyCount} laporan stok DARURAT belum selesai</p>
            <p className="text-sm opacity-90">Segera tindak lanjuti agar operasional tidak terganggu.</p>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Karyawan aktif" value={q.loading ? '…' : employees.length} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Hadir" value={q.loading ? '…' : presentCount} icon={<UserCheck className="h-5 w-5" />} tone="success" />
        <StatCard label="Belum absen" value={q.loading ? '…' : absentCount} icon={<UserX className="h-5 w-5" />} tone={absentCount ? 'warning' : 'neutral'} />
        <StatCard label="Pemasukan" value={q.loading ? '…' : formatRupiah(incomeToday)} icon={<Wallet className="h-5 w-5" />} />
        <StatCard label="Produk terjual" value={q.loading ? '…' : formatNumber(itemsToday)} icon={<ShoppingBag className="h-5 w-5" />} tone="success" />
        <StatCard
          label="Stok belum selesai"
          value={q.loading ? '…' : d?.openShortages ?? 0}
          icon={<ClipboardList className="h-5 w-5" />}
          tone={d?.openShortages ? 'danger' : 'neutral'}
        />
      </div>

      {/* Grafik */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Grafik</h2>
        <div className="w-36">
          <Select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Rentang grafik">
            <option value={7}>7 hari</option>
            <option value={14}>14 hari</option>
            <option value={30}>30 hari</option>
          </Select>
        </div>
      </div>
      {q.loading ? (
        <Card>
          <LoadingBlock />
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title="Pemasukan harian" subtitle={`${formatDateShort(rangeFrom)} – ${formatDateShort(date)}`} />
            <div className="px-2 pb-4 pt-3 sm:px-4">
              <IncomeAreaChart data={dailyChart} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Perbandingan antar-loket" subtitle={`${days} hari terakhir`} />
            <div className="px-2 pb-4 pt-3 sm:px-4">
              <OutletBarChart data={outletChart} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Penjualan per produk" subtitle={`${days} hari terakhir`} />
            <div className="px-2 pb-4 pt-3 sm:px-4">
              {productChart.length ? <ProductBarChart data={productChart} /> : <EmptyState title="Belum ada penjualan produk" />}
            </div>
          </Card>
          <Card>
            <CardHeader title="Tren pemasukan mingguan" subtitle={`${WEEKS} minggu terakhir`} />
            <div className="px-2 pb-4 pt-3 sm:px-4">
              <TrendLineChart data={weeklyChart.data} series={weeklyChart.series} />
            </div>
          </Card>
        </div>
      )}

      {/* Tabel absensi */}
      <Card>
        <CardHeader title="Absensi" subtitle={formatDateShort(date)} />
        <div className="p-5 pt-3">
          {q.loading ? (
            <LoadingBlock />
          ) : employees.length === 0 ? (
            <EmptyState title="Belum ada karyawan aktif" />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line/70">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Karyawan</th>
                    <th>Loket</th>
                    <th>Masuk</th>
                    <th>Pulang</th>
                    <th>Status</th>
                    <th className="text-right">Jarak</th>
                  </tr>
                </thead>
                <tbody>
                  {[...employees]
                    .sort((a, b) => Number(attByUser.has(b.id)) - Number(attByUser.has(a.id)) || a.full_name.localeCompare(b.full_name))
                    .map((e) => {
                      const a = attByUser.get(e.id);
                      return (
                        <tr key={e.id}>
                          <td>
                            <div className="flex items-center gap-3">
                              <Avatar name={e.full_name} src={e.avatar_path ? avatarUrls[e.avatar_path] : null} size="sm" />
                              <span className="whitespace-nowrap font-medium">{e.full_name}</span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap">{e.outlet?.name ?? '—'}</td>
                          <td className="tabular-nums">{formatTime(a?.check_in_at)}</td>
                          <td className="tabular-nums">{formatTime(a?.check_out_at)}</td>
                          <td>
                            {!a ? (
                              <Badge tone="warning">Belum absen</Badge>
                            ) : a.check_out_at ? (
                              <Badge tone="success">Sudah pulang</Badge>
                            ) : (
                              <Badge tone="brand">Hadir</Badge>
                            )}
                          </td>
                          <td className="text-right tabular-nums">{a ? formatDistance(a.check_in_distance_m) : '—'}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Tabel penjualan */}
      <Card>
        <CardHeader
          title="Penjualan"
          subtitle={formatDateShort(date)}
          action={
            <Link to="/admin/penjualan" className="text-sm font-semibold text-brand hover:underline">
              Semua laporan
            </Link>
          }
        />
        <div className="p-5 pt-3">
          {q.loading ? (
            <LoadingBlock />
          ) : dayReports.length === 0 ? (
            <EmptyState title="Belum ada laporan penjualan" description="Belum ada karyawan yang mengirim laporan pada tanggal ini." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line/70">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Karyawan</th>
                    <th>Loket</th>
                    <th className="text-right">Produk terjual</th>
                    <th className="text-right">Pemasukan aktual</th>
                    <th className="text-right">Modal brankas</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {dayReports.map((r) => (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap font-medium">{r.profile?.full_name ?? '—'}</td>
                      <td className="whitespace-nowrap">{r.outlet?.name}</td>
                      <td className="text-right tabular-nums">{formatNumber(r.total_items)}</td>
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
        </div>
      </Card>

      <SalesReportDetailModal report={detail} onClose={() => setDetail(null)} onChanged={q.reload} />
    </div>
  );
}
