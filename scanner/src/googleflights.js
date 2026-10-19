// Busca preços de ida e volta direto no Google Flights (mesma técnica da biblioteca
// aberta "fast-flights"). Gratuito e sem chave, mas não é uma API oficial:
// se o Google mudar a página, este arquivo precisa de ajuste.

const SEARCH_URL = 'https://www.google.com/travel/flights/search';
const DAY_MS = 86_400_000;
const MAX_SEARCHES_PER_ROUTE = 12;
const DELAY_MS = 1500;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Monta o parâmetro "tfs" (busca codificada em protobuf) ----------
const varint = (n) => {
  const bytes = [];
  while (n > 127) {
    bytes.push((n & 127) | 128);
    n >>>= 7;
  }
  bytes.push(n);
  return bytes;
};
const field = (num, wireType) => varint((num << 3) | wireType);
const text = (num, s) => {
  const bytes = [...Buffer.from(s)];
  return [...field(num, 2), ...varint(bytes.length), ...bytes];
};
const nested = (num, inner) => [...field(num, 2), ...varint(inner.length), ...inner];
const number = (num, n) => [...field(num, 0), ...varint(n)];

const leg = (date, from, to) => [...text(2, date), ...nested(13, text(2, from)), ...nested(14, text(2, to))];

function buildTfs({ origin, destination, departDate, returnDate }) {
  const bytes = [
    ...nested(3, leg(departDate, origin, destination)),
    ...nested(3, leg(returnDate, destination, origin)),
    ...nested(8, [1]), // 1 adulto
    ...number(9, 1), // classe econômica
    ...number(19, 1), // ida e volta
  ];
  return Buffer.from(bytes).toString('base64');
}

export function googleFlightsUrl(trip, lang = 'pt-BR') {
  const url = new URL(SEARCH_URL);
  url.searchParams.set('tfs', buildTfs(trip));
  url.searchParams.set('tfu', 'EgQIABABIgA');
  url.searchParams.set('hl', lang);
  url.searchParams.set('curr', 'BRL');
  return url.toString();
}

// ---------- Lê os voos da página ----------
async function fetchTrip(trip) {
  const res = await fetch(googleFlightsUrl(trip, 'en'), {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      Accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!res.ok) throw new Error(`Google Flights respondeu ${res.status}`);

  const html = await res.text();
  const script = html.match(/<script[^>]*class="ds:1"[^>]*>([\s\S]*?)<\/script>/);
  if (!script) throw new Error('Google Flights mudou a página ou bloqueou a busca (dados não encontrados).');

  const afterData = script[1].split('data:', 2)[1] ?? '';
  const raw = afterData.slice(0, afterData.lastIndexOf(','));
  if (raw.endsWith('errorHasStatus: true')) return [];

  const payload = JSON.parse(raw);
  const groups = [payload[2], payload[3]].filter(Boolean).map((section) => section[0] || []);

  return groups
    .flat()
    .map((item) => ({
      price: item[1]?.[0]?.[1] ?? null,
      airline: (item[0][1] || []).join(' / ') || null,
      transfers: item[0][2].length - 1,
    }))
    .filter((f) => typeof f.price === 'number');
}

// ---------- Escolhe quais datas testar nesta varredura ----------
const isoDate = (d) => d.toISOString().slice(0, 10);
const addDays = (iso, days) => isoDate(new Date(Date.parse(iso) + days * DAY_MS));

// 0 = manhã, 1 = tarde, 2 = noite. Cada varredura testa datas diferentes.
function scanSlot(now) {
  const hour = Number(
    now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hourCycle: 'h23' }),
  );
  return hour < 10 ? 0 : hour < 17 ? 1 : 2;
}

export function pickTrips(route, now = new Date()) {
  const { departFrom, departTo, minNights, maxNights } = route;
  const tomorrow = isoDate(new Date(now.getTime() + DAY_MS));
  const start = departFrom > tomorrow ? departFrom : tomorrow;
  if (start > departTo) return [];

  const totalDays = Math.round((Date.parse(departTo) - Date.parse(start)) / DAY_MS) + 1;
  const nightOptions = [...new Set([minNights, Math.round((minNights + maxNights) / 2), maxNights])];
  const slot = scanSlot(now);

  const trips = [];
  const seen = new Set();
  const add = (departDate, nights) => {
    const key = `${departDate}|${nights}`;
    if (seen.has(key) || departDate < start || departDate > departTo) return;
    seen.add(key);
    trips.push({ departDate, returnDate: addDays(departDate, nights), nights });
  };

  // Sempre reconfere a melhor data encontrada antes, para acompanhar o preço dela.
  if (route.lastBest) add(route.lastBest.departDate, route.lastBest.nights);

  const slots = MAX_SEARCHES_PER_ROUTE - trips.length;
  const step = Math.max(1, Math.ceil(totalDays / slots));
  const offset = Math.floor((step * slot) / 3); // desloca as datas a cada varredura
  for (let day = offset, i = 0; day < totalDays && trips.length < MAX_SEARCHES_PER_ROUTE; day += step, i++) {
    add(addDays(start, day), nightOptions[(i + slot) % nightOptions.length]);
  }
  return trips;
}

/**
 * Testa várias combinações de datas no Google Flights e devolve as ofertas
 * (a mais barata de cada combinação), da mais barata para a mais cara.
 */
export async function searchRoundTrips(route, now = new Date()) {
  const trips = pickTrips(route, now);
  const offers = [];
  let failures = 0;
  let lastError;

  for (const trip of trips) {
    const full = { origin: route.origin, destination: route.destination, ...trip };
    try {
      const flights = await fetchTrip(full);
      if (flights.length) {
        const cheapest = flights.reduce((a, b) => (b.price < a.price ? b : a));
        offers.push({
          ...trip,
          price: cheapest.price,
          airline: cheapest.airline,
          transfers: cheapest.transfers,
          link: googleFlightsUrl(full),
        });
      }
    } catch (err) {
      failures++;
      lastError = err;
    }
    await sleep(DELAY_MS);
  }

  if (trips.length && failures > trips.length / 2) throw lastError;
  return offers.sort((a, b) => a.price - b.price);
}
