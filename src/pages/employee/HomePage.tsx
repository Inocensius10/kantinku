import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck, CalendarDays, ClipboardList, LogIn, LogOut, TrendingUp, Wallet } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { attendanceService } from '@/services/attendanceService';
import { salesService } from '@/services/salesService';
import { inventoryService } from '@/services/inventoryService';
import { Avatar } from '@/components/ui/Avatar';
import { Card, CardHeader, StatCard } from '@/components/ui/Card';
import { Badge, ShortageStatusBadge, UrgencyBadge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/Feedback';
import { IncomeAreaChart } from '@/components/charts/Charts';
import {
  dateRangeList,
  formatDateAxis,
  formatDateLong,
  formatDateShort,
  formatRupiah,
  formatTime,
  jakartaDate,
  shiftDate,
  startOfWeek,
} from '@/lib/format';

export default function EmployeeHomePage() {
  const { profile } = useAuth();
  const today = jakartaDate();
  const weekStart = startOfWeek(today);
  const sevenAgo = shiftDate(today, -6);
  const from = weekStart < sevenAgo ? weekStart : sevenAgo;

  const { data, loading, error, reload } = useAsync(async () => {
    const uid = profile!.id;
    const [att, reports, shortages] = await Promise.all([
      attendanceService.getMine(uid, today),
      salesService.listMine(uid, { from, to: today }),
      inventoryService.listMine(uid, 20),
    ]);
    return { att, reports, shortages };
  }, [profile?.id, today]);

  if (!profile) return null;

  const reports = data?.reports ?? [];
  const byDate = new Map(reports.map((r) => [r.report_date, r]));
  const todayIncome = byDate.get(today)?.net_income ?? 0;
  const weekIncome = reports.filter((r) => r.report_date >= weekStart).reduce((s, r) => s + r.net_income, 0);
  const chart = dateRangeList(sevenAgo, today).map((d) => ({ label: formatDateAxis(d), value: byDate.get(d)?.net_income ?? 0 }));
  const openShortages = (data?.shortages ?? []).filter((s) => s.status !== 'done');
  const att = data?.att;

  const attStatus = !att
    ? { label: 'Belum absen', tone: 'warning' as const }
    : att.check_out_at
      ? { label: 'Sudah pulang', tone: 'success' as const }
      : { label: 'Sedang bekerja', tone: 'brand' as const };

  return (
    <div className="space-y-5">
      {/* Kartu sapaan */}
      <div className="relative overflow-hidden rounded-3xl bg-brand p-5 text-cream sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-accent/40 blur-xl" />
        <div className="relative flex items-center gap-4">
          <Avatar name={profile.full_name} path={profile.avatar_path} size="lg" className="ring-cream/40" />
          <div className="min-w-0">
            <p className="text-sm text-cream/80">Halo,</p>
            <h1 className="truncate text-xl font-extrabold sm:text-2xl">{profile.full_name}</h1>
            <p className="mt-0.5 text-sm text-cream/85">Loket {profile.outlet?.name ?? '—'}</p>
          </div>
        </div>
        <div className="relative mt-4 flex items-center gap-2 text-sm text-cream/90">
          <CalendarDays className="h-4 w-4" /> {formatDateLong(today)}
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={reload} />}

      {/* Absensi hari ini */}
      <Card>
        <CardHeader
          title="Absensi hari ini"
          icon={<CalendarCheck className="h-5 w-5" />}
          action={loading ? null : <Badge tone={attStatus.tone}>{attStatus.label}</Badge>}
        />
        <div className="grid grid-cols-2 gap-3 p-5">
          <div className="rounded-2xl bg-cream-light p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-ink-soft">
              <LogIn className="h-3.5 w-3.5" /> Jam masuk
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums">{loading ? '…' : formatTime(att?.check_in_at)}</p>
          </div>
          <div className="rounded-2xl bg-cream-light p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-ink-soft">
              <LogOut className="h-3.5 w-3.5" /> Jam pulang
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums">{loading ? '…' : formatTime(att?.check_out_at)}</p>
          </div>
          {!loading && (!att || !att.check_out_at) && (
            <Link
              to="/app/absensi"
              className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-semibold text-cream hover:bg-brand-dark"
            >
              {!att ? 'Absen masuk sekarang' : 'Absen pulang'} <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </Card>

      {/* Ringkasan pemasukan */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Pendapatan bersih hari ini" value={loading ? '…' : formatRupiah(todayIncome)} icon={<Wallet className="h-5 w-5" />} hint={byDate.get(today) ? 'Sudah dilaporkan' : 'Belum dilaporkan'} />
        <StatCard label="Pendapatan bersih minggu ini" value={loading ? '…' : formatRupiah(weekIncome)} icon={<TrendingUp className="h-5 w-5" />} tone="success" hint={`Sejak ${formatDateShort(weekStart)}`} />
      </div>

      {/* Grafik 7 hari */}
      <Card>
        <CardHeader
          title="Penjualan 7 hari terakhir"
          subtitle="Pendapatan bersih (cash + QRIS + EDC − modal)"
          action={
            <Link to="/app/grafik" className="text-sm font-semibold text-brand hover:underline">
              Isi laporan
            </Link>
          }
        />
        <div className="px-2 pb-4 pt-3 sm:px-4">{loading ? <LoadingBlock /> : <IncomeAreaChart data={chart} height={220} />}</div>
      </Card>

      {/* Laporan stok belum selesai */}
      <Card>
        <CardHeader
          title="Laporan stok belum selesai"
          icon={<ClipboardList className="h-5 w-5" />}
          action={
            <Link to="/app/stock" className="text-sm font-semibold text-brand hover:underline">
              Lapor
            </Link>
          }
        />
        <div className="p-5 pt-3">
          {loading ? (
            <LoadingBlock />
          ) : openShortages.length === 0 ? (
            <EmptyState title="Tidak ada laporan terbuka" description="Semua laporan kekurangan bahan baku Anda sudah ditangani." />
          ) : (
            <ul className="divide-y divide-line/70">
              {openShortages.slice(0, 4).map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{(s.items ?? []).map((i) => i.item_name).join(', ') || '—'}</p>
                    <p className="text-xs text-ink-soft">{formatDateShort(s.report_date)}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <UrgencyBadge urgency={s.urgency} />
                    <ShortageStatusBadge status={s.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
