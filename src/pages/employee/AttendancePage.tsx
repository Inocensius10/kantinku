import { useMemo, useState } from 'react';
import { CheckCircle2, Crosshair, History, LogIn, LogOut, MapPin, Printer, RefreshCw, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { attendanceService } from '@/services/attendanceService';
import { settingsService } from '@/services/settingsService';
import { getAccuratePosition, GeoError, haversineMeters } from '@/lib/geo';
import { formatDateLong, formatDateShort, formatDistance, formatTime, jakartaDate } from '@/lib/format';
import { toMessage } from '@/lib/errors';
import { Card, CardHeader, PageHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/Feedback';
import { PeriodFilter, defaultPeriod, periodLabel, periodToRange } from '@/components/ui/PeriodFilter';
import { PrintHeader } from '@/components/ui/PrintHeader';
import type { AttendanceResult } from '@/types';

type Phase = 'idle' | 'locating' | 'submitting';

interface ResultView {
  ok: boolean;
  title: string;
  message: string;
  distance?: number;
  accuracy?: number;
  radius?: number;
}

export default function AttendancePage() {
  const { profile } = useAuth();
  const today = jakartaDate();
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<ResultView | null>(null);
  const [period, setPeriod] = useState(defaultPeriod('month'));
  const range = periodToRange(period);

  const todayQ = useAsync(async () => {
    const [att, settings] = await Promise.all([attendanceService.getMine(profile!.id, today), settingsService.get()]);
    return { att, settings };
  }, [profile?.id, today]);

  const historyQ = useAsync(() => attendanceService.listMine(profile!.id, range), [profile?.id, range.from, range.to]);

  const att = todayQ.data?.att ?? null;
  const settings = todayQ.data?.settings ?? null;
  const action: 'in' | 'out' | 'done' = !att ? 'in' : !att.check_out_at ? 'out' : 'done';

  const doAttendance = async () => {
    setResult(null);
    setPhase('locating');
    try {
      const pos = await getAccuratePosition({ targetAccuracy: 25, maxWaitMs: 12000 });
      const localDistance = settings
        ? haversineMeters(pos.latitude, pos.longitude, settings.attendance_latitude, settings.attendance_longitude)
        : undefined;
      setPhase('submitting');
      const res: AttendanceResult = action === 'in' ? await attendanceService.checkIn(pos) : await attendanceService.checkOut(pos);
      setResult({
        ok: res.success,
        title: res.success ? (action === 'in' ? 'Absen masuk berhasil' : 'Absen pulang berhasil') : 'Absensi ditolak',
        message: res.message,
        distance: res.distance_m ?? localDistance,
        accuracy: res.accuracy_m ?? pos.accuracy,
        radius: res.radius_m ?? settings?.attendance_radius_m,
      });
      if (res.success) {
        await Promise.all([todayQ.reload(), historyQ.reload()]);
      }
    } catch (err) {
      setResult({
        ok: false,
        title: err instanceof GeoError ? 'Lokasi tidak tersedia' : 'Absensi gagal',
        message: err instanceof GeoError ? err.message : toMessage(err),
      });
    } finally {
      setPhase('idle');
    }
  };

  const history = historyQ.data ?? [];
  const summary = useMemo(
    () => ({ hadir: history.length, lengkap: history.filter((h) => h.check_out_at).length }),
    [history],
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Absensi" subtitle={formatDateLong(today)} />

      <Card className="print:hidden">
        <CardHeader
          title="Absensi hari ini"
          subtitle={settings ? `Radius ${settings.attendance_radius_m} m dari titik kantin` : undefined}
          icon={<MapPin className="h-5 w-5" />}
        />
        <div className="space-y-4 p-5">
          {todayQ.error && <ErrorState message={todayQ.error} onRetry={todayQ.reload} />}

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-cream-light p-4">
              <p className="flex items-center gap-1.5 text-xs font-medium text-ink-soft">
                <LogIn className="h-3.5 w-3.5" /> Masuk
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{todayQ.loading ? '…' : formatTime(att?.check_in_at)}</p>
              {att && <p className="mt-0.5 text-xs text-ink-soft">Jarak {formatDistance(att.check_in_distance_m)}</p>}
            </div>
            <div className="rounded-2xl bg-cream-light p-4">
              <p className="flex items-center gap-1.5 text-xs font-medium text-ink-soft">
                <LogOut className="h-3.5 w-3.5" /> Pulang
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{todayQ.loading ? '…' : formatTime(att?.check_out_at)}</p>
              {att?.check_out_distance_m != null && <p className="mt-0.5 text-xs text-ink-soft">Jarak {formatDistance(att.check_out_distance_m)}</p>}
            </div>
          </div>

          {!todayQ.loading &&
            (action === 'done' ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-success/10 py-4 text-sm font-semibold text-success">
                <CheckCircle2 className="h-5 w-5" /> Absensi hari ini sudah lengkap
              </div>
            ) : (
              <Button
                size="lg"
                block
                variant={action === 'in' ? 'primary' : 'success'}
                className="h-14 text-base"
                loading={phase !== 'idle'}
                disabled={!settings}
                icon={action === 'in' ? <LogIn className="h-5 w-5" /> : <LogOut className="h-5 w-5" />}
                onClick={doAttendance}
              >
                {phase === 'locating'
                  ? 'Mengambil lokasi GPS…'
                  : phase === 'submitting'
                    ? 'Memverifikasi lokasi…'
                    : action === 'in'
                      ? 'Absen Masuk'
                      : 'Absen Pulang'}
              </Button>
            ))}

          {result && (
            <div
              className={`animate-slide-up rounded-2xl border p-4 ${result.ok ? 'border-success/30 bg-success/10' : 'border-danger/30 bg-danger/10'}`}
            >
              <div className={`flex items-center gap-2 font-bold ${result.ok ? 'text-success' : 'text-danger'}`}>
                {result.ok ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                {result.title}
              </div>
              <p className="mt-1 text-sm text-ink">{result.message}</p>
              {(result.distance !== undefined || result.accuracy !== undefined) && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {result.distance !== undefined && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-semibold">
                      <MapPin className="h-3.5 w-3.5" /> Jarak {formatDistance(result.distance)}
                      {result.radius ? ` / maks ${result.radius} m` : ''}
                    </span>
                  )}
                  {result.accuracy !== undefined && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-semibold">
                      <Crosshair className="h-3.5 w-3.5" /> Akurasi ±{Math.round(result.accuracy)} m
                    </span>
                  )}
                </div>
              )}
              {!result.ok && (
                <button onClick={doAttendance} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-danger underline-offset-2 hover:underline">
                  <RefreshCw className="h-4 w-4" /> Coba lagi
                </button>
              )}
            </div>
          )}

          <p className="text-xs text-ink-soft">
            Waktu absensi dicatat oleh server (WIB) dan lokasi diverifikasi di server. Aktifkan GPS dan izinkan akses lokasi di browser.
          </p>
        </div>
      </Card>

      {/* Riwayat */}
      <Card className="print:border-0 print:shadow-none">
        <div className="print:hidden">
          <CardHeader
            title="Riwayat absensi"
            subtitle={`${periodLabel(period)} · ${summary.hadir} hari hadir`}
            icon={<History className="h-5 w-5" />}
            action={
              <Button variant="secondary" size="sm" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()} disabled={!history.length}>
                Cetak
              </Button>
            }
          />
          <div className="px-5 pt-4">
            <PeriodFilter value={period} onChange={setPeriod} />
          </div>
        </div>

        <div className="print-area p-5 print:p-0">
          <PrintHeader
            title="Riwayat Absensi Karyawan"
            lines={[`Nama: ${profile?.full_name ?? ''}`, `Loket: ${profile?.outlet?.name ?? '—'}`, `Periode: ${periodLabel(period)}`]}
          />
          {historyQ.loading ? (
            <LoadingBlock />
          ) : historyQ.error ? (
            <ErrorState message={historyQ.error} onRetry={historyQ.reload} />
          ) : history.length === 0 ? (
            <EmptyState title="Belum ada absensi" description="Tidak ada data absensi pada periode ini." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line/70 print:overflow-visible print:rounded-none print:border-0">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th className="print:table-cell">Nama</th>
                    <th>Loket</th>
                    <th>Masuk</th>
                    <th>Pulang</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id}>
                      <td className="whitespace-nowrap font-medium">{formatDateShort(h.work_date)}</td>
                      <td className="whitespace-nowrap">{profile?.full_name}</td>
                      <td>{h.outlet?.name ?? '—'}</td>
                      <td className="tabular-nums">{formatTime(h.check_in_at)}</td>
                      <td className="tabular-nums">{formatTime(h.check_out_at)}</td>
                      <td>
                        {h.check_out_at ? (
                          <Badge tone="success">Hadir</Badge>
                        ) : h.work_date === today ? (
                          <Badge tone="brand">Sedang bekerja</Badge>
                        ) : (
                          <Badge tone="warning">Tidak absen pulang</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 hidden text-[10pt] print:block">
                Total hadir: {summary.hadir} hari · Absensi lengkap: {summary.lengkap} hari
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
