import { useEffect, useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CurrencyInput, Field, Input, Select } from '@/components/ui/Field';
import { Alert, LoadingBlock } from '@/components/ui/Feedback';
import { useToast } from '@/contexts/ToastContext';
import { useAsync } from '@/hooks/useAsync';
import { profileService } from '@/services/profileService';
import { salesService } from '@/services/salesService';
import { formatDateLong, formatRupiah, jakartaDate } from '@/lib/format';
import { toMessage } from '@/lib/errors';
import type { DailySalesReport } from '@/types';

type Money = number | '';

/**
 * Admin mengisi / mengubah uang Cash, QRIS, EDC & modal brankas.
 * - Dengan `report`: mengubah laporan tersebut (karyawan & tanggal terkunci).
 * - Tanpa `report`: admin memilih karyawan & tanggal; laporan dibuat bila belum ada.
 */
export function AdminMoneyModal({
  open,
  report,
  defaultDate,
  onClose,
  onSaved,
}: {
  open: boolean;
  report?: DailySalesReport | null;
  defaultDate?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const today = jakartaDate();
  const fixed = Boolean(report);

  const [userId, setUserId] = useState('');
  const [date, setDate] = useState(today);
  const [cash, setCash] = useState<Money>('');
  const [qris, setQris] = useState<Money>('');
  const [edc, setEdc] = useState<Money>('');
  const [capital, setCapital] = useState<Money>('');
  const [errors, setErrors] = useState<{ user?: string; cash?: string; capital?: string }>({});
  const [saving, setSaving] = useState(false);

  const employeesQ = useAsync(
    () => (open && !fixed ? profileService.listProfiles({ role: 'employee', status: 'active' }) : Promise.resolve([])),
    [open, fixed],
  );

  // Laporan yang sudah ada untuk karyawan + tanggal terpilih (untuk prefill).
  const existingQ = useAsync(
    () =>
      open && !fixed && userId && date
        ? salesService.list({ from: date, to: date }, { userId }).then((r) => r[0] ?? null)
        : Promise.resolve(null),
    [open, fixed, userId, date],
  );
  const existing = fixed ? (report ?? null) : existingQ.data;

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (report) {
      setUserId(report.user_id);
      setDate(report.report_date);
    } else {
      setUserId('');
      setDate(defaultDate && defaultDate <= today ? defaultDate : today);
    }
  }, [open, report, defaultDate, today]);

  useEffect(() => {
    setCash(existing ? existing.cash_income : '');
    setQris(existing ? existing.qris_income : '');
    setEdc(existing ? existing.edc_income : '');
    setCapital(existing ? existing.safe_capital : '');
  }, [existing, open]);

  const total = Number(cash || 0) + Number(qris || 0) + Number(edc || 0);
  const net = total - Number(capital || 0);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!userId) errs.user = 'Pilih karyawan.';
    if (cash === '') errs.cash = 'Uang cash wajib diisi (isi 0 jika tidak ada).';
    if (capital === '') errs.capital = 'Uang modal brankas wajib diisi.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      await salesService.adminSaveMoney({
        userId,
        reportDate: date,
        cashIncome: Number(cash),
        qrisIncome: Number(qris || 0),
        edcIncome: Number(edc || 0),
        safeCapital: Number(capital),
      });
      toast.success(existing ? 'Uang laporan berhasil diperbarui.' : 'Laporan baru berhasil dibuat.');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(toMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const employees = employeesQ.data ?? [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={fixed ? 'Ubah uang laporan' : 'Input uang laporan'}
      description={
        fixed && report ? `${report.profile?.full_name ?? 'Karyawan'} · ${formatDateLong(report.report_date)}` : 'Isi uang cash, QRIS, EDC & modal brankas untuk karyawan.'
      }
      footer={
        <Button type="submit" form="admin-money-form" loading={saving} icon={<Save className="h-4 w-4" />}>
          Simpan
        </Button>
      }
    >
      <form id="admin-money-form" onSubmit={submit} className="space-y-4">
        {!fixed && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Karyawan" required error={errors.user}>
              {employeesQ.loading ? (
                <LoadingBlock />
              ) : (
                <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
                  <option value="">— Pilih karyawan —</option>
                  {employees
                    .filter((p) => p.outlet_id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                        {p.outlet?.name ? ` · ${p.outlet.name}` : ''}
                      </option>
                    ))}
                </Select>
              )}
            </Field>
            <Field label="Tanggal laporan" required>
              <Input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
            </Field>
          </div>
        )}

        {!fixed && userId && !existingQ.loading && (
          <Alert tone="info">
            {existing
              ? 'Karyawan ini sudah punya laporan pada tanggal tersebut. Angka di bawah akan memperbarui laporannya (rincian produk tidak berubah).'
              : 'Belum ada laporan pada tanggal tersebut. Laporan baru akan dibuat tanpa rincian produk.'}
          </Alert>
        )}
        {existing?.status === 'verified' && (
          <Alert tone="warning">Laporan ini sudah diverifikasi. Perubahan oleh admin tetap disimpan dan dicatat.</Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Uang cash" required error={errors.cash}>
            <CurrencyInput value={cash} onChange={setCash} />
          </Field>
          <Field label="Uang di QRIS" hint="Kosong = 0">
            <CurrencyInput value={qris} onChange={setQris} />
          </Field>
          <Field label="Uang EDC" hint="Kosong = 0">
            <CurrencyInput value={edc} onChange={setEdc} />
          </Field>
        </div>
        <Field label="Uang modal di brankas" required error={errors.capital}>
          <CurrencyInput value={capital} onChange={setCapital} />
        </Field>

        <div className="space-y-1.5 rounded-2xl border border-line/70 bg-cream-light/50 p-4 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-ink-soft">Cash + QRIS + EDC</span>
            <span className="font-semibold tabular-nums">{formatRupiah(total)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-ink-soft">Dikurangi modal brankas</span>
            <span className="font-semibold tabular-nums text-danger">− {formatRupiah(Number(capital || 0))}</span>
          </div>
          <div className="flex justify-between gap-2 border-t border-line pt-2">
            <span className="font-semibold text-brand-dark">Pendapatan bersih</span>
            <span className={`text-lg font-extrabold tabular-nums ${net < 0 ? 'text-danger' : 'text-brand-dark'}`}>{formatRupiah(net)}</span>
          </div>
        </div>
      </form>
    </Modal>
  );
}
