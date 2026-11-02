import { AVATAR_BUCKET, supabase } from '@/lib/supabase';
import { compressAvatar, dataUrlToBlob } from '@/lib/image';
import type { AccountStatus, Profile } from '@/types';
import { unwrap } from './base';

const PROFILE_SELECT = '*, outlet:outlets(id, name)';

// ---- Cache signed URL foto profil (bucket privat) ----
const urlCache = new Map<string, { url: string; expires: number }>();
const SIGNED_TTL = 60 * 60; // detik

export const profileService = {
  async getMyProfile(userId: string): Promise<Profile | null> {
    const res = await supabase.from('profiles').select(PROFILE_SELECT).eq('id', userId).maybeSingle();
    return unwrap(res) as Profile | null;
  },

  async updateMyProfile(
    userId: string,
    patch: Partial<Pick<Profile, 'full_name' | 'phone' | 'address' | 'birth_date'>>,
  ): Promise<void> {
    const res = await supabase.from('profiles').update(patch).eq('id', userId);
    if (res.error) throw res.error;
  },

  /** Unggah foto profil (dikompres) ke {uid}/avatar.jpg lalu simpan path di profil. */
  async uploadAvatar(userId: string, file: File | Blob): Promise<string> {
    const blob = file instanceof File ? await compressAvatar(file) : file;
    const path = `${userId}/avatar.jpg`;
    const up = await supabase.storage.from(AVATAR_BUCKET).upload(path, blob, {
      upsert: true,
      contentType: 'image/jpeg',
      cacheControl: '60',
    });
    if (up.error) throw up.error;
    const res = await supabase.from('profiles').update({ avatar_path: path }).eq('id', userId);
    if (res.error) throw res.error;
    urlCache.delete(path);
    return path;
  },

  async uploadAvatarFromDataUrl(userId: string, dataUrl: string): Promise<string> {
    const blob = await dataUrlToBlob(dataUrl);
    return this.uploadAvatar(userId, blob);
  },

  /** Ambil signed URL untuk sekumpulan path, dengan cache. `version` dipakai untuk cache-busting. */
  async getAvatarUrls(paths: string[]): Promise<Record<string, string>> {
    const now = Date.now();
    const result: Record<string, string> = {};
    const missing: string[] = [];
    for (const p of new Set(paths.filter(Boolean))) {
      const c = urlCache.get(p);
      if (c && c.expires > now + 60_000) result[p] = c.url;
      else missing.push(p);
    }
    if (missing.length) {
      const { data, error } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrls(missing, SIGNED_TTL);
      if (!error && data) {
        for (const row of data) {
          if (row.signedUrl && row.path) {
            urlCache.set(row.path, { url: row.signedUrl, expires: now + SIGNED_TTL * 1000 });
            result[row.path] = row.signedUrl;
          }
        }
      }
    }
    return result;
  },

  invalidateAvatar(path: string) {
    urlCache.delete(path);
  },

  // ---------------- Admin ----------------
  async listProfiles(filter: { outletId?: string | null; status?: AccountStatus | 'all'; role?: 'employee' | 'admin' | 'all' } = {}) {
    let q = supabase.from('profiles').select(PROFILE_SELECT).order('created_at', { ascending: false });
    if (filter.outletId) q = q.eq('outlet_id', filter.outletId);
    if (filter.status && filter.status !== 'all') q = q.eq('status', filter.status);
    if (filter.role && filter.role !== 'all') q = q.eq('role', filter.role);
    return unwrap(await q) as Profile[];
  },

  async adminUpdateProfile(
    id: string,
    patch: Partial<Pick<Profile, 'status' | 'outlet_id' | 'role' | 'status_note'>>,
  ): Promise<void> {
    const res = await supabase.from('profiles').update(patch).eq('id', id);
    if (res.error) throw res.error;
  },
};
