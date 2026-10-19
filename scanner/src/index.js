// Varredura principal: roda 3x por dia no GitHub Actions.
// Para cada rota ativa: busca preços, salva no histórico, avalia queda e avisa no Telegram.

import { db, Timestamp } from './firestore.js';
import * as googleFlights from './googleflights.js';
import * as travelpayouts from './travelpayouts.js';
import { evaluate, shouldAlert } from './analysis.js';
import { sendMessage, setChatId, brl, dayMonth, escapeHtml } from './telegram.js';

const HISTORY_DAYS = 30;
const DEFAULT_THRESHOLD = 0.3;
const sendReport = process.env.SEND_REPORT !== 'false';

const tripLabel = (r) => (r.tripType === 'oneway' ? 'só ida' : 'ida e volta');

const routeLabel = (r) =>
  escapeHtml(`${r.origin} → ${r.destination}${r.name ? ` (${r.name})` : ''}, ${tripLabel(r)}`);

function offerLine(o) {
  const stops = o.transfers === 0 ? 'direto' : o.transfers === 1 ? '1 conexão' : `${o.transfers} conexões`;
  const dates = o.returnDate
    ? `ida ${dayMonth(o.departDate)}, volta ${dayMonth(o.returnDate)} (${o.nights} noites)`
    : `ida ${dayMonth(o.departDate)} (só ida)`;
  return `${dates}, ${o.airline ?? '?'}, ${stops}`;
}

function alertMessage(route, best, ev) {
  const pct = Math.round(ev.dropPct * 100);
  return [
    `🚨 <b>ALERTA: ${routeLabel(route)} está ${pct}% abaixo do usual!</b>`,
    '',
    `💰 <b>${brl(best.price)}</b> (usual: ${brl(ev.baseline)})`,
    `🗓 ${offerLine(best)}`,
    best.link ? `🔗 <a href="${escapeHtml(best.link)}">Ver passagem</a>` : null,
    '',
    '<i>Preços mudam rápido. Confira antes de comprar.</i>',
  ]
    .filter((line) => line !== null)
    .join('\n');
}

