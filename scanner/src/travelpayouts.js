// Busca preços de ida e volta na API gratuita do Travelpayouts (Aviasales).
// Os preços vêm de um cache de buscas recentes, então servem bem para tendência e histórico.

const API_URL = 'https://api.travelpayouts.com/aviasales/v3/prices_for_dates';
const DAY_MS = 86_400_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function toYearMonth(date) {
  return date.toISOString().slice(0, 7);
}

// Lista os meses (AAAA-MM) entre duas datas, inclusive.
export function monthsBetween(fromDate, toDate) {
  const months = [];
  const cursor = new Date(`${fromDate.slice(0, 7)}-01T00:00:00Z`);
  const end = toDate.slice(0, 7);
  while (toYearMonth(cursor) <= end) {
    months.push(toYearMonth(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

// Meses em que a volta pode cair, para uma ida em `month`.
function returnMonthsFor(month, minNights, maxNights) {
  const first = new Date(`${month}-01T00:00:00Z`);
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0));
  const earliest = new Date(first.getTime() + minNights * DAY_MS);
  const latest = new Date(last.getTime() + maxNights * DAY_MS);
  return monthsBetween(earliest.toISOString(), latest.toISOString());
}

async function query(params) {
  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token) throw new Error('TRAVELPAYOUTS_TOKEN não definido.');

  const url = new URL(API_URL);
  const all = { ...params, currency: 'brl', sorting: 'price', one_way: 'false', limit: 1000, token };
  for (const [key, value] of Object.entries(all)) url.searchParams.set(key, String(value));

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Travelpayouts respondeu ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const json = await res.json();
  if (!json.success) throw new Error(`Travelpayouts recusou a busca: ${json.error ?? 'motivo desconhecido'}`);
  return json.data ?? [];
}

function normalize(raw) {
  if (!raw.departure_at || !raw.return_at) return null;
  const departDate = raw.departure_at.slice(0, 10);
  const returnDate = raw.return_at.slice(0, 10);
  return {
    departDate,
    returnDate,
    nights: Math.round((Date.parse(returnDate) - Date.parse(departDate)) / DAY_MS),
    price: raw.price,
    airline: raw.airline ?? null,
    transfers: raw.transfers ?? 0,
    returnTransfers: raw.return_transfers ?? 0,
    link: raw.link ? `https://www.aviasales.com${raw.link}` : null,
  };
}

/**
 * Busca as passagens de ida e volta que cabem na rota:
 * ida entre departFrom e departTo, ficando de minNights a maxNights.
 * Retorna as ofertas da mais barata para a mais cara.
 */
export async function searchRoundTrips(route) {
  const { origin, destination, departFrom, departTo, minNights, maxNights } = route;
  const raw = [];

  for (const month of monthsBetween(departFrom, departTo)) {
    for (const returnMonth of returnMonthsFor(month, minNights, maxNights)) {
      raw.push(...(await query({ origin, destination, departure_at: month, return_at: returnMonth })));
      await sleep(400); // evita estourar o limite de requisições
    }
  }

  const cheapestByTrip = new Map();
  for (const offer of raw.map(normalize)) {
    if (!offer) continue;
    if (offer.departDate < departFrom || offer.departDate > departTo) continue;
    if (offer.nights < minNights || offer.nights > maxNights) continue;
    const key = `${offer.departDate}|${offer.returnDate}|${offer.airline}`;
    const existing = cheapestByTrip.get(key);
    if (!existing || offer.price < existing.price) cheapestByTrip.set(key, offer);
  }

  return [...cheapestByTrip.values()].sort((a, b) => a.price - b.price);
}
