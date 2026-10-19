import { useHistory } from '../lib/data';
import { brl, dayMonth, stopsLabel, timeAgo, toneStyles, verdict } from '../lib/format';
import { cityName } from '../lib/airports';
import PriceRange from './PriceRange';

// Cada rota como um cartão de embarque: canhoto com o destino, corpo com o preço.
export default function RouteTicket({ route }) {
  const history = useHistory(route.id, 30);
  const v = verdict(route);
  const best = route.lastBest;
  const updated = route.lastScanAt?.toDate?.();

  return (
    <a
      href={`#/rota/${route.id}`}
      className={`group flex overflow-hidden rounded-2xl bg-surface shadow-[0_1px_0_var(--line),0_8px_24px_-12px_rgb(20_33_61/0.25)] transition hover:-translate-y-0.5 ${
        route.active ? '' : 'opacity-60'
      }`}
    >
      {/* Canhoto */}
      <div className="flex w-24 shrink-0 flex-col justify-between bg-sky p-4 text-sky-ink sm:w-36 sm:p-5">
        <span className="text-xs text-sky-muted">BSB para</span>
        <span className="text-3xl leading-none font-extrabold tracking-tight text-ipe sm:text-5xl">
          {route.destination}
        </span>
        <span className="truncate text-xs text-sky-muted sm:text-sm">{route.name || cityName(route.destination)}</span>
      </div>

      {/* Corpo */}
      <div className="ticket-cut min-w-0 flex-1 border-l-2 border-dashed border-line p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div>
            <p className="tnum text-3xl font-bold tracking-tight sm:text-4xl">{brl(route.lastPrice)}</p>
            {best && (
              <p className="tnum mt-1 text-sm text-muted">
                {dayMonth(best.departDate)} a {dayMonth(best.returnDate)}, {best.nights} noites
                {best.airline ? `, ${best.airline}` : ''}
                {best.transfers != null ? `, ${stopsLabel(best.transfers)}` : ''}
              </p>
            )}
          </div>
          {!route.active && (
            <span className="rounded-full border border-line px-3 py-1 text-xs font-medium text-muted">Pausada</span>
          )}
        </div>

        <p className={`mt-3 inline-block rounded-md px-2.5 py-1 text-sm font-medium ${toneStyles[v.tone]}`}>{v.text}</p>

        <PriceRange prices={history?.map((h) => h.minPrice)} current={route.lastPrice} />

        {updated && <p className="mt-3 text-xs text-muted">Atualizado {timeAgo(updated)}</p>}
      </div>
    </a>
  );
}
