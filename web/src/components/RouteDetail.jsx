import { useState } from 'react';
import { ArrowLeft, ExternalLink, Pause, Pencil, Play, Trash2 } from 'lucide-react';
import { deleteRoute, setRouteActive, useHistory } from '../lib/data';
import { brl, longDate, shortDate, stopsLabel, timeAgo, toneDot, toneStyles, verdict } from '../lib/format';
import PriceChart from './PriceChart';
import DatePriceChart from './DatePriceChart';

const PERIODS = [
  [7, '7 dias'],
  [30, '30 dias'],
  [90, '90 dias'],
];

export default function RouteDetail({ route, routes = [], onEdit }) {
  const [days, setDays] = useState(30);
  const history = useHistory(route.id, days);
  const v = verdict(route);
  const latest = history?.at(-1);
  const updated = route.lastScanAt?.toDate?.();
  const city = route.name || route.destination;

  async function remove() {
    if (!confirm(`Excluir a rota para ${city}? O histórico de preços também será apagado.`)) return;
    await deleteRoute(route.id);
    window.location.hash = '';
  }

  return (
    <article>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <a href="#" className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Todas as rotas
        </a>

        {/* Trocar de rota sem voltar ao início (só com 2 rotas ou mais) */}
        {routes.length > 1 && (
          <nav aria-label="Outras rotas" className="-mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 sm:mx-0 sm:w-auto sm:px-0">
            <ul className="flex gap-2">
              {routes.map((r) => {
                const current = r.id === route.id;
                const tone = verdict(r).tone;
                return (
                  <li key={r.id} className="shrink-0">
                    <a
                      href={`#/rota/${r.id}`}
                      aria-current={current ? 'page' : undefined}
                      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                        current ? 'border-ink bg-ink font-semibold text-surface' : 'border-line bg-surface hover:border-muted'
                      } ${r.active ? '' : 'opacity-50'}`}
                    >
                      <span className={`size-2 rounded-full ${toneDot[tone]}`} aria-hidden="true" />
                      <span className="font-semibold">{r.destination}</span>
                      <span className={`tnum ${current ? '' : 'text-muted'}`}>{brl(r.lastPrice)}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
            {route.origin ?? 'BSB'} <span className="text-muted">para</span> {route.destination}
          </h2>
          <p className="mt-2 text-lg text-muted">
            Saindo de {route.originName ?? 'Brasília'} para {city}
            {route.country ? `, ${route.country}` : ''}. Ida entre {longDate(route.departFrom)} e {longDate(route.departTo)}, de {route.minNights} a{' '}
            {route.maxNights} noites.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onEdit} className="btn-secondary">
            <Pencil className="size-4" aria-hidden="true" /> Editar
          </button>
          <button type="button" onClick={() => setRouteActive(route.id, !route.active)} className="btn-secondary">
            {route.active ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
            {route.active ? 'Pausar' : 'Retomar'}
          </button>
          <button type="button" onClick={remove} className="btn-secondary text-high">
            <Trash2 className="size-4" aria-hidden="true" /> Excluir
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="card p-5 sm:p-6" aria-labelledby="historico">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 id="historico" className="text-lg font-bold">
              Histórico de preços
            </h3>
            <div className="flex rounded-full bg-raised p-1" role="group" aria-label="Período do gráfico">
              {PERIODS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDays(value)}
                  aria-pressed={days === value}
                  className={`rounded-full px-3 py-1 text-sm font-medium ${
                    days === value ? 'bg-sky text-sky-ink' : 'text-muted hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5">
            <PriceChart history={history} />
          </div>
        </section>

        <aside className="rounded-2xl bg-stub p-5 text-sky-ink shadow-card sm:p-6">
          <p className="text-sm text-sky-muted">Menor preço agora</p>
          <p className="tnum mt-1 text-5xl font-extrabold tracking-tight">{brl(route.lastPrice)}</p>
          <p className={`mt-3 inline-block rounded-md px-2.5 py-1 text-sm font-medium ${toneStyles[v.tone]}`}>{v.text}</p>
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-sky-muted">Preço usual</dt>
              <dd className="tnum font-semibold">{brl(route.baseline)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-sky-muted">Alerta quando cair</dt>
              <dd className="font-semibold">{Math.round((route.alertThreshold ?? 0.3) * 100)}% ou mais</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-sky-muted">Última varredura</dt>
              <dd className="font-semibold">{updated ? timeAgo(updated) : 'ainda não'}</dd>
            </div>
          </dl>

          {route.lastBest && (
            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="text-sm text-sky-muted">Melhor data encontrada</p>
              <p className="tnum mt-1 text-lg font-bold">
                {shortDate(route.lastBest.departDate)} a {shortDate(route.lastBest.returnDate)}
              </p>
              <p className="text-sm text-sky-muted">
                {route.lastBest.nights} noites
                {route.lastBest.airline ? `, ${route.lastBest.airline}` : ''}
                {route.lastBest.transfers != null ? `, ${stopsLabel(route.lastBest.transfers)}` : ''}
              </p>
              {route.lastBest.link && (
                <a
                  href={route.lastBest.link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ipe px-4 py-2.5 text-sm font-semibold text-ipe-ink hover:brightness-105"
                >
                  Ver voos no Google Flights <ExternalLink className="size-4" aria-hidden="true" />
                </a>
              )}
            </div>
          )}
        </aside>
      </div>

      <section className="card mt-6 p-5 sm:p-6" aria-labelledby="por-data">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="por-data" className="text-lg font-bold">
            Preço por data de ida
          </h3>
          <p className="text-sm text-muted">Menor preço visto nos últimos 3 dias. Em verde, o dia mais barato.</p>
        </div>
        <div className="mt-5">
          <DatePriceChart history={history} />
        </div>
      </section>

      <section className="card mt-6 p-5 sm:p-6" aria-labelledby="datas">
        <h3 id="datas" className="text-lg font-bold">
          Melhores datas da última varredura
        </h3>
        {!latest?.topOffers?.length ? (
          <p className="mt-3 text-muted">As datas aparecem aqui depois da primeira varredura.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {latest.topOffers.map((o) => (
              <li key={`${o.departDate}-${o.returnDate}-${o.airline}`}className="flex flex-wrap items-center gap-x-6 gap-y-1 py-3">
                <span className="tnum w-28 text-lg font-bold">{brl(o.price)}</span>
                <span className="tnum min-w-48 flex-1">
                  {shortDate(o.departDate)} a {shortDate(o.returnDate)}{' '}
                  <span className="text-muted">({o.nights} noites)</span>
                </span>
                <span className="text-sm text-muted">
                  {[o.airline, o.transfers != null ? stopsLabel(o.transfers) : null].filter(Boolean).join(', ')}
                </span>
                {o.link && (
                  <a
                    href={o.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline"
                  >
                    Ver voos <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
