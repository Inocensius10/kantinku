# Kantinku by Inosensius

Aplikasi internal untuk mengelola **absensi karyawan (GPS)**, **laporan penjualan harian**, **uang modal brankas**, dan **laporan kekurangan bahan baku** pada beberapa loket kantin.

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, React Router, Lucide React, Recharts
- **Backend:** Supabase (Auth, PostgreSQL, Storage, Row Level Security)

---

## Fitur

| Karyawan | Admin |
|---|---|
| Registrasi (role otomatis `employee`, status `pending`) & login | Dashboard dengan filter loket & tanggal |
| Dashboard pribadi + grafik 7 hari | Statistik karyawan aktif, hadir, belum absen, pemasukan, produk terjual, stok terbuka |
| Absen masuk/pulang berbasis GPS (validasi di database) | Grafik pemasukan harian, per produk, antar-loket, tren mingguan |
| Riwayat absensi (filter tanggal/bulan/tahun) + cetak | Setujui/tolak registrasi, aktif/nonaktifkan akun, ubah loket |
| Laporan penjualan harian (produk dari DB, snapshot harga) | Riwayat absensi & penjualan per karyawan |
| Uang cash, QRIS, EDC & uang modal brankas → pendapatan bersih otomatis | Verifikasi laporan penjualan (laporan terkunci setelah diverifikasi) |
| Laporan kekurangan bahan baku + urgensi | Tindak lanjut laporan stok (Baru → Sedang Ditangani → Selesai), laporan darurat ditonjolkan |
| Profil, foto, email, password | Kelola loket, produk (harga & urutan), bahan baku, lokasi absensi |
| | Cetak laporan absensi, penjualan, stok (A4) |

---

## Struktur proyek

```text
src/
├── components/        # UI reusable (ui/, charts/, layout/, admin/)
├── contexts/          # AuthContext, ToastContext
├── hooks/             # useAsync, useOutlets, useAvatarUrls
├── layouts/           # AppLayout (sidebar desktop + bottom nav mobile), AuthLayout
├── lib/               # supabase client, format tanggal/rupiah, geo (Haversine), image, errors
├── pages/
│   ├── auth/          # Welcome, Login, Register, AccountStatus, ResetPassword
│   ├── employee/      # Home, Absensi, Grafik (penjualan), Stock
│   ├── admin/         # Dashboard, Karyawan, Penjualan, Stok, Cetak Laporan, Loket, Produk, Bahan Baku, Pengaturan
│   └── shared/        # Profil, 404
├── routes/            # AppRoutes + guard role/status
├── services/          # Akses data Supabase per domain
├── styles/            # Tailwind + gaya cetak A4
└── types/
supabase/
├── migrations/        # SQL migration lengkap (urut berdasarkan nama file)
└── functions/         # (cadangan untuk Edge Functions; saat ini tidak dibutuhkan)
```

---

## 1. Instalasi lokal

Prasyarat: Node.js 20+.

```bash
npm install
cp .env.example .env      # lalu isi nilainya
npm run dev               # http://localhost:5173
```

Isi `.env`:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...   # atau legacy anon key
```

> ⚠️ **Jangan pernah** memasukkan `service_role` / secret key ke file `.env` frontend. Semua keamanan ditegakkan oleh RLS & fungsi database.

Perintah lain: `npm run build` (typecheck + build produksi), `npm run preview`.

---

## 2. Konfigurasi Supabase

### a. Database
Project `wvhqhkxkpnndekyucyom` **sudah** berisi seluruh migration. Untuk project Supabase baru, jalankan file di `supabase/migrations/` **berurutan** lewat SQL Editor, atau dengan Supabase CLI:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

| File | Isi |
|---|---|
| `…000100_drop_legacy_schema.sql` | Membersihkan skema aplikasi lama (aman dijalankan di DB kosong) |
| `…000200_core_schema.sql` | Enum, 10 tabel, index, unique constraint, trigger `updated_at` |
| `…000300_auth_functions_triggers.sql` | `is_admin()`, trigger profil saat registrasi, proteksi kolom role/status/loket, audit status |
| `…000400_business_rpc.sql` | RPC `check_in`, `check_out`, `submit_sales_report`, `create_stock_shortage_report` |
| `…000500_rls_policies.sql` | RLS semua tabel + pembatasan hak eksekusi fungsi |
| `…000600_storage_avatars.sql` | Bucket privat `avatars` + policy |
| `…000700_seed_data.sql` | Loket Dimsum/Aneka Nasi/Jus, titik absensi, contoh bahan baku |
| `…000800_sales_payment_methods.sql` | Kolom uang Cash/QRIS/EDC, `net_income` = (cash + QRIS + EDC) − modal brankas, RPC `submit_sales_report` versi baru |

### b. Authentication → URL Configuration
- **Site URL**: URL produksi Anda (mis. `https://kantinku.vercel.app`)
- **Redirect URLs**: tambahkan `http://localhost:5173/**` dan `https://<domain-produksi>/**`

