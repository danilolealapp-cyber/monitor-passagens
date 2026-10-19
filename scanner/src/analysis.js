// Decide se o preço atual é uma oportunidade, comparando com o "preço usual"
// (mediana dos menores preços registrados nos últimos 30 dias).

// Precisa de pelo menos 2 dias de varreduras antes de disparar alertas.
export const MIN_SAMPLES = 6;
const DAY_MS = 86_400_000;

export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function evaluate({ currentPrice, history, threshold }) {
  if (history.length < MIN_SAMPLES) {
    return { baseline: null, dropPct: null, isDeal: false, warmingUp: true };
  }
  const baseline = median(history);
  const dropPct = (baseline - currentPrice) / baseline;
  return { baseline, dropPct, isDeal: dropPct >= threshold, warmingUp: false };
}

// Evita repetir o mesmo alerta: só avisa de novo depois de 24h
// ou se o preço cair mais 5% em relação ao último alerta.
export function shouldAlert(lastAlert, price, now) {
  if (!lastAlert) return true;
  const lastAt = lastAlert.at?.toMillis?.() ?? 0;
  if (now.getTime() - lastAt > DAY_MS) return true;
  return price < lastAlert.price * 0.95;
}
