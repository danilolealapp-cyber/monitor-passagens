import { useEffect, useState } from 'react';
import { Check, Clock3, Plus } from 'lucide-react';
import { useRoutes, MAX_ACTIVE_ROUTES } from '../lib/data';
import { todayScans } from '../lib/format';
import RouteTicket from './RouteTicket';
import RouteDetail from './RouteDetail';
import RouteForm from './RouteForm';
import AlertsList from './AlertsList';
import StatusPanel from './StatusPanel';
import Brand, { BRAND_NAME } from './Brand';
import UserMenu from './UserMenu';

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

// As 3 varreduras do dia: as feitas ficam com ✓, a próxima fica destacada
function ScanBoard() {
  const scans = todayScans();
  return (
    <div
      className="flex items-center gap-0.5 rounded-[10px] border border-white/10 bg-white/5 p-1"
      role="group"
      aria-label="Horários das varreduras de preço"
      title="Horários em que os preços são conferidos"
    >
      <Clock3 className="mx-1.5 hidden size-3.5 text-sky-muted sm:block" aria-hidden="true" />
      {scans.map(({ hour, done, next, tomorrow }) => (
        <span
          key={hour}
          className={`tnum inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${
            next ? 'bg-white/10 text-sky-ink' : 'text-sky-muted'
          }`}
        >
          {done && <Check className="size-3" strokeWidth={3} aria-hidden="true" />}
          {next && <span className="size-1.5 rounded-full bg-ipe" aria-hidden="true" />}
          {String(hour).padStart(2, '0')}h
          {next && <span className="hidden font-normal text-sky-muted md:inline">{tomorrow ? 'amanhã' : 'próxima'}</span>}
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
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface text-ink shadow-card">
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
          <button onClick={onSignOut} className="mt-6 rounded-xl bg-ipe px-5 py-3 font-bold text-ipe-ink">
            Sair
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-sky/95 text-sky-ink backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <a href="#" aria-label={`${BRAND_NAME}: página inicial`} className="rounded-lg">
            <Brand onDark compact />
          </a>
          <div className="flex items-center gap-3">
            <ScanBoard />
            <UserMenu user={user} onSignOut={onSignOut} />
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
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-ipe px-4 py-2.5 text-sm font-bold text-ipe-ink shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:bg-raised disabled:text-muted disabled:shadow-none"
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
