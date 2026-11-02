import { supabase } from '@/lib/supabase';
import type { GeoReading } from '@/lib/geo';
import type { Attendance, AttendanceResult, DateRange } from '@/types';
import { PROFILE_MINI, unwrap } from './base';

const SELECT_WITH_REL = `*, profile:profiles!attendance_user_id_fkey(${PROFILE_MINI}), outlet:outlets(id, name)`;

export const attendanceService = {
  async checkIn(pos: GeoReading): Promise<AttendanceResult> {
    const res = await supabase.rpc('check_in', {
      p_latitude: pos.latitude,
      p_longitude: pos.longitude,
      p_accuracy: pos.accuracy,
    });
    return unwrap(res) as AttendanceResult;
  },

  async checkOut(pos: GeoReading): Promise<AttendanceResult> {
    const res = await supabase.rpc('check_out', {
      p_latitude: pos.latitude,
      p_longitude: pos.longitude,
      p_accuracy: pos.accuracy,
    });
    return unwrap(res) as AttendanceResult;
  },

  async getMine(userId: string, workDate: string): Promise<Attendance | null> {
    const res = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .eq('work_date', workDate)
      .maybeSingle();
    return unwrap(res) as Attendance | null;
  },

  async listMine(userId: string, range: DateRange): Promise<Attendance[]> {
    const res = await supabase
      .from('attendance')
      .select('*, outlet:outlets(id, name)')
      .eq('user_id', userId)
      .gte('work_date', range.from)
      .lte('work_date', range.to)
      .order('work_date', { ascending: false });
    return unwrap(res) as Attendance[];
  },

  /** Admin: semua absensi dalam rentang tanggal, opsional per loket / karyawan. */
  async list(range: DateRange, opts: { outletId?: string | null; userId?: string } = {}): Promise<Attendance[]> {
    let q = supabase
      .from('attendance')
      .select(SELECT_WITH_REL)
      .gte('work_date', range.from)
      .lte('work_date', range.to)
      .order('work_date', { ascending: false })
      .order('check_in_at', { ascending: true });
    if (opts.outletId) q = q.eq('outlet_id', opts.outletId);
    if (opts.userId) q = q.eq('user_id', opts.userId);
    return unwrap(await q) as Attendance[];
  },
};
