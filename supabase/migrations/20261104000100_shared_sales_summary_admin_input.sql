-- =============================================================================
-- 1. Ringkasan pendapatan bersih untuk SEMUA user aktif (karyawan & admin).
--    Hanya angka agregat per tanggal per loket — rincian laporan pribadi
--    (nama, catatan, rincian produk) tetap dilindungi RLS.
-- 2. Admin dapat mengisi / mengubah uang Cash, QRIS, EDC & modal brankas
--    pada laporan karyawan (membuat laporan bila belum ada).
-- =============================================================================

alter table public.daily_sales_reports
  add column money_edited_by uuid references public.profiles (id) on delete set null,
  add column money_edited_at timestamptz;

create index daily_sales_reports_money_edited_by_idx on public.daily_sales_reports (money_edited_by);

comment on column public.daily_sales_reports.money_edited_by is 'Admin terakhir yang mengisi/mengubah uang Cash/QRIS/EDC/modal lewat admin_save_sales_money.';

-- ---------------------------------------------------------------------------
-- Ringkasan harian (agregat) — bisa dibaca semua user aktif.
-- ---------------------------------------------------------------------------
create or replace function public.sales_daily_summary(p_from date, p_to date)
returns table (
  report_date   date,
  outlet_id     uuid,
  net_income    numeric,
  total_income  numeric,
  total_items   bigint,
  report_count  bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Sesi login tidak ditemukan. Silakan login kembali.' using errcode = '28000';
  end if;
  if not exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.status = 'active') then
    raise exception 'Akun Anda belum aktif. Hubungi admin untuk persetujuan.' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'Rentang tanggal tidak valid.' using errcode = '22023';
  end if;
  if p_to - p_from > 400 then
    raise exception 'Rentang tanggal maksimal 400 hari.' using errcode = '22023';
  end if;

  return query
    select r.report_date,
           r.outlet_id,
           sum(r.net_income)::numeric,
           sum(r.actual_income)::numeric,
           sum(r.total_items)::bigint,
           count(*)::bigint
      from public.daily_sales_reports r
     where r.report_date between p_from and p_to
     group by r.report_date, r.outlet_id
     order by r.report_date, r.outlet_id;
end;
$$;

revoke all on function public.sales_daily_summary(date, date) from public, anon;
grant execute on function public.sales_daily_summary(date, date) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: isi / ubah uang laporan karyawan.
-- ---------------------------------------------------------------------------
create or replace function public.admin_save_sales_money(
  p_user_id uuid,
  p_report_date date,
  p_cash_income numeric,
  p_qris_income numeric,
  p_edc_income numeric,
  p_safe_capital numeric
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin    uuid := (select auth.uid());
  v_employee public.profiles;
  v_id       uuid;
begin
  if v_admin is null or not public.is_admin() then
    raise exception 'Hanya admin yang dapat mengisi uang laporan karyawan.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles p where p.id = v_admin and p.status = 'active') then
    raise exception 'Akun admin tidak aktif.' using errcode = '42501';
  end if;

  if p_cash_income is null or p_cash_income < 0 then
    raise exception 'Uang cash wajib diisi dan tidak boleh negatif.' using errcode = '22023';
  end if;
  if p_qris_income is null or p_qris_income < 0 then
    raise exception 'Uang QRIS wajib diisi dan tidak boleh negatif.' using errcode = '22023';
  end if;
  if p_edc_income is null or p_edc_income < 0 then
    raise exception 'Uang EDC wajib diisi dan tidak boleh negatif.' using errcode = '22023';
  end if;
  if p_safe_capital is null or p_safe_capital < 0 then
    raise exception 'Uang modal brankas wajib diisi dan tidak boleh negatif.' using errcode = '22023';
  end if;
  if p_report_date is null or p_report_date > public.jakarta_today() then
    raise exception 'Tanggal laporan tidak boleh di masa depan.' using errcode = '22023';
  end if;

  select r.id into v_id from public.daily_sales_reports r
   where r.user_id = p_user_id and r.report_date = p_report_date
   for update;

  if found then
    update public.daily_sales_reports
       set cash_income     = p_cash_income,
           qris_income     = p_qris_income,
           edc_income      = p_edc_income,
           safe_capital    = p_safe_capital,
           money_edited_by = v_admin,
           money_edited_at = now()
     where id = v_id;
    return v_id;
  end if;

  select * into v_employee from public.profiles p where p.id = p_user_id;
  if not found or v_employee.role <> 'employee' then
    raise exception 'Karyawan tidak ditemukan.' using errcode = 'P0002';
  end if;
  if v_employee.outlet_id is null then
    raise exception 'Karyawan ini belum ditempatkan di loket mana pun.' using errcode = '22023';
  end if;

  insert into public.daily_sales_reports
    (user_id, outlet_id, report_date, cash_income, qris_income, edc_income, actual_income, safe_capital,
     money_edited_by, money_edited_at)
  values
    (v_employee.id, v_employee.outlet_id, p_report_date, p_cash_income, p_qris_income, p_edc_income,
     p_cash_income + p_qris_income + p_edc_income, p_safe_capital, v_admin, now())
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.admin_save_sales_money(uuid, date, numeric, numeric, numeric, numeric) from public, anon;
grant execute on function public.admin_save_sales_money(uuid, date, numeric, numeric, numeric, numeric) to authenticated;
