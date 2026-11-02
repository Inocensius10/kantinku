-- Kantinku by Inosensius
-- 0003: Fungsi keamanan, trigger profil, dan trigger audit status.

-- ---------------------------------------------------------------------------
-- is_admin(): SECURITY DEFINER agar tidak memicu RLS rekursif pada profiles.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
      and p.status = 'active'
  );
$$;

-- ---------------------------------------------------------------------------
-- Pembuatan profil otomatis setelah registrasi Supabase Auth.
-- Role & status SELALU default (employee / pending); metadata klien diabaikan
-- untuk kolom sensitif.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta   jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_outlet uuid;
  v_birth  date;
  v_name   text;
begin
  begin
    v_outlet := nullif(v_meta ->> 'outlet_id', '')::uuid;
  exception when others then
    v_outlet := null;
  end;

  if v_outlet is not null
     and not exists (select 1 from public.outlets o where o.id = v_outlet and o.is_active) then
    v_outlet := null;
  end if;

  begin
    v_birth := nullif(v_meta ->> 'birth_date', '')::date;
  exception when others then
    v_birth := null;
  end;
  if v_birth is not null and (v_birth <= date '1900-01-01' or v_birth > current_date) then
    v_birth := null;
  end if;

  v_name := left(btrim(coalesce(v_meta ->> 'full_name', '')), 100);
  if char_length(v_name) < 2 then
    v_name := left(split_part(coalesce(new.email, 'Pengguna'), '@', 1), 100);
  end if;
  if char_length(v_name) < 2 then
    v_name := 'Pengguna';
  end if;

  insert into public.profiles (id, full_name, email, phone, address, birth_date, outlet_id)
  values (
    new.id,
    v_name,
    coalesce(new.email, ''),
    nullif(left(btrim(coalesce(v_meta ->> 'phone', '')), 25), ''),
    nullif(left(btrim(coalesce(v_meta ->> 'address', '')), 300), ''),
    v_birth,
    v_outlet
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Sinkronkan email profil jika email diubah melalui Supabase Auth.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
     set email = coalesce(new.email, '')
   where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- Lindungi kolom sensitif profil.
--  * Karyawan hanya boleh mengubah: full_name, phone, address, birth_date, avatar_path
--  * Admin boleh mengubah loket/role/status karyawan, tapi tidak status/role dirinya sendiri
--  * Email hanya diubah lewat Supabase Auth (trigger di atas)
-- Koneksi tanpa JWT pengguna (SQL editor / service role / auth admin) dilewati.
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    return new;
  end if;

  new.id := old.id;
  new.created_at := old.created_at;

  if new.email is distinct from old.email then
    raise exception 'Email hanya dapat diubah melalui pengaturan akun.' using errcode = '42501';
  end if;

  if public.is_admin() then
    if new.id = v_uid and (new.role is distinct from old.role or new.status is distinct from old.status) then
      raise exception 'Admin tidak dapat mengubah role atau status akunnya sendiri.' using errcode = '42501';
    end if;

    if new.status = 'active' and old.status is distinct from 'active' then
      new.approved_at := now();
      new.approved_by := v_uid;
    end if;
    return new;
  end if;

  if new.role is distinct from old.role
     or new.status is distinct from old.status
     or new.status_note is distinct from old.status_note
     or new.outlet_id is distinct from old.outlet_id
     or new.approved_at is distinct from old.approved_at
     or new.approved_by is distinct from old.approved_by then
    raise exception 'Loket, role, dan status akun hanya dapat diubah oleh admin.' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ---------------------------------------------------------------------------
-- Audit otomatis saat admin memverifikasi laporan penjualan.
-- ---------------------------------------------------------------------------
create or replace function public.track_sales_report_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'verified' then
      new.verified_at := now();
      new.verified_by := (select auth.uid());
    else
      new.verified_at := null;
      new.verified_by := null;
    end if;
  end if;
  return new;
end;
$$;

create trigger track_sales_report_status
  before update on public.daily_sales_reports
  for each row execute function public.track_sales_report_status();

-- ---------------------------------------------------------------------------
-- Audit otomatis saat admin menindaklanjuti laporan stok.
-- ---------------------------------------------------------------------------
create or replace function public.track_shortage_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.handled_by := coalesce((select auth.uid()), new.handled_by);
    new.handled_at := now();
    if new.status = 'done' then
      new.resolved_at := now();
    else
      new.resolved_at := null;
    end if;
  end if;
  return new;
end;
$$;

create trigger track_shortage_status
  before update on public.stock_shortage_reports
  for each row execute function public.track_shortage_status();

-- Catat siapa admin yang terakhir mengubah pengaturan.
create or replace function public.track_settings_editor()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_by := coalesce((select auth.uid()), new.updated_by);
  new.singleton := true;
  return new;
end;
$$;

create trigger track_settings_editor
  before update on public.app_settings
  for each row execute function public.track_settings_editor();
