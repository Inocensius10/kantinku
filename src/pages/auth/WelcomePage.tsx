import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarCheck, ClipboardList, Wallet } from 'lucide-react';
import { BrandMark } from '@/components/layout/Brand';

export default function WelcomePage() {
  const navigate = useNavigate();
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-brand text-cream">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-accent/40 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-brand-dark/60 blur-2xl" />

      <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-12 sm:px-10">
        <div className="animate-slide-up">
          <BrandMark tone="cream" className="h-16 w-16 rounded-3xl" />
          <h1 className="mt-8 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Selamat datang di <span className="text-white">Kantinku</span> by Inosensius
          </h1>
          <p className="mt-4 max-w-xl text-base text-cream/85 sm:text-lg">
            Satu tempat untuk mengelola absensi dan aktivitas operasional kantin dengan lebih mudah.
          </p>

          <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
            {[
              { icon: CalendarCheck, text: 'Absensi berbasis GPS' },
              { icon: Wallet, text: 'Laporan penjualan harian' },
              { icon: ClipboardList, text: 'Laporan kekurangan stok' },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-sm font-medium">
                <f.icon className="h-5 w-5 shrink-0" />
                {f.text}
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/login')}
            className="mt-10 inline-flex h-13 items-center gap-2 rounded-2xl bg-cream px-8 py-3.5 text-base font-bold tracking-wide text-brand-dark shadow-lg transition hover:bg-white active:scale-[0.98]"
          >
            NEXT <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
      <p className="relative pb-6 text-center text-xs text-cream/60">© {new Date().getFullYear()} Kantinku by Inosensius</p>
    </div>
  );
}
