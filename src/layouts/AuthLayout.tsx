import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark, BrandName } from '@/components/layout/Brand';

export function AuthLayout({ title, subtitle, children, wide = false }: { title: string; subtitle?: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className="flex min-h-dvh bg-cream-light">
      <div className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-brand p-10 text-cream lg:flex">
        <div className="pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-brand-accent/40 blur-2xl" />
        <Link to="/" className="relative flex items-center gap-3">
          <BrandMark tone="cream" />
          <BrandName light />
        </Link>
        <div className="relative">
          <h2 className="text-3xl font-extrabold leading-tight">Operasional kantin yang rapi, setiap hari.</h2>
          <p className="mt-3 text-cream/80">Absensi, penjualan, uang modal, dan stok — tercatat dalam satu aplikasi.</p>
        </div>
        <p className="relative text-xs text-cream/60">© {new Date().getFullYear()} Kantinku by Inosensius</p>
      </div>

      <div className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:px-6">
        <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} animate-slide-up`}>
          <Link to="/" className="mb-6 flex items-center gap-3 lg:hidden">
            <BrandMark />
            <BrandName />
          </Link>
          <div className="card p-6 sm:p-8">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
