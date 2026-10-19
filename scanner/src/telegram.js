import dns from 'node:dns';
import net from 'node:net';

// Nos servidores do GitHub, a rede IPv6 não alcança o Telegram e o Node desiste da
// conexão em 0,25 s. Preferir IPv4 e dar mais tempo evita o erro "fetch failed / ETIMEDOUT".
dns.setDefaultResultOrder('ipv4first');
net.setDefaultAutoSelectFamilyAttemptTimeout(2000);

const API = 'https://api.telegram.org/bot';
const RETRY_DELAYS_MS = [2000, 5000]; // até 3 tentativas no total

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function token() {
  const value = process.env.TELEGRAM_BOT_TOKEN;
  if (!value) throw new Error('TELEGRAM_BOT_TOKEN não definido.');
  return value;
}

async function callOnce(method, body) {
  const res = await fetch(`${API}${token()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const json = await res.json();
  if (!json.ok) {
    const err = new Error(`Telegram recusou (${method}): ${json.description}`);
    err.status = res.status;
    throw err;
  }
  return json.result;
}

// Tenta de novo em falhas de rede e erros temporários do Telegram (429 e 5xx).
// Erros de conteúdo (ex.: mensagem mal formatada) não adiantam repetir.
export async function callTelegram(method, body = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await callOnce(method, body);
    } catch (err) {
      const transient = err.status === undefined || err.status === 429 || err.status >= 500;
      if (!transient || attempt >= RETRY_DELAYS_MS.length) throw err;
      console.error(`  Telegram falhou (${err.message}), tentando de novo...`);
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
}

// Chat que recebe as mensagens: o ativado pelo /start no bot (settings/bot)
// ou, enquanto ninguém ativou, o TELEGRAM_CHAT_ID do .env / GitHub.
let activeChatId = null;
export const setChatId = (id) => {
  activeChatId = id;
};

export async function sendMessage(text) {
  const chatId = activeChatId || process.env.TELEGRAM_CHAT_ID;
  if (!chatId) throw new Error('Nenhum chat do Telegram configurado.');
  return callTelegram('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  });
}

// Formatação usada nas mensagens
export const brl = (value) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

// "2027-03-07" → "7 mar" (mesmo formato do site e do bot)
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const dayMonth = (isoDate) => {
  const [, m, d] = isoDate.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`;
};

export const escapeHtml = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
