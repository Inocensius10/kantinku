export const TIMEZONE = 'Asia/Jakarta';

const rupiahFmt = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});
const numberFmt = new Intl.NumberFormat('id-ID');

export function formatRupiah(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return rupiahFmt.format(Number.isFinite(n) ? n : 0);
}

export function formatCompactRupiah(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `Rp${(value / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
  if (Math.abs(value) >= 1_000) return `Rp${(value / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} rb`;
  return `Rp${value}`;
}

export function formatNumber(value: number | string | null | undefined): string {
  return numberFmt.format(Number(value ?? 0));
}

/** YYYY-MM-DD untuk tanggal hari ini (atau `date`) di zona Asia/Jakarta */
export function jakartaDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Tambah/kurangi hari pada string YYYY-MM-DD */
export function shiftDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** Senin pada minggu yang sama dengan isoDate */
export function startOfWeek(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Minggu
  const diff = dow === 0 ? -6 : 1 - dow;
  return shiftDate(isoDate, diff);
}

export function startOfMonth(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`;
}

export function endOfMonth(isoDate: string): string {
  const [y, m] = isoDate.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${isoDate.slice(0, 7)}-${String(last).padStart(2, '0')}`;
}

export function dateRangeList(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  let guard = 0;
  while (cur <= to && guard < 400) {
    out.push(cur);
    cur = shiftDate(cur, 1);
    guard++;
  }
  return out;
}

/** "Senin, 3 November 2026" dari YYYY-MM-DD */
export function formatDateLong(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** "3 Nov 2026" dari YYYY-MM-DD */
export function formatDateShort(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** "Sen 3/11" untuk sumbu grafik */
export function formatDateAxis(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const wd = new Intl.DateTimeFormat('id-ID', { weekday: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
  return `${wd} ${d}/${m}`;
}

/** Jam "07:45" dari timestamp, zona Asia/Jakarta */
export function formatTime(ts: string | null | undefined): string {
  if (!ts) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(new Date(ts))
    .replace('.', ':');
}

export function formatDateTime(ts: string | null | undefined): string {
  if (!ts) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(ts));
}

export function calculateAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const today = jakartaDate();
  const [ty, tm, td] = today.split('-').map(Number);
  const [by, bm, bd] = birthDate.split('-').map(Number);
  if (!by) return null;
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age--;
  return age >= 0 ? age : null;
}

export function formatDistance(m: number | null | undefined): string {
  if (m === null || m === undefined) return '—';
  const n = Number(m);
  if (n >= 1000) return `${(n / 1000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} km`;
  return `${Math.round(n)} m`;
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export const MONTHS_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];
