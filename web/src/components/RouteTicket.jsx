import { ArrowLeftRight, ArrowRight, BellRing, ExternalLink, Plane } from 'lucide-react';
import { useHistory } from '../lib/data';
import { brl, dayMonth, isOneWay, stopsLabel, timeAgo, toneStyles, tripLabel, verdict, windowLabel } from '../lib/format';
import PriceRange from './PriceRange';
import Sparkline from './Sparkline';

function Field({ label, children, note }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="tnum mt-0.5 truncate font-semibold">{children}</dd>
      {note && <dd className="truncate text-xs text-muted">{note}</dd>}
    </div>
  );
}

// Cada rota como um cartão de embarque: canhoto com o destino, corpo com o preço.
export default function RouteTicket({ route }) {
  const history = useHistory(route.id, 30);
  const prices = history?.map((h) => h.minPrice) ?? [];
  const v = verdict(route);
  const best = route.lastBest;
  const updated = route.lastScanAt?.toDate?.();
  const city = route.name || route.destination;
  const oneWay = isOneWay(route);

  return (
    <article className={`card group relative flex overflow-hidden transition hover:border-muted/60 ${route.active ? '' : 'opacity-60'}`}>
      {/* Canhoto */}
      <div className="flex w-28 shrink-0 flex-col bg-stub p-4 text-sky-ink sm:w-44 sm:p-5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-muted">
          {route.origin ?? 'BSB'} <Plane className="size-3.5 text-ipe" aria-hidden="true" />
        </div>
        <p className="mt-2 text-4xl leading-none font-extrabold tracking-tight text-ipe sm:text-5xl">{route.destination}</p>
        <p className="mt-2 truncate text-sm font-semibold">{city}</p>
        {route.country && <p className="truncate text-xs text-sky-muted">{route.country}</p>}
        <div className="mt-auto pt-5 text-xs text-sky-muted">
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-1 font-medium text-sky-ink">
            <BellRing className="size-3.5 text-ipe" aria-hidden="true" />
            <span className="hidden sm:inline">Alerta em</span> −{Math.round((route.alertThreshold ?? 0.3) * 100)}%
          </p>
          <p className="tnum">{windowLabel(route.departFrom, route.departTo)}</p>
          <p>{oneWay ? 'Só ida' : `${route.minNights} a ${route.maxNights} noites`}</p>
        </div>
      </div>

      {/* Corpo */}
      <div className="ticket-cut min-w-0 flex-1 border-l-2 border-dashed border-line p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs text-muted">
              Menor preço
              <span className="inline-flex items-center gap-1 rounded-full bg-raised px-2 py-0.5 font-semibold text-ink">
                {oneWay ? <ArrowRight className="size-3" aria-hidden="true" /> : <ArrowLeftRight className="size-3" aria-hidden="true" />}
                {tripLabel(route)}
              </span>
            </p>
            <h3 className="tnum mt-0.5 text-3xl font-extrabold tracking-tight sm:text-4xl">
              {/* Link que cobre o cartão inteiro */}
              <a href={`#/rota/${route.id}`} className="after:absolute after:inset-0 after:content-['']">
                {brl(route.lastPrice)}
              </a>
            </h3>
          </div>
          <div className="hidden shrink-0 sm:block">
            <Sparkline values={prices.slice(-21)} />
          </div>
          {!route.active && (
            <span className="shrink-0 rounded-full border border-line px-3 py-1 text-xs font-medium text-muted">Pausada</span>
          )}
        </div>

        <p className={`mt-3 inline-block rounded-md px-2.5 py-1 text-sm font-medium ${toneStyles[v.tone]}`}>{v.text}</p>

        {best && (
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4 sm:grid-cols-4">
            <Field label="Ida">{dayMonth(best.departDate)}</Field>
            {best.returnDate ? (
              <>
                <Field label="Volta">{dayMonth(best.returnDate)}</Field>
                <Field label="Duração">{best.nights} noites</Field>
              </>
            ) : (
              <Field label="Volta">Sem volta</Field>
            )}
            <Field label="Companhia" note={best.transfers != null ? stopsLabel(best.transfers) : null}>
              {best.airline ?? '—'}
            </Field>
          </dl>
        )}

        <PriceRange prices={prices} current={route.lastPrice} />

        <div className="mt-4 flex items-center justify-between gap-4 text-xs text-muted">
          <span className="whitespace-nowrap">{updated ? `Atualizado ${timeAgo(updated)}` : 'Ainda não buscado'}</span>
          {best?.link && (
            <a
              href={best.link}
              target="_blank"
              rel="noreferrer"
              className="relative z-10 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-raised px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-ink hover:bg-line"
            >
              Ver voos <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
