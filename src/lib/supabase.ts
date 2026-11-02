import { createClient } from '@supabase/supabase-js';

/**
 * Konfigurasi Supabase.
 * Prioritas: environment variable (VITE_*) → nilai bawaan project Kantinku.
 *
 * URL project dan publishable key memang bersifat publik (selalu terkirim ke
 * browser) — keamanan data dijaga oleh Row Level Security di database.
 * JANGAN PERNAH menaruh service_role / secret key di sini.
 */
const DEFAULT_SUPABASE_URL = 'https://wvhqhkxkpnndekyucyom.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_iW75V0a6IJQFAQGmfuRIXg_zncGFSKT';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || DEFAULT_SUPABASE_URL;
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() || DEFAULT_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(url && key);

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const AVATAR_BUCKET = 'avatars';
