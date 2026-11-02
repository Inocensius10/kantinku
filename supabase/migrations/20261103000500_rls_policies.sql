-- Kantinku by Inosensius
-- 0005: Row Level Security, hak akses tabel, dan hak eksekusi fungsi.

-- ---------------------------------------------------------------------------
-- Aktifkan RLS di semua tabel
-- ---------------------------------------------------------------------------
alter table public.outlets                enable row level security;
alter table public.profiles               enable row level security;
alter table public.app_settings           enable row level security;
alter table public.attendance             enable row level security;
alter table public.sales_products         enable row level security;
alter table public.daily_sales_reports    enable row level security;
alter table public.sales_report_items     enable row level security;
alter table public.inventory_items        enable row level security;
alter table public.stock_shortage_reports enable row level security;
alter table public.stock_shortage_items   enable row level security;

-- ---------------------------------------------------------------------------
-- Hak tabel: anon hanya boleh membaca loket aktif (untuk form registrasi).
-- Penulisan data operasional karyawan dilakukan melalui RPC SECURITY DEFINER.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
grant select on public.outlets to anon;

revoke all on all tables in schema public from authenticated;
grant select on all tables in schema public to authenticated;
grant insert, update on public.outlets, public.sales_products, public.inventory_items to authenticated;
grant update on public.profiles, public.app_settings, public.attendance,
                public.daily_sales_reports, public.stock_shortage_reports to authenticated;

-- ---------------------------------------------------------------------------
-- outlets
-- ---------------------------------------------------------------------------
create policy outlets_select_anon on public.outlets
  for select to anon
  using (is_active);

create policy outlets_select_auth on public.outlets
  for select to authenticated
  using (is_active or (select public.is_admin()));

create policy outlets_insert_admin on public.outlets
  for insert to authenticated
  with check ((select public.is_admin()));

create policy outlets_update_admin on public.outlets
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy profiles_select_own_or_admin on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy profiles_update_own_or_admin on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- app_settings
-- ---------------------------------------------------------------------------
create policy app_settings_select_auth on public.app_settings
  for select to authenticated
  using (true);

create policy app_settings_update_admin on public.app_settings
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- attendance (karyawan: baca milik sendiri; tulis hanya via RPC)
-- ---------------------------------------------------------------------------
create policy attendance_select_own_or_admin on public.attendance
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy attendance_update_admin on public.attendance
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- sales_products
-- ---------------------------------------------------------------------------
create policy sales_products_select_auth on public.sales_products
  for select to authenticated
  using (is_active or (select public.is_admin()));

create policy sales_products_insert_admin on public.sales_products
  for insert to authenticated
  with check ((select public.is_admin()));

create policy sales_products_update_admin on public.sales_products
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- daily_sales_reports & sales_report_items
-- ---------------------------------------------------------------------------
create policy daily_sales_reports_select_own_or_admin on public.daily_sales_reports
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy daily_sales_reports_update_admin on public.daily_sales_reports
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy sales_report_items_select_own_or_admin on public.sales_report_items
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.daily_sales_reports r
      where r.id = sales_report_items.report_id
        and r.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- inventory_items
-- ---------------------------------------------------------------------------
create policy inventory_items_select_auth on public.inventory_items
  for select to authenticated
  using (is_active or (select public.is_admin()));

create policy inventory_items_insert_admin on public.inventory_items
  for insert to authenticated
  with check ((select public.is_admin()));

create policy inventory_items_update_admin on public.inventory_items
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- stock_shortage_reports & stock_shortage_items
-- ---------------------------------------------------------------------------
create policy stock_shortage_reports_select_own_or_admin on public.stock_shortage_reports
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy stock_shortage_reports_update_admin on public.stock_shortage_reports
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy stock_shortage_items_select_own_or_admin on public.stock_shortage_items
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.stock_shortage_reports r
      where r.id = stock_shortage_items.report_id
        and r.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Hak eksekusi fungsi: tutup semua, buka yang dibutuhkan saja.
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.jakarta_today() to authenticated;
grant execute on function public.haversine_m(double precision, double precision, double precision, double precision) to authenticated;
grant execute on function public.check_in(double precision, double precision, double precision) to authenticated;
grant execute on function public.check_out(double precision, double precision, double precision) to authenticated;
grant execute on function public.submit_sales_report(numeric, numeric, text, jsonb) to authenticated;
grant execute on function public.create_stock_shortage_report(public.urgency_level, text, jsonb) to authenticated;

-- Fungsi trigger/helper internal tidak dipanggil langsung oleh klien.
-- (handle_new_user, handle_user_email_change, protect_profile_fields,
--  track_*, set_updated_at, require_active_profile, validate_attendance_location)

-- Jangan beri hak default ke anon untuk objek baru di masa depan.
alter default privileges in schema public revoke execute on functions from public, anon;
