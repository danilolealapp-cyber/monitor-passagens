// Base de aeroportos com voos comerciais (gerada por scripts/build-airports.mjs).
// Carregada só quando o formulário de rota é aberto.

const countryNames = new Intl.DisplayNames(['pt-BR'], { type: 'region' });

export const normalize = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

let cache;
export function loadAirports() {
  cache ??= fetch(`${import.meta.env.BASE_URL}airports.json`)
    .then((res) => res.json())
    .then((rows) =>
      rows.map(([code, city, country, name, size]) => {
        const countryName = countryNames.of(country) ?? country;
        return {
          code,
          city,
          country,
          countryName,
          name,
          size,
          cityKey: normalize(city),
          countryKey: normalize(countryName),
          searchKey: normalize(`${code} ${city} ${countryName} ${name}`),
        };
      }),
    )
    .catch((err) => {
      cache = undefined; // permite tentar de novo
      throw err;
    });
  return cache;
}

// Busca por código, cidade (sem precisar de acento), país ou nome do aeroporto.
export function searchAirports(airports, query, limit = 8) {
  const q = normalize(query.trim());
  if (!q) return [];
  const scored = [];
  for (const a of airports) {
    if (a.code === 'BSB') continue;
    let score;
    if (a.code.toLowerCase() === q) score = 100;
    else if (a.cityKey.startsWith(q)) score = 50;
    else if (a.cityKey.includes(q)) score = 30;
    else if (a.countryKey.startsWith(q)) score = 20;
    else if (a.searchKey.includes(q)) score = 10;
    else continue;
    scored.push([score + a.size * 3 + (a.country === 'BR' ? 1 : 0), a]);
  }
  return scored
    .sort((x, y) => y[0] - x[0])
    .slice(0, limit)
    .map(([, a]) => a);
}

export const airportLabel = (a) => `${a.city} (${a.code})`;
