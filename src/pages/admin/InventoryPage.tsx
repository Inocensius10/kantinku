import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, ClipboardList, Pencil, Plus, Power, Search } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { useOutlets } from '@/hooks/useOutlets';
import { useToast } from '@/contexts/ToastContext';
import { inventoryService } from '@/services/inventoryService';
import { Card, PageHeader } from '@/components/ui/Card';
import { Field, Input, Select } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/Feedback';
import { toMessage } from '@/lib/errors';
import type { InventoryItem } from '@/types';

const UNITS = ['kg', 'gram', 'liter', 'ml', 'pcs', 'pack', 'bungkus', 'botol', 'tabung', 'karton', 'ikat', 'sisir'];

interface FormState {
  name: string;
  category: string;
  unit: string;
  outlet_id: string; // '' = semua loket
  sort_order: string;
}

export default function InventoryPage() {
  const toast = useToast();
  const { outlets } = useOutlets();
  const [filter, setFilter] = useState<string>('all'); // all | general | outletId
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<InventoryItem | 'new' | null>(null);
  const [form, setForm] = useState<FormState>({ name: '', category: '', unit: 'kg', outlet_id: '', sort_order: '0' });
  const [saving, setSaving] = useState(false);

  const q = useAsync(() => inventoryService.listItems(), []);
  const all = useMemo(() => q.data ?? [], [q.data]);
  const categories = useMemo(() => [...new Set(all.map((i) => i.category).filter(Boolean))] as string[], [all]);

  const items = useMemo(() => {
    const s = search.trim().toLowerCase();
    return all.filter(
      (i) =>
        (filter === 'all' || (filter === 'general' ? i.outlet_id === null : i.outlet_id === filter)) &&
        (!s || i.name.toLowerCase().includes(s) || (i.category ?? '').toLowerCase().includes(s)),
    );
  }, [all, filter, search]);

  const open = (i: InventoryItem | 'new') => {
    setEditing(i);
    setForm(
      i === 'new'
        ? { name: '', category: '', unit: 'kg', outlet_id: filter !== 'all' && filter !== 'general' ? filter : '', sort_order: String(all.length + 1) }
        : { name: i.name, category: i.category ?? '', unit: i.unit, outlet_id: i.outlet_id ?? '', sort_order: String(i.sort_order) },
    );
  };

  const save = async () => {
    if (form.name.trim().length < 2) return toast.error('Nama bahan baku minimal 2 karakter.');
    if (!form.unit.trim()) return toast.error('Satuan wajib diisi.');
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || null,
      unit: form.unit.trim(),
      outlet_id: form.outlet_id || null,
      sort_order: Number(form.sort_order) || 0,
    };
    try {
      if (editing === 'new') await inventoryService.createItem(payload);
      else if (editing) await inventoryService.updateItem(editing.id, payload);
      toast.success('Bahan baku disimpan.');
      setEditing(null);
      await q.reload();
    } catch (err) {
      toast.error(toMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (i: InventoryItem) => {
    try {
      await inventoryService.updateItem(i.id, { is_active: !i.is_active });
      toast.success(i.is_active ? `${i.name} dinonaktifkan.` : `${i.name} diaktifkan.`);
      await q.reload();
    } catch (err) {
      toast.error(toMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Manajemen Bahan Baku"
        subtitle="Daftar bahan baku yang dapat dilaporkan karyawan saat kurang."
        action={
          <>
            <Link to="/admin/stok">
              <Button variant="secondary" icon={<ClipboardList className="h-4 w-4" />}>
                Laporan kekurangan
              </Button>
            </Link>
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => open('new')}>
              Tambah bahan
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <Input className="pl-10" placeholder="Cari nama atau kategori…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="w-56">
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter loket">
            <option value="all">Semua bahan baku</option>
            <option value="general">Umum (semua loket)</option>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                Khusus {o.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {q.error && <ErrorState message={q.error} onRetry={q.reload} />}

      <Card>
        {q.loading ? (
          <LoadingBlock />
        ) : items.length === 0 ? (
          <EmptyState icon={<Boxes className="h-6 w-6" />} title="Belum ada bahan baku" />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Kategori</th>
                  <th>Satuan</th>
                  <th>Loket</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className={i.is_active ? '' : 'opacity-60'}>
                    <td className="font-semibold">{i.name}</td>
                    <td>{i.category ?? '—'}</td>
                    <td>{i.unit}</td>
                    <td>{i.outlet?.name ?? <span className="text-ink-soft">Semua loket</span>}</td>
                    <td>
                      <Badge tone={i.is_active ? 'success' : 'neutral'}>{i.is_active ? 'Aktif' : 'Nonaktif'}</Badge>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => open(i)}>
                          Ubah
                        </Button>
                        <Button size="sm" variant="ghost" className={i.is_active ? 'text-danger' : 'text-success'} icon={<Power className="h-4 w-4" />} onClick={() => toggle(i)} aria-label={i.is_active ? 'Nonaktifkan' : 'Aktifkan'} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Tambah bahan baku' : 'Ubah bahan baku'}
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama bahan baku" required className="sm:col-span-2">
            <Input maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mis. Tepung terigu" />
          </Field>
          <Field label="Kategori">
            <Input list="inv-categories" maxLength={50} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Mis. Bahan Kering" />
            <datalist id="inv-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Satuan" required>
            <Input list="inv-units" maxLength={20} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            <datalist id="inv-units">
              {UNITS.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </Field>
          <Field label="Loket terkait" hint="Kosongkan agar tersedia untuk semua loket.">
            <Select value={form.outlet_id} onChange={(e) => setForm({ ...form, outlet_id: e.target.value })}>
              <option value="">Semua loket</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Urutan tampil">
            <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
