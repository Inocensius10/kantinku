import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && key);

if (!isSupabaseConfigured) {
  console.error(
    '[Kantinku] VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY belum diisi. Salin .env.example menjadi .env.',
  );
}

export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const AVATAR_BUCKET = 'avatars';
