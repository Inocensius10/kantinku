import { useMemo, useState, type FormEvent } from 'react';
import { AlertOctagon, AlertTriangle, Check, ClipboardList, PackageSearch, Search, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useAsync } from '@/hooks/useAsync';
import { inventoryService } from '@/services/inventoryService';
import { Card, CardHeader, PageHeader } from '@/components/ui/Card';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { ShortageStatusBadge, UrgencyBadge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/Feedback';
import { formatDateTime, formatNumber } from '@/lib/format';
import { toMessage } from '@/lib/errors';
import type { UrgencyLevel } from '@/types';

interface Selected {
  quantity: string;
  description: string;
}

const URGENCY_OPTIONS: Array<{ value: UrgencyLevel; label: string; desc: string; cls: string }> = [
  { value: 'normal', label: 'Normal', desc: 'Bisa dibeli saat belanja rutin', cls: 'peer-checked:border-ink-soft peer-checked:bg-cream-light' },
  { value: 'urgent', label: 'Perlu Segera Dibeli', desc: 'Dibutuhkan hari ini/besok', cls: 'peer-checked:border-warning peer-checked:bg-warning/10' },
  { value: 'emergency', label: 'Darurat', desc: 'Operasional terganggu', cls: 'peer-checked:border-danger peer-checked:bg-danger/10' },
];

export default function StockPage() {
  const { profile } = useAuth();
  const toast = useToast();

  const itemsQ = useAsync(() => inventoryService.listItems({ outletId: profile?.outlet_id, activeOnly: true }), [profile?.outlet_id]);
  const historyQ = useAsync(() => inventoryService.listMine(profile!.id, 30), [profile?.id]);

  const [selected, setSelected] = useState<Record<string, Selected>>({});
  const [urgency, setUrgency] = useState<UrgencyLevel>('normal');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const items = (itemsQ.data ?? []).filter((i) => i.name.toLowerCase().includes(search.trim().toLowerCase()));
    const m = new Map<string, typeof items>();
    for (const it of items) {
      const k = it.category || 'Lainnya';
      m.set(k, [...(m.get(k) ?? []), it]);
    }
    return [...m.entries()];
  }, [itemsQ.data, search]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = { ...s };
      if (next[id]) delete next[id];
      else next[id] = { quantity: '', description: '' };
      return next;
    });

  const selectedIds = Object.keys(selected);
  const itemById = new Map((itemsQ.data ?? []).map((i) => [i.id, i]));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (selectedIds.length === 0) {
      setError('Pilih minimal satu bahan baku yang kurang.');
      return;
    }
    for (const id of selectedIds) {
      const q = selected[id].quantity.trim();
      if (q && (!Number.isFinite(Number(q.replace(',', '.'))) || Number(q.replace(',', '.')) <= 0)) {
        setError(`Jumlah kebutuhan untuk ${itemById.get(id)?.name} harus angka lebih dari 0.`);
        return;
      }
    }
    setSaving(true);
    try {
      await inventoryService.createShortageReport({
        urgency,
        notes,
        items: selectedIds.map((id) => ({
          inventory_item_id: id,
          quantity_needed: selected[id].quantity.trim() ? Number(selected[id].quantity.replace(',', '.')) : null,
          description: selected[id].description,
        })),
      });
      toast.success('Laporan kekurangan bahan baku terkirim ke admin.');
      setSelected({});
      setNotes('');
      setUrgency('normal');
      await historyQ.reload();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Laporan Stok" subtitle="Laporkan bahan baku yang habis atau hampir habis." />

      <Card>
        <CardHeader title="Bahan baku yang kurang" subtitle="Pilih satu atau beberapa bahan baku." icon={<PackageSearch className="h-5 w-5" />} />
        {itemsQ.loading ? (
          <LoadingBlock />
        ) : itemsQ.error ? (
          <div className="p-5">
            <ErrorState message={itemsQ.error} onRetry={itemsQ.reload} />
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5 p-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
              <Input className="pl-10" placeholder="Cari bahan baku…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            {grouped.length === 0 ? (
              <EmptyState title="Bahan baku tidak ditemukan" description="Admin belum menambahkan bahan baku untuk loket Anda." />
            ) : (
              <div className="space-y-4">
                {grouped.map(([cat, items]) => (
                  <div key={cat}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">{cat}</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                      {items.map((it) => {
                        const on = Boolean(selected[it.id]);
                        return (
                          <button
                            type="button"
                            key={it.id}
                            onClick={() => toggle(it.id)}
                            className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition ${
                              on ? 'border-brand bg-cream text-brand-dark' : 'border-line bg-white hover:border-brand-accent/50'
                            }`}
                          >
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${on ? 'border-brand bg-brand text-cream' : 'border-line'}`}
                            >
                              {on && <Check className="h-3.5 w-3.5" />}
                            </span>
                            <span className="truncate">{it.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedIds.length > 0 && (
              <div className="space-y-3 rounded-2xl bg-cream-light/70 p-4">
                <p className="text-sm font-semibold">Detail kebutuhan ({selectedIds.length} bahan)</p>
                {selectedIds.map((id) => {
                  const it = itemById.get(id);
                  if (!it) return null;
                  return (
                    <div key={id} className="grid gap-2 rounded-xl bg-white p-3 sm:grid-cols-[160px_150px_1fr] sm:items-center">
                      <p className="font-semibold">{it.name}</p>
                      <div className="relative">
                        <Input
                          inputMode="decimal"
                          placeholder="Jumlah"
                          className="pr-16"
                          value={selected[id].quantity}
                          onChange={(e) => setSelected((s) => ({ ...s, [id]: { ...s[id], quantity: e.target.value } }))}
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-ink-soft">{it.unit}</span>
                      </div>
                      <Input
                        placeholder="Keterangan (mis. tersisa 1 bungkus)"
                        maxLength={500}
                        value={selected[id].description}
                        onChange={(e) => setSelected((s) => ({ ...s, [id]: { ...s[id], description: e.target.value } }))}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <Field label="Tingkat urgensi" required>
              <div className="grid gap-2 sm:grid-cols-3">
                {URGENCY_OPTIONS.map((o) => (
                  <label key={o.value} className="cursor-pointer">
                    <input type="radio" name="urgency" value={o.value} checked={urgency === o.value} onChange={() => setUrgency(o.value)} className="peer sr-only" />
                    <div className={`h-full rounded-xl border border-line bg-white px-3 py-2.5 transition ${o.cls}`}>
                      <p className="flex items-center gap-1.5 text-sm font-semibold">
                        {o.value === 'emergency' && <AlertOctagon className="h-4 w-4 text-danger" />}
                        {o.value === 'urgent' && <AlertTriangle className="h-4 w-4 text-warning" />}
                        {o.label}
                      </p>
                      <p className="text-xs text-ink-soft">{o.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </Field>

            <Field label="Catatan tambahan (opsional)">
              <Textarea rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Kondisi khusus, mis. kompor bocor, supplier libur, dll." />
            </Field>

            {error && <ErrorState message={error} />}

            <Button type="submit" size="lg" block loading={saving} variant={urgency === 'emergency' ? 'danger' : 'primary'} icon={<Send className="h-5 w-5" />}>
              Kirim laporan ({selectedIds.length})
            </Button>
          </form>
        )}
      </Card>

      <Card>
        <CardHeader title="Riwayat laporan saya" icon={<ClipboardList className="h-5 w-5" />} />
        <div className="p-5 pt-3">
          {historyQ.loading ? (
            <LoadingBlock />
          ) : historyQ.error ? (
            <ErrorState message={historyQ.error} onRetry={historyQ.reload} />
          ) : (historyQ.data ?? []).length === 0 ? (
            <EmptyState title="Belum ada laporan" />
          ) : (
            <ul className="space-y-3">
              {(historyQ.data ?? []).map((r) => (
                <li
                  key={r.id}
                  className={`rounded-2xl border p-4 ${r.urgency === 'emergency' && r.status !== 'done' ? 'border-danger/40 bg-danger/5' : 'border-line/70'}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-ink-soft">{formatDateTime(r.created_at)}</p>
                    <div className="flex gap-1.5">
                      <UrgencyBadge urgency={r.urgency} />
                      <ShortageStatusBadge status={r.status} />
                    </div>
                  </div>
                  <ul className="mt-2 space-y-1 text-sm">
                    {(r.items ?? []).map((i) => (
                      <li key={i.id}>
                        <span className="font-semibold">{i.item_name}</span>
                        {i.quantity_needed != null && (
                          <span className="text-ink-soft">
                            {' '}
                            · {formatNumber(i.quantity_needed)} {i.unit}
                          </span>
                        )}
                        {i.description && <span className="text-ink-soft"> — {i.description}</span>}
                      </li>
                    ))}
                  </ul>
                  {r.notes && <p className="mt-2 text-sm text-ink-soft">Catatan: {r.notes}</p>}
                  {r.admin_notes && <p className="mt-2 rounded-lg bg-cream px-3 py-2 text-sm text-brand-dark">Tindak lanjut admin: {r.admin_notes}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
