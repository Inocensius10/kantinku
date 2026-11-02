-- Kantinku by Inosensius
-- 0004: RPC bisnis (absensi GPS, laporan penjualan, laporan kekurangan stok).
-- Semua penulisan data operasional karyawan HANYA lewat fungsi ini sehingga
-- validasi (lokasi, kepemilikan, duplikasi, waktu server) terjadi di database.

-- ---------------------------------------------------------------------------
-- Helper: profil aktif milik pemanggil (raise jika tidak valid).
-- ---------------------------------------------------------------------------
create or replace function public.require_active_profile()
returns public.profiles
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
begin
  if (select auth.uid()) is null then
    raise exception 'Sesi login tidak ditemukan. Silakan login kembali.' using errcode = '28000';
  end if;

  select * into v_profile from public.profiles where id = (select auth.uid());

  if not found then
    raise exception 'Profil tidak ditemukan.' using errcode = 'P0002';
  end if;
  if v_profile.status <> 'active' then
    raise exception 'Akun Anda belum aktif. Hubungi admin untuk persetujuan.' using errcode = '42501';
  end if;
  if v_profile.outlet_id is null then
    raise exception 'Anda belum ditempatkan di loket mana pun. Hubungi admin.' using errcode = '42501';
  end if;

  return v_profile;
end;
$$;

