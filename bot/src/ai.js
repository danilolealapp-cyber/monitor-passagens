// Respostas em texto livre com o Gemini (plano gratuito do Google AI Studio).

const FALLBACK_MODEL = 'gemini-2.5-flash';

async function generate(env, model, system, question) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: question }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 900 },
    }),
  });
  if (!res.ok) {
    const err = new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  const json = await res.json();
  return (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim();
}

// Monta um resumo compacto dos dados para a IA consultar
async function buildContext(db, routes) {
  const data = [];
  for (const r of routes) {
    const snaps = await db.latest(`routes/${r.id}`, 'snapshots', 'scannedAt', 30);
    data.push({
      rota: `${r.origin} → ${r.destination} (${r.name ?? ''})`,
      ativa: r.active,
      periodo_ida: `${r.departFrom} a ${r.departTo}`,
      noites: `${r.minNights} a ${r.maxNights}`,
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

const SYSTEM = `Você é o assistente do "Monitor de passagens", um bot de Telegram que acompanha preços de passagens aéreas de ida e volta (1 adulto, econômica).
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
  const model = env.GEMINI_MODEL || 'gemini-flash-latest';

  try {
    return (await generate(env, model, system, question)) || 'Não consegui formular uma resposta. Tente reformular a pergunta.';
  } catch (err) {
    // Modelo indisponível: tenta o modelo reserva
    if (err.status === 404 && model !== FALLBACK_MODEL) {
      return (await generate(env, FALLBACK_MODEL, system, question)) || 'Não consegui formular uma resposta.';
    }
    if (err.status === 429) return 'Atingi o limite gratuito de perguntas por agora. Tente de novo em alguns minutos.';
    throw err;
  }
}
