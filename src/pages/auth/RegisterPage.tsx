import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, MailCheck, UserPlus } from 'lucide-react';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Field, Input, PasswordInput, Select, Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Feedback';
import { Avatar } from '@/components/ui/Avatar';
import { authService } from '@/services/authService';
import { profileService } from '@/services/profileService';
import { stashPendingAvatar } from '@/contexts/AuthContext';
import { useOutlets } from '@/hooks/useOutlets';
import { blobToDataUrl, compressAvatar } from '@/lib/image';
import { calculateAge, jakartaDate } from '@/lib/format';
import { toMessage } from '@/lib/errors';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormState {
  full_name: string;
  email: string;
  password: string;
  confirm: string;
  phone: string;
  address: string;
  birth_date: string;
  outlet_id: string;
}

const empty: FormState = { full_name: '', email: '', password: '', confirm: '', phone: '', address: '', birth_date: '', outlet_id: '' };

export default function RegisterPage() {
  const navigate = useNavigate();
  const { outlets, loading: outletsLoading, error: outletsError } = useOutlets({ activeOnly: true });
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'photo', string>>>({});
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState<null | 'verify'>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  const set = (k: keyof FormState) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const age = calculateAge(form.birth_date);

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      const blob = await compressAvatar(file);
      setPhoto(blob);
      setPhotoPreview(URL.createObjectURL(blob));
      setErrors((e) => ({ ...e, photo: undefined }));
    } catch (err) {
      setErrors((e) => ({ ...e, photo: toMessage(err) }));
    }
  };

  const validate = () => {
    const e: typeof errors = {};
    if (form.full_name.trim().length < 2) e.full_name = 'Nama lengkap minimal 2 karakter.';
    if (!EMAIL_RE.test(form.email.trim())) e.email = 'Masukkan email yang valid.';
    if (form.password.length < 8) e.password = 'Password minimal 8 karakter.';
    else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) e.password = 'Gunakan kombinasi huruf dan angka.';
    if (form.confirm !== form.password) e.confirm = 'Konfirmasi password tidak sama.';
    if (!/^(\+62|62|0)8\d{7,12}$/.test(form.phone.replace(/[\s-]/g, ''))) e.phone = 'Nomor telepon tidak valid (contoh: 0812xxxxxxx).';
    if (form.address.trim().length < 5) e.address = 'Alamat wajib diisi.';
    if (!form.birth_date) e.birth_date = 'Tanggal lahir wajib diisi.';
    else if (age === null || age < 14 || age > 80) e.birth_date = 'Tanggal lahir tidak valid.';
    if (!form.outlet_id) e.outlet_id = 'Pilih loket tempat Anda bekerja.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    setFormError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await authService.signUp({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        phone: form.phone.replace(/[\s-]/g, ''),
        address: form.address,
        birth_date: form.birth_date,
        outlet_id: form.outlet_id,
      });

      // Supabase mengembalikan user tanpa identities jika email sudah terdaftar.
      if (res.user && res.user.identities && res.user.identities.length === 0) {
        setFormError('Email sudah terdaftar. Silakan login.');
        return;
      }

      if (res.session && res.user) {
        // Konfirmasi email nonaktif: langsung unggah foto.
        if (photo) {
          try {
            await profileService.uploadAvatar(res.user.id, photo);
          } catch (e) {
            console.warn(e);
          }
        }
        navigate('/status', { replace: true });
      } else {
        // Konfirmasi email aktif: simpan foto sementara, diunggah otomatis saat login pertama.
        if (photo) stashPendingAvatar(form.email, await blobToDataUrl(photo));
        setDone('verify');
      }
    } catch (err) {
      setFormError(toMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (done === 'verify') {
    return (
      <AuthLayout title="Cek email Anda">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cream text-brand">
            <MailCheck className="h-7 w-7" />
          </div>
          <p className="mt-4 text-sm text-ink-soft">
            Kami telah mengirim link verifikasi ke <b className="text-ink">{form.email}</b>. Klik link tersebut, lalu login.
            Setelah itu akun Anda menunggu persetujuan admin.
          </p>
          <Button className="mt-6" block onClick={() => navigate('/login')}>
            Ke halaman Login
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Buat Akun Baru" subtitle="Isi data diri Anda. Akun akan aktif setelah disetujui admin." wide>
      <form onSubmit={submit} className="space-y-5" noValidate>
        {formError && <Alert tone="danger">{formError}</Alert>}

        <div className="flex items-center gap-4">
          <Avatar name={form.full_name || 'K'} src={photoPreview} size="lg" />
          <div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
            <Button variant="secondary" size="sm" icon={<Camera className="h-4 w-4" />} onClick={() => fileRef.current?.click()}>
              {photo ? 'Ganti foto' : 'Pilih foto profil'}
            </Button>
            <p className="mt-1 text-xs text-ink-soft">{errors.photo ?? 'JPG/PNG, otomatis dipotong persegi.'}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama lengkap" required error={errors.full_name} className="sm:col-span-2">
            <Input autoComplete="name" value={form.full_name} onChange={set('full_name')} placeholder="Nama sesuai KTP" />
          </Field>
          <Field label="Email" required error={errors.email}>
            <Input type="email" autoComplete="email" value={form.email} onChange={set('email')} placeholder="nama@email.com" />
          </Field>
          <Field label="Nomor telepon" required error={errors.phone}>
            <Input type="tel" autoComplete="tel" inputMode="tel" value={form.phone} onChange={set('phone')} placeholder="0812xxxxxxx" />
          </Field>
          <Field label="Password" required error={errors.password} hint="Minimal 8 karakter, huruf & angka.">
            <PasswordInput autoComplete="new-password" value={form.password} onChange={set('password')} />
          </Field>
          <Field label="Konfirmasi password" required error={errors.confirm}>
            <PasswordInput autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
          </Field>
          <Field label="Tanggal lahir" required error={errors.birth_date}>
            <Input type="date" max={jakartaDate()} value={form.birth_date} onChange={set('birth_date')} />
          </Field>
          <Field label="Umur">
            <Input value={age !== null ? `${age} tahun` : ''} placeholder="Otomatis" disabled />
          </Field>
          <Field label="Alamat" required error={errors.address} className="sm:col-span-2">
            <Textarea rows={2} value={form.address} onChange={set('address')} placeholder="Alamat tempat tinggal" />
          </Field>
          <Field
            label="Loket"
            required
            error={errors.outlet_id ?? outletsError}
            className="sm:col-span-2"
            hint={outletsLoading ? 'Memuat daftar loket…' : undefined}
          >
            <Select value={form.outlet_id} onChange={set('outlet_id')} disabled={outletsLoading}>
              <option value="">Pilih loket…</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Button type="submit" block size="lg" loading={loading} icon={<UserPlus className="h-5 w-5" />}>
          Daftar
        </Button>
        <p className="text-center text-sm text-ink-soft">
          Sudah punya akun?{' '}
          <Link to="/login" className="font-semibold text-brand hover:underline">
            Login
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
