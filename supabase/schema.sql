-- KantinKu / KMS database schema. Execute in the Supabase SQL editor.
create type public.app_role as enum ('student', 'employee', 'admin', 'superadmin');
create type public.preorder_status as enum ('menunggu', 'diproses', 'siap_diambil', 'selesai', 'dibatalkan');

create table public.lokets (
  id uuid primary key default gen_random_uuid(), name text not null unique, phone text, address text,
  latitude numeric, longitude numeric, attendance_radius integer not null default 100, is_active boolean default true, created_at timestamptz default now()
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade, role public.app_role not null default 'student',
  full_name text not null, phone text, avatar_url text, birth_date date, address text, loket_id uuid references public.lokets(id), is_active boolean default true, created_at timestamptz default now(), updated_at timestamptz default now()
);
create table public.students (profile_id uuid primary key references public.profiles(id) on delete cascade, nis text not null unique, class_name text not null);
create table public.menu_categories (id uuid primary key default gen_random_uuid(), name text not null, loket_id uuid references public.lokets(id) on delete cascade);
create table public.menus (id uuid primary key default gen_random_uuid(), loket_id uuid not null references public.lokets(id) on delete cascade, category_id uuid references public.menu_categories(id) on delete set null, name text not null, price numeric not null check(price >= 0), description text, image_url text, stock integer not null default 0, is_available boolean default true, created_at timestamptz default now());
create table public.preorders (id uuid primary key default gen_random_uuid(), student_id uuid not null references public.profiles(id), loket_id uuid not null references public.lokets(id), pickup_at timestamptz not null, notes text, status public.preorder_status default 'menunggu', total numeric not null, created_at timestamptz default now());
create table public.preorder_items (id uuid primary key default gen_random_uuid(), preorder_id uuid not null references public.preorders(id) on delete cascade, menu_id uuid references public.menus(id), quantity integer not null check(quantity > 0), unit_price numeric not null);
create table public.attendance (id uuid primary key default gen_random_uuid(), employee_id uuid not null references public.profiles(id), loket_id uuid not null references public.lokets(id), attended_on date not null default current_date, checked_in_at timestamptz default now(), latitude numeric, longitude numeric, distance_meters numeric, unique(employee_id, attended_on));
create table public.cash_capital (id uuid primary key default gen_random_uuid(), employee_id uuid not null references public.profiles(id), loket_id uuid not null references public.lokets(id), recorded_on date not null default current_date, amount numeric not null check(amount >= 0), unique(employee_id, recorded_on));
create table public.stock_daily (id uuid primary key default gen_random_uuid(), employee_id uuid not null references public.profiles(id), loket_id uuid not null references public.lokets(id), recorded_on date not null default current_date);
create table public.stock_items (id uuid primary key default gen_random_uuid(), stock_daily_id uuid not null references public.stock_daily(id) on delete cascade, material_name text not null, quantity numeric not null, unit text, notes text);
create table public.income_daily (id uuid primary key default gen_random_uuid(), loket_id uuid not null references public.lokets(id), recorded_by uuid not null references public.profiles(id), income_date date not null default current_date, method text not null check(method in ('cash','qris','transfer')), amount numeric not null, notes text);
create table public.audit_logs (id bigint generated always as identity primary key, actor_id uuid references public.profiles(id), action text not null, entity text not null, entity_id uuid, created_at timestamptz default now());

alter table public.profiles enable row level security; alter table public.menus enable row level security; alter table public.preorders enable row level security; alter table public.attendance enable row level security;
create or replace function public.current_role() returns public.app_role language sql stable security definer set search_path=public as $$ select role from public.profiles where id=auth.uid() $$;
create or replace function public.current_loket() returns uuid language sql stable security definer set search_path=public as $$ select loket_id from public.profiles where id=auth.uid() $$;
create policy "profiles own or superadmin" on public.profiles for select using (id=auth.uid() or public.current_role()='superadmin');
create policy "menus public read" on public.menus for select using (is_available or public.current_role() in ('admin','superadmin'));
create policy "admin manages assigned menu" on public.menus for all using (public.current_role()='superadmin' or (public.current_role()='admin' and loket_id=public.current_loket())) with check (public.current_role()='superadmin' or (public.current_role()='admin' and loket_id=public.current_loket()));
create policy "students own orders" on public.preorders for select using (student_id=auth.uid() or loket_id=public.current_loket() or public.current_role()='superadmin');
create policy "student creates own order" on public.preorders for insert with check (student_id=auth.uid() and public.current_role()='student');
create policy "attendance scoped" on public.attendance for select using (employee_id=auth.uid() or loket_id=public.current_loket() or public.current_role()='superadmin');
create policy "employee creates own attendance" on public.attendance for insert with check (employee_id=auth.uid() and public.current_role()='employee' and loket_id=public.current_loket());

-- Bootstrap: create the first superadmin in Auth, then execute:
-- update public.profiles set role='superadmin' where id='AUTH_USER_UUID';
