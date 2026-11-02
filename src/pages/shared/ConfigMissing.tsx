export function ConfigMissing() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-cream-light p-6">
      <div className="card max-w-lg p-6">
        <h1 className="text-lg font-bold text-ink">Konfigurasi Supabase belum diisi</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Salin file <code className="rounded bg-cream px-1">.env.example</code> menjadi{' '}
          <code className="rounded bg-cream px-1">.env</code>, isi <code>VITE_SUPABASE_URL</code> dan{' '}
          <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>, lalu jalankan ulang <code>npm run dev</code>.
        </p>
      </div>
    </div>
  );
}
