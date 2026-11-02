import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Ban, Clock, LogOut, RefreshCw, XCircle } from 'lucide-react';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { homePathFor } from '@/routes/guards';

export default function AccountStatusPage() {
  const { profile, refreshProfile, signOut } = useAuth();
  const [checking, setChecking] = useState(false);

  if (!profile) return null;
  if (profile.status === 'active') return <Navigate to={homePathFor(profile.role)} replace />;

  const content = {
    pending: {
      icon: <Clock className="h-7 w-7" />,
      tone: 'bg-warning/10 text-warning',
      title: 'Menunggu persetujuan admin',
      text: 'Registrasi Anda berhasil. Admin akan memeriksa data Anda sebelum akun dapat digunakan untuk absensi dan laporan.',
    },
    rejected: {
      icon: <XCircle className="h-7 w-7" />,
      tone: 'bg-danger/10 text-danger',
      title: 'Registrasi ditolak',
      text: 'Registrasi akun Anda tidak disetujui. Hubungi admin untuk informasi lebih lanjut.',
    },
    inactive: {
      icon: <Ban className="h-7 w-7" />,
      tone: 'bg-cream-light text-ink-soft',
      title: 'Akun dinonaktifkan',
      text: 'Akun Anda sedang dinonaktifkan oleh admin. Hubungi admin untuk mengaktifkannya kembali.',
    },
  }[profile.status];

  return (
    <AuthLayout title="Status Akun">
      <div className="text-center">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${content.tone}`}>{content.icon}</div>
        <h2 className="mt-4 text-lg font-bold">{content.title}</h2>
        <p className="mt-2 text-sm text-ink-soft">{content.text}</p>
        {profile.status_note && <p className="mt-3 rounded-xl bg-cream-light p-3 text-sm">Catatan admin: {profile.status_note}</p>}

        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-line p-3 text-left">
          <Avatar name={profile.full_name} path={profile.avatar_path} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{profile.full_name}</p>
            <p className="truncate text-sm text-ink-soft">
              {profile.email} · {profile.outlet?.name ?? 'Belum ada loket'}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Button variant="secondary" icon={<LogOut className="h-4 w-4" />} onClick={() => void signOut()}>
            Keluar
          </Button>
          <Button
            loading={checking}
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={async () => {
              setChecking(true);
              await refreshProfile();
              setChecking(false);
            }}
          >
            Cek status
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}
