import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { brl, median } from '../lib/format';

const axisDate = (ms) => new Date(ms).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
const tooltipDate = (ms) =>
  new Date(ms).toLocaleString('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-lg">
      <p className="tnum font-semibold">{brl(p.price)}</p>
      <p className="text-xs text-muted">{tooltipDate(p.t)}</p>
    </div>
  );
}

// Menor preço encontrado em cada varredura, com a linha do preço usual.
export default function PriceChart({ history }) {
  if (!history) return <div className="h-72 animate-pulse rounded-xl bg-line/40" />;
  if (history.length < 2) {
    return (
      <div className="grid h-72 place-items-center rounded-xl border-2 border-dashed border-line px-6 text-center text-muted">
        O gráfico aparece depois de duas varreduras.
      </div>
    );
  }

  const data = history.map((h) => ({ t: h.at.getTime(), price: h.minPrice }));
  const usual = median(data.map((d) => d.price));

  return (
    <div className="h-72" role="img" aria-label="Gráfico do menor preço encontrado em cada varredura">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--ipe)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--ipe)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={axisDate}
            tick={{ fill: 'var(--muted)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            minTickGap={40}
          />
          <YAxis
            tickFormatter={(v) => `${Math.round(v / 100) / 10} mil`}
            tick={{ fill: 'var(--muted)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={52}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--muted)', strokeDasharray: 3 }} />
          <ReferenceLine
            y={usual}
            stroke="var(--muted)"
            strokeDasharray="5 4"
            label={{ value: `usual ${brl(usual)}`, position: 'insideTopLeft', fill: 'var(--muted)', fontSize: 12 }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke="var(--ink)"
            strokeWidth={2}
            fill="url(#priceFill)"
            dot={false}
            isAnimationActive={false}
            activeDot={{ r: 5, fill: 'var(--ipe)', stroke: 'var(--ink)' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
