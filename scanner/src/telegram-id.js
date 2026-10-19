// Descobre o seu "chat id" do Telegram.
// Antes de rodar: abra o seu bot no Telegram e mande qualquer mensagem (ex.: "oi").

import { callTelegram } from './telegram.js';

const bot = await callTelegram('getMe');
console.log(`🤖 Seu bot: @${bot.username}  →  https://t.me/${bot.username}\n`);

const updates = await callTelegram('getUpdates');
const chats = new Map();
for (const u of updates) {
  const chat = u.message?.chat;
  if (chat) chats.set(chat.id, chat.first_name || chat.title || chat.username);
}

if (!chats.size) {
  console.log(`Nenhuma mensagem encontrada. Abra https://t.me/${bot.username}, toque em "Iniciar"`);
  console.log('(ou mande um "oi") e rode este comando de novo em até alguns minutos.');
} else {
  for (const [id, name] of chats) console.log(`✅ ${name}: TELEGRAM_CHAT_ID=${id}`);
}
