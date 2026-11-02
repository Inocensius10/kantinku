import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { profileService } from '@/services/profileService';
import type { Profile } from '@/types';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  isActive: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const PENDING_AVATAR_KEY = 'kantinku.pendingAvatar';

/** Foto profil saat registrasi disimpan sementara jika sesi belum ada (email belum diverifikasi). */
export function stashPendingAvatar(email: string, dataUrl: string) {
  try {
    localStorage.setItem(`${PENDING_AVATAR_KEY}:${email.trim().toLowerCase()}`, dataUrl);
  } catch {
    /* storage penuh / diblokir — abaikan */
  }
}

async function flushPendingAvatar(userId: string, email: string | undefined, profile: Profile | null) {
  if (!email) return false;
  const key = `${PENDING_AVATAR_KEY}:${email.toLowerCase()}`;
  let dataUrl: string | null = null;
  try {
    dataUrl = localStorage.getItem(key);
  } catch {
    return false;
  }
  if (!dataUrl) return false;
  try {
    if (!profile?.avatar_path) await profileService.uploadAvatarFromDataUrl(userId, dataUrl);
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.warn('Gagal mengunggah foto profil tertunda', e);
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const loadedFor = useRef<string | null>(null);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) {
      loadedFor.current = null;
      setProfile(null);
      return;
    }
    try {
      let p = await profileService.getMyProfile(s.user.id);
      if (await flushPendingAvatar(s.user.id, s.user.email, p)) {
        p = await profileService.getMyProfile(s.user.id);
      }
      loadedFor.current = s.user.id;
      setProfile(p);
    } catch (e) {
      console.error('Gagal memuat profil', e);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      await loadProfile(data.session);
      if (mounted) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      // Hindari memanggil Supabase langsung di dalam callback (deadlock); tunda ke tick berikutnya.
      if (event === 'SIGNED_OUT') {
        loadedFor.current = null;
        setProfile(null);
        return;
      }
      if (s && (loadedFor.current !== s.user.id || event === 'USER_UPDATED')) {
        setTimeout(() => {
          void loadProfile(s);
        }, 0);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await loadProfile(data.session);
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      loading,
      isAdmin: profile?.role === 'admin' && profile.status === 'active',
      isActive: profile?.status === 'active',
      refreshProfile,
      signOut,
    }),
    [session, profile, loading, refreshProfile, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}
