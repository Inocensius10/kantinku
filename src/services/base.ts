import type { PostgrestError } from '@supabase/supabase-js';

export function unwrap<T>(res: { data: T | null; error: PostgrestError | null }): T {
  if (res.error) throw res.error;
  return res.data as T;
}

export const PROFILE_MINI = 'id, full_name, avatar_path';