function reportBlock(route, best, ev) {
  let trend;
  if (ev.warmingUp) trend = '⏳ juntando histórico (alertas liberados após 2 dias)';
  else if (ev.dropPct >= 0) trend = `📉 ${Math.round(ev.dropPct * 100)}% abaixo do usual (${brl(ev.baseline)})`;
  else trend = `📈 ${Math.round(-ev.dropPct * 100)}% acima do usual (${brl(ev.baseline)})`;

  return [
    `✈️ <b>${routeLabel(route)}</b>`,
    `💰 <b>${brl(best.price)}</b>`,
    `🗓 ${offerLine(best)}`,
    trend,
    best.link ? `🔗 <a href="${escapeHtml(best.link)}">Ver voos</a>` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

// Fonte principal: Google Flights. Reserva: Travelpayouts (menos dados, mas estável).
async function findOffers(route, now) {
  try {
    return { offers: await googleFlights.searchTrips(route, now), source: 'google-flights' };
  } catch (err) {
    console.error(`  Google Flights falhou (${err.message}). Usando Travelpayouts.`);
    return { offers: await travelpayouts.searchTrips(route), source: 'travelpayouts' };
  }
}

async function scanRoute(doc, now) {
  const route = { id: doc.id, ...doc.data() };
  const { offers, source } = await findOffers(route, now);

  if (!offers.length) {
    await doc.ref.update({ lastScanAt: Timestamp.fromDate(now), lastScanStatus: 'sem-dados' });
    return { text: `✈️ <b>${routeLabel(route)}</b>\n😶 Nenhum preço encontrado para esse período.` };
  }

  const best = offers[0];

  // A fonte reserva guarda preços antigos de buscas de outras pessoas. Ela serve só como
  // referência no relatório: não entra no histórico nem dispara alerta (evita alerta falso).
  if (source !== 'google-flights') {
    await doc.ref.update({ lastScanAt: Timestamp.fromDate(now), lastScanStatus: 'reserva' });
    return {
      text: [
        `✈️ <b>${routeLabel(route)}</b>`,
        '⚠️ O Google Flights não respondeu nesta varredura.',
        `Referência de outra fonte (pode estar desatualizada): ${brl(best.price)}, ${offerLine(best)}`,
      ].join('\n'),
    };
  }

  const since = Timestamp.fromMillis(now.getTime() - HISTORY_DAYS * 86_400_000);
  const historySnap = await doc.ref.collection('snapshots').where('scannedAt', '>=', since).get();
  const history = historySnap.docs
    .map((d) => d.data())
    .filter((s) => s.source === 'google-flights')
    .map((s) => s.minPrice);

  const ev = evaluate({
    currentPrice: best.price,
    history,
    threshold: route.alertThreshold ?? DEFAULT_THRESHOLD,
  });

  await doc.ref.collection('snapshots').add({
    scannedAt: Timestamp.fromDate(now),
    source,
    currency: 'BRL',
    minPrice: best.price,
    offerCount: offers.length,
    topOffers: offers.slice(0, 10),
  });

  const routeUpdate = {
    lastScanAt: Timestamp.fromDate(now),
    lastScanStatus: 'ok',
    lastPrice: best.price,
    lastBest: best,
    baseline: ev.baseline,
  };

  if (ev.isDeal && shouldAlert(route.lastAlert, best.price, now)) {
    // Se o envio falhar, a rota é atualizada mesmo assim e o alerta é tentado na próxima varredura
    try {
      await sendMessage(alertMessage(route, best, ev));
      await db.collection('alerts').add({
        routeId: route.id,
        createdAt: Timestamp.fromDate(now),
        price: best.price,
        baseline: ev.baseline,
        dropPct: ev.dropPct,
        offer: best,
      });
      routeUpdate.lastAlert = { price: best.price, at: Timestamp.fromDate(now) };
      console.log(`  Alerta enviado: ${route.destination} a ${best.price}`);
    } catch (err) {
      console.error(`  Falha ao enviar o alerta: ${err.message}`);
    }
  }

  await doc.ref.update(routeUpdate);
  console.log(`  Menor preço: R$ ${best.price} (${offers.length} ofertas, fonte: ${source})`);
  return { text: reportBlock(route, best, ev) };
}

async function main() {
  const now = new Date();

  // Preferências definidas pelo bot do Telegram (/start, /silenciar)
  const settings = (await db.doc('settings/bot').get()).data() ?? {};
  if (settings.chatId) setChatId(settings.chatId);
  const wantsReport = sendReport && settings.scanReports !== false;

  const routes = await db.collection('routes').where('active', '==', true).get();

  if (routes.empty) {
    console.log('Nenhuma rota ativa cadastrada. Use: npm run add-route');
    return;
  }

  const blocks = [];
  let failures = 0;

  for (const doc of routes.docs) {
    const { origin, destination } = doc.data();
    console.log(`Buscando ${origin} → ${destination}...`);
    try {
      blocks.push((await scanRoute(doc, now)).text);
    } catch (err) {
      failures++;
      console.error(`  Erro: ${err.message}`);
      blocks.push(`✈️ <b>${origin} → ${destination}</b>\n⚠️ Erro na busca: ${escapeHtml(err.message)}`);
    }
  }

  if (wantsReport) {
    const hour = now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    await sendMessage([`📊 <b>Relatório de passagens</b> · ${date} ${hour}`, '', blocks.join('\n\n')].join('\n'));
    // O bot usa este registro para não repetir o relatório agendado logo em seguida
    await db.doc('settings/bot').set({ lastReportAt: Timestamp.now() }, { merge: true });
  }

  if (failures === routes.size) {
    throw new Error('Todas as buscas falharam.');
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
