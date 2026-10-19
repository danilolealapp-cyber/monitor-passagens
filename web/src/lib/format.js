export const brl = (value) =>
  value == null
    ? '—'
    : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// "2027-03-07" → "7 mar"
export const dayMonth = (iso) => {
  const [, m, d] = iso.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`;
};

// "2027-03-07" → "mar 2027"
export const monthYear = (iso) => {
  const [y, m] = iso.split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
};

// Período da ida: "7 mar a 31 mai"
export const windowLabel = (from, to) => `${dayMonth(from)} a ${dayMonth(to)}`;

// Situação das 3 varreduras de hoje (horário de Brasília)
export function todayScans(now = new Date()) {
  const brHour = ((now.getUTCHours() + 21) % 24) + now.getUTCMinutes() / 60;
  const nextHour = SCAN_HOURS.find((h) => h > brHour);
  // Depois das 20h, a próxima é a das 07h de amanhã
  if (nextHour === undefined) {
    return SCAN_HOURS.map((h, i) => ({ hour: h, done: i > 0, next: i === 0, tomorrow: i === 0 }));
  }
  return SCAN_HOURS.map((h) => ({ hour: h, done: h <= brHour, next: h === nextHour, tomorrow: false }));
}

export const longDate = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });

export const shortDate = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });

export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function timeAgo(date) {
  if (!date) return null;
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'ontem' : `há ${days} dias`;
}

// Varreduras às 07h, 13h e 20h (Brasília, UTC−3)
const SCAN_HOURS = [7, 13, 20];
export function nextScanLabel(now = new Date()) {
  const brHour = (now.getUTCHours() + 24 - 3) % 24 + now.getUTCMinutes() / 60;
  const next = SCAN_HOURS.find((h) => h > brHour);
  return next ? `hoje às ${next}h` : `amanhã às ${SCAN_HOURS[0]}h`;
}

/**
 * Diz se o preço atual está bom, comparando com o preço usual da rota.
 * tone: deal | good | normal | high | warming | waiting
 */
export function verdict(route) {
  if (route.lastPrice == null) {
    return { tone: 'waiting', text: 'Aguardando a primeira varredura' };
  }
  if (route.baseline == null) {
    return { tone: 'warming', text: 'Juntando histórico. Os alertas começam após 2 dias.' };
  }
  const drop = (route.baseline - route.lastPrice) / route.baseline;
  const pct = Math.round(Math.abs(drop) * 100);
  const threshold = route.alertThreshold ?? 0.3;
  if (drop >= threshold) return { tone: 'deal', text: `${pct}% abaixo do usual. Bom momento para comprar.` };
  if (drop >= 0.08) return { tone: 'good', text: `${pct}% abaixo do usual` };
  if (drop > -0.08) return { tone: 'normal', text: 'Perto do preço usual' };
  return { tone: 'high', text: `${pct}% acima do usual. Vale esperar.` };
}

export const toneStyles = {
  deal: 'bg-deal text-white',
  good: 'bg-deal-bg text-deal',
  normal: 'bg-line/60 text-muted',
  high: 'bg-high-bg text-high',
  warming: 'bg-warm-bg text-warm',
  waiting: 'bg-line/60 text-muted',
};

// Ponto colorido de situação (usado nos atalhos entre rotas)
export const toneDot = {
  deal: 'bg-deal ring-2 ring-deal/30',
  good: 'bg-deal',
  normal: 'bg-muted',
  high: 'bg-high',
  warming: 'bg-ipe',
  waiting: 'bg-muted/50',
};

export const stopsLabel = (n) => (n === 0 ? 'voo direto' : n === 1 ? '1 conexão' : `${n} conexões`);
