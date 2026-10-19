import { useSettings } from '../lib/data';
import { timeAgo } from '../lib/format';

// O maior intervalo entre varreduras é de 11h (20h → 07h); acima de 12h está atrasada
const LATE_MS = 12 * 3600_000;

function Row({ label, value, hint, tone = 'ok' }) {
  const dot = { ok: 'bg-deal', warn: 'bg-ipe', off: 'bg-muted/60' }[tone];
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <span className={`mt-1.5 size-2 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-muted">{label}</span>
          <span className="text-right text-sm font-semibold">{value}</span>
        </div>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
    </div>
  );
}

// Situação do robô e do bot do Telegram
export default function StatusPanel({ routes }) {
  const settings = useSettings();

  const lastScan = routes
    .map((r) => r.lastScanAt?.toDate?.())
    .filter(Boolean)
    .sort((a, b) => b - a)[0];
  const late = lastScan && Date.now() - lastScan.getTime() > LATE_MS;
  const failed = routes.some((r) => r.active && r.lastScanStatus && r.lastScanStatus !== 'ok');

  return (
    <section aria-labelledby="status" className="card p-5">
      <h2 id="status" className="text-lg font-bold">
        Status
      </h2>
      <div className="mt-4 divide-y divide-line">
        <Row
          label="Última varredura"
          value={lastScan ? timeAgo(lastScan) : 'ainda não'}
          tone={!lastScan || late || failed ? 'warn' : 'ok'}
          hint={
            late
              ? 'Atrasada. Confira a aba Actions no GitHub.'
              : failed
                ? 'Alguma rota não teve preço novo na última varredura. Os preços mostrados são da anterior.'
                : null
          }
        />
        {settings !== undefined && (
          <>
            <Row
              label="Telegram"
              value={settings.chatId ? 'Conectado' : 'Não ativado'}
              tone={settings.chatId ? 'ok' : 'warn'}
              hint={settings.chatId ? null : 'No bot, envie /start seguido do código de ativação.'}
            />
            <Row
              label="Relatório diário"
              value={settings.reportTimes?.length ? settings.reportTimes.join(', ') : 'Não agendado'}
              tone={settings.reportTimes?.length ? 'ok' : 'off'}
              hint={settings.reportTimes?.length ? null : 'No bot, envie /agendar 08:00.'}
            />
            <Row
              label="Relatório após varredura"
              value={settings.scanReports === false ? 'Silenciado' : 'Ligado'}
              tone={settings.scanReports === false ? 'off' : 'ok'}
              hint={settings.scanReports === false ? 'Os alertas de queda continuam chegando.' : null}
            />
          </>
        )}
      </div>
    </section>
  );
}
