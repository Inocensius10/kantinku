import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { FullPageLoader } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import type { UserRole } from '@/types';

export function homePathFor(role: UserRole | undefined) {
  return role === 'admin' ? '/admin' : '/app';
}

/** Halaman publik (welcome/login/register): pengguna yang sudah login diarahkan ke beranda. */
export function PublicOnly({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (session && profile) {
    return <Navigate to={profile.status === 'active' ? homePathFor(profile.role) : '/status'} replace />;
  }
  return <>{children}</>;
}

function ProfileMissing() {
  const { signOut, refreshProfile } = useAuth();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-cream-light p-6">
      <div className="card max-w-sm p-6 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-danger" />
        <p className="mt-3 font-bold">Profil tidak dapat dimuat</p>
        <p className="mt-1 text-sm text-ink-soft">Periksa koneksi internet Anda lalu coba lagi.</p>
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="secondary" onClick={() => void signOut()}>
            Keluar
          </Button>
          <Button onClick={() => void refreshProfile()}>Coba lagi</Button>
        </div>
      </div>
    </div>
  );
}

/** Wajib login. `role` membatasi area; `requireActive` memastikan akun sudah disetujui. */
export function RequireAuth({
  children,
  role,
  requireActive = true,
}: {
  children: ReactNode;
  role?: UserRole;
  requireActive?: boolean;
}) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!profile) return <ProfileMissing />;
  if (requireActive && profile.status !== 'active') return <Navigate to="/status" replace />;
  if (role && profile.role !== role) return <Navigate to={homePathFor(profile.role)} replace />;
  return <>{children}</>;
}
