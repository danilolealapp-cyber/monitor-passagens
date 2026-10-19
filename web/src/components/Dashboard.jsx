import { useEffect, useState } from 'react';
import { Check, LogOut, Plus } from 'lucide-react';
import { useRoutes, MAX_ACTIVE_ROUTES } from '../lib/data';
import { todayScans } from '../lib/format';
import RouteTicket from './RouteTicket';
import RouteDetail from './RouteDetail';
import RouteForm from './RouteForm';
import AlertsList from './AlertsList';
import StatusPanel from './StatusPanel';

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
    <div className="flex items-center gap-1.5" aria-label="Varreduras de hoje" title="Varreduras de preço do dia">
      {scans.map(({ hour, done, next, tomorrow }) => (
        <span
          key={hour}
          className={`tnum inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${
            next
              ? 'bg-ipe text-ipe-ink'
              : done
                ? 'text-sky-muted'
                : 'text-sky-muted ring-1 ring-white/15 ring-inset'
          }`}
        >
          {done && <Check className="size-3" strokeWidth={3} aria-hidden="true" />}
          {String(hour).padStart(2, '0')}h
          {next && <span className="hidden font-normal sm:inline">{tomorrow ? 'amanhã' : 'próxima'}</span>}
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
      {/* Barra superior fixa, fechada pela linha amarela */}
      <header className="sticky top-0 z-30 border-b-[3px] border-ipe bg-sky text-sky-ink">
        <div>
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
            <a href="#" className="flex items-center gap-2 text-[15px] font-bold whitespace-nowrap">
              <svg viewBox="0 0 48 48" className="size-6 shrink-0" aria-hidden="true">
                <path d="M4 30 44 16l-6 18z" fill="var(--ipe)" />
                <path d="M4 30l14 2 4 10 4-9" fill="none" stroke="var(--ipe)" strokeWidth="3" strokeLinejoin="round" />
              </svg>
              <span className="hidden sm:inline">Monitor de passagens</span>
              <span className="sm:hidden">Passagens</span>
            </a>
            <div className="flex items-center gap-3">
              <ScanBoard />
              <span className="hidden h-5 w-px bg-white/15 md:block" aria-hidden="true" />
              <span className="hidden max-w-48 truncate text-sm text-sky-muted md:inline">{user.email}</span>
              <button
                type="button"
                onClick={onSignOut}
                className="-mr-2 rounded-full p-2 text-sky-muted hover:bg-white/10 hover:text-sky-ink"
                aria-label="Sair"
                title="Sair"
              >
                <LogOut className="size-[18px]" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {openRoute ? (
          <RouteDetail route={openRoute} routes={routes} onEdit={() => setForm({ route: openRoute })} />
        ) : (
          <>
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
              <h1 className="text-2xl font-extrabold tracking-tight whitespace-nowrap sm:text-3xl">Suas rotas</h1>
              <span className="text-sm text-muted">
                {activeCount} de {MAX_ACTIVE_ROUTES} ativas
              </span>
            </div>
            <button
              type="button"
              onClick={() => setForm({})}
              disabled={!canAdd}
              title={canAdd ? undefined : `Limite de ${MAX_ACTIVE_ROUTES} rotas ativas`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ipe px-4 py-2 text-sm font-semibold text-ipe-ink hover:brightness-105 disabled:opacity-40"
            >
              <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
              Nova rota
            </button>
          </div>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section aria-label="Rotas">
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
            <aside className="space-y-6 self-start">
              <StatusPanel routes={routes} />
              <AlertsList routes={routes} />
            </aside>
          </div>
          </>
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-4 pt-4 pb-10 text-xs text-muted sm:px-6">
        Preços do Google Flights para 1 adulto, classe econômica. Podem mudar a qualquer momento: confira antes
        de comprar.
      </footer>

      {form && <RouteForm route={form.route} canActivate={canAdd} onClose={() => setForm(null)} />}
    </div>
  );
}
