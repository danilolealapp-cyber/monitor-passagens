// Respostas em texto livre com o Gemini (plano gratuito do Google AI Studio).

// Modelos gratuitos tentados em ordem quando o anterior está sobrecarregado ou indisponível
const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-flash-lite-latest', 'gemini-2.5-flash-lite'];
const TIMEOUT_MS = 12_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Erros temporários (sobrecarga, limite, falha do servidor) valem nova tentativa
const isTransient = (status) => status === 429 || status >= 500;

async function generate(env, model, system, question, timeoutMs = TIMEOUT_MS) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: question }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 900 },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const err = new Error(`Gemini ${res.status} (${model}): ${(await res.text()).slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  const json = await res.json();
  return (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim();
}

// A Cloudflare encerra o trabalho em segundo plano após ~30s. Todas as tentativas
// precisam caber nesse tempo, com folga para enviar a resposta no Telegram.
const TOTAL_BUDGET_MS = 20_000;

// Tenta o modelo principal (com uma nova tentativa) e depois os modelos reserva.
async function generateWithFallback(env, system, question) {
  const primary = env.GEMINI_MODEL || 'gemini-flash-latest';
  const models = [primary, ...FALLBACK_MODELS.filter((m) => m !== primary)];
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let lastError;
  for (const [i, model] of models.entries()) {
    const attempts = i === 0 ? 2 : 1;
    for (let a = 0; a < attempts; a++) {
      const remaining = deadline - Date.now();
      if (remaining < 3000) throw lastError ?? Object.assign(new Error('Tempo esgotado'), { name: 'TimeoutError' });
      try {
        return await generate(env, model, system, question, Math.min(TIMEOUT_MS, remaining));
      } catch (err) {
        lastError = err;
        console.error(err.message);
        const timedOut = err.name === 'TimeoutError' || err.name === 'AbortError';
        if (!timedOut && err.status !== 404 && !isTransient(err.status)) throw err; // erro de configuração
        if (a + 1 < attempts) await sleep(1500);
      }
    }
  }
  throw lastError;
}

// Monta um resumo compacto dos dados para a IA consultar
async function buildContext(db, routes) {
  const data = [];
  for (const r of routes) {
    const snaps = await db.latest(`routes/${r.id}`, 'snapshots', 'scannedAt', 30);
    data.push({
      rota: `${r.origin} → ${r.destination} (${r.name ?? ''})`,
      tipo: r.tripType === 'oneway' ? 'só ida' : 'ida e volta',
      ativa: r.active,
      periodo_ida: `${r.departFrom} a ${r.departTo}`,
      noites: r.tripType === 'oneway' ? 'não se aplica (só ida)' : `${r.minNights} a ${r.maxNights}`,
      alerta_quando_cair: `${Math.round((r.alertThreshold ?? 0.3) * 100)}%`,
      menor_preco_atual: r.lastPrice,
      preco_usual_30_dias: r.baseline,
      melhores_datas_ultima_varredura: (snaps[0]?.topOffers ?? []).slice(0, 6).map((o) => ({
        ida: o.departDate,
        volta: o.returnDate,
        noites: o.nights,
        preco: o.price,
        companhia: o.airline,
        conexoes: o.transfers,
      })),
      historico_menor_preco: snaps
        .slice()
        .reverse()
        .map((s) => ({ quando: s.scannedAt?.toISOString?.().slice(0, 16), preco: s.minPrice })),
    });
  }
  const alerts = await db.latest(null, 'alerts', 'createdAt', 5);
  return {
    hoje: new Date().toISOString().slice(0, 10),
    rotas: data,
    alertas_recentes: alerts.map((a) => ({
      quando: a.createdAt?.toISOString?.().slice(0, 10),
      preco: a.price,
      queda: `${Math.round((a.dropPct ?? 0) * 100)}%`,
    })),
  };
}

const SYSTEM = `Você é o assistente do "Radar de Passagens", um bot de Telegram que acompanha preços de passagens aéreas (1 adulto, econômica).
Cada rota é "ida e volta" ou "só ida" (campo "tipo"). Sempre diga o tipo ao citar um preço, por exemplo "R$ 3.968 (ida e volta)".
Os preços vêm do Google Flights, conferidos 3 vezes por dia (07h, 13h e 20h, horário de Brasília).
Responda em português do Brasil, de forma curta e direta (no máximo ~8 linhas), em texto simples, sem markdown.
Use apenas os dados fornecidos. Se a pergunta não puder ser respondida com eles, diga isso e sugira o que o usuário pode fazer.
Datas no formato "7 mar". Valores em reais, como "R$ 3.968".
Você não consegue comprar passagens, nem criar ou editar rotas: para isso, oriente a usar o site do monitor.
Comandos disponíveis para sugerir: /relatorio, /rotas, /agendar 08:00, /silenciar, /reativar, /buscar.`;

export async function answer(env, db, routes, question) {
  if (!env.GEMINI_API_KEY) return 'A IA ainda não foi configurada. Use /relatorio ou /rotas enquanto isso.';

  const context = await buildContext(db, routes);
  const system = `${SYSTEM}\n\nDados atuais (JSON):\n${JSON.stringify(context)}`;

  try {
    return (await generateWithFallback(env, system, question)) || 'Não consegui formular uma resposta. Tente reformular a pergunta.';
  } catch (err) {
    if (err.status === 429) {
      return 'Atingi o limite gratuito de perguntas da IA por agora. Tente de novo em alguns minutos. Enquanto isso, /relatorio mostra os preços atuais.';
    }
    if (isTransient(err.status) || err.name === 'TimeoutError' || err.name === 'AbortError') {
      return 'A IA do Google está sobrecarregada agora e não conseguiu responder. Tente de novo em alguns minutos. Enquanto isso, /relatorio mostra os preços atuais.';
    }
    throw err;
  }
}
