-- =============================================================================
-- Rincian uang laporan penjualan: Cash, QRIS, EDC.
--   actual_income = cash_income + qris_income + edc_income   (dihitung trigger)
--   net_income    = actual_income - safe_capital             (kolom generated)
-- =============================================================================

alter table public.daily_sales_reports
  add column cash_income numeric(14, 2) not null default 0 check (cash_income >= 0),
  add column qris_income numeric(14, 2) not null default 0 check (qris_income >= 0),
  add column edc_income  numeric(14, 2) not null default 0 check (edc_income >= 0);

-- Data lama (jika ada) dianggap seluruhnya uang cash.
update public.daily_sales_reports set cash_income = actual_income where cash_income = 0 and actual_income > 0;

alter table public.daily_sales_reports
  add column net_income numeric(14, 2) generated always as (actual_income - safe_capital) stored;

comment on column public.daily_sales_reports.actual_income is 'Total uang = cash + QRIS + EDC (diisi otomatis oleh trigger).';
comment on column public.daily_sales_reports.net_income is 'Pendapatan bersih = total uang (cash + QRIS + EDC) - uang modal brankas.';

-- Total selalu konsisten dengan rinciannya, apa pun jalur penulisannya.
create or replace function public.compute_sales_report_total()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actual_income := coalesce(new.cash_income, 0) + coalesce(new.qris_income, 0) + coalesce(new.edc_income, 0);
  return new;
end;
$$;

create trigger compute_sales_report_total
  before insert or update on public.daily_sales_reports
  for each row execute function public.compute_sales_report_total();

-- ---------------------------------------------------------------------------
-- RPC baru: submit_sales_report(cash, qris, edc, modal, catatan, items)
-- ---------------------------------------------------------------------------
create or replace function public.submit_sales_report(
  p_cash_income numeric,
  p_qris_income numeric,
  p_edc_income numeric,
  p_safe_capital numeric,
  p_notes text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile    public.profiles;
  v_today      date := public.jakarta_today();
  v_report     public.daily_sales_reports;
  v_input      jsonb := '{}'::jsonb;
  v_item       jsonb;
  v_key        text;
  v_product    public.sales_products;
  v_product_id uuid;
  v_qty        integer;
  v_notes      text := nullif(left(btrim(coalesce(p_notes, '')), 1000), '');
begin
  v_profile := public.require_active_profile();

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
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Format rincian produk tidak valid.' using errcode = '22023';
  end if;

  -- Normalisasi input: gabungkan product_id yang sama.
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_product_id := (v_item ->> 'product_id')::uuid;
      v_qty := coalesce((v_item ->> 'quantity')::integer, 0);
    exception when others then
      raise exception 'Data produk atau jumlah tidak valid.' using errcode = '22023';
    end;
    if v_product_id is null or v_qty < 0 or v_qty > 100000 then
      raise exception 'Jumlah produk harus antara 0 dan 100.000.' using errcode = '22023';
    end if;
    v_input := jsonb_set(
      v_input,
      array[v_product_id::text],
      to_jsonb(coalesce((v_input ->> v_product_id::text)::integer, 0) + v_qty)
    );
  end loop;

  select * into v_report
    from public.daily_sales_reports r
   where r.user_id = v_profile.id and r.report_date = v_today
   for update;

  if found then
    if v_report.status = 'verified' then
      raise exception 'Laporan hari ini sudah diverifikasi admin dan tidak dapat diubah.' using errcode = '42501';
    end if;

    update public.sales_report_items set quantity = 0 where report_id = v_report.id;

    update public.daily_sales_reports
       set cash_income  = p_cash_income,
           qris_income  = p_qris_income,
           edc_income   = p_edc_income,
           safe_capital = p_safe_capital,
           notes        = v_notes,
           submitted_at = now()
     where id = v_report.id
    returning * into v_report;
  else
    insert into public.daily_sales_reports
      (user_id, outlet_id, report_date, cash_income, qris_income, edc_income, actual_income, safe_capital, notes)
    values
      (v_profile.id, v_profile.outlet_id, v_today, p_cash_income, p_qris_income, p_edc_income,
       p_cash_income + p_qris_income + p_edc_income, p_safe_capital, v_notes)
    returning * into v_report;
  end if;

  for v_key in select jsonb_object_keys(v_input)
  loop
    v_qty := (v_input ->> v_key)::integer;
    continue when v_qty = 0;
    if v_qty > 100000 then
      raise exception 'Jumlah produk harus antara 0 dan 100.000.' using errcode = '22023';
    end if;

    select * into v_product
      from public.sales_products p
     where p.id = v_key::uuid
       and p.outlet_id = v_report.outlet_id
       and (
         p.is_active
         or exists (select 1 from public.sales_report_items i where i.report_id = v_report.id and i.product_id = p.id)
       );

    if not found then
      raise exception 'Produk tidak tersedia untuk loket Anda.' using errcode = '22023';
    end if;

    insert into public.sales_report_items (report_id, product_id, product_name, unit_price, quantity)
    values (v_report.id, v_product.id, v_product.name, v_product.price, v_qty)
    on conflict (report_id, product_id)
      do update set quantity = excluded.quantity;
  end loop;

  update public.daily_sales_reports r
     set estimated_total = coalesce(t.total, 0),
         total_items = coalesce(t.cnt, 0)
    from (
      select sum(i.subtotal) as total, sum(i.quantity)::integer as cnt
        from public.sales_report_items i
       where i.report_id = v_report.id
    ) t
   where r.id = v_report.id;

  return v_report.id;
end;
$$;

revoke all on function public.submit_sales_report(numeric, numeric, numeric, numeric, text, jsonb) from public, anon;
grant execute on function public.submit_sales_report(numeric, numeric, numeric, numeric, text, jsonb) to authenticated;

-- Versi lama (4 parameter) dinonaktifkan tanpa DROP: selalu menolak & tidak bisa dipanggil.
create or replace function public.submit_sales_report(
  p_actual_income numeric,
  p_safe_capital numeric,
  p_notes text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Versi aplikasi lama. Muat ulang halaman untuk mengisi uang Cash, QRIS, dan EDC.' using errcode = '0A000';
end;
$$;
revoke all on function public.submit_sales_report(numeric, numeric, text, jsonb) from public, anon, authenticated;
revoke all on function public.compute_sales_report_total() from public, anon, authenticated;
