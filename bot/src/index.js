// Bot do Telegram do Monitor de passagens (Cloudflare Worker).
// - POST /telegram  → recebe as mensagens do Telegram (webhook)
// - GET  /setup     → registra o webhook e o menu de comandos (chamado na publicação)
// - a cada 15 min   → envia o relatório diário nos horários agendados

import { firestore } from './firestore.js';
import { COMMANDS, sendHtml, sendPlain, telegram, webhookSecret } from './telegram.js';
import { brasiliaNow, brl, dayMonth, hasNewScan, reportText, routeLabel } from './format.js';
import { answer } from './ai.js';

const SETTINGS = 'settings/bot';

const HELP = [
  '✈️ <b>Radar de Passagens</b>',
  '',
  '/relatorio: preços atuais de todas as rotas',
  '/rotas: rotas monitoradas',
  '/agendar 08:00: relatório nesse horário (até 3 horários, ex.: /agendar 08:00 18:30). Ao agendar, o relatório após cada varredura é desligado',
  '/agendar nenhum: cancela o agendamento e volta ao relatório após cada varredura',
  '/silenciar: para o relatório após cada varredura (os alertas de queda continuam)',
  '/reativar: volta a receber o relatório após cada varredura',
  '/buscar: faz uma varredura agora',
  '',
  'Você também pode perguntar livremente, por exemplo: <i>qual a data mais barata para Lisboa?</i>',
].join('\n');

// Arredonda para o intervalo de 15 minutos em que o agendamento roda
function parseTimes(args) {
  const times = [];
  for (const raw of args) {
    const m = raw.match(/^(\d{1,2})(?:[:h](\d{2}))?h?$/i);
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2] ?? 0);
    if (h > 23 || min > 59) return null;
    const rounded = Math.floor(min / 15) * 15;
    times.push(`${String(h).padStart(2, '0')}:${String(rounded).padStart(2, '0')}`);
  }
  return [...new Set(times)].sort().slice(0, 3);
}

