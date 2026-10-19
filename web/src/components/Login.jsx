import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

export default function Login({ notice, disabled = false }) {
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Não foi possível entrar. Tente de novo ou use outro navegador.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col justify-between bg-sky px-6 py-10 text-sky-ink">
      <div className="mx-auto w-full max-w-md pt-[12vh]">
        <svg viewBox="0 0 48 48" className="size-12" aria-hidden="true">
          <path d="M4 30 44 16l-6 18z" fill="var(--ipe)" />
          <path d="M4 30l14 2 4 10 4-9" fill="none" stroke="var(--ipe)" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        <h1 className="mt-8 text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl">
          Monitor de passagens
        </h1>
        <p className="mt-4 max-w-sm text-lg text-sky-muted">
          Preços saindo de Brasília, conferidos três vezes por dia. Você recebe um aviso quando cair de verdade.
        </p>

        <button
          type="button"
          onClick={signIn}
          disabled={disabled || busy}
          className="mt-10 inline-flex items-center gap-3 rounded-full bg-ipe px-6 py-3.5 font-semibold text-ipe-ink transition hover:brightness-105 disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
            <path
              fill="currentColor"
              d="M21.35 11.1H12v2.98h5.35c-.23 1.5-1.68 4.4-5.35 4.4a5.97 5.97 0 0 1 0-11.94c1.84 0 3.07.78 3.78 1.46l2.58-2.49A9.4 9.4 0 0 0 12 2.6a9.4 9.4 0 1 0 0 18.8c5.43 0 9.03-3.82 9.03-9.2 0-.62-.07-1.09-.15-1.56z"
            />
          </svg>
          {busy ? 'Entrando…' : 'Entrar com Google'}
        </button>

        {(notice || error) && (
          <p role="alert" className="mt-6 max-w-sm rounded-lg bg-white/10 px-4 py-3 text-sm">
            {notice || error}
          </p>
        )}
      </div>
      <p className="mx-auto w-full max-w-md text-sm text-sky-muted">Acesso restrito à conta autorizada.</p>
    </main>
  );
}
