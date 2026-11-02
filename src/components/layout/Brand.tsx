import { UtensilsCrossed } from 'lucide-react';

export function BrandMark({ className = 'h-10 w-10', tone = 'brand' }: { className?: string; tone?: 'brand' | 'cream' }) {
  return (
    <div
      className={`flex items-center justify-center rounded-2xl ${tone === 'brand' ? 'bg-brand text-cream' : 'bg-cream text-brand'} ${className}`}
    >
      <UtensilsCrossed className="h-1/2 w-1/2" strokeWidth={2.2} />
    </div>
  );
}

export function BrandName({ light = false }: { light?: boolean }) {
  return (
    <div className="leading-tight">
      <p className={`text-base font-extrabold tracking-tight ${light ? 'text-cream' : 'text-ink'}`}>Kantinku</p>
      <p className={`text-[11px] font-medium ${light ? 'text-cream/75' : 'text-ink-soft'}`}>by Inosensius</p>
    </div>
  );
}
