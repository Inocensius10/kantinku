import { useEffect, useState } from 'react';
import { BadgeCheck, Undo2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Textarea } from '@/components/ui/Field';
import { SalesStatusBadge } from '@/components/ui/Badge';
import { useToast } from '@/contexts/ToastContext';
import { salesService } from '@/services/salesService';
import { formatDateLong, formatDateTime, formatNumber, formatRupiah } from '@/lib/format';
import { toMessage } from '@/lib/errors';
import type { DailySalesReport } from '@/types';

export function SalesReportDetailModal({
  report,
  onClose,
  onChanged,
}: {
  report: DailySalesReport | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => setNotes(report?.admin_notes ?? ''), [report]);

  if (!report) return null;
  const diff = report.net_income - report.estimated_total;

  const setStatus = async (status: 'verified' | 'submitted') => {
    setSaving(true);
    try {
      await salesService.setStatus(report.id, status, notes);
      toast.success(status === 'verified' ? 'Laporan diverifikasi.' : 'Verifikasi dibatalkan. Karyawan dapat mengubah laporan.');
      onChanged();
      onClose();
    } catch (err) {
      toast.error(toMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Laporan ${report.profile?.full_name ?? ''}`}
      description={`${formatDateLong(report.report_date)} · Loket ${report.outlet?.name ?? '—'}`}
      footer={
        report.status === 'verified' ? (
          <Button variant="secondary" loading={saving} icon={<Undo2 className="h-4 w-4" />} onClick={() => setStatus('submitted')}>
            Batalkan verifikasi
          </Button>
        ) : (
          <Button variant="success" loading={saving} icon={<BadgeCheck className="h-4 w-4" />} onClick={() => setStatus('verified')}>
            Verifikasi laporan
          </Button>
        )
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <SalesStatusBadge status={report.status} />
          <span className="text-ink-soft">Dikirim {formatDateTime(report.submitted_at)}</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-line/70">
          <table className="table-base">
            <thead>
              <tr>
                <th>Produk</th>
                <th className="text-right">Harga</th>
                <th className="text-right">Jumlah</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(report.items ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-ink-soft">
                    Tidak ada rincian produk.
                  </td>
                </tr>
              ) : (
                (report.items ?? []).map((i) => (
                  <tr key={i.id}>
                    <td className="font-medium">{i.product_name}</td>
                    <td className="text-right tabular-nums">{formatRupiah(i.unit_price)}</td>
                    <td className="text-right tabular-nums">{formatNumber(i.quantity)}</td>
                    <td className="text-right font-semibold tabular-nums">{formatRupiah(i.subtotal)}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-cream/60 font-semibold">
                <td className="px-4 py-3">Estimasi penjualan</td>
                <td />
                <td className="px-4 py-3 text-right tabular-nums">{formatNumber(report.total_items)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatRupiah(report.estimated_total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="space-y-1.5 rounded-xl border border-line/70 p-4 text-sm">
          {[
            ['Uang cash', report.cash_income],
            ['Uang QRIS', report.qris_income],
            ['Uang EDC', report.edc_income],
          ].map(([label, value]) => (
            <div key={label as string} className="flex justify-between gap-2">
              <span className="text-ink-soft">{label}</span>
              <span className="tabular-nums">{formatRupiah(value as number)}</span>
            </div>
          ))}
          <div className="flex justify-between gap-2 border-t border-line pt-1.5 font-semibold">
            <span>Total uang</span>
            <span className="tabular-nums">{formatRupiah(report.actual_income)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-ink-soft">Dikurangi modal brankas</span>
            <span className="tabular-nums text-danger">− {formatRupiah(report.safe_capital)}</span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-cream-light p-3">
            <p className="text-xs text-ink-soft">Pendapatan bersih</p>
            <p className={`text-lg font-bold tabular-nums ${report.net_income < 0 ? 'text-danger' : ''}`}>{formatRupiah(report.net_income)}</p>
          </div>
          <div className={`rounded-xl p-3 ${diff === 0 ? 'bg-success/10' : 'bg-warning/10'}`}>
            <p className="text-xs text-ink-soft">Selisih bersih − estimasi</p>
            <p className={`text-lg font-bold tabular-nums ${diff === 0 ? 'text-success' : 'text-[#8a5d0c]'}`}>
              {diff > 0 ? '+' : ''}
              {formatRupiah(diff)}
            </p>
          </div>
        </div>

        {report.notes && (
          <div className="rounded-xl border border-line/70 p-3 text-sm">
            <p className="text-xs font-semibold text-ink-soft">Catatan karyawan</p>
            <p className="mt-1">{report.notes}</p>
          </div>
        )}

        <Field label="Catatan admin (opsional)">
          <Textarea rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Mis. selisih sudah dikonfirmasi" />
        </Field>
        {report.verified_at && <p className="text-xs text-ink-soft">Diverifikasi {formatDateTime(report.verified_at)}</p>}
      </div>
    </Modal>
  );
}