async function triggerScan(env) {
  if (!env.GH_TOKEN || !env.GH_REPO) return false;
  const res = await fetch(`https://api.github.com/repos/${env.GH_REPO}/actions/workflows/scan.yml/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'monitor-passagens-bot',
    },
    body: JSON.stringify({ ref: 'main' }),
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return true;
}

async function handleMessage(env, message) {
  const chatId = message.chat.id;
  const text = (message.text ?? '').trim();
  if (!text) return;

  const db = firestore(env);
  const settings = (await db.get(SETTINGS)) ?? {};
  const [rawCommand, ...args] = text.split(/\s+/);
  const command = rawCommand.toLowerCase().replace(/@.*$/, ''); // remove "@nomedobot"

  // Ativação: /start <código>
  if (command === '/start') {
    if (String(settings.chatId) === String(chatId)) return sendHtml(env, chatId, HELP);
    if (env.ACTIVATION_CODE && args[0] === env.ACTIVATION_CODE) {
      await db.merge(SETTINGS, { chatId: String(chatId), activatedAt: new Date() });
      return sendHtml(env, chatId, `✅ Pronto! Este chat agora recebe os alertas e relatórios.\n\n${HELP}`);
    }
    return sendPlain(env, chatId, 'Para ativar, envie /start seguido do código de ativação. Ex.: /start ABC123');
  }

  // Só o chat ativado conversa com o bot
  if (String(settings.chatId) !== String(chatId)) {
    return sendPlain(env, chatId, 'Este bot é privado. Se você é o dono, envie /start seguido do código de ativação.');
  }

  const routes = await db.list('routes');

  switch (command) {
    case '/ajuda':
    case '/help':
      return sendHtml(env, chatId, HELP);

    case '/relatorio':
      return sendHtml(env, chatId, reportText(routes));

    case '/rotas': {
      if (!routes.length) return sendPlain(env, chatId, 'Nenhuma rota cadastrada. Cadastre destinos no site.');
      const lines = routes.map(
        (r) =>
          `${r.active ? '🟢' : '⏸'} <b>${routeLabel(r)}</b>\n` +
          `   Ida entre ${dayMonth(r.departFrom)} e ${dayMonth(r.departTo)}` +
          (r.tripType === 'oneway' ? ', sem volta\n' : `, ${r.minNights} a ${r.maxNights} noites\n`) +
          `   Agora: ${brl(r.lastPrice)}, alerta em −${Math.round((r.alertThreshold ?? 0.3) * 100)}%`,
      );
      return sendHtml(env, chatId, `🗺 <b>Suas rotas</b>\n\n${lines.join('\n\n')}`);
    }

    case '/agendar': {
      if (!args.length) {
        const current = settings.reportTimes?.length ? settings.reportTimes.join(', ') : 'nenhum';
        return sendHtml(env, chatId, `🕒 Relatório diário: <b>${current}</b>\n\nPara mudar: /agendar 08:00 (até 3 horários)\nPara cancelar: /agendar nenhum`);
      }
      if (['nenhum', 'off', 'cancelar'].includes(args[0].toLowerCase())) {
        await db.merge(SETTINGS, { reportTimes: [], scanReports: true });
        return sendPlain(env, chatId, '🕒 Relatório agendado cancelado. Voltei a enviar o relatório após cada varredura (07h, 13h e 20h).');
      }
      const times = parseTimes(args);
      if (!times) return sendPlain(env, chatId, 'Não entendi o horário. Use, por exemplo: /agendar 08:00 ou /agendar 8h 18:30');
      // Quem agenda escolhe quando quer receber: desliga o relatório após cada varredura
      await db.merge(SETTINGS, { reportTimes: times, scanReports: false });
      return sendHtml(
        env,
        chatId,
        [
          `🕒 Combinado! Relatório diário às <b>${times.join(', ')}</b> (horário de Brasília).`,
          '',
          '🔕 Desliguei o relatório após cada varredura, para você não receber repetido. Os alertas de queda continuam chegando na hora.',
          'Se não houver varredura nova desde o último relatório, o agendado não é enviado de novo.',
          '',
          'Para receber após cada varredura também: /reativar',
        ].join('\n'),
      );
    }

    case '/silenciar':
      await db.merge(SETTINGS, { scanReports: false });
      return sendPlain(env, chatId, '🔕 Relatórios após cada varredura desligados. Os alertas de queda continuam chegando.');

    case '/reativar':
      await db.merge(SETTINGS, { scanReports: true });
      return sendPlain(env, chatId, '🔔 Relatórios após cada varredura religados.');

    case '/buscar': {
      const started = await triggerScan(env);
      return sendPlain(
        env,
        chatId,
        started
          ? '🔎 Varredura iniciada. O relatório chega em 2 a 4 minutos.'
          : 'A busca manual ainda não foi configurada. Use /relatorio para ver os preços da última varredura.',
      );
    }

    default: {
      if (text.startsWith('/')) return sendPlain(env, chatId, 'Comando desconhecido. Envie /ajuda para ver as opções.');
      await telegram(env, 'sendChatAction', { chat_id: chatId, action: 'typing' });
      return sendPlain(env, chatId, await answer(env, db, routes, text));
    }
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const secret = await webhookSecret(env);

    if (url.pathname === '/telegram' && request.method === 'POST') {
      if (request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== secret) return new Response('forbidden', { status: 403 });
      const update = await request.json();
      if (update.message) {
        // Responde ao Telegram na hora e processa em segundo plano
        ctx.waitUntil(
          handleMessage(env, update.message).catch(async (err) => {
            console.error(err);
            await sendPlain(env, update.message.chat.id, `⚠️ Algo deu errado: ${err.message}`).catch(() => {});
          }),
        );
      }
      return new Response('ok');
    }

    if (url.pathname === '/setup') {
      if (url.searchParams.get('key') !== secret) return new Response('forbidden', { status: 403 });
      await telegram(env, 'setWebhook', {
        url: `${url.origin}/telegram`,
        secret_token: secret,
        allowed_updates: ['message'],
        drop_pending_updates: false, // mensagens enviadas durante uma atualização não se perdem
      });
      await telegram(env, 'setMyCommands', { commands: COMMANDS });
      return new Response('webhook configurado');
    }

    return new Response('Radar de Passagens: bot ativo.');
  },

  // Relatório diário nos horários agendados (roda a cada 15 minutos)
  async scheduled(event, env) {
    const db = firestore(env);
    const settings = (await db.get(SETTINGS)) ?? {};
    if (!settings.chatId || !settings.reportTimes?.length) return;

    const { hour, minute } = brasiliaNow(new Date(event.scheduledTime));
    const slot = `${String(hour).padStart(2, '0')}:${String(Math.floor(minute / 15) * 15).padStart(2, '0')}`;
    if (!settings.reportTimes.includes(slot)) return;

    const routes = await db.list('routes');
    if (!hasNewScan(settings, routes)) return; // nada novo desde o último relatório

    await sendHtml(env, settings.chatId, reportText(routes));
    await db.merge(SETTINGS, { lastReportAt: new Date() });
  },
};
