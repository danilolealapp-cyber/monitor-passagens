import { Plane } from 'lucide-react';

// Para trocar o nome do app, altere aqui (e o <title> em web/index.html).
export const BRAND_NAME = 'Radar de Passagens';
export const BRAND_SHORT = 'Radar';

/**
 * Ícone da marca: avião decolando sobre arcos de radar, em um quadrado de cantos suaves.
 * O avião fica sobre o fundo amarelo-ipê.
 */
export function Logo({ className = 'size-9' }) {
  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-[10px] bg-ipe text-ipe-ink ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 36 36" className="absolute inset-0 size-full" fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1.5">
        <circle cx="4" cy="32" r="11" />
        <circle cx="4" cy="32" r="21" />
      </svg>
      <Plane className="relative size-[55%]" fill="currentColor" strokeWidth={1.75} />
    </span>
  );
}

/** Ícone + nome. `onDark` ajusta as cores para fundo escuro. */
export default function Brand({ onDark = false, compact = false }) {
  return (
    <span className="flex items-center gap-2.5">
      <Logo />
      <span className={`text-[17px] leading-none font-extrabold tracking-tight whitespace-nowrap ${onDark ? 'text-sky-ink' : 'text-ink'}`}>
        {BRAND_SHORT}
        <span className={`font-medium ${compact ? 'hidden sm:inline' : ''} ${onDark ? 'text-sky-muted' : 'text-muted'}`}> de Passagens</span>
      </span>
    </span>
  );
}
