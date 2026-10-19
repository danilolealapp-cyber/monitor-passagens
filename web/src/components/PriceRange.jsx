import { brl, median } from '../lib/format';

/**
 * Faixa de preços dos últimos 30 dias, com o preço atual marcado.
 * Esquerda = mais barato visto, direita = mais caro visto, risco = preço usual.
 */
export default function PriceRange({ prices, current }) {
  if (!prices || current == null) return null;
  const low = Math.min(...prices, current);
  const high = Math.max(...prices, current);

  if (prices.length < 2 || high === low) {
    return (
      <p className="mt-4 text-xs text-muted">A faixa de preços dos últimos 30 dias aparece após mais algumas varreduras.</p>
    );
  }

  const usual = median(prices);
  const pos = (v) => `${((v - low) / (high - low)) * 100}%`;

  return (
    <figure
      className="mt-5"
      aria-label={`Preço atual ${brl(current)}. Nos últimos 30 dias variou de ${brl(low)} a ${brl(high)}.`}
    >
      <div className="relative h-1.5 rounded-full bg-gradient-to-r from-deal via-line to-high">
        <span className="absolute top-1/2 h-3.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded bg-muted" style={{ left: pos(usual) }} aria-hidden="true" />
        <span
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-surface bg-ink shadow"
          style={{ left: pos(current) }}
          aria-hidden="true"
        />
      </div>
      <figcaption className="tnum mt-2 flex justify-between text-xs text-muted">
        <span>Mínimo {brl(low)}</span>
        <span>Usual {brl(usual)}</span>
        <span>Máximo {brl(high)}</span>
      </figcaption>
    </figure>
  );
}