-- ---------------------------------------------------------------------------
-- Absensi: validasi bersama untuk masuk & pulang.
-- Mengembalikan jsonb {success, code, message, distance_m, accuracy_m, radius_m}
-- ---------------------------------------------------------------------------
create or replace function public.validate_attendance_location(
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy double precision
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_settings public.app_settings;
  v_distance double precision;
begin
  select * into v_settings from public.app_settings limit 1;
  if not found then
    raise exception 'Pengaturan lokasi absensi belum dibuat. Hubungi admin.';
  end if;

  if p_latitude is null or p_longitude is null
     or p_latitude not between -90 and 90
     or p_longitude not between -180 and 180 then
    return jsonb_build_object(
      'success', false,
      'code', 'INVALID_LOCATION',
      'message', 'Koordinat lokasi tidak valid. Aktifkan GPS lalu coba lagi.'
    );
  end if;

  if p_accuracy is null or p_accuracy <= 0 or p_accuracy > v_settings.max_gps_accuracy_m then
    return jsonb_build_object(
      'success', false,
      'code', 'LOW_ACCURACY',
      'message', format(
        'Akurasi GPS kurang baik (±%s m, maksimal %s m). Pindah ke area terbuka lalu coba lagi.',
        coalesce(round(p_accuracy::numeric)::text, '?'), v_settings.max_gps_accuracy_m
      ),
      'accuracy_m', round(coalesce(p_accuracy, 0)::numeric, 1),
      'max_accuracy_m', v_settings.max_gps_accuracy_m
    );
  end if;

  v_distance := public.haversine_m(
    p_latitude, p_longitude,
    v_settings.attendance_latitude, v_settings.attendance_longitude
  );

  if v_distance > v_settings.attendance_radius_m then
    return jsonb_build_object(
      'success', false,
      'code', 'OUT_OF_RANGE',
      'message', format(
        'Anda berada %s m dari lokasi kantin. Absensi hanya bisa dilakukan dalam radius %s m.',
        round(v_distance::numeric), v_settings.attendance_radius_m
      ),
      'distance_m', round(v_distance::numeric, 1),
      'accuracy_m', round(p_accuracy::numeric, 1),
      'radius_m', v_settings.attendance_radius_m
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'code', 'OK',
    'distance_m', round(v_distance::numeric, 1),
    'accuracy_m', round(p_accuracy::numeric, 1),
    'radius_m', v_settings.attendance_radius_m
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Absen masuk
-- ---------------------------------------------------------------------------
create or replace function public.check_in(
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy double precision
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
  v_check   jsonb;
  v_today   date := public.jakarta_today();
  v_row     public.attendance;
begin
  v_profile := public.require_active_profile();

  if exists (select 1 from public.attendance a where a.user_id = v_profile.id and a.work_date = v_today) then
    return jsonb_build_object(
      'success', false,
      'code', 'ALREADY_CHECKED_IN',
      'message', 'Anda sudah melakukan absen masuk hari ini.'
    );
  end if;

  v_check := public.validate_attendance_location(p_latitude, p_longitude, p_accuracy);
  if not (v_check ->> 'success')::boolean then
    return v_check;
  end if;

  insert into public.attendance (
    user_id, outlet_id, work_date, check_in_at,
    check_in_latitude, check_in_longitude, check_in_accuracy_m, check_in_distance_m
  )
  values (
    v_profile.id, v_profile.outlet_id, v_today, now(),
    p_latitude, p_longitude, round(p_accuracy::numeric, 2), (v_check ->> 'distance_m')::numeric
  )
  on conflict (user_id, work_date) do nothing
  returning * into v_row;

  if v_row.id is null then
    return jsonb_build_object(
      'success', false,
      'code', 'ALREADY_CHECKED_IN',
      'message', 'Anda sudah melakukan absen masuk hari ini.'
    );
  end if;

  return v_check || jsonb_build_object(
    'message', format('Absen masuk berhasil. Jarak Anda %s m dari lokasi kantin.', round((v_check ->> 'distance_m')::numeric)),
    'record', to_jsonb(v_row)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Absen pulang
-- ---------------------------------------------------------------------------
create or replace function public.check_out(
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy double precision
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
  v_check   jsonb;
  v_row     public.attendance;
begin
  v_profile := public.require_active_profile();

  select * into v_row
    from public.attendance a
   where a.user_id = v_profile.id and a.work_date = public.jakarta_today()
   for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'code', 'NOT_CHECKED_IN',
      'message', 'Anda belum absen masuk hari ini.'
    );
  end if;

  if v_row.check_out_at is not null then
    return jsonb_build_object(
      'success', false,
      'code', 'ALREADY_CHECKED_OUT',
      'message', 'Anda sudah melakukan absen pulang hari ini.'
    );
  end if;

  v_check := public.validate_attendance_location(p_latitude, p_longitude, p_accuracy);
  if not (v_check ->> 'success')::boolean then
    return v_check;
  end if;

  update public.attendance
     set check_out_at = now(),
         check_out_latitude = p_latitude,
         check_out_longitude = p_longitude,
         check_out_accuracy_m = round(p_accuracy::numeric, 2),
         check_out_distance_m = (v_check ->> 'distance_m')::numeric
   where id = v_row.id
  returning * into v_row;

  return v_check || jsonb_build_object(
    'message', format('Absen pulang berhasil. Jarak Anda %s m dari lokasi kantin.', round((v_check ->> 'distance_m')::numeric)),
    'record', to_jsonb(v_row)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Laporan penjualan harian (transaksional, satu per karyawan per hari).
-- p_items: [{"product_id": "<uuid>", "quantity": 3}, ...]
-- Bisa dikirim ulang (edit) selama belum diverifikasi admin.
-- Harga & nama produk disimpan sebagai snapshot. Saat edit, baris lama
-- dipertahankan (quantity di-reset lalu di-upsert) sehingga snapshot harga
-- lama tetap berlaku; baris quantity 0 diabaikan dalam perhitungan.
-- ---------------------------------------------------------------------------
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
begin
  v_profile := public.require_active_profile();

  if p_actual_income is null or p_actual_income < 0 then
    raise exception 'Total pemasukan aktual wajib diisi dan tidak boleh negatif.' using errcode = '22023';
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
       set actual_income = p_actual_income,
           safe_capital  = p_safe_capital,
           notes         = nullif(left(btrim(coalesce(p_notes, '')), 1000), ''),
           submitted_at  = now()
     where id = v_report.id
    returning * into v_report;
  else
    insert into public.daily_sales_reports (user_id, outlet_id, report_date, actual_income, safe_capital, notes)
    values (v_profile.id, v_profile.outlet_id, v_today, p_actual_income, p_safe_capital,
            nullif(left(btrim(coalesce(p_notes, '')), 1000), ''))
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

-- ---------------------------------------------------------------------------
-- Laporan kekurangan bahan baku (transaksional).
-- p_items: [{"inventory_item_id": "<uuid>", "quantity_needed": 2, "description": "..."}]
-- ---------------------------------------------------------------------------
create or replace function public.create_stock_shortage_report(
  p_urgency public.urgency_level,
  p_notes text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile   public.profiles;
  v_report_id uuid;
  v_item      jsonb;
  v_inv       public.inventory_items;
  v_inv_id    uuid;
  v_qty       numeric(12, 2);
  v_desc      text;
begin
  v_profile := public.require_active_profile();

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Pilih minimal satu bahan baku.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 100 then
    raise exception 'Terlalu banyak bahan baku dalam satu laporan.' using errcode = '22023';
  end if;

  insert into public.stock_shortage_reports (user_id, outlet_id, urgency, notes)
  values (
    v_profile.id,
    v_profile.outlet_id,
    coalesce(p_urgency, 'normal'),
    nullif(left(btrim(coalesce(p_notes, '')), 1000), '')
  )
  returning id into v_report_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_inv_id := (v_item ->> 'inventory_item_id')::uuid;
      v_qty := nullif(v_item ->> 'quantity_needed', '')::numeric;
    exception when others then
      raise exception 'Data bahan baku tidak valid.' using errcode = '22023';
    end;

    if v_qty is not null and v_qty <= 0 then
      raise exception 'Jumlah kebutuhan harus lebih dari 0.' using errcode = '22023';
    end if;

    v_desc := nullif(left(btrim(coalesce(v_item ->> 'description', '')), 500), '');

    select * into v_inv
      from public.inventory_items i
     where i.id = v_inv_id
       and i.is_active
       and (i.outlet_id is null or i.outlet_id = v_profile.outlet_id);

    if not found then
      raise exception 'Bahan baku tidak tersedia untuk loket Anda.' using errcode = '22023';
    end if;

    insert into public.stock_shortage_items (report_id, inventory_item_id, item_name, unit, quantity_needed, description)
    values (v_report_id, v_inv.id, v_inv.name, v_inv.unit, v_qty, v_desc)
    on conflict (report_id, inventory_item_id) do nothing;
  end loop;

  return v_report_id;
end;
$$;
