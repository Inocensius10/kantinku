-- Kantinku by Inosensius
-- 0007: Data awal (loket, pengaturan lokasi absensi, daftar bahan baku contoh).
-- Produk penjualan TIDAK di-seed karena harga harus ditentukan admin.

insert into public.outlets (name, description, sort_order) values
  ('Dimsum', 'Loket dimsum', 1),
  ('Aneka Nasi', 'Loket aneka nasi', 2),
  ('Jus', 'Loket jus dan minuman', 3)
on conflict do nothing;

insert into public.app_settings (attendance_latitude, attendance_longitude, attendance_radius_m, max_gps_accuracy_m, timezone)
values (-6.302007, 106.683086, 100, 100, 'Asia/Jakarta')
on conflict (singleton) do nothing;

-- Bahan baku contoh. outlet_id NULL = tersedia untuk semua loket.
insert into public.inventory_items (name, category, unit, outlet_id, sort_order)
select v.name, v.category, v.unit, o.id, v.sort_order
from (values
  ('Ayam',            'Protein',  'kg',     null,         1),
  ('Udang',           'Protein',  'kg',     'Dimsum',     2),
  ('Tepung',          'Bahan Kering', 'kg', 'Dimsum',     3),
  ('Kulit dimsum',    'Bahan Kering', 'pack', 'Dimsum',   4),
  ('Minyak goreng',   'Bahan Masak', 'liter', null,       5),
  ('Beras',           'Bahan Kering', 'kg', 'Aneka Nasi', 6),
  ('Sayuran',         'Sayur & Buah', 'kg', null,         7),
  ('Gula',            'Bahan Kering', 'kg', null,         8),
  ('Susu',            'Minuman',  'liter',  'Jus',        9),
  ('Buah-buahan',     'Sayur & Buah', 'kg', 'Jus',        10),
  ('Saus',            'Bumbu',    'botol',  null,         11),
  ('Gas LPG',         'Operasional', 'tabung', null,      12),
  ('Kemasan makanan', 'Operasional', 'pack', null,        13)
) as v(name, category, unit, outlet_name, sort_order)
left join public.outlets o on o.name = v.outlet_name
on conflict do nothing;
