import { useState } from 'react';
import { Pencil, Plus, Power, Store } from 'lucide-react';
import { useOutlets } from '@/hooks/useOutlets';
import { useToast } from '@/contexts/ToastContext';
import { outletService } from '@/services/outletService';
import { Card, PageHeader } from '@/components/ui/Card';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/Feedback';
import { toMessage } from '@/lib/errors';
import type { Outlet } from '@/types';

export default function OutletsPage() {
  const toast = useToast();
  const { outlets, loading, error, reload } = useOutlets();
  const [editing, setEditing] = useState<Outlet | 'new' | null>(null);
  const [form, setForm] = useState({ name: '', description: '', sort_order: '0' });
  const [saving, setSaving] = useState(false);

  const open = (o: Outlet | 'new') => {
    setEditing(o);
    setForm(
      o === 'new'
        ? { name: '', description: '', sort_order: String(outlets.length + 1) }
        : { name: o.name, description: o.description ?? '', sort_order: String(o.sort_order) },
    );
  };

  const save = async () => {
    if (form.name.trim().length < 2) return toast.error('Nama loket minimal 2 karakter.');
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), description: form.description.trim() || null, sort_order: Number(form.sort_order) || 0 };
      if (editing === 'new') await outletService.create(payload);
      else if (editing) await outletService.update(editing.id, payload);
      toast.success('Loket disimpan.');
      setEditing(null);
      await reload();
    } catch (err) {
      toast.error(toMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (o: Outlet) => {
    try {
      await outletService.update(o.id, { is_active: !o.is_active });
      toast.success(o.is_active ? `Loket ${o.name} dinonaktifkan.` : `Loket ${o.name} diaktifkan.`);
      await reload();
    } catch (err) {
      toast.error(toMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Manajemen Loket"
        subtitle="Loket nonaktif tidak muncul di registrasi, tetapi riwayat datanya tetap tersimpan."
        action={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => open('new')}>
            Tambah loket
          </Button>
        }
      />
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading ? (
        <LoadingBlock />
      ) : outlets.length === 0 ? (
        <Card>
          <EmptyState title="Belum ada loket" />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {outlets.map((o) => (
            <Card key={o.id} className={`p-4 ${o.is_active ? '' : 'opacity-70'}`}>
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cream text-brand">
                  <Store className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{o.name}</p>
                  <p className="truncate text-sm text-ink-soft">{o.description || 'Tanpa deskripsi'}</p>
                  <div className="mt-1.5 flex gap-1.5">
                    <Badge tone={o.is_active ? 'success' : 'neutral'}>{o.is_active ? 'Aktif' : 'Nonaktif'}</Badge>
                    <Badge>Urutan {o.sort_order}</Badge>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-2 border-t border-line/60 pt-3">
                <Button size="sm" variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => open(o)}>
                  Ubah
                </Button>
                <Button size="sm" variant="ghost" className={o.is_active ? 'text-danger' : 'text-success'} icon={<Power className="h-4 w-4" />} onClick={() => toggle(o)}>
                  {o.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Tambah loket' : 'Ubah loket'}
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
          <Field label="Nama loket" required>
            <Input maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mis. Mie Ayam" />
          </Field>
          <Field label="Deskripsi">
            <Textarea rows={2} maxLength={300} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="Urutan tampil">
            <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
