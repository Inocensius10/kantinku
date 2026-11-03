import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { BarChart3, CheckCircle2, Lock, Minus, Plus, Save, ShoppingBag, Wallet } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useAsync } from '@/hooks/useAsync';
import { salesService } from '@/services/salesService';
import { Card, CardHeader, PageHeader, StatCard } from '@/components/ui/Card';
import { CurrencyInput, Field, Select, Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { SalesStatusBadge } from '@/components/ui/Badge';
import { Alert, EmptyState, ErrorState, LoadingBlock } from '@/components/ui/Feedback';
import { IncomeAreaChart, ProductBarChart, TrendLineChart } from '@/components/charts/Charts';
import {
  dateRangeList,
  formatDateAxis,
  formatDateLong,
  formatDateShort,
  formatNumber,
  formatRupiah,
  jakartaDate,
  shiftDate,
} from '@/lib/format';
import { toMessage } from '@/lib/errors';

interface Row {
  product_id: string;
  name: string;
  price: number;
  inactive?: boolean;
}

export default function SalesPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const today = jakartaDate();
  const outletId = profile?.outlet_id ?? null;

  // ---------- Form laporan hari ini ----------
  const formQ = useAsync(async () => {
    const [products, report] = await Promise.all([
      salesService.listProducts({ outletId, activeOnly: true }),
      salesService.getMyReport(profile!.id, today),
    ]);
    return { products, report };
  }, [profile?.id, outletId, today]);

  const report = formQ.data?.report ?? null;
  const locked = report?.status === 'verified';

  const rows: Row[] = useMemo(() => {
    const products = formQ.data?.products ?? [];
    const list: Row[] = products.map((p) => ({ product_id: p.id, name: p.name, price: p.price }));
    // Produk yang sudah dilaporkan tapi kini nonaktif tetap ditampilkan dengan harga snapshot.
    for (const it of report?.items ?? []) {
      const existing = list.find((r) => r.product_id === it.product_id);
      if (existing) existing.price = it.unit_price;
      else list.push({ product_id: it.product_id, name: it.product_name, price: it.unit_price, inactive: true });
    }
    return list;
  }, [formQ.data, report]);

  const [qty, setQty] = useState<Record<string, number>>({});
  const [cashIncome, setCashIncome] = useState<number | ''>('');
  const [qrisIncome, setQrisIncome] = useState<number | ''>('');
  const [edcIncome, setEdcIncome] = useState<number | ''>('');
  const [safeCapital, setSafeCapital] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ cash?: string; capital?: string }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q: Record<string, number> = {};
    for (const it of report?.items ?? []) q[it.product_id] = it.quantity;
    setQty(q);
    setCashIncome(report ? report.cash_income : '');
    setQrisIncome(report ? report.qris_income : '');
    setEdcIncome(report ? report.edc_income : '');
    setSafeCapital(report ? report.safe_capital : '');
    setNotes(report?.notes ?? '');
  }, [report]);

  const estimated = rows.reduce((s, r) => s + r.price * (qty[r.product_id] ?? 0), 0);
  const totalItems = rows.reduce((s, r) => s + (qty[r.product_id] ?? 0), 0);
  const moneyFilled = cashIncome !== '' || qrisIncome !== '' || edcIncome !== '';
  const totalMoney = Number(cashIncome || 0) + Number(qrisIncome || 0) + Number(edcIncome || 0);
  const netIncome = totalMoney - Number(safeCapital || 0);
  const diff = moneyFilled && safeCapital !== '' ? netIncome - estimated : null;

  const setQ = (id: string, v: number) => setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(100000, Math.floor(v || 0))) }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (cashIncome === '') errs.cash = 'Uang cash wajib diisi (isi 0 jika tidak ada).';
    if (safeCapital === '') errs.capital = 'Uang modal brankas wajib diisi.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      await salesService.submitReport({
        cashIncome: Number(cashIncome),
        qrisIncome: Number(qrisIncome || 0),
        edcIncome: Number(edcIncome || 0),
        safeCapital: Number(safeCapital),
        notes,
        items: rows.map((r) => ({ product_id: r.product_id, quantity: qty[r.product_id] ?? 0 })),
      });
      toast.success(report ? 'Laporan hari ini berhasil diperbarui.' : 'Laporan penjualan berhasil dikirim.');
      await Promise.all([formQ.reload(), chartQ.reload()]);
    } catch (err) {
      toast.error(toMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // ---------- Grafik ----------
  const [days, setDays] = useState(7);
  const chartFrom = shiftDate(today, -(days - 1));
  const chartQ = useAsync(() => salesService.listMine(profile!.id, { from: chartFrom, to: today }), [profile?.id, chartFrom, today]);
  const chartReports = chartQ.data ?? [];

  const trend = useMemo(() => {
    const byDate = new Map(chartReports.map((r) => [r.report_date, r]));
    return dateRangeList(chartFrom, today).map((d) => ({
      label: formatDateAxis(d),
      'Pendapatan bersih': byDate.get(d)?.net_income ?? 0,
      'Estimasi produk': byDate.get(d)?.estimated_total ?? 0,
    }));
  }, [chartReports, chartFrom, today]);

  const productAgg = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of chartReports) for (const it of r.items ?? []) m.set(it.product_name, (m.get(it.product_name) ?? 0) + it.quantity);
    return [...m.entries()].map(([name, quantity]) => ({ name, quantity })).sort((a, b) => b.quantity - a.quantity);
  }, [chartReports]);

  const periodIncome = chartReports.reduce((s, r) => s + r.net_income, 0);
  const periodItems = chartReports.reduce((s, r) => s + r.total_items, 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Laporan Penjualan" subtitle={`${formatDateLong(today)} · Loket ${profile?.outlet?.name ?? '—'}`} />

      {/* ---------- Form ---------- */}
      <Card>
        <CardHeader
          title="Laporan hari ini"
          subtitle="Isi jumlah produk terjual, uang cash, QRIS, EDC, dan uang modal di brankas."
          icon={<ShoppingBag className="h-5 w-5" />}
          action={report ? <SalesStatusBadge status={report.status} /> : null}
        />
        {formQ.loading ? (
          <LoadingBlock />
        ) : formQ.error ? (
          <div className="p-5">
            <ErrorState message={formQ.error} onRetry={formQ.reload} />
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5 p-5">
            {locked && (
              <Alert tone="success" icon={<Lock className="h-4 w-4" />} title="Laporan sudah diverifikasi admin">
                Laporan hari ini tidak dapat diubah lagi.{report?.admin_notes ? ` Catatan admin: ${report.admin_notes}` : ''}
              </Alert>
            )}
            {!locked && report && (
              <Alert tone="info" icon={<CheckCircle2 className="h-4 w-4" />}>
                Laporan hari ini sudah terkirim. Anda masih dapat mengubahnya sebelum diverifikasi admin.
              </Alert>
            )}

            {/* Produk */}
            {rows.length === 0 ? (
              <EmptyState title="Belum ada produk" description="Admin belum menentukan produk untuk loket Anda. Anda tetap dapat melaporkan uang cash, QRIS, EDC & uang modal." />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-line/70">
                <div className="hidden grid-cols-[1fr_120px_150px_130px] gap-3 bg-cream-light/60 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-soft sm:grid">
                  <span>Produk</span>
                  <span className="text-right">Harga</span>
                  <span className="text-center">Terjual</span>
                  <span className="text-right">Total</span>
                </div>
                <ul className="divide-y divide-line/60">
                  {rows.map((r) => {
                    const q = qty[r.product_id] ?? 0;
                    return (
                      <li key={r.product_id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[1fr_120px_150px_130px]">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{r.name}</p>
                          <p className="text-xs text-ink-soft sm:hidden">{formatRupiah(r.price)} / porsi</p>
                          {r.inactive && <p className="text-xs text-warning">Produk sudah dinonaktifkan</p>}
                        </div>
                        <p className="hidden text-right text-sm tabular-nums text-ink-soft sm:block">{formatRupiah(r.price)}</p>
                        <div className="flex items-center justify-end gap-1 sm:justify-center">
                          <button
                            type="button"
                            disabled={locked || q === 0}
                            onClick={() => setQ(r.product_id, q - 1)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-soft hover:bg-cream-light disabled:opacity-40"
                            aria-label={`Kurangi ${r.name}`}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            disabled={locked}
                            value={q === 0 ? '' : q}
                            placeholder="0"
                            onChange={(e) => setQ(r.product_id, Number(e.target.value))}
                            className="h-9 w-16 rounded-lg border border-line text-center text-sm font-semibold tabular-nums outline-none focus:border-brand-accent disabled:bg-cream-light/60"
                            aria-label={`Jumlah ${r.name}`}
                          />
                          <button
                            type="button"
                            disabled={locked}
                            onClick={() => setQ(r.product_id, q + 1)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-soft hover:bg-cream-light disabled:opacity-40"
                            aria-label={`Tambah ${r.name}`}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="col-span-2 text-right text-sm font-semibold tabular-nums sm:col-span-1">
                          <span className="mr-1 text-xs font-normal text-ink-soft sm:hidden">Total:</span>
                          {formatRupiah(r.price * q)}
                        </p>
                      </li>
                    );
                  })}
                </ul>
                <div className="flex items-center justify-between bg-cream px-4 py-3">
                  <span className="text-sm font-semibold text-brand-dark">Estimasi penjualan ({formatNumber(totalItems)} item)</span>
                  <span className="text-lg font-extrabold tabular-nums text-brand-dark">{formatRupiah(estimated)}</span>
                </div>
              </div>
            )}

            {/* Uang hari ini & modal */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Uang cash" required error={errors.cash} hint="Uang tunai yang diterima hari ini.">
                <CurrencyInput value={cashIncome} onChange={setCashIncome} disabled={locked} />
              </Field>
              <Field label="Uang di QRIS" hint="Pembayaran QRIS hari ini. Kosong = 0.">
                <CurrencyInput value={qrisIncome} onChange={setQrisIncome} disabled={locked} />
              </Field>
              <Field label="Uang EDC" hint="Pembayaran kartu (mesin EDC) hari ini. Kosong = 0.">
                <CurrencyInput value={edcIncome} onChange={setEdcIncome} disabled={locked} />
              </Field>
            </div>
            <Field label="Uang modal di brankas" required error={errors.capital} hint="Akan dikurangkan dari total uang hari ini.">
              <CurrencyInput value={safeCapital} onChange={setSafeCapital} disabled={locked} />
            </Field>

            {/* Rekap perhitungan */}
            <div className="space-y-1.5 rounded-2xl border border-line/70 bg-cream-light/50 p-4 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-ink-soft">Cash + QRIS + EDC</span>
                <span className="font-semibold tabular-nums">{formatRupiah(totalMoney)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-ink-soft">Dikurangi modal brankas</span>
                <span className="font-semibold tabular-nums text-danger">− {formatRupiah(Number(safeCapital || 0))}</span>
              </div>
              <div className="flex justify-between gap-2 border-t border-line pt-2">
                <span className="font-semibold text-brand-dark">Pendapatan bersih hari ini</span>
                <span className={`text-lg font-extrabold tabular-nums ${netIncome < 0 ? 'text-danger' : 'text-brand-dark'}`}>{formatRupiah(netIncome)}</span>
              </div>
            </div>

            {diff !== null && rows.length > 0 && (
              <div
                className={`flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm ${
                  diff === 0 ? 'bg-success/10 text-success' : 'bg-warning/10 text-[#8a5d0c]'
                }`}
              >
                <span className="font-medium">Selisih pendapatan bersih vs estimasi produk</span>
                <span className="font-bold tabular-nums">
                  {diff > 0 ? '+' : ''}
                  {formatRupiah(diff)}
                </span>
              </div>
            )}

            <Field label="Catatan tambahan (opsional)">
              <Textarea rows={2} maxLength={1000} disabled={locked} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Mis. ada produk retur, dll." />
            </Field>

            {!locked && (
              <Button type="submit" size="lg" block loading={saving} icon={<Save className="h-5 w-5" />}>
                {report ? 'Perbarui laporan' : 'Kirim laporan'}
              </Button>
            )}
          </form>
        )}
      </Card>

      {/* ---------- Grafik ---------- */}
      <Card>
        <CardHeader
          title="Grafik penjualan"
          icon={<BarChart3 className="h-5 w-5" />}
          action={
            <div className="w-36">
              <Select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Periode grafik">
                <option value={7}>7 hari</option>
                <option value={14}>14 hari</option>
                <option value={30}>30 hari</option>
              </Select>
            </div>
          }
        />
        <div className="space-y-5 p-5">
          {chartQ.loading ? (
            <LoadingBlock />
          ) : chartQ.error ? (
            <ErrorState message={chartQ.error} onRetry={chartQ.reload} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label={`Pendapatan bersih ${days} hari`} value={formatRupiah(periodIncome)} icon={<Wallet className="h-5 w-5" />} />
                <StatCard label="Produk terjual" value={formatNumber(periodItems)} icon={<ShoppingBag className="h-5 w-5" />} tone="success" />
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold">Pendapatan bersih vs estimasi produk</p>
                {days <= 7 ? (
                  <TrendLineChart data={trend} series={['Pendapatan bersih', 'Estimasi produk']} height={240} />
                ) : (
                  <IncomeAreaChart data={trend.map((t) => ({ label: t.label as string, value: t['Pendapatan bersih'] as number }))} height={240} name="Pendapatan bersih" />
                )}
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold">Produk terjual</p>
                {productAgg.length ? <ProductBarChart data={productAgg} /> : <EmptyState title="Belum ada data produk" />}
              </div>
            </>
          )}
        </div>
      </Card>

      {/* ---------- Riwayat ---------- */}
      <Card>
        <CardHeader title="Riwayat laporan" subtitle={`${days} hari terakhir`} />
        <div className="p-5 pt-3">
          {chartReports.length === 0 ? (
            <EmptyState title="Belum ada laporan" />
          ) : (
            <ul className="divide-y divide-line/70">
              {chartReports.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="text-sm font-semibold">{formatDateShort(r.report_date)}</p>
                    <p className="text-xs text-ink-soft">
                      {formatNumber(r.total_items)} item · Cash {formatRupiah(r.cash_income)} · QRIS {formatRupiah(r.qris_income)} · EDC {formatRupiah(r.edc_income)} · Modal {formatRupiah(r.safe_capital)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold tabular-nums" title="Pendapatan bersih">{formatRupiah(r.net_income)}</span>
                    <SalesStatusBadge status={r.status} />
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
