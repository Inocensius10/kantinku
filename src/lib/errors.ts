/** Ubah error Supabase/JS menjadi pesan Bahasa Indonesia yang ramah pengguna. */
export function toMessage(err: unknown): string {
  if (!err) return 'Terjadi kesalahan.';
  const e = err as { message?: string; code?: string; status?: number };
  const msg = e.message ?? String(err);

  const map: Array<[RegExp, string]> = [
    [/invalid login credentials/i, 'Email atau password salah.'],
    [/email not confirmed/i, 'Email belum diverifikasi. Cek kotak masuk email Anda.'],
    [/user already registered/i, 'Email sudah terdaftar. Silakan login.'],
    [/password should be at least/i, 'Password minimal 6 karakter.'],
    [/rate limit|too many requests/i, 'Terlalu banyak percobaan. Tunggu beberapa saat lalu coba lagi.'],
    [/failed to fetch|network/i, 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.'],
    [/jwt expired|invalid jwt/i, 'Sesi berakhir. Silakan login kembali.'],
    [/duplicate key value.*outlets_name/i, 'Nama loket sudah digunakan.'],
    [/duplicate key value.*sales_products_outlet_name/i, 'Produk dengan nama itu sudah ada di loket ini.'],
    [/duplicate key value.*inventory_items_name_outlet/i, 'Bahan baku dengan nama itu sudah ada.'],
    [/row-level security|permission denied/i, 'Anda tidak memiliki izin untuk melakukan aksi ini.'],
    [/new email address should be different/i, 'Email baru harus berbeda dari email saat ini.'],
    [/same.*password|new password should be different/i, 'Password baru harus berbeda dari password lama.'],
  ];
  for (const [re, text] of map) if (re.test(msg)) return text;
  return msg;
}