Ini diperlukan untuk link verifikasi email, ganti email, dan reset password.

### c. Authentication → Email
- *Confirm email* aktif secara default: karyawan harus klik link verifikasi sebelum login. Foto profil yang dipilih saat registrasi diunggah otomatis saat login pertama.
- SMTP bawaan Supabase dibatasi beberapa email per jam. Untuk pemakaian harian, pasang **Custom SMTP** (Authentication → Emails → SMTP Settings).

---

## 3. Membuat admin pertama

Role admin **tidak dapat** dipilih saat registrasi. Caranya:

1. Buka aplikasi → **Buat Akun Baru**, daftar dengan email admin (pilih loket mana saja), lalu verifikasi email.
2. Di Supabase Dashboard → **SQL Editor**, jalankan:

   ```sql
   update public.profiles
      set role = 'admin', status = 'active', outlet_id = null
    where email = 'email-admin@contoh.com';
   ```
3. Login ulang. Anda akan diarahkan ke `/admin`.

Admin berikutnya dapat dibuat dengan cara yang sama. Admin tidak dapat mengubah role/status akunnya sendiri dari aplikasi (mencegah terkunci tanpa admin).

---

## 4. Keamanan (ringkas)

- **RLS aktif di semua tabel.** Karyawan hanya membaca data miliknya; admin (`is_admin()`, `SECURITY DEFINER`, tanpa rekursi RLS) membaca semua.
- **Karyawan tidak bisa menulis langsung** ke `attendance`, `daily_sales_reports`, `stock_shortage_reports`. Semua lewat RPC yang memvalidasi status akun, loket, kepemilikan, duplikasi, dan memakai `now()` server.
- **Absensi**: jarak dihitung dengan Haversine di database terhadap `app_settings`; akurasi GPS buruk ditolak; unique `(user_id, work_date)` mencegah duplikasi; zona waktu `Asia/Jakarta`.
- **Profil**: trigger `protect_profile_fields` menolak perubahan role/status/loket/email oleh non-admin.
- **Laporan penjualan**: satu per karyawan per hari, bisa diedit sampai diverifikasi; harga disimpan sebagai snapshot. Total uang (`actual_income`) dihitung trigger dari cash + QRIS + EDC, pendapatan bersih (`net_income`) = total − modal brankas (kolom generated).
- **Data historis**: FK `ON DELETE RESTRICT` — loket/produk/bahan baku dinonaktifkan, bukan dihapus.
- **Storage**: bucket `avatars` privat, path `{user_id}/avatar.jpg`, hanya pemilik yang bisa menulis; pemilik & admin bisa membaca (signed URL).

> Catatan: GPS browser dapat dipalsukan dengan aplikasi *mock location*. Validasi server memastikan koordinat yang dikirim berada dalam radius, tetapi tidak dapat membuktikan perangkat benar-benar berada di sana.

---

## 5. Deployment

Geolocation browser **hanya bekerja di HTTPS** (atau `localhost`).

**Vercel** (sudah ada `vercel.json` untuk SPA rewrite):
1. Import repo di Vercel, framework **Vite**.
2. Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Deploy, lalu tambahkan domain ke *Redirect URLs* Supabase.

**Netlify**: build `npm run build`, publish `dist`. File `public/_redirects` sudah menangani SPA routing.

---

## 6. Checklist uji manual

- [ ] Registrasi karyawan → status "Menunggu persetujuan".
- [ ] Admin menyetujui → karyawan masuk ke `/app`.
- [ ] Karyawan membuka `/admin` → dialihkan ke `/app`.
- [ ] Absen di luar radius 100 m → ditolak dengan info jarak.
- [ ] Absen masuk dua kali → ditolak; absen pulang sebelum masuk → ditolak.
- [ ] Admin menambah produk → muncul di form karyawan loket tersebut.
- [ ] Kirim laporan penjualan, edit, lalu admin verifikasi → laporan terkunci.
- [ ] Laporan stok "Darurat" → tampil menonjol di dashboard & halaman Stok admin.
- [ ] Filter loket di dashboard mengubah semua statistik & tabel.
- [ ] Cetak laporan (Ctrl/Cmd + P) dalam format A4.
