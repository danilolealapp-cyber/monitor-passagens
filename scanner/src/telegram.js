const API = 'https://api.telegram.org/bot';

function token() {
  const value = process.env.TELEGRAM_BOT_TOKEN;
  if (!value) throw new Error('TELEGRAM_BOT_TOKEN não definido.');
  return value;
}

export async function callTelegram(method, body = {}) {
  const res = await fetch(`${API}${token()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram recusou (${method}): ${json.description}`);
  return json.result;
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

export const dayMonth = (isoDate) => {
  const [, m, d] = isoDate.split('-');
  return `${d}/${m}`;
};

export const escapeHtml = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
