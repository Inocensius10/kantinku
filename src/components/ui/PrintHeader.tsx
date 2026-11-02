import { formatDateTime } from '@/lib/format';

/** Kop laporan — hanya tampil saat dicetak. */
export function PrintHeader({ title, lines = [] }: { title: string; lines?: string[] }) {
  return (
    <div className="mb-4 hidden border-b-2 border-black pb-3 print:block">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[15pt] font-extrabold">Kantinku by Inosensius</p>
          <p className="text-[12pt] font-bold">{title}</p>
          {lines.map((l) => (
            <p key={l} className="text-[10pt]">
              {l}
            </p>
          ))}
        </div>
        <p className="text-[9pt]">Dicetak: {formatDateTime(new Date().toISOString())}</p>
      </div>
    </div>
  );
}
