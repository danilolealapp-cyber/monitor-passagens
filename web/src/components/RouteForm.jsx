import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { createRoute, updateRoute, MAX_ACTIVE_ROUTES } from '../lib/data';
import AirportPicker from './AirportPicker';

const DAY_MS = 86_400_000;
const today = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS);

function validate(f) {
  if (!/^[A-Z]{3}$/.test(f.destination)) return 'Escolha o destino na lista de sugestões.';
  if (f.destination === 'BSB') return 'O destino precisa ser diferente de Brasília.';
  if (!f.departFrom || !f.departTo) return 'Preencha as duas datas.';
  if (f.departTo < today()) return 'O período precisa estar no futuro.';
  if (f.departFrom > f.departTo) return 'A primeira data precisa vir antes da segunda.';
  if (daysBetween(f.departFrom, f.departTo) > 180) return 'Use um período de até 6 meses para as buscas cobrirem bem as datas.';
  if (!(f.minNights >= 1)) return 'A viagem precisa ter pelo menos 1 noite.';
  if (f.maxNights < f.minNights) return 'O máximo de noites precisa ser maior ou igual ao mínimo.';
  if (f.maxNights > 60) return 'O máximo é de 60 noites.';
  return null;
}

export default function RouteForm({ route, canActivate, onClose }) {
  const dialog = useRef(null);
  const editing = Boolean(route);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState(() => ({
    destination: route?.destination ?? '',
    name: route?.name ?? '',
    country: route?.country ?? '',
    departFrom: route?.departFrom ?? '',
    departTo: route?.departTo ?? '',
    minNights: route?.minNights ?? 7,
    maxNights: route?.maxNights ?? 12,
    threshold: Math.round((route?.alertThreshold ?? 0.3) * 100),
  }));

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const set = (key) => (e) => {
    const raw = e.target.value;
    const value = ['minNights', 'maxNights', 'threshold'].includes(key) ? Number(raw) : raw;
    setF((prev) => ({ ...prev, [key]: value }));
  };

  const pickAirport = (a) =>
    setF((prev) => ({ ...prev, destination: a.code, name: a.city, country: a.countryName }));

  async function submit(e) {
    e.preventDefault();
    const problem = validate(f);
    if (problem) return setError(problem);
    if (!editing && !canActivate) return setError(`Você já tem ${MAX_ACTIVE_ROUTES} rotas ativas. Pause ou exclua uma antes.`);

    const fields = {
      destination: f.destination,
      name: f.name || f.destination,
      country: f.country,
      departFrom: f.departFrom,
      departTo: f.departTo,
      minNights: f.minNights,
      maxNights: f.maxNights,
      alertThreshold: f.threshold / 100,
    };

    setSaving(true);
    try {
      if (editing) {
        const tripChanged = ['destination', 'departFrom', 'departTo', 'minNights', 'maxNights'].some(
          (k) => fields[k] !== route[k],
        );
        await updateRoute(route.id, fields, { resetBest: tripChanged });
      } else {
        await createRoute(fields);
      }
      onClose();
    } catch {
      setError('Não foi possível salvar. Confira a conexão e tente de novo.');
      setSaving(false);
    }
  }

  const label = 'block text-sm font-semibold';
  const input =
    'mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-base text-ink focus:border-ink focus:outline-none';

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      className="m-auto w-[min(100%-2rem,32rem)] overflow-visible rounded-2xl bg-surface p-0 text-ink shadow-2xl"
    >
      <form onSubmit={submit} noValidate className="p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-extrabold tracking-tight">{editing ? 'Editar rota' : 'Nova rota'}</h2>
          <button type="button" onClick={onClose} className="-m-2 rounded-full p-2 text-muted hover:text-ink" aria-label="Fechar">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-1 text-sm text-muted">Saindo de Brasília (BSB), ida e volta.</p>

        <div className="mt-6 space-y-5">
          <div>
            <label htmlFor="destination" className={label}>
              Destino
            </label>
            <div className="mt-1.5">
              <AirportPicker id="destination" value={f.destination} onSelect={pickAirport} />
            </div>
          </div>

          <fieldset>
            <legend className={label}>Quero ir entre</legend>
            <div className="mt-1.5 grid grid-cols-2 gap-3">
              <input type="date" aria-label="Data inicial" min={today()} value={f.departFrom} onChange={set('departFrom')} className={`${input} mt-0`} />
              <input type="date" aria-label="Data final" min={f.departFrom || today()} value={f.departTo} onChange={set('departTo')} className={`${input} mt-0`} />
            </div>
          </fieldset>

          <fieldset>
            <legend className={label}>Ficar de</legend>
            <div className="mt-1.5 flex items-center gap-3">
              <input type="number" min="1" max="60" aria-label="Mínimo de noites" value={f.minNights} onChange={set('minNights')} className={`${input} mt-0 w-24`} />
              <span className="text-muted">a</span>
              <input type="number" min="1" max="60" aria-label="Máximo de noites" value={f.maxNights} onChange={set('maxNights')} className={`${input} mt-0 w-24`} />
              <span className="text-muted">noites</span>
            </div>
          </fieldset>

          <div>
            <label htmlFor="threshold" className={label}>
              Avisar quando cair {f.threshold}% ou mais
            </label>
            <input
              id="threshold"
              type="range"
              min="10"
              max="50"
              step="5"
              value={f.threshold}
              onChange={set('threshold')}
              className="mt-3 w-full accent-[var(--ipe)]"
            />
            <p className="mt-1 text-sm text-muted">Comparado com o preço usual dos últimos 30 dias.</p>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-5 rounded-lg bg-high-bg px-4 py-3 text-sm text-high">
            {error}
          </p>
        )}

        <div className="mt-7 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-sky px-5 py-2.5 text-sm font-semibold text-sky-ink disabled:opacity-50"
          >
            {saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Criar rota'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
