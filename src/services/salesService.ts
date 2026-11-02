import { supabase } from '@/lib/supabase';
import type { DailySalesReport, DateRange, SalesProduct, SalesReportStatus } from '@/types';
import { PROFILE_MINI, unwrap } from './base';

const REPORT_SELECT = `*, items:sales_report_items(*), profile:profiles!daily_sales_reports_user_id_fkey(${PROFILE_MINI}), outlet:outlets(id, name)`;

function normalize(r: DailySalesReport): DailySalesReport {
  return {
    ...r,
    actual_income: Number(r.actual_income),
    safe_capital: Number(r.safe_capital),
    estimated_total: Number(r.estimated_total),
    items: (r.items ?? [])
      .filter((i) => i.quantity > 0)
      .map((i) => ({ ...i, unit_price: Number(i.unit_price), subtotal: Number(i.subtotal ?? 0) }))
      .sort((a, b) => a.product_name.localeCompare(b.product_name)),
  };
}

export const salesService = {
  // ---------------- Produk ----------------
  async listProducts(opts: { outletId?: string | null; activeOnly?: boolean } = {}): Promise<SalesProduct[]> {
    let q = supabase.from('sales_products').select('*').order('sort_order').order('name');
    if (opts.outletId) q = q.eq('outlet_id', opts.outletId);
    if (opts.activeOnly) q = q.eq('is_active', true);
    const rows = unwrap(await q) as SalesProduct[];
    return rows.map((p) => ({ ...p, price: Number(p.price) }));
  },

  async createProduct(p: { outlet_id: string; name: string; price: number; sort_order: number }) {
    const res = await supabase.from('sales_products').insert({ ...p, name: p.name.trim() });
    if (res.error) throw res.error;
  },

  async updateProduct(id: string, patch: Partial<Pick<SalesProduct, 'name' | 'price' | 'sort_order' | 'is_active' | 'outlet_id'>>) {
    const res = await supabase.from('sales_products').update(patch).eq('id', id);
    if (res.error) throw res.error;
  },

  // ---------------- Laporan ----------------
  async submitReport(p: {
    actualIncome: number;
    safeCapital: number;
    notes: string;
    items: Array<{ product_id: string; quantity: number }>;
  }): Promise<string> {
    const res = await supabase.rpc('submit_sales_report', {
      p_actual_income: p.actualIncome,
      p_safe_capital: p.safeCapital,
      p_notes: p.notes,
      p_items: p.items,
    });
    return unwrap(res) as string;
  },

  async getMyReport(userId: string, date: string): Promise<DailySalesReport | null> {
    const res = await supabase
      .from('daily_sales_reports')
      .select('*, items:sales_report_items(*)')
      .eq('user_id', userId)
      .eq('report_date', date)
      .maybeSingle();
    const row = unwrap(res) as DailySalesReport | null;
    return row ? normalize(row) : null;
  },

  async listMine(userId: string, range: DateRange): Promise<DailySalesReport[]> {
    const res = await supabase
      .from('daily_sales_reports')
      .select('*, items:sales_report_items(*)')
      .eq('user_id', userId)
      .gte('report_date', range.from)
      .lte('report_date', range.to)
      .order('report_date', { ascending: false });
    return (unwrap(res) as DailySalesReport[]).map(normalize);
  },

  /** Admin: laporan semua karyawan */
  async list(range: DateRange, opts: { outletId?: string | null; userId?: string } = {}): Promise<DailySalesReport[]> {
    let q = supabase
      .from('daily_sales_reports')
      .select(REPORT_SELECT)
      .gte('report_date', range.from)
      .lte('report_date', range.to)
      .order('report_date', { ascending: false })
      .order('submitted_at', { ascending: false });
    if (opts.outletId) q = q.eq('outlet_id', opts.outletId);
    if (opts.userId) q = q.eq('user_id', opts.userId);
    return (unwrap(await q) as DailySalesReport[]).map(normalize);
  },

  async setStatus(id: string, status: SalesReportStatus, adminNotes?: string | null) {
    const res = await supabase
      .from('daily_sales_reports')
      .update({ status, admin_notes: adminNotes?.trim() || null })
      .eq('id', id);
    if (res.error) throw res.error;
  },
};
