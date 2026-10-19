import { brl, median } from '../lib/format';

/**
 * Faixa de preços dos últimos 30 dias, com o preço atual marcado.
 * Esquerda = mais barato visto, direita = mais caro visto, risco = preço usual.
 */
export default function PriceRange({ prices, current }) {
  if (!prices || prices.length < 2 || current == null) return null;

  const low = Math.min(...prices, current);
  const high = Math.max(...prices, current);
  const usual = median(prices);
  const span = high - low || 1;
  const pos = (v) => `${((v - low) / span) * 100}%`;

  return (
    <figure className="mt-4" aria-label={`Preço atual ${brl(current)}. Nos últimos 30 dias variou de ${brl(low)} a ${brl(high)}.`}>
      <div className="relative h-2 rounded-full bg-gradient-to-r from-deal/70 via-line to-high/60">
        <span
          className="absolute top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-muted"
          style={{ left: pos(usual) }}
          aria-hidden="true"
        />
        <span
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-surface bg-ink shadow"
          style={{ left: pos(current) }}
          aria-hidden="true"
        />
      </div>
      <figcaption className="tnum mt-2 flex justify-between text-xs text-muted">
        <span>{brl(low)}</span>
        <span>usual {brl(usual)}</span>
        <span>{brl(high)}</span>
      </figcaption>
    </figure>
  );
}
