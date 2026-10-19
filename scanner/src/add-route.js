// Cadastra uma rota pelo terminal (provisório, até o dashboard ficar pronto).
// Uso: npm run add-route -- LIS 2027-03-01 2027-05-31 7 12
//      (destino, ida a partir de, ida até, mínimo de noites, máximo de noites)

import { db, Timestamp } from './firestore.js';

const MAX_ACTIVE_ROUTES = 3;
const [destination, departFrom, departTo, minNights, maxNights] = process.argv.slice(2);

function fail(message) {
  console.error(`❌ ${message}`);
  console.error('Uso: npm run add-route -- LIS 2027-03-01 2027-05-31 7 12');
  process.exit(1);
}

const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s ?? '') && !Number.isNaN(Date.parse(s));

if (!/^[A-Za-z]{3}$/.test(destination ?? '')) fail('Destino deve ser o código de 3 letras (ex.: LIS, MIA, GRU).');
if (!isDate(departFrom) || !isDate(departTo)) fail('Datas devem estar no formato AAAA-MM-DD.');
if (departFrom > departTo) fail('A data inicial deve ser antes da final.');
const min = Number(minNights);
const max = Number(maxNights);
if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max < min) fail('Noites inválidas.');

const active = await db.collection('routes').where('active', '==', true).count().get();
if (active.data().count >= MAX_ACTIVE_ROUTES) fail(`Já existem ${MAX_ACTIVE_ROUTES} rotas ativas.`);

const ref = await db.collection('routes').add({
  origin: 'BSB',
  destination: destination.toUpperCase(),
  departFrom,
  departTo,
  minNights: min,
  maxNights: max,
  alertThreshold: 0.3,
  active: true,
  createdAt: Timestamp.now(),
});

console.log(`✅ Rota BSB → ${destination.toUpperCase()} cadastrada (id ${ref.id}).`);
process.exit(0);
