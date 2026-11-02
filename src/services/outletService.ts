import { supabase } from '@/lib/supabase';
import type { Outlet } from '@/types';
import { unwrap } from './base';

export const outletService = {
  /** Daftar loket. RLS: non-admin/anon hanya melihat loket aktif. */
  async list(opts: { activeOnly?: boolean } = {}): Promise<Outlet[]> {
    let q = supabase.from('outlets').select('*').order('sort_order').order('name');
    if (opts.activeOnly) q = q.eq('is_active', true);
    return unwrap(await q) as Outlet[];
  },

  async create(p: { name: string; description?: string | null; sort_order?: number }): Promise<Outlet> {
    const res = await supabase
      .from('outlets')
      .insert({ name: p.name.trim(), description: p.description?.trim() || null, sort_order: p.sort_order ?? 0 })
      .select()
      .single();
    return unwrap(res) as Outlet;
  },

  async update(id: string, patch: Partial<Pick<Outlet, 'name' | 'description' | 'sort_order' | 'is_active'>>) {
    const res = await supabase.from('outlets').update(patch).eq('id', id);
    if (res.error) throw res.error;
  },
};
