import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Package, Pencil, Plus, Power } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { useOutlets } from '@/hooks/useOutlets';
import { useToast } from '@/contexts/ToastContext';
import { salesService } from '@/services/salesService';
import { Card, PageHeader } from '@/components/ui/Card';
import { CurrencyInput, Field, Input, Select } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/Feedback';
import { formatRupiah } from '@/lib/format';
import { toMessage } from '@/lib/errors';
import type { SalesProduct } from '@/types';

export default function ProductsPage() {
  const toast = useToast();
  const { outlets } = useOutlets();
  const [outletId, setOutletId] = useState('');
  const [editing, setEditing] = useState<SalesProduct | 'new' | null>(null);
  const [form, setForm] = useState<{ name: string; price: number | ''; outlet_id: string }>({ name: '', price: '', outlet_id: '' });
  const [saving, setSaving] = useState(false);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    if (!outletId && outlets.length) setOutletId(outlets.find((o) => o.is_active)?.id ?? outlets[0].id);
  }, [outlets, outletId]);

  const q = useAsync(() => salesService.listProducts({ outletId }), [outletId], { enabled: !!outletId });
  const products = useMemo(() => q.data ?? [], [q.data]);

  const open = (p: SalesProduct | 'new') => {
    setEditing(p);
    setForm(p === 'new' ? { name: '', price: '', outlet_id: outletId } : { name: p.name, price: p.price, outlet_id: p.outlet_id });
  };

  const save = async () => {
    if (form.name.trim().length < 2) return toast.error('Nama produk minimal 2 karakter.');
    if (form.price === '') return toast.error('Harga wajib diisi.');
    if (!form.outlet_id) return toast.error('Pilih loket.');
    setSaving(true);
    try {
      if (editing === 'new') {
        const maxOrder = products.reduce((m, p) => Math.max(m, p.sort_order), 0);
        await salesService.createProduct({ name: form.name, price: form.price, outlet_id: form.outlet_id, sort_order: maxOrder + 1 });
      } else if (editing) {
        await salesService.updateProduct(editing.id, { name: form.name.trim(), price: form.price, outlet_id: form.outlet_id });
      }
      toast.success('Produk disimpan. Laporan sebelumnya tetap memakai harga lama.');
      setEditing(null);
      await q.reload();
    } catch (err) {
      toast.error(toMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (p: SalesProduct) => {
    try {
      await salesService.updateProduct(p.id, { is_active: !p.is_active });
      toast.success(p.is_active ? `${p.name} dinonaktifkan.` : `${p.name} diaktifkan.`);
      await q.reload();
    } catch (err) {
      toast.error(toMessage(err));
    }
  };

  /** Tukar urutan dengan produk di atas/bawahnya; urutan dinormalisasi 1..n. */
  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= products.length) return;
    const ordered = [...products];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    setMoving(true);
    try {
      await Promise.all(
        ordered.map((p, i) => (p.sort_order !== i + 1 ? salesService.updateProduct(p.id, { sort_order: i + 1 }) : Promise.resolve())),
      );
      await q.reload();
    } catch (err) {
      toast.error(toMessage(err));
    } finally {
      setMoving(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Manajemen Produk"
        subtitle="Produk aktif otomatis muncul di form laporan karyawan sesuai loketnya."
        action={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => open('new')} disabled={!outletId}>
            Tambah produk
          </Button>
        }
      />

      <div className="flex gap-1 overflow-x-auto rounded-xl bg-white p-1 ring-1 ring-line/70">
        {outlets.map((o) => (
          <button
            key={o.id}
            onClick={() => setOutletId(o.id)}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              outletId === o.id ? 'bg-brand text-cream' : 'text-ink-soft hover:bg-cream-light'
            } ${o.is_active ? '' : 'italic'}`}
          >
            {o.name}
          </button>
        ))}
      </div>

      {q.error && <ErrorState message={q.error} onRetry={q.reload} />}

      <Card>
        {q.loading ? (
          <LoadingBlock />
        ) : products.length === 0 ? (
          <EmptyState
            icon={<Package className="h-6 w-6" />}
            title="Belum ada produk"
            description="Tambahkan produk yang harus dilaporkan karyawan loket ini."
            action={
              <Button icon={<Plus className="h-4 w-4" />} onClick={() => open('new')}>
                Tambah produk
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-line/60">
            {products.map((p, i) => (
              <li key={p.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${p.is_active ? '' : 'bg-cream-light/40'}`}>
                <div className="flex flex-col">
                  <button disabled={i === 0 || moving} onClick={() => move(i, -1)} className="rounded p-0.5 text-ink-soft hover:bg-cream-light disabled:opacity-30" aria-label="Naikkan">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    disabled={i === products.length - 1 || moving}
                    onClick={() => move(i, 1)}
                    className="rounded p-0.5 text-ink-soft hover:bg-cream-light disabled:opacity-30"
                    aria-label="Turunkan"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold ${p.is_active ? '' : 'text-ink-soft line-through'}`}>{p.name}</p>
                  <p className="text-sm tabular-nums text-ink-soft">{formatRupiah(p.price)}</p>
                </div>
                <Badge tone={p.is_active ? 'success' : 'neutral'}>{p.is_active ? 'Aktif' : 'Nonaktif'}</Badge>
                <div className="flex gap-1">
                  <Button size="sm" variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => open(p)}>
                    Ubah
                  </Button>
                  <Button size="sm" variant="ghost" className={p.is_active ? 'text-danger' : 'text-success'} icon={<Power className="h-4 w-4" />} onClick={() => toggle(p)}>
                    <span className="hidden sm:inline">{p.is_active ? 'Nonaktifkan' : 'Aktifkan'}</span>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Tambah produk' : 'Ubah produk'}
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
          <Field label="Nama produk" required>
            <Input maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mis. Dimsum Mentai" />
          </Field>
          <Field label="Harga satuan" required hint="Perubahan harga tidak memengaruhi laporan yang sudah tersimpan.">
            <CurrencyInput value={form.price} onChange={(v) => setForm({ ...form, price: v })} />
          </Field>
          <Field label="Loket" required>
            <Select value={form.outlet_id} onChange={(e) => setForm({ ...form, outlet_id: e.target.value })}>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
