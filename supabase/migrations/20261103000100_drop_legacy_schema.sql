-- Kantinku by Inosensius
-- 0001: Hapus skema lama (aplikasi pre-order siswa) yang tidak lagi dipakai.
-- Semua tabel ini kosong saat migration ini dibuat (2026-11-03).

drop table if exists
  public.preorder_items,
  public.preorders,
  public.menus,
  public.menu_categories,
  public.students,
  public.attendance,
  public.cash_capital,
  public.stock_items,
  public.stock_daily,
  public.income_daily,
  public.audit_logs,
  public.profiles,
  public.lokets
cascade;

drop function if exists public."current_role"() cascade;
drop function if exists public.current_loket() cascade;

drop type if exists public.preorder_status cascade;
drop type if exists public.app_role cascade;
