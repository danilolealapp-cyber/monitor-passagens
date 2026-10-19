import { useEffect, useState } from 'react';
import { LogOut, Plus } from 'lucide-react';
import { useRoutes, MAX_ACTIVE_ROUTES } from '../lib/data';
import { nextScanLabel } from '../lib/format';
import RouteTicket from './RouteTicket';
import RouteDetail from './RouteDetail';
import RouteForm from './RouteForm';
import AlertsList from './AlertsList';

// Navegação simples pelo endereço: #/rota/<id> abre os detalhes
function useHashRoute() {
  const read = () => window.location.hash.match(/^#\/rota\/(.+)$/)?.[1] ?? null;
  const [routeId, setRouteId] = useState(read);
  useEffect(() => {
    const onChange = () => setRouteId(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return routeId;
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
          <p className="mt-3 text-sky-muted">
            Você entrou como {user.email}. Saia e entre com a conta Google autorizada.
          </p>
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
        <div className="mx-auto flex max-w-6xl items-end justify-between gap-4 px-4 pt-6 pb-7 sm:px-6 sm:pt-8">
          <div>
            <p className="text-sm text-sky-muted">Próxima varredura {nextScanLabel()}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Saindo de Brasília</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setForm({})}
              disabled={!canAdd}
              title={canAdd ? undefined : `Limite de ${MAX_ACTIVE_ROUTES} rotas ativas`}
              className="inline-flex items-center gap-2 rounded-full bg-ipe px-4 py-2.5 text-sm font-semibold text-ipe-ink hover:brightness-105 disabled:opacity-40"
            >
              <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
              Nova rota
            </button>
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
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {openRoute ? (
          <RouteDetail route={openRoute} onEdit={() => setForm({ route: openRoute })} />
        ) : (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section aria-labelledby="rotas">
              <h2 id="rotas" className="sr-only">
                Rotas
              </h2>
              {loading ? (
                <p className="text-muted">Carregando rotas…</p>
              ) : routes.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-line px-6 py-12 text-center">
                  <p className="text-lg font-semibold">Nenhuma rota ainda</p>
                  <p className="mx-auto mt-2 max-w-sm text-muted">
                    Cadastre até {MAX_ACTIVE_ROUTES} destinos para acompanhar os preços e receber alertas.
                  </p>
                  <button
                    type="button"
                    onClick={() => setForm({})}
                    className="mt-6 rounded-full bg-sky px-5 py-3 font-semibold text-sky-ink"
                  >
                    Cadastrar primeira rota
                  </button>
                </div>
              ) : (
                <ul className="space-y-5">
                  {routes.map((route) => (
                    <li key={route.id}>
                      <RouteTicket route={route} />
                    </li>
                  ))}
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
