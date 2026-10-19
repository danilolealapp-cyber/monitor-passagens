import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { brl, dayMonth, stopsLabel } from '../lib/format';

const WINDOW_MS = 3 * 86_400_000; // usa as varreduras dos últimos 3 dias

// Menor preço encontrado para cada data de ida, para achar os dias mais baratos.
export function bestByDepartDate(history) {
  if (!history?.length) return [];
  const newest = history.at(-1).at.getTime();
  const best = new Map();
  for (const snap of history) {
    if (newest - snap.at.getTime() > WINDOW_MS) continue;
    for (const o of snap.topOffers ?? []) {
      const current = best.get(o.departDate);
      if (!current || o.price < current.price) best.set(o.departDate, o);
    }
  }
  return [...best.values()].sort((a, b) => a.departDate.localeCompare(b.departDate));
}

function DateTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const o = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-lg">
      <p className="tnum font-semibold">{brl(o.price)}</p>
      <p className="text-xs text-muted">
        {o.returnDate
          ? `Ida ${dayMonth(o.departDate)}, volta ${dayMonth(o.returnDate)} (${o.nights} noites)`
          : `Ida ${dayMonth(o.departDate)}, só ida`}
      </p>
      <p className="text-xs text-muted">{[o.airline, o.transfers != null ? stopsLabel(o.transfers) : null].filter(Boolean).join(', ')}</p>
      {o.link && <p className="mt-1 text-xs font-semibold">Clique para ver os voos</p>}
    </div>
  );
}

export default function DatePriceChart({ history }) {
  const data = bestByDepartDate(history);
  if (data.length < 3) {
    return (
      <p className="text-sm text-muted">
        O gráfico aparece depois de algumas varreduras, quando houver preços para pelo menos 3 datas de ida.
      </p>
    );
  }
  const cheapest = Math.min(...data.map((d) => d.price));

  return (
    <div className="h-56" role="img" aria-label="Menor preço encontrado para cada data de ida">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="departDate"
            tickFormatter={dayMonth}
            tick={{ fill: 'var(--muted)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis hide domain={[(min) => Math.floor(min * 0.85), 'auto']} />
          <Tooltip content={<DateTooltip />} cursor={{ fill: 'var(--raised)' }} />
          <Bar
            dataKey="price"
            radius={[6, 6, 0, 0]}
            isAnimationActive={false}
            onClick={(d) => d?.link && window.open(d.link, '_blank', 'noreferrer')}
            className="cursor-pointer"
          >
            {data.map((d) => (
              <Cell
                key={d.departDate}
                fill={d.price === cheapest ? 'var(--deal)' : 'var(--muted)'}
                fillOpacity={d.price === cheapest ? 1 : 0.35}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
