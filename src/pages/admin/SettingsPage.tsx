import { useEffect, useState } from 'react';
import { Crosshair, ExternalLink, MapPin, Save } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/contexts/ToastContext';
import { settingsService } from '@/services/settingsService';
import { getAccuratePosition } from '@/lib/geo';
import { formatDateTime } from '@/lib/format';
import { toMessage } from '@/lib/errors';
import { Card, CardHeader, PageHeader } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Alert, ErrorState, LoadingBlock } from '@/components/ui/Feedback';

export default function SettingsPage() {
  const toast = useToast();
  const q = useAsync(() => settingsService.get(), []);
  const s = q.data;
  const [form, setForm] = useState({ lat: '', lng: '', radius: '', accuracy: '' });
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (s)
      setForm({
        lat: String(s.attendance_latitude),
        lng: String(s.attendance_longitude),
        radius: String(s.attendance_radius_m),
        accuracy: String(s.max_gps_accuracy_m),
      });
  }, [s]);

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const pos = await getAccuratePosition({ targetAccuracy: 15, maxWaitMs: 15000 });
      setForm((f) => ({ ...f, lat: pos.latitude.toFixed(6), lng: pos.longitude.toFixed(6) }));
      toast.info(`Lokasi terbaca (akurasi ±${Math.round(pos.accuracy)} m). Klik Simpan untuk menerapkan.`);
    } catch (err) {
      toast.error(toMessage(err));
    } finally {
      setLocating(false);
    }
  };

  const save = async () => {
    if (!s) return;
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    const radius = Number(form.radius);
    const accuracy = Number(form.accuracy);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) return toast.error('Latitude tidak valid.');
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) return toast.error('Longitude tidak valid.');
    if (!Number.isInteger(radius) || radius < 10 || radius > 5000) return toast.error('Radius harus 10–5000 meter.');
    if (!Number.isInteger(accuracy) || accuracy < 5 || accuracy > 2000) return toast.error('Batas akurasi harus 5–2000 meter.');
    setSaving(true);
    try {
      await settingsService.update(s.id, {
        attendance_latitude: lat,
        attendance_longitude: lng,
        attendance_radius_m: radius,
        max_gps_accuracy_m: accuracy,
      });
      toast.success('Pengaturan lokasi absensi disimpan.');
      await q.reload();
    } catch (err) {
      toast.error(toMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Pengaturan" subtitle="Titik lokasi dan aturan validasi absensi GPS." />
      {q.loading ? (
        <LoadingBlock />
      ) : q.error ? (
        <ErrorState message={q.error} onRetry={q.reload} />
      ) : !s ? (
        <Alert tone="danger">Baris pengaturan belum ada di database. Jalankan migration seed.</Alert>
      ) : (
        <Card>
          <CardHeader title="Lokasi absensi" subtitle={`Terakhir diubah ${formatDateTime(s.updated_at)}`} icon={<MapPin className="h-5 w-5" />} />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Latitude" required>
              <Input inputMode="decimal" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} />
            </Field>
            <Field label="Longitude" required>
              <Input inputMode="decimal" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} />
            </Field>
            <Field label="Radius absensi (meter)" required hint="Karyawan di luar radius ini ditolak.">
              <Input type="number" value={form.radius} onChange={(e) => setForm({ ...form, radius: e.target.value })} />
            </Field>
            <Field label="Batas akurasi GPS (meter)" required hint="Pembacaan GPS dengan akurasi lebih buruk diminta mencoba lagi.">
              <Input type="number" value={form.accuracy} onChange={(e) => setForm({ ...form, accuracy: e.target.value })} />
            </Field>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button variant="secondary" loading={locating} icon={<Crosshair className="h-4 w-4" />} onClick={useMyLocation}>
                Gunakan lokasi saya
              </Button>
              <a
                href={`https://www.google.com/maps?q=${form.lat},${form.lng}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold hover:bg-cream-light"
              >
                <ExternalLink className="h-4 w-4" /> Lihat di Google Maps
              </a>
              <Button className="sm:ml-auto" loading={saving} icon={<Save className="h-4 w-4" />} onClick={save}>
                Simpan
              </Button>
            </div>
            <p className="text-xs text-ink-soft sm:col-span-2">Zona waktu sistem: {s.timezone}. Validasi jarak dilakukan di database menggunakan formula Haversine.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
