import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-cream-light p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cream text-brand">
        <Compass className="h-7 w-7" />
      </div>
      <h1 className="text-2xl font-extrabold text-ink">Halaman tidak ditemukan</h1>
      <p className="text-sm text-ink-soft">Alamat yang Anda buka tidak tersedia.</p>
      <Link to="/" className="mt-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-cream hover:bg-brand-dark">
        Kembali ke beranda
      </Link>
    </div>
  );
}
