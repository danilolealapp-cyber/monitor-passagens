// Gera web/public/airports.json a partir da base aberta OurAirports.
// Uso: node scripts/build-airports.mjs caminho/para/airports.csv
// (baixe em https://davidmegginson.github.io/ourairports-data/airports.csv)

import { readFileSync, writeFileSync } from 'node:fs';

// Nomes em português para cidades estrangeiras conhecidas
const PT_NAMES = {
  LHR: 'Londres', LGW: 'Londres', STN: 'Londres', LCY: 'Londres', LTN: 'Londres',
  JFK: 'Nova York', EWR: 'Nova York', LGA: 'Nova York',
  MEX: 'Cidade do México', CPT: 'Cidade do Cabo', JNB: 'Joanesburgo',
  PEK: 'Pequim', PKX: 'Pequim', NRT: 'Tóquio', HND: 'Tóquio', ICN: 'Seul', SIN: 'Singapura',
  MUC: 'Munique', ZRH: 'Zurique', GVA: 'Genebra', VIE: 'Viena', ATH: 'Atenas',
  IST: 'Istambul', SAW: 'Istambul', FCO: 'Roma', CIA: 'Roma', MXP: 'Milão', LIN: 'Milão', BGY: 'Milão',
  VCE: 'Veneza', NAP: 'Nápoles', FLR: 'Florença', BRU: 'Bruxelas', CPH: 'Copenhague',
  ARN: 'Estocolmo', HEL: 'Helsinque', OSL: 'Oslo', WAW: 'Varsóvia', PRG: 'Praga', BUD: 'Budapeste',
  DUB: 'Dublin', EDI: 'Edimburgo', AMS: 'Amsterdã', FRA: 'Frankfurt', BER: 'Berlim', HAM: 'Hamburgo',
  LIS: 'Lisboa', OPO: 'Porto', FAO: 'Faro', FNC: 'Funchal (Madeira)', PDL: 'Ponta Delgada (Açores)',
  MAD: 'Madri', BCN: 'Barcelona', SVQ: 'Sevilha', AGP: 'Málaga', PMI: 'Palma de Maiorca', VLC: 'Valência',
  CDG: 'Paris', ORY: 'Paris', MRS: 'Marselha', NCE: 'Nice', LYS: 'Lyon',
  SFO: 'São Francisco', IAD: 'Washington', DCA: 'Washington', YUL: 'Montreal',
  HAV: 'Havana', SDQ: 'Santo Domingo', ASU: 'Assunção', MVD: 'Montevidéu',
  CAI: 'Cairo', CMN: 'Casablanca', RAK: 'Marrakech', PVG: 'Xangai', SHA: 'Xangai', DEL: 'Nova Délhi',
  PTY: 'Cidade do Panamá', CUZ: 'Cusco', EZE: 'Buenos Aires', AEP: 'Buenos Aires', SCL: 'Santiago',
  GIG: 'Rio de Janeiro', SDU: 'Rio de Janeiro', GRU: 'São Paulo', CGH: 'São Paulo', VCP: 'Campinas',
};

const SIZE = { large_airport: 3, medium_airport: 2, small_airport: 1 };

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field || row.length) rows.push([...row, field]);
  return rows;
}

const [csvPath] = process.argv.slice(2);
if (!csvPath) {
  console.error('Uso: node scripts/build-airports.mjs airports.csv');
  process.exit(1);
}

const [header, ...rows] = parseCsv(readFileSync(csvPath, 'utf8'));
const col = Object.fromEntries(header.map((name, i) => [name, i]));

const airports = rows
  .filter(
    (r) =>
      r[col.scheduled_service] === 'yes' &&
      SIZE[r[col.type]] &&
      /^[A-Z]{3}$/.test(r[col.iata_code] ?? ''),
  )
  .map((r) => {
    const iata = r[col.iata_code];
    const city = PT_NAMES[iata] || r[col.municipality] || r[col.name];
    // [código, cidade, país (ISO), nome do aeroporto, porte]
    return [iata, city, r[col.iso_country], r[col.name], SIZE[r[col.type]]];
  })
  .sort((a, b) => b[4] - a[4] || a[1].localeCompare(b[1]));

writeFileSync(new URL('../public/airports.json', import.meta.url), JSON.stringify(airports));
console.log(`${airports.length} aeroportos salvos em public/airports.json`);
