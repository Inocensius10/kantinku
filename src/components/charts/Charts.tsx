import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCompactRupiah, formatNumber, formatRupiah } from '@/lib/format';

export const CHART_COLORS = ['#A94722', '#477B54', '#C98A1B', '#783319', '#C96A3B', '#6F5A4E', '#3E6E8E'];

const axisProps = {
  tick: { fill: '#6F5A4E', fontSize: 11 },
  axisLine: false,
  tickLine: false,
} as const;

function RupiahTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-ink">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-ink-soft">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold tabular-nums text-ink">{formatRupiah(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

function CountTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-ink">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-ink-soft">
          {p.name}: <span className="font-semibold tabular-nums text-ink">{formatNumber(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

/** Area chart pemasukan harian. data: [{label, value}] */
export function IncomeAreaChart({ data, height = 240, name = 'Pendapatan bersih' }: { data: Array<{ label: string; value: number }>; height?: number; name?: string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A94722" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#A94722" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#EAD8C6" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
        <YAxis {...axisProps} width={62} tickFormatter={(v: number) => formatCompactRupiah(v)} />
        <Tooltip content={<RupiahTooltip />} />
        <Area type="monotone" dataKey="value" name={name} stroke="#A94722" strokeWidth={2.5} fill="url(#incomeFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Bar horizontal jumlah terjual per produk. */
export function ProductBarChart({ data, height }: { data: Array<{ name: string; quantity: number }>; height?: number }) {
  const h = height ?? Math.max(180, data.length * 36 + 30);
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
        <CartesianGrid stroke="#EAD8C6" strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" {...axisProps} allowDecimals={false} />
        <YAxis type="category" dataKey="name" {...axisProps} width={110} />
        <Tooltip content={<CountTooltip />} cursor={{ fill: '#F8EBDD' }} />
        <Bar dataKey="quantity" name="Terjual" fill="#C96A3B" radius={[0, 6, 6, 0]} barSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Bar pemasukan per loket. */
export function OutletBarChart({ data, height = 240 }: { data: Array<{ name: string; income: number }>; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#EAD8C6" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" {...axisProps} />
        <YAxis {...axisProps} width={62} tickFormatter={(v: number) => formatCompactRupiah(v)} />
        <Tooltip content={<RupiahTooltip />} cursor={{ fill: '#F8EBDD' }} />
        <Bar dataKey="income" name="Pendapatan bersih" fill="#A94722" radius={[6, 6, 0, 0]} barSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Garis tren mingguan, satu garis per seri. data: [{label, [series]: number}] */
export function TrendLineChart({
  data,
  series,
  height = 260,
}: {
  data: Array<Record<string, number | string>>;
  series: string[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#EAD8C6" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} width={62} tickFormatter={(v: number) => formatCompactRupiah(v)} />
        <Tooltip content={<RupiahTooltip />} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />}
        {series.map((s, i) => (
          <Line
            key={s}
            type="monotone"
            dataKey={s}
            name={s}
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
