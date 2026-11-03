import { useMemo, useState } from 'react';
import { Ban, CheckCircle2, Eye, Phone, Power, Search, XCircle } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { useOutlets } from '@/hooks/useOutlets';
import { useAvatarUrls } from '@/hooks/useAvatarUrls';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { profileService } from '@/services/profileService';
import { attendanceService } from '@/services/attendanceService';
import { salesService } from '@/services/salesService';
import { Card, PageHeader } from '@/components/ui/Card';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { AccountStatusBadge, Badge, SalesStatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/Feedback';
import { OutletSelect } from '@/components/admin/OutletSelect';
import { PeriodFilter, defaultPeriod, periodToRange } from '@/components/ui/PeriodFilter';
import { calculateAge, formatDateShort, formatDateTime, formatDistance, formatNumber, formatRupiah, formatTime } from '@/lib/format';
import { toMessage } from '@/lib/errors';
import type { AccountStatus, Profile } from '@/types';

type StatusTab = AccountStatus | 'all';

export default function EmployeesPage() {
  const toast = useToast();
  const { profile: me } = useAuth();
  const { outlets } = useOutlets();
  const [tab, setTab] = useState<StatusTab>('pending');
  const [outletId, setOutletId] = useState('');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<Profile | null>(null);
  const [rejecting, setRejecting] = useState<Profile | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const q = useAsync(() => profileService.listProfiles({ outletId: outletId || null }), [outletId]);
  const all = q.data ?? [];

  const counts = useMemo(() => {
    const c: Record<StatusTab, number> = { pending: 0, active: 0, inactive: 0, rejected: 0, all: all.length };
    for (const p of all) c[p.status]++;
    return c;
  }, [all]);

  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return all.filter(
      (p) =>
        (tab === 'all' || p.status === tab) &&
        (!s || p.full_name.toLowerCase().includes(s) || p.email.toLowerCase().includes(s) || (p.phone ?? '').includes(s)),
    );
  }, [all, tab, search]);

  const avatarUrls = useAvatarUrls(list.map((p) => p.avatar_path));

  const update = async (p: Profile, patch: Parameters<typeof profileService.adminUpdateProfile>[1], msg: string) => {
    setBusy(p.id);
    try {
      await profileService.adminUpdateProfile(p.id, patch);
      toast.success(msg);
      await q.reload();
      if (detail?.id === p.id) setDetail({ ...p, ...patch } as Profile);
    } catch (err) {
      toast.error(toMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const approve = (p: Profile) => {
    if (!p.outlet_id) {
      toast.error('Tentukan loket karyawan terlebih dahulu sebelum menyetujui.');
      setDetail(p);
      return;
    }
    void update(p, { status: 'active', status_note: null }, `${p.full_name} disetujui dan aktif.`);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Manajemen Karyawan" subtitle="Setujui registrasi, atur loket, dan kelola status akun." />

      <Tabs<StatusTab>
        value={tab}
        onChange={setTab}
        items={[
          { value: 'pending', label: 'Menunggu', count: counts.pending },
          { value: 'active', label: 'Aktif', count: counts.active },
          { value: 'inactive', label: 'Nonaktif', count: counts.inactive },
          { value: 'rejected', label: 'Ditolak', count: counts.rejected },
          { value: 'all', label: 'Semua' },
        ]}
      />

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <Input className="pl-10" placeholder="Cari nama, email, atau telepon…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <OutletSelect outlets={outlets} value={outletId} onChange={setOutletId} />
      </div>

      {q.error && <ErrorState message={q.error} onRetry={q.reload} />}

      {q.loading ? (
        <LoadingBlock />
      ) : list.length === 0 ? (
        <Card>
          <EmptyState title="Tidak ada data" description={tab === 'pending' ? 'Tidak ada registrasi yang menunggu persetujuan.' : 'Tidak ada pengguna yang cocok dengan filter.'} />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => (
            <Card key={p.id} className="flex flex-col p-4">
              <div className="flex items-start gap-3">
                <Avatar name={p.full_name} src={p.avatar_path ? avatarUrls[p.avatar_path] : null} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{p.full_name}</p>
                  <p className="truncate text-sm text-ink-soft">{p.email}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <AccountStatusBadge status={p.status} />
                    {p.role === 'admin' && <Badge tone="brand">Admin</Badge>}
                    <Badge>{p.outlet?.name ?? 'Tanpa loket'}</Badge>
                  </div>
                </div>
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-soft">
                <Phone className="h-3.5 w-3.5" /> {p.phone ?? '—'} · Daftar {formatDateShort(p.created_at.slice(0, 10))}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-line/60 pt-3">
                <Button size="sm" variant="secondary" icon={<Eye className="h-4 w-4" />} onClick={() => setDetail(p)}>
                  Detail
                </Button>
                {p.id !== me?.id && p.status === 'pending' && (
                  <>
                    <Button size="sm" variant="success" loading={busy === p.id} icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => approve(p)}>
                      Setujui
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger"
                      icon={<XCircle className="h-4 w-4" />}
                      onClick={() => {
                        setRejectNote('');
                        setRejecting(p);
                      }}
                    >
                      Tolak
                    </Button>
                  </>
                )}
                {p.id !== me?.id && p.status === 'active' && (
                  <Button size="sm" variant="ghost" className="text-danger" loading={busy === p.id} icon={<Ban className="h-4 w-4" />} onClick={() => update(p, { status: 'inactive' }, `Akun ${p.full_name} dinonaktifkan.`)}>
                    Nonaktifkan
                  </Button>
                )}
                {p.id !== me?.id && (p.status === 'inactive' || p.status === 'rejected') && (
                  <Button size="sm" variant="ghost" className="text-success" loading={busy === p.id} icon={<Power className="h-4 w-4" />} onClick={() => approve(p)}>
                    Aktifkan
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Tolak registrasi */}
      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title="Tolak registrasi"
        description={rejecting?.full_name}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejecting(null)}>
              Batal
            </Button>
            <Button
              variant="danger"
              loading={busy === rejecting?.id}
              onClick={async () => {
                if (!rejecting) return;
                await update(rejecting, { status: 'rejected', status_note: rejectNote.trim() || null }, 'Registrasi ditolak.');
                setRejecting(null);
              }}
            >
              Tolak
            </Button>
          </>
        }
      >
        <Field label="Alasan (opsional, ditampilkan ke pengguna)">
          <Textarea rows={3} maxLength={300} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
        </Field>
      </Modal>

      {detail && (
        <EmployeeDetailModal
          profile={detail}
          isSelf={detail.id === me?.id}
          outlets={outlets}
          busy={busy === detail.id}
          onClose={() => setDetail(null)}
          onChangeOutlet={(outletId) => update(detail, { outlet_id: outletId || null }, 'Loket karyawan diperbarui.')}
        />
      )}
    </div>
  );
}

function EmployeeDetailModal({
  profile,
  isSelf,
  outlets,
  busy,
  onClose,
  onChangeOutlet,
}: {
  profile: Profile;
  isSelf: boolean;
  outlets: ReturnType<typeof useOutlets>['outlets'];
  busy: boolean;
  onClose: () => void;
  onChangeOutlet: (outletId: string) => void;
}) {
  const [tab, setTab] = useState<'info' | 'attendance' | 'sales'>('info');
  const [period, setPeriod] = useState(defaultPeriod('month'));
  const range = periodToRange(period);
  const [outlet, setOutlet] = useState(profile.outlet_id ?? '');
  const age = calculateAge(profile.birth_date);

  const attQ = useAsync(() => attendanceService.list(range, { userId: profile.id }), [profile.id, range.from, range.to], { enabled: tab === 'attendance' });
  const salesQ = useAsync(() => salesService.list(range, { userId: profile.id }), [profile.id, range.from, range.to], { enabled: tab === 'sales' });

  return (
    <Modal open onClose={onClose} title={profile.full_name} description={profile.email} size="xl">
      <div className="space-y-4">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: 'info', label: 'Profil' },
            { value: 'attendance', label: 'Riwayat absensi' },
            { value: 'sales', label: 'Riwayat penjualan' },
          ]}
        />

        {tab === 'info' && (
          <div className="grid gap-5 md:grid-cols-[auto_1fr]">
            <Avatar name={profile.full_name} path={profile.avatar_path} size="xl" className="mx-auto" />
            <div className="space-y-4">
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                {[
                  ['Telepon', profile.phone ?? '—'],
                  ['Tanggal lahir', profile.birth_date ? `${formatDateShort(profile.birth_date)}${age !== null ? ` (${age} th)` : ''}` : '—'],
                  ['Alamat', profile.address ?? '—'],
                  ['Role', profile.role === 'admin' ? 'Admin' : 'Karyawan'],
                  ['Terdaftar', formatDateTime(profile.created_at)],
                  ['Disetujui', formatDateTime(profile.approved_at)],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-cream-light/70 p-3">
                    <dt className="text-xs text-ink-soft">{k}</dt>
                    <dd className="mt-0.5 font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">Status:</span> <AccountStatusBadge status={profile.status} />
                {profile.status_note && <span className="text-sm text-ink-soft">— {profile.status_note}</span>}
              </div>
              {!isSelf && (
                <div className="flex flex-wrap items-end gap-2 rounded-xl border border-line/70 p-3">
                  <Field label="Loket kerja" className="min-w-[200px] flex-1">
                    <Select value={outlet} onChange={(e) => setOutlet(e.target.value)}>
                      <option value="">— Tanpa loket —</option>
                      {outlets.map((o) => (
                        <option key={o.id} value={o.id} disabled={!o.is_active && o.id !== profile.outlet_id}>
                          {o.name}
                          {!o.is_active ? ' (nonaktif)' : ''}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Button loading={busy} disabled={outlet === (profile.outlet_id ?? '')} onClick={() => onChangeOutlet(outlet)}>
                    Simpan loket
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {tab !== 'info' && <PeriodFilter value={period} onChange={setPeriod} />}

        {tab === 'attendance' &&
          (attQ.loading ? (
            <LoadingBlock />
          ) : attQ.error ? (
            <ErrorState message={attQ.error} onRetry={attQ.reload} />
          ) : !attQ.data?.length ? (
            <EmptyState title="Tidak ada absensi pada periode ini" />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line/70">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Loket</th>
                    <th>Masuk</th>
                    <th>Pulang</th>
                    <th className="text-right">Jarak masuk</th>
                  </tr>
                </thead>
                <tbody>
                  {attQ.data.map((a) => (
                    <tr key={a.id}>
                      <td className="whitespace-nowrap">{formatDateShort(a.work_date)}</td>
                      <td>{a.outlet?.name}</td>
                      <td className="tabular-nums">{formatTime(a.check_in_at)}</td>
                      <td className="tabular-nums">{formatTime(a.check_out_at)}</td>
                      <td className="text-right tabular-nums">{formatDistance(a.check_in_distance_m)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-line/60 px-4 py-2 text-sm text-ink-soft">Total hadir: {attQ.data.length} hari</p>
            </div>
          ))}

        {tab === 'sales' &&
          (salesQ.loading ? (
            <LoadingBlock />
          ) : salesQ.error ? (
            <ErrorState message={salesQ.error} onRetry={salesQ.reload} />
          ) : !salesQ.data?.length ? (
            <EmptyState title="Tidak ada laporan penjualan pada periode ini" />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line/70">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th className="text-right">Produk</th>
                    <th className="text-right">Estimasi</th>
                    <th className="text-right">Cash</th>
                    <th className="text-right">QRIS</th>
                    <th className="text-right">EDC</th>
                    <th className="text-right">Modal</th>
                    <th className="text-right">Bersih</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {salesQ.data.map((r) => (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap">{formatDateShort(r.report_date)}</td>
                      <td className="text-right tabular-nums">{formatNumber(r.total_items)}</td>
                      <td className="text-right tabular-nums">{formatRupiah(r.estimated_total)}</td>
                      <td className="text-right tabular-nums">{formatRupiah(r.cash_income)}</td>
                      <td className="text-right tabular-nums">{formatRupiah(r.qris_income)}</td>
                      <td className="text-right tabular-nums">{formatRupiah(r.edc_income)}</td>
                      <td className="text-right tabular-nums">−{formatRupiah(r.safe_capital)}</td>
                      <td className="text-right font-semibold tabular-nums">{formatRupiah(r.net_income)}</td>
                      <td>
                        <SalesStatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-line/60 px-4 py-2 text-sm text-ink-soft">
                Total pendapatan bersih: <b className="text-ink">{formatRupiah(salesQ.data.reduce((s, r) => s + r.net_income, 0))}</b>
              </p>
            </div>
          ))}
      </div>
    </Modal>
  );
}
