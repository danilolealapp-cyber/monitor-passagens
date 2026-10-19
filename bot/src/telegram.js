export async function telegram(env, method, body) {
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram (${method}): ${json.description}`);
  return json.result;
}

export const sendHtml = (env, chatId, text) =>
  telegram(env, 'sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true });

export const sendPlain = (env, chatId, text) =>
  telegram(env, 'sendMessage', { chat_id: chatId, text, disable_web_page_preview: true });

// Senha do webhook, derivada do token do bot (não precisa de outra chave)
export async function webhookSecret(env) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(env.TELEGRAM_BOT_TOKEN));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

export const COMMANDS = [
  { command: 'relatorio', description: 'Preços atuais de todas as rotas' },
  { command: 'rotas', description: 'Lista das rotas monitoradas' },
  { command: 'agendar', description: 'Relatório diário em horários fixos (ex.: /agendar 08:00)' },
  { command: 'silenciar', description: 'Parar o relatório após cada varredura (alertas continuam)' },
  { command: 'reativar', description: 'Voltar a receber o relatório após cada varredura' },
  { command: 'buscar', description: 'Fazer uma varredura agora' },
  { command: 'ajuda', description: 'Ver o que o bot sabe fazer' },
];
