import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { BellRing, Clock3, LineChart, Plane } from 'lucide-react';
import { auth, googleProvider } from '../firebase';

function Logo({ className = 'size-7' }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path d="M4 30 44 16l-6 18z" fill="var(--ipe)" />
      <path d="M4 30l14 2 4 10 4-9" fill="none" stroke="var(--ipe)" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

// Prévia ilustrativa de um cartão de rota (decorativa)
function TicketPreview() {
  return (
    <div className="flex w-full max-w-md overflow-hidden rounded-2xl bg-surface text-ink shadow-[0_30px_60px_-20px_rgb(0_0_0/0.6)]" aria-hidden="true">
      <div className="flex w-28 shrink-0 flex-col bg-stub p-4 text-sky-ink">
        <span className="flex items-center gap-1 text-xs font-semibold text-sky-muted">
          BSB <Plane className="size-3 text-ipe" />
        </span>
        <span className="mt-2 text-4xl leading-none font-extrabold tracking-tight text-ipe">LIS</span>
        <span className="mt-2 text-sm font-semibold">Lisboa</span>
        <span className="text-xs text-sky-muted">Portugal</span>
      </div>
      <div className="ticket-cut flex-1 border-l-2 border-dashed border-line p-4">
        <p className="text-xs text-muted">Menor preço ida e volta</p>
        <p className="tnum text-3xl font-extrabold tracking-tight">R$ 3.120</p>
        <p className="mt-2 inline-block rounded-md bg-deal px-2 py-0.5 text-xs font-medium text-white">29% abaixo do usual</p>
        <div className="relative mt-4 h-1.5 rounded-full bg-gradient-to-r from-deal via-line to-high">
          <span className="absolute top-1/2 left-[62%] h-3 w-0.5 -translate-y-1/2 rounded bg-muted" />
          <span className="absolute top-1/2 left-[4%] size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-surface bg-ink" />
        </div>
        <p className="tnum mt-2 flex justify-between text-[11px] text-muted">
          <span>R$ 3.120</span>
          <span>usual R$ 4.390</span>
        </p>
      </div>
    </div>
  );
}

// Rota tracejada de fundo: sai de trás do cartão e sobe pela direita, longe do texto
function FlightArc() {
  return (
    <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 600 800" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M300 610 C 470 570, 560 400, 585 70"
        fill="none"
        stroke="var(--ipe)"
        strokeOpacity="0.4"
        strokeWidth="2"
        strokeDasharray="2 10"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

const FEATURES = [
  [Clock3, 'Preços conferidos às 07h, 13h e 20h'],
  [BellRing, 'Alerta no Telegram quando o preço cai'],
  [LineChart, 'Histórico para saber o preço usual'],
];

export default function Login({ notice, disabled = false }) {
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setError('Não foi possível entrar. Permita janelas pop-up para este site ou tente outro navegador.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      {/* Painel da marca */}
      <section className="relative hidden overflow-hidden bg-sky text-sky-ink lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <FlightArc />
        <div className="relative flex items-center gap-2.5 font-bold">
          <Logo />
          Monitor de passagens
        </div>

        <div className="relative">
          <h1 className="max-w-lg text-5xl leading-[1.05] font-extrabold tracking-tight xl:text-6xl">
            A hora certa de comprar sua passagem.
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-sky-muted">
            Acompanhamos os preços das suas rotas todos os dias e avisamos quando caem de verdade, não só quando oscilam.
          </p>
          <div className="mt-10">
            <TicketPreview />
          </div>
        </div>

        <ul className="relative grid gap-3 text-sm text-sky-muted xl:grid-cols-3 xl:gap-6">
          {FEATURES.map(([Icon, text]) => (
            <li key={text} className="flex items-start gap-2.5">
              <Icon className="mt-0.5 size-4 shrink-0 text-ipe" aria-hidden="true" />
              {text}
            </li>
          ))}
        </ul>
      </section>

      {/* Painel de acesso */}
      <main className="flex flex-col bg-bg px-6 py-8 sm:px-10">
        <div className="flex items-center gap-2.5 font-bold lg:hidden">
          <Logo />
          Monitor de passagens
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h2 className="text-3xl font-extrabold tracking-tight">Entrar no painel</h2>
          <p className="mt-2 text-muted">Use a conta Google autorizada para ver suas rotas, o histórico de preços e os alertas.</p>

          <button
            type="button"
            onClick={signIn}
            disabled={disabled || busy}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-surface px-5 py-3.5 font-semibold text-ink shadow-card transition hover:border-muted disabled:opacity-50"
          >
            <GoogleG />
            {busy ? 'Abrindo o Google…' : 'Continuar com Google'}
          </button>

          {(notice || error) && (
            <p role="alert" className="mt-4 rounded-lg bg-high-bg px-4 py-3 text-sm text-high">
              {notice || error}
            </p>
          )}

          <ul className="mt-10 space-y-3 border-t border-line pt-6 text-sm text-muted lg:hidden">
            {FEATURES.map(([Icon, text]) => (
              <li key={text} className="flex items-start gap-2.5">
                <Icon className="mt-0.5 size-4 shrink-0 text-ipe" aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-center text-xs text-muted">Acesso restrito. Outras contas Google não conseguem ver os dados.</p>
      </main>
    </div>
  );
}
