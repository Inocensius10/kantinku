import { useEffect, useState } from 'react';
import { AlertOctagon, MessageSquareText } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { useOutlets } from '@/hooks/useOutlets';
import { useToast } from '@/contexts/ToastContext';
import { inventoryService } from '@/services/inventoryService';
import { Card, PageHeader } from '@/components/ui/Card';
import { Field, Select, Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { SHORTAGE_STATUS_LABEL, ShortageStatusBadge, UrgencyBadge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/Feedback';
import { OutletSelect } from '@/components/admin/OutletSelect';
import { Avatar } from '@/components/ui/Avatar';
import { formatDateTime, formatNumber } from '@/lib/format';
import { toMessage } from '@/lib/errors';
import type { ShortageStatus, StockShortageReport } from '@/types';

type Filter = 'open' | ShortageStatus | 'all';

export default function ShortageReportsPage() {
  const toast = useToast();
  const { outlets } = useOutlets();
  const [filter, setFilter] = useState<Filter>('open');
  const [outletId, setOutletId] = useState('');
  const [editing, setEditing] = useState<StockShortageReport | null>(null);
  const [form, setForm] = useState<{ status: ShortageStatus; admin_notes: string }>({ status: 'new', admin_notes: '' });
  const [saving, setSaving] = useState(false);

  const q = useAsync(() => inventoryService.list({ status: filter, outletId: outletId || null }), [filter, outletId]);
  const rows = q.data ?? [];

  useEffect(() => {
    if (editing) setForm({ status: editing.status, admin_notes: editing.admin_notes ?? '' });
  }, [editing]);

  const quick = async (r: StockShortageReport, status: ShortageStatus) => {
    try {
      await inventoryService.updateShortage(r.id, { status });
      toast.success(`Status diubah ke "${SHORTAGE_STATUS_LABEL[status]}".`);
      await q.reload();
    } catch (err) {
      toast.error(toMessage(err));
    }
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await inventoryService.updateShortage(editing.id, { status: form.status, admin_notes: form.admin_notes.trim() || null });
      toast.success('Tindak lanjut disimpan.');
      setEditing(null);
      await q.reload();
    } catch (err) {
      toast.error(toMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Laporan Kekurangan Stok" subtitle="Tindak lanjuti laporan bahan baku dari karyawan." />

      <div className="flex flex-wrap items-center gap-2">
        <Tabs<Filter>
          value={filter}
          onChange={setFilter}
          items={[
            { value: 'open', label: 'Belum selesai' },
            { value: 'new', label: 'Baru' },
            { value: 'in_progress', label: 'Ditangani' },
            { value: 'done', label: 'Selesai' },
            { value: 'all', label: 'Semua' },
          ]}
        />
        <OutletSelect outlets={outlets} value={outletId} onChange={setOutletId} />
      </div>

      {q.error && <ErrorState message={q.error} onRetry={q.reload} />}

      {q.loading ? (
        <LoadingBlock />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState title="Tidak ada laporan" description="Tidak ada laporan kekurangan stok pada filter ini." />
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {rows.map((r) => {
            const emergency = r.urgency === 'emergency' && r.status !== 'done';
            return (
              <Card key={r.id} className={`p-4 ${emergency ? 'border-2 border-danger bg-danger/[0.04]' : ''}`}>
                {emergency && (
                  <div className="-mx-4 -mt-4 mb-3 flex items-center gap-2 rounded-t-2xl bg-danger px-4 py-2 text-sm font-bold text-white">
                    <AlertOctagon className="h-4 w-4" /> DARURAT
                  </div>
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={r.profile?.full_name} path={r.profile?.avatar_path} size="sm" />
                    <div>
                      <p className="font-semibold">{r.profile?.full_name ?? '—'}</p>
                      <p className="text-xs text-ink-soft">
                        Loket {r.outlet?.name} · {formatDateTime(r.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <UrgencyBadge urgency={r.urgency} />
                    <ShortageStatusBadge status={r.status} />
                  </div>
                </div>

                <ul className="mt-3 divide-y divide-line/60 rounded-xl border border-line/70">
                  {(r.items ?? []).map((i) => (
                    <li key={i.id} className="flex flex-wrap justify-between gap-2 px-3 py-2 text-sm">
                      <span className="font-semibold">{i.item_name}</span>
                      <span className="text-ink-soft">
                        {i.quantity_needed != null ? `${formatNumber(i.quantity_needed)} ${i.unit ?? ''}` : 'Jumlah tidak diisi'}
                      </span>
                      {i.description && <span className="w-full text-xs text-ink-soft">{i.description}</span>}
                    </li>
                  ))}
                </ul>
                {r.notes && <p className="mt-2 text-sm text-ink-soft">Catatan: {r.notes}</p>}
                {r.admin_notes && (
                  <p className="mt-2 rounded-lg bg-cream px-3 py-2 text-sm text-brand-dark">
                    <b>Tindak lanjut:</b> {r.admin_notes}
                  </p>
                )}
                {r.resolved_at && <p className="mt-1 text-xs text-ink-soft">Selesai {formatDateTime(r.resolved_at)}</p>}

                <div className="mt-3 flex flex-wrap gap-2 border-t border-line/60 pt-3">
                  {r.status === 'new' && (
                    <Button size="sm" variant="secondary" onClick={() => quick(r, 'in_progress')}>
                      Tangani
                    </Button>
                  )}
                  {r.status !== 'done' && (
                    <Button size="sm" variant="success" onClick={() => quick(r, 'done')}>
                      Tandai selesai
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" icon={<MessageSquareText className="h-4 w-4" />} onClick={() => setEditing(r)}>
                    Catatan & status
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Tindak lanjut laporan"
        description={editing ? `${editing.profile?.full_name ?? ''} · ${(editing.items ?? []).map((i) => i.item_name).join(', ')}` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Batal
            </Button>
            <Button loading={saving} onClick={save}>
              Simpan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Status">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ShortageStatus })}>
              <option value="new">Baru</option>
              <option value="in_progress">Sedang Ditangani</option>
              <option value="done">Selesai</option>
            </Select>
          </Field>
          <Field label="Catatan tindak lanjut">
            <Textarea rows={3} maxLength={1000} value={form.admin_notes} onChange={(e) => setForm({ ...form, admin_notes: e.target.value })} placeholder="Mis. sudah dipesan ke supplier, datang besok pagi." />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
