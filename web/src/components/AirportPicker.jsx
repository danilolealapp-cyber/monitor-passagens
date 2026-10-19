import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { airportLabel, loadAirports, searchAirports } from '../lib/airports';

// Campo de destino com busca: digite cidade, país ou código do aeroporto.
export default function AirportPicker({ id, value, exclude, onSelect }) {
  const listId = useId();
  const inputRef = useRef(null);
  const [airports, setAirports] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    loadAirports()
      .then(setAirports)
      .catch(() => setLoadError(true));
  }, []);

  const selected = useMemo(() => airports?.find((a) => a.code === value), [airports, value]);

  // Mostra o destino já escolhido (ao editar uma rota)
  useEffect(() => {
    if (selected && !open) setQuery(airportLabel(selected));
  }, [selected, open]);

  const results = useMemo(
    () => (airports && open ? searchAirports(airports, query, { exclude }) : []),
    [airports, query, open, exclude],
  );

  function choose(airport) {
    onSelect(airport);
    setQuery(airportLabel(airport));
    setOpen(false);
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && open && results[active]) {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Escape' && open) {
      e.preventDefault(); // não fecha o formulário inteiro
      e.stopPropagation();
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      {/* Centralizada na altura do campo (não do bloco, que cresce com mensagens) */}
      <Search className="pointer-events-none absolute top-[1.4rem] left-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && results[active] ? `${listId}-${results[active].code}` : undefined}
        value={query}
        placeholder={airports ? 'Cidade, país ou código' : 'Carregando aeroportos…'}
        autoComplete="off"
        onFocus={(e) => {
          e.target.select();
          setOpen(true);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onBlur={() => {
          setOpen(false);
          if (selected) setQuery(airportLabel(selected));
        }}
        onKeyDown={onKeyDown}
        className="w-full rounded-lg border border-line bg-bg py-2.5 pr-3 pl-9 text-base text-ink focus:border-ink focus:outline-none"
      />

      {open && results.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1.5 max-h-80 w-full overflow-auto rounded-xl border border-line bg-surface p-1 shadow-xl"
        >
          {results.map((a, i) => (
            <li
              key={a.code}
              id={`${listId}-${a.code}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()} // mantém o foco no campo
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(a)}
              className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 ${i === active ? 'bg-bg' : ''}`}
            >
              <span className="w-11 shrink-0 rounded-md bg-stub py-1 text-center text-xs font-bold text-ipe">{a.code}</span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">
                  {a.city}, <span className="font-normal text-muted">{a.countryName}</span>
                </span>
                <span className="block truncate text-xs text-muted">{a.name}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {open && airports && query.trim() && results.length === 0 && (
        <p className="absolute z-20 mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted shadow-xl">
          Nenhum aeroporto encontrado. Tente o nome da cidade sem abreviação ou o código de 3 letras.
        </p>
      )}
      {loadError && <p className="mt-1.5 text-sm text-high">Não foi possível carregar a lista de aeroportos. Recarregue a página.</p>}
    </div>
  );
}
