import type { ReactNode } from 'react';
import type { AccountStatus, SalesReportStatus, ShortageStatus, UrgencyLevel } from '@/types';

type Tone = 'neutral' | 'brand' | 'success' | 'danger' | 'warning';

const tones: Record<Tone, string> = {
  neutral: 'bg-cream-light text-ink-soft border-line',
  brand: 'bg-cream text-brand-dark border-brand/20',
  success: 'bg-success/10 text-success border-success/25',
  danger: 'bg-danger/10 text-danger border-danger/25',
  warning: 'bg-warning/10 text-[#8a5d0c] border-warning/30',
};

export function Badge({ tone = 'neutral', children, className = '' }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export const ACCOUNT_STATUS_LABEL: Record<AccountStatus, string> = {
  pending: 'Menunggu',
  active: 'Aktif',
  inactive: 'Nonaktif',
  rejected: 'Ditolak',
};
export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  const tone: Record<AccountStatus, Tone> = { pending: 'warning', active: 'success', inactive: 'neutral', rejected: 'danger' };
  return <Badge tone={tone[status]}>{ACCOUNT_STATUS_LABEL[status]}</Badge>;
}

export const URGENCY_LABEL: Record<UrgencyLevel, string> = {
  normal: 'Normal',
  urgent: 'Perlu Segera Dibeli',
  emergency: 'Darurat',
};
export function UrgencyBadge({ urgency }: { urgency: UrgencyLevel }) {
  const tone: Record<UrgencyLevel, Tone> = { normal: 'neutral', urgent: 'warning', emergency: 'danger' };
  return <Badge tone={tone[urgency]}>{URGENCY_LABEL[urgency]}</Badge>;
}

export const SHORTAGE_STATUS_LABEL: Record<ShortageStatus, string> = {
  new: 'Baru',
  in_progress: 'Sedang Ditangani',
  done: 'Selesai',
};
export function ShortageStatusBadge({ status }: { status: ShortageStatus }) {
  const tone: Record<ShortageStatus, Tone> = { new: 'brand', in_progress: 'warning', done: 'success' };
  return <Badge tone={tone[status]}>{SHORTAGE_STATUS_LABEL[status]}</Badge>;
}

export const SALES_STATUS_LABEL: Record<SalesReportStatus, string> = {
  submitted: 'Menunggu Verifikasi',
  verified: 'Terverifikasi',
};
export function SalesStatusBadge({ status }: { status: SalesReportStatus | null | undefined }) {
  if (!status) return <Badge tone="neutral">Belum Lapor</Badge>;
  return <Badge tone={status === 'verified' ? 'success' : 'warning'}>{SALES_STATUS_LABEL[status]}</Badge>;
}
