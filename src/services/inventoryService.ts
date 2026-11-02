import { supabase } from '@/lib/supabase';
import type { DateRange, InventoryItem, ShortageStatus, StockShortageReport, UrgencyLevel } from '@/types';
import { PROFILE_MINI, unwrap } from './base';

const REPORT_SELECT = `*, items:stock_shortage_items(*), profile:profiles!stock_shortage_reports_user_id_fkey(${PROFILE_MINI}), outlet:outlets(id, name)`;

const URGENCY_RANK: Record<UrgencyLevel, number> = { emergency: 0, urgent: 1, normal: 2 };

export const inventoryService = {
  // ---------------- Bahan baku ----------------
  /** outletId: tampilkan bahan baku umum (outlet null) + bahan baku loket tersebut. */
  async listItems(opts: { outletId?: string | null; activeOnly?: boolean; exactOutlet?: boolean } = {}): Promise<InventoryItem[]> {
    let q = supabase
      .from('inventory_items')
      .select('*, outlet:outlets(id, name)')
      .order('sort_order')
      .order('name');
    if (opts.outletId) {
      q = opts.exactOutlet ? q.eq('outlet_id', opts.outletId) : q.or(`outlet_id.is.null,outlet_id.eq.${opts.outletId}`);
    }
    if (opts.activeOnly) q = q.eq('is_active', true);
    return unwrap(await q) as InventoryItem[];
  },

  async createItem(p: { name: string; category: string | null; unit: string; outlet_id: string | null; sort_order: number }) {
    const res = await supabase.from('inventory_items').insert({ ...p, name: p.name.trim() });
    if (res.error) throw res.error;
  },

  async updateItem(
    id: string,
    patch: Partial<Pick<InventoryItem, 'name' | 'category' | 'unit' | 'outlet_id' | 'sort_order' | 'is_active'>>,
  ) {
    const res = await supabase.from('inventory_items').update(patch).eq('id', id);
    if (res.error) throw res.error;
  },

  // ---------------- Laporan kekurangan ----------------
  async createShortageReport(p: {
    urgency: UrgencyLevel;
    notes: string;
    items: Array<{ inventory_item_id: string; quantity_needed: number | null; description: string }>;
  }): Promise<string> {
    const res = await supabase.rpc('create_stock_shortage_report', {
      p_urgency: p.urgency,
      p_notes: p.notes,
      p_items: p.items,
    });
    return unwrap(res) as string;
  },

  async listMine(userId: string, limit = 30): Promise<StockShortageReport[]> {
    const res = await supabase
      .from('stock_shortage_reports')
      .select('*, items:stock_shortage_items(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return unwrap(res) as StockShortageReport[];
  },

  /** Admin: laporan kekurangan; diurutkan status (belum selesai dulu), urgensi, lalu terbaru. */
  async list(opts: {
    range?: DateRange;
    outletId?: string | null;
    status?: ShortageStatus | 'open' | 'all';
    userId?: string;
  } = {}): Promise<StockShortageReport[]> {
    let q = supabase.from('stock_shortage_reports').select(REPORT_SELECT).order('created_at', { ascending: false });
    if (opts.range) q = q.gte('report_date', opts.range.from).lte('report_date', opts.range.to);
    if (opts.outletId) q = q.eq('outlet_id', opts.outletId);
    if (opts.userId) q = q.eq('user_id', opts.userId);
    if (opts.status === 'open') q = q.in('status', ['new', 'in_progress']);
    else if (opts.status && opts.status !== 'all') q = q.eq('status', opts.status);
    const rows = unwrap(await q) as StockShortageReport[];
    const statusRank: Record<ShortageStatus, number> = { new: 0, in_progress: 1, done: 2 };
    return rows.sort(
      (a, b) =>
        statusRank[a.status] - statusRank[b.status] ||
        URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] ||
        b.created_at.localeCompare(a.created_at),
    );
  },

  async countOpen(opts: { outletId?: string | null; userId?: string } = {}): Promise<number> {
    let q = supabase
      .from('stock_shortage_reports')
      .select('id', { count: 'exact', head: true })
      .in('status', ['new', 'in_progress']);
    if (opts.outletId) q = q.eq('outlet_id', opts.outletId);
    if (opts.userId) q = q.eq('user_id', opts.userId);
    const res = await q;
    if (res.error) throw res.error;
    return res.count ?? 0;
  },

  async updateShortage(id: string, patch: { status?: ShortageStatus; admin_notes?: string | null }) {
    const res = await supabase.from('stock_shortage_reports').update(patch).eq('id', id);
    if (res.error) throw res.error;
  },
};
