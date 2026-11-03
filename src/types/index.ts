export type UserRole = 'admin' | 'employee';
export type AccountStatus = 'pending' | 'active' | 'inactive' | 'rejected';
export type SalesReportStatus = 'submitted' | 'verified';
export type UrgencyLevel = 'normal' | 'urgent' | 'emergency';
export type ShortageStatus = 'new' | 'in_progress' | 'done';

export interface Outlet {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  birth_date: string | null;
  avatar_path: string | null;
  outlet_id: string | null;
  role: UserRole;
  status: AccountStatus;
  status_note: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  outlet?: Pick<Outlet, 'id' | 'name'> | null;
}

export interface AppSettings {
  id: string;
  app_name: string;
  attendance_latitude: number;
  attendance_longitude: number;
  attendance_radius_m: number;
  max_gps_accuracy_m: number;
  timezone: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  user_id: string;
  outlet_id: string;
  work_date: string;
  check_in_at: string;
  check_in_latitude: number;
  check_in_longitude: number;
  check_in_accuracy_m: number | null;
  check_in_distance_m: number;
  check_out_at: string | null;
  check_out_latitude: number | null;
  check_out_longitude: number | null;
  check_out_accuracy_m: number | null;
  check_out_distance_m: number | null;
  admin_note: string | null;
  created_at: string;
  profile?: Pick<Profile, 'id' | 'full_name' | 'avatar_path'> | null;
  outlet?: Pick<Outlet, 'id' | 'name'> | null;
}

export interface AttendanceResult {
  success: boolean;
  code:
    | 'OK'
    | 'OUT_OF_RANGE'
    | 'LOW_ACCURACY'
    | 'INVALID_LOCATION'
    | 'ALREADY_CHECKED_IN'
    | 'ALREADY_CHECKED_OUT'
    | 'NOT_CHECKED_IN';
  message: string;
  distance_m?: number;
  accuracy_m?: number;
  radius_m?: number;
  max_accuracy_m?: number;
  record?: Attendance;
}

export interface SalesProduct {
  id: string;
  outlet_id: string;
  name: string;
  price: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SalesReportItem {
  id: string;
  report_id: string;
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number | null;
}

export interface DailySalesReport {
  id: string;
  user_id: string;
  outlet_id: string;
  report_date: string;
  estimated_total: number;
  total_items: number;
  /** Uang cash (tunai) hari ini */
  cash_income: number;
  /** Uang yang masuk lewat QRIS */
  qris_income: number;
  /** Uang yang masuk lewat mesin EDC (kartu debit/kredit) */
  edc_income: number;
  /** Total uang = cash + QRIS + EDC (dihitung database) */
  actual_income: number;
  safe_capital: number;
  /** Pendapatan bersih = total uang - uang modal brankas (dihitung database) */
  net_income: number;
  notes: string | null;
  status: SalesReportStatus;
  admin_notes: string | null;
  submitted_at: string;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
  items?: SalesReportItem[];
  profile?: Pick<Profile, 'id' | 'full_name' | 'avatar_path'> | null;
  outlet?: Pick<Outlet, 'id' | 'name'> | null;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  outlet_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  outlet?: Pick<Outlet, 'id' | 'name'> | null;
}

export interface StockShortageItem {
  id: string;
  report_id: string;
  inventory_item_id: string;
  item_name: string;
  unit: string | null;
  quantity_needed: number | null;
  description: string | null;
}

export interface StockShortageReport {
  id: string;
  user_id: string;
  outlet_id: string;
  report_date: string;
  urgency: UrgencyLevel;
  notes: string | null;
  status: ShortageStatus;
  admin_notes: string | null;
  handled_by: string | null;
  handled_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  items?: StockShortageItem[];
  profile?: Pick<Profile, 'id' | 'full_name' | 'avatar_path'> | null;
  outlet?: Pick<Outlet, 'id' | 'name'> | null;
}

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}
