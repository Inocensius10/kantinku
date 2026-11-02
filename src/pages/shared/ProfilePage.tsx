import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, KeyRound, LogOut, Mail, Save, UserRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { profileService } from '@/services/profileService';
import { authService } from '@/services/authService';
import { Card, CardHeader, PageHeader } from '@/components/ui/Card';
import { Field, Input, PasswordInput, Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { AccountStatusBadge, Badge } from '@/components/ui/Badge';
import { calculateAge, formatDateShort, jakartaDate } from '@/lib/format';
import { toMessage } from '@/lib/errors';

export default function ProfilePage() {
  const { profile, session, refreshProfile, signOut } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ full_name: '', phone: '', address: '', birth_date: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [pw, setPw] = useState({ next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    if (profile)
      setForm({
        full_name: profile.full_name,
        phone: profile.phone ?? '',
        address: profile.address ?? '',
        birth_date: profile.birth_date ?? '',
      });
  }, [profile]);

  if (!profile) return null;
  const age = calculateAge(form.birth_date);

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (form.full_name.trim().length < 2) return toast.error('Nama lengkap minimal 2 karakter.');
    if (form.phone && !/^(\+62|62|0)8\d{7,12}$/.test(form.phone.replace(/[\s-]/g, ''))) return toast.error('Nomor telepon tidak valid.');
    setSaving(true);
    try {
      await profileService.updateMyProfile(profile.id, {
        full_name: form.full_name.trim(),
        phone: form.phone.replace(/[\s-]/g, '') || null,
        address: form.address.trim() || null,
        birth_date: form.birth_date || null,
      });
      await refreshProfile();
      toast.success('Profil berhasil disimpan.');
    } catch (err) {
      toast.error(toMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      await profileService.uploadAvatar(profile.id, file);
      await refreshProfile();
      toast.success('Foto profil diperbarui.');
    } catch (err) {
      toast.error(toMessage(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const changeEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) return toast.error('Masukkan email yang valid.');
    setEmailSaving(true);
    try {
      await authService.updateEmail(newEmail);
      toast.success('Link konfirmasi dikirim. Cek email lama & baru Anda untuk menyelesaikan perubahan.');
      setNewEmail('');
    } catch (err) {
      toast.error(toMessage(err));
    } finally {
      setEmailSaving(false);
    }
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.next.length < 8) return toast.error('Password minimal 8 karakter.');
    if (pw.next !== pw.confirm) return toast.error('Konfirmasi password tidak sama.');
    setPwSaving(true);
    try {
      await authService.updatePassword(pw.next);
      toast.success('Password berhasil diubah.');
      setPw({ next: '', confirm: '' });
    } catch (err) {
      toast.error(toMessage(err));
    } finally {
      setPwSaving(false);
    }
  };

  const pendingEmail = session?.user.new_email;

  return (
    <div className="space-y-5">
      <PageHeader title="Profil Saya" />

      <Card className="p-5">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <div className="relative">
            <Avatar name={profile.full_name} path={profile.avatar_path} size="xl" />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-brand text-cream shadow-md hover:bg-brand-dark disabled:opacity-60"
              aria-label="Ganti foto profil"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadPhoto(e.target.files?.[0])} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-extrabold">{profile.full_name}</h2>
            <p className="text-sm text-ink-soft">{profile.email}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5 sm:justify-start">
              <Badge tone="brand">{profile.role === 'admin' ? 'Admin' : 'Karyawan'}</Badge>
              <AccountStatusBadge status={profile.status} />
              {profile.outlet && <Badge>Loket {profile.outlet.name}</Badge>}
            </div>
            {uploading && <p className="mt-2 text-xs text-ink-soft">Mengunggah foto…</p>}
          </div>
        </div>
        <p className="mt-4 rounded-xl bg-cream-light px-3 py-2 text-xs text-ink-soft">
          Loket, role, dan status akun hanya dapat diubah oleh admin. Terdaftar sejak {formatDateShort(profile.created_at.slice(0, 10))}.
        </p>
      </Card>

      <Card>
        <CardHeader title="Data diri" icon={<UserRound className="h-5 w-5" />} />
        <form onSubmit={saveProfile} className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Nama lengkap" className="sm:col-span-2">
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </Field>
          <Field label="Nomor telepon">
            <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <div className="grid grid-cols-[1fr_100px] gap-3">
            <Field label="Tanggal lahir">
              <Input type="date" max={jakartaDate()} value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
            </Field>
            <Field label="Umur">
              <Input disabled value={age !== null ? `${age} th` : '—'} />
            </Field>
          </div>
          <Field label="Alamat" className="sm:col-span-2">
            <Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" loading={saving} icon={<Save className="h-4 w-4" />}>
              Simpan perubahan
            </Button>
          </div>
        </form>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Ubah email" subtitle="Perubahan email diverifikasi melalui Supabase Auth." icon={<Mail className="h-5 w-5" />} />
          <form onSubmit={changeEmail} className="space-y-3 p-5">
            {pendingEmail && <p className="rounded-xl bg-warning/10 px-3 py-2 text-xs text-[#8a5d0c]">Menunggu konfirmasi untuk: {pendingEmail}</p>}
            <Field label="Email baru">
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email.baru@contoh.com" />
            </Field>
            <Button type="submit" variant="secondary" loading={emailSaving}>
              Kirim konfirmasi
            </Button>
          </form>
        </Card>

        <Card>
          <CardHeader title="Ubah password" icon={<KeyRound className="h-5 w-5" />} />
          <form onSubmit={changePassword} className="space-y-3 p-5">
            <Field label="Password baru" hint="Minimal 8 karakter.">
              <PasswordInput autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
            </Field>
            <Field label="Konfirmasi password baru">
              <PasswordInput autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
            </Field>
            <Button type="submit" variant="secondary" loading={pwSaving}>
              Simpan password
            </Button>
          </form>
        </Card>
      </div>

      <Button
        variant="secondary"
        block
        className="border-danger/30 text-danger hover:bg-danger/5"
        icon={<LogOut className="h-4 w-4" />}
        onClick={async () => {
          await signOut();
          navigate('/login', { replace: true });
        }}
      >
        Keluar dari akun
      </Button>
    </div>
  );
}
