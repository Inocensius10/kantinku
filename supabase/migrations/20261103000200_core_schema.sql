-- Kantinku by Inosensius
-- 0002: Skema inti (enum, tabel, index, trigger updated_at)

-- ---------------------------------------------------------------------------
-- Enum
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('admin', 'employee');
create type public.account_status as enum ('pending', 'active', 'inactive', 'rejected');
create type public.sales_report_status as enum ('submitted', 'verified');
create type public.urgency_level as enum ('normal', 'urgent', 'emergency');
create type public.shortage_status as enum ('new', 'in_progress', 'done');

-- ---------------------------------------------------------------------------
-- Helper umum
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Tanggal "hari ini" menurut zona waktu Asia/Jakarta (sumber: jam server DB).
create or replace function public.jakarta_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Jakarta')::date;
$$;

-- Jarak dua koordinat (meter) dengan formula Haversine.
create or replace function public.haversine_m(
  lat1 double precision,
  lng1 double precision,
  lat2 double precision,
  lng2 double precision
)
returns double precision
language sql
immutable
strict
set search_path = ''
as $$
  select 2 * 6371000 * asin(
    sqrt(
      power(sin(radians(lat2 - lat1) / 2), 2)
      + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- outlets (loket)
-- ---------------------------------------------------------------------------
create table public.outlets (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 2 and 60),
  description text check (description is null or char_length(description) <= 300),
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index outlets_name_unique on public.outlets (lower(btrim(name)));

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  full_name    text not null check (char_length(btrim(full_name)) between 2 and 100),
  email        text not null,
  phone        text check (phone is null or char_length(phone) <= 25),
  address      text check (address is null or char_length(address) <= 300),
  birth_date   date check (birth_date is null or birth_date > date '1900-01-01'),
  avatar_path  text,
  outlet_id    uuid references public.outlets (id) on delete restrict,
  role         public.user_role not null default 'employee',
  status       public.account_status not null default 'pending',
  status_note  text check (status_note is null or char_length(status_note) <= 300),
  approved_at  timestamptz,
  approved_by  uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index profiles_outlet_idx on public.profiles (outlet_id);
create index profiles_role_status_idx on public.profiles (role, status);
create index profiles_approved_by_idx on public.profiles (approved_by);

-- ---------------------------------------------------------------------------
-- app_settings (satu baris saja)
-- ---------------------------------------------------------------------------
create table public.app_settings (
  id                   uuid primary key default gen_random_uuid(),
  singleton            boolean not null default true unique check (singleton),
  app_name             text not null default 'Kantinku by Inosensius',
  attendance_latitude  double precision not null check (attendance_latitude between -90 and 90),
  attendance_longitude double precision not null check (attendance_longitude between -180 and 180),
  attendance_radius_m  integer not null default 100 check (attendance_radius_m between 10 and 5000),
  max_gps_accuracy_m   integer not null default 100 check (max_gps_accuracy_m between 5 and 2000),
  timezone             text not null default 'Asia/Jakarta',
  updated_by           uuid references public.profiles (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index app_settings_updated_by_idx on public.app_settings (updated_by);

-- ---------------------------------------------------------------------------
-- attendance
-- ---------------------------------------------------------------------------
create table public.attendance (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles (id) on delete restrict,
  outlet_id             uuid not null references public.outlets (id) on delete restrict,
  work_date             date not null default public.jakarta_today(),
  check_in_at           timestamptz not null default now(),
  check_in_latitude     double precision not null,
  check_in_longitude    double precision not null,
  check_in_accuracy_m   numeric(8, 2),
  check_in_distance_m   numeric(10, 2) not null,
  check_out_at          timestamptz,
  check_out_latitude    double precision,
  check_out_longitude   double precision,
  check_out_accuracy_m  numeric(8, 2),
  check_out_distance_m  numeric(10, 2),
  admin_note            text check (admin_note is null or char_length(admin_note) <= 300),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint attendance_one_per_day unique (user_id, work_date),
  constraint attendance_checkout_after_checkin check (check_out_at is null or check_out_at >= check_in_at)
);
create index attendance_work_date_idx on public.attendance (work_date);
create index attendance_outlet_date_idx on public.attendance (outlet_id, work_date);

-- ---------------------------------------------------------------------------
-- sales_products
-- ---------------------------------------------------------------------------
create table public.sales_products (
  id          uuid primary key default gen_random_uuid(),
  outlet_id   uuid not null references public.outlets (id) on delete restrict,
  name        text not null check (char_length(btrim(name)) between 2 and 80),
  price       numeric(12, 2) not null check (price >= 0),
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index sales_products_outlet_name_unique on public.sales_products (outlet_id, lower(btrim(name)));
create index sales_products_outlet_order_idx on public.sales_products (outlet_id, sort_order);

-- ---------------------------------------------------------------------------
-- daily_sales_reports
-- ---------------------------------------------------------------------------
create table public.daily_sales_reports (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete restrict,
  outlet_id        uuid not null references public.outlets (id) on delete restrict,
  report_date      date not null default public.jakarta_today(),
  estimated_total  numeric(14, 2) not null default 0 check (estimated_total >= 0),
  total_items      integer not null default 0 check (total_items >= 0),
  actual_income    numeric(14, 2) not null check (actual_income >= 0),
  safe_capital     numeric(14, 2) not null check (safe_capital >= 0),
  notes            text check (notes is null or char_length(notes) <= 1000),
  status           public.sales_report_status not null default 'submitted',
  admin_notes      text check (admin_notes is null or char_length(admin_notes) <= 1000),
  submitted_at     timestamptz not null default now(),
  verified_at      timestamptz,
  verified_by      uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint daily_sales_reports_one_per_day unique (user_id, report_date)
);
create index daily_sales_reports_date_idx on public.daily_sales_reports (report_date);
create index daily_sales_reports_outlet_date_idx on public.daily_sales_reports (outlet_id, report_date);
create index daily_sales_reports_verified_by_idx on public.daily_sales_reports (verified_by);

-- ---------------------------------------------------------------------------
-- sales_report_items (harga disimpan sebagai snapshot)
-- ---------------------------------------------------------------------------
create table public.sales_report_items (
  id            uuid primary key default gen_random_uuid(),
  report_id     uuid not null references public.daily_sales_reports (id) on delete cascade,
  product_id    uuid not null references public.sales_products (id) on delete restrict,
  product_name  text not null,
  unit_price    numeric(12, 2) not null check (unit_price >= 0),
  quantity      integer not null check (quantity between 0 and 100000),
  subtotal      numeric(14, 2) generated always as (unit_price * quantity) stored,
  created_at    timestamptz not null default now(),
  constraint sales_report_items_unique_product unique (report_id, product_id)
);
create index sales_report_items_product_idx on public.sales_report_items (product_id);

-- ---------------------------------------------------------------------------
-- inventory_items (bahan baku). outlet_id NULL = berlaku untuk semua loket.
-- ---------------------------------------------------------------------------
create table public.inventory_items (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 2 and 80),
  category    text check (category is null or char_length(category) <= 50),
  unit        text not null default 'pcs' check (char_length(btrim(unit)) between 1 and 20),
  outlet_id   uuid references public.outlets (id) on delete restrict,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index inventory_items_name_outlet_unique
  on public.inventory_items (lower(btrim(name)), coalesce(outlet_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index inventory_items_outlet_idx on public.inventory_items (outlet_id);

-- ---------------------------------------------------------------------------
-- stock_shortage_reports
-- ---------------------------------------------------------------------------
create table public.stock_shortage_reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete restrict,
  outlet_id    uuid not null references public.outlets (id) on delete restrict,
  report_date  date not null default public.jakarta_today(),
  urgency      public.urgency_level not null default 'normal',
  notes        text check (notes is null or char_length(notes) <= 1000),
  status       public.shortage_status not null default 'new',
  admin_notes  text check (admin_notes is null or char_length(admin_notes) <= 1000),
  handled_by   uuid references public.profiles (id) on delete set null,
  handled_at   timestamptz,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index stock_shortage_reports_status_idx on public.stock_shortage_reports (status, urgency);
create index stock_shortage_reports_outlet_created_idx on public.stock_shortage_reports (outlet_id, created_at desc);
create index stock_shortage_reports_user_idx on public.stock_shortage_reports (user_id, created_at desc);
create index stock_shortage_reports_handled_by_idx on public.stock_shortage_reports (handled_by);

-- ---------------------------------------------------------------------------
-- stock_shortage_items
-- ---------------------------------------------------------------------------
create table public.stock_shortage_items (
  id                 uuid primary key default gen_random_uuid(),
  report_id          uuid not null references public.stock_shortage_reports (id) on delete cascade,
  inventory_item_id  uuid not null references public.inventory_items (id) on delete restrict,
  item_name          text not null,
  unit               text,
  quantity_needed    numeric(12, 2) check (quantity_needed is null or quantity_needed > 0),
  description        text check (description is null or char_length(description) <= 500),
  created_at         timestamptz not null default now(),
  constraint stock_shortage_items_unique_item unique (report_id, inventory_item_id)
);
create index stock_shortage_items_item_idx on public.stock_shortage_items (inventory_item_id);

-- ---------------------------------------------------------------------------
-- Trigger updated_at
-- ---------------------------------------------------------------------------
create trigger set_updated_at before update on public.outlets
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.app_settings
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.attendance
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.sales_products
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.daily_sales_reports
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.inventory_items
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.stock_shortage_reports
  for each row execute function public.set_updated_at();
