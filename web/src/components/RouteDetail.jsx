import { useState } from 'react';
import { ArrowLeft, ExternalLink, Pause, Pencil, Play, Trash2 } from 'lucide-react';
import { deleteRoute, setRouteActive, useHistory } from '../lib/data';
import { brl, longDate, shortDate, stopsLabel, timeAgo, toneStyles, verdict } from '../lib/format';
import { cityName } from '../lib/airports';
import PriceChart from './PriceChart';

const PERIODS = [
  [7, '7 dias'],
  [30, '30 dias'],
  [90, '90 dias'],
];

export default function RouteDetail({ route, onEdit }) {
  const [days, setDays] = useState(30);
  const history = useHistory(route.id, days);
  const v = verdict(route);
  const latest = history?.at(-1);
  const updated = route.lastScanAt?.toDate?.();
  const city = route.name || cityName(route.destination);

  async function remove() {
    if (!confirm(`Excluir a rota para ${city}? O histórico de preços também será apagado.`)) return;
    await deleteRoute(route.id);
    window.location.hash = '';
  }

  return (
    <article>
      <a href="#" className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Todas as rotas
      </a>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
            BSB <span className="text-muted">para</span> {route.destination}
          </h2>
          <p className="mt-2 text-lg text-muted">
            {city}. Ida entre {longDate(route.departFrom)} e {longDate(route.departTo)}, de {route.minNights} a{' '}
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
        <section className="rounded-2xl bg-surface p-5 sm:p-6" aria-labelledby="historico">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 id="historico" className="text-lg font-bold">
              Histórico de preços
            </h3>
            <div className="flex rounded-full bg-bg p-1" role="group" aria-label="Período do gráfico">
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

        <aside className="rounded-2xl bg-sky p-5 text-sky-ink sm:p-6">
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
        </aside>
      </div>

      <section className="mt-6 rounded-2xl bg-surface p-5 sm:p-6" aria-labelledby="datas">
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
