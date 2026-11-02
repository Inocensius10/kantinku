import { supabase } from '@/lib/supabase';
import type { AppSettings } from '@/types';
import { unwrap } from './base';

export const settingsService = {
  async get(): Promise<AppSettings | null> {
    const res = await supabase.from('app_settings').select('*').limit(1).maybeSingle();
    return unwrap(res) as AppSettings | null;
  },

  async update(
    id: string,
    patch: Partial<
      Pick<AppSettings, 'attendance_latitude' | 'attendance_longitude' | 'attendance_radius_m' | 'max_gps_accuracy_m'>
    >,
  ) {
    const res = await supabase.from('app_settings').update(patch).eq('id', id);
    if (res.error) throw res.error;
  },
};
