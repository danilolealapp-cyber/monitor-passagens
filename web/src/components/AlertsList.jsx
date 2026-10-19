import { BellRing } from 'lucide-react';
import { useAlerts } from '../lib/data';
import { brl, dayMonth, timeAgo } from '../lib/format';

export default function AlertsList({ routes }) {
  const alerts = useAlerts();
  const byId = Object.fromEntries(routes.map((r) => [r.id, r]));

  return (
    <section aria-labelledby="alertas" className="card self-start p-5">
      <h2 id="alertas" className="flex items-center gap-2 text-lg font-bold">
        <BellRing className="size-5 text-ipe" aria-hidden="true" />
        Alertas
      </h2>

      {alerts === null ? (
        <p className="mt-4 text-muted">Carregando…</p>
      ) : alerts.length === 0 ? (
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
          <p>Nenhum alerta ainda.</p>
          <p>
            Quando o preço de uma rota cair abaixo do usual no percentual que você escolheu, o aviso aparece aqui e
            chega na hora pelo Telegram.
          </p>
          <p>O preço usual é calculado com as varreduras dos últimos 30 dias.</p>
        </div>
      ) : (
        <ol className="mt-4 space-y-3">
          {alerts.map((a) => {
            const route = byId[a.routeId];
            return (
              <li key={a.id} className="rounded-xl border-l-4 border-deal bg-raised px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-bold">BSB para {route?.destination ?? '?'}</span>
                  <span className="text-xs text-muted">{timeAgo(a.createdAt?.toDate?.())}</span>
                </div>
                <p className="tnum mt-1">
                  <span className="text-lg font-bold text-deal">{brl(a.price)}</span>{' '}
                  <span className="text-sm text-muted">
                    {Math.round(a.dropPct * 100)}% abaixo de {brl(a.baseline)}
                  </span>
                </p>
                {a.offer && (
                  <p className="tnum mt-1 text-sm text-muted">
                    {dayMonth(a.offer.departDate)} a {dayMonth(a.offer.returnDate)}
                    {a.offer.link && (
                      <>
                        {', '}
                        <a href={a.offer.link} target="_blank" rel="noreferrer" className="font-semibold text-ink underline-offset-4 hover:underline">
                          ver voos
                        </a>
                      </>
                    )}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
