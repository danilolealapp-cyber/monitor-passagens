import { useEffect, useState } from 'react';
import { Check, LogOut, Plus } from 'lucide-react';
import { useRoutes, MAX_ACTIVE_ROUTES } from '../lib/data';
import { todayScans } from '../lib/format';
import RouteTicket from './RouteTicket';
import RouteDetail from './RouteDetail';
import RouteForm from './RouteForm';
import AlertsList from './AlertsList';

// Navegação simples pelo endereço: #/rota/<id> abre os detalhes
function useHashRoute() {
  const read = () => window.location.hash.match(/^#\/rota\/(.+)$/)?.[1] ?? null;
  const [routeId, setRouteId] = useState(read);
  useEffect(() => {
    const onChange = () => {
      setRouteId(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return routeId;
}

// Painel de partidas: as 3 varreduras do dia
function ScanBoard() {
  const scans = todayScans();
  return (
    <div className="flex items-center gap-2" aria-label="Varreduras de hoje">
      {scans.map(({ hour, done, next, tomorrow }) => (
        <span
          key={hour}
          className={`tnum inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold ${
            next ? 'bg-ipe text-ipe-ink' : done ? 'bg-white/10 text-sky-ink' : 'bg-white/5 text-sky-muted'
          }`}
        >
          {done && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
          {String(hour).padStart(2, '0')}h
          {next && <span className="font-normal">{tomorrow ? 'amanhã' : 'próxima'}</span>}
        </span>
      ))}
    </div>
  );
}

function EmptySlot({ onAdd, first, remaining }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="flex w-full items-center gap-4 rounded-2xl border-2 border-dashed border-line px-5 py-6 text-left text-muted transition hover:border-muted hover:text-ink"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface text-ink shadow-card">
        <Plus className="size-5" aria-hidden="true" />
      </span>
      <span>
        <span className="block font-semibold text-ink">{first ? 'Cadastre seu primeiro destino' : 'Adicionar outro destino'}</span>
        <span className="block text-sm">
          {first
            ? 'Escolha a cidade, o período da viagem e quantas noites quer ficar.'
            : `Você ainda pode monitorar mais ${remaining} ${remaining === 1 ? 'destino' : 'destinos'}.`}
        </span>
      </span>
    </button>
  );
}

export default function Dashboard({ user, onSignOut }) {
  const { loading, routes, error } = useRoutes();
  const openId = useHashRoute();
  const [form, setForm] = useState(null); // null | { route?: object }

  const activeCount = routes.filter((r) => r.active).length;
  const canAdd = activeCount < MAX_ACTIVE_ROUTES;
  const openRoute = routes.find((r) => r.id === openId);

  // "Saindo de Brasília" quando todas as rotas saem da mesma cidade
  const origins = [...new Set(routes.map((r) => r.originName ?? 'Brasília'))];
  const headline = origins.length > 1 ? 'Suas rotas' : `Saindo de ${origins[0] ?? 'Brasília'}`;

  if (error?.code === 'permission-denied') {
    return (
      <main className="grid min-h-dvh place-items-center bg-sky px-6 text-sky-ink">
        <div className="max-w-sm">
          <h1 className="text-2xl font-bold">Esta conta não tem acesso</h1>
          <p className="mt-3 text-sky-muted">Você entrou como {user.email}. Saia e entre com a conta Google autorizada.</p>
          <button onClick={onSignOut} className="mt-6 rounded-full bg-ipe px-5 py-3 font-semibold text-ipe-ink">
            Sair
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-dvh">
      <header className="border-b-4 border-ipe bg-sky text-sky-ink">
        <div className="mx-auto max-w-6xl px-4 pt-5 pb-7 sm:px-6 sm:pt-6">
          <div className="flex items-center justify-between gap-4">
            <a href="#" className="flex items-center gap-2.5 font-bold">
              <svg viewBox="0 0 48 48" className="size-7" aria-hidden="true">
                <path d="M4 30 44 16l-6 18z" fill="var(--ipe)" />
                <path d="M4 30l14 2 4 10 4-9" fill="none" stroke="var(--ipe)" strokeWidth="3" strokeLinejoin="round" />
              </svg>
              Monitor de passagens
            </a>
            <div className="flex items-center gap-1">
              <span className="hidden text-sm text-sky-muted sm:inline">{user.email}</span>
              <button
                type="button"
                onClick={onSignOut}
                className="rounded-full p-2.5 text-sky-muted hover:bg-white/10 hover:text-sky-ink"
                aria-label="Sair"
                title="Sair"
              >
                <LogOut className="size-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{headline}</h1>
              <p className="mt-1.5 text-sky-muted">
                {activeCount} de {MAX_ACTIVE_ROUTES} rotas monitoradas, preços conferidos 3 vezes por dia.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ScanBoard />
              <button
                type="button"
                onClick={() => setForm({})}
                disabled={!canAdd}
                title={canAdd ? undefined : `Limite de ${MAX_ACTIVE_ROUTES} rotas ativas`}
                className="inline-flex items-center gap-2 rounded-full bg-ipe px-4 py-2 text-sm font-semibold text-ipe-ink hover:brightness-105 disabled:opacity-40"
              >
                <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
                Nova rota
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {openRoute ? (
          <RouteDetail route={openRoute} onEdit={() => setForm({ route: openRoute })} />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section aria-labelledby="rotas">
              <h2 id="rotas" className="sr-only">
                Rotas
              </h2>
              {loading ? (
                <div className="h-56 animate-pulse rounded-2xl bg-surface" />
              ) : (
                <ul className="space-y-5">
                  {routes.map((route) => (
                    <li key={route.id}>
                      <RouteTicket route={route} />
                    </li>
                  ))}
                  {canAdd && (
                    <li>
                      <EmptySlot first={!routes.length} remaining={MAX_ACTIVE_ROUTES - activeCount} onAdd={() => setForm({})} />
                    </li>
                  )}
                </ul>
              )}
            </section>
            <AlertsList routes={routes} />
          </div>
        )}
      </main>

      {form && <RouteForm route={form.route} canActivate={canAdd} onClose={() => setForm(null)} />}
    </div>
  );
}
