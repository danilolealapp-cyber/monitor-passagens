// Formatação das mensagens (mesmo estilo dos relatórios do robô de varredura)

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export const brl = (v) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export const dayMonth = (iso) => {
  const [, m, d] = iso.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`;
};

export const escapeHtml = (text) =>
  String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Rotas antigas, sem o campo tripType, são ida e volta
export const tripLabel = (r) => (r.tripType === 'oneway' ? 'só ida' : 'ida e volta');

export const routeLabel = (r) =>
  escapeHtml(`${r.origin} → ${r.destination}${r.name ? ` (${r.name})` : ''}, ${tripLabel(r)}`);

// "ida 7 mar, volta 19 mar (12 noites)" ou "ida 7 mar (só ida)"
export const datesLabel = (o) =>
  o.returnDate
    ? `ida ${dayMonth(o.departDate)}, volta ${dayMonth(o.returnDate)} (${o.nights} noites)`
    : `ida ${dayMonth(o.departDate)} (só ida)`;

export const stopsLabel = (n) => (n === 0 ? 'direto' : n === 1 ? '1 conexão' : `${n} conexões`);

// Hora atual em Brasília (UTC−3)
export function brasiliaNow(date = new Date()) {
  const br = new Date(date.getTime() - 3 * 3600_000);
  return {
    hour: br.getUTCHours(),
    minute: br.getUTCMinutes(),
    label: `${String(br.getUTCDate()).padStart(2, '0')}/${String(br.getUTCMonth() + 1).padStart(2, '0')} ${String(br.getUTCHours()).padStart(2, '0')}:${String(br.getUTCMinutes()).padStart(2, '0')}`,
  };
}

// O relatório agendado só vale a pena se houve varredura depois do último relatório
// enviado (pelo agendamento ou pelo robô de varredura). Evita mensagens repetidas.
export function hasNewScan(settings, routes) {
  const last = settings.lastReportAt;
  if (!last) return true;
  const latestScan = routes
    .filter((r) => r.active && r.lastScanAt)
    .map((r) => r.lastScanAt.getTime())
    .sort((a, b) => b - a)[0];
  return latestScan === undefined || latestScan > last.getTime();
}

export function trend(route) {
  if (route.lastPrice == null) return '⏳ aguardando a primeira varredura';
  if (route.baseline == null) return '⏳ juntando histórico (alertas liberados após 2 dias)';
  const drop = (route.baseline - route.lastPrice) / route.baseline;
  const pct = Math.round(Math.abs(drop) * 100);
  if (drop >= (route.alertThreshold ?? 0.3)) return `🔥 ${pct}% abaixo do usual (${brl(route.baseline)}). Bom momento!`;
  if (drop >= 0) return `📉 ${pct}% abaixo do usual (${brl(route.baseline)})`;
  return `📈 ${pct}% acima do usual (${brl(route.baseline)})`;
}

export function reportText(routes) {
  const active = routes.filter((r) => r.active);
  const { label } = brasiliaNow();
  if (!active.length) return '📊 <b>Relatório de passagens</b>\n\nNenhuma rota ativa. Cadastre destinos no site.';

  const blocks = active.map((r) => {
    const b = r.lastBest;
    const lines = [`✈️ <b>${routeLabel(r)}</b>`, `💰 <b>${brl(r.lastPrice)}</b>`];
    if (b) {
      lines.push(`🗓 ${datesLabel(b)}, ${escapeHtml(b.airline ?? '?')}, ${stopsLabel(b.transfers ?? 0)}`);
    }
    lines.push(trend(r));
    if (b?.link) lines.push(`🔗 <a href="${escapeHtml(b.link)}">Ver voos</a>`);
    return lines.join('\n');
  });

  return [`📊 <b>Relatório de passagens</b> · ${label}`, '', blocks.join('\n\n'), '', '<i>Preços da última varredura.</i>'].join('\n');
}
