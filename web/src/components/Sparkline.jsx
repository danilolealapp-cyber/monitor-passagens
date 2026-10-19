// Mini-gráfico de tendência (SVG simples, sem eixos).
export default function Sparkline({ values, width = 120, height = 40 }) {
  if (!values || values.length < 2) return null;

  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low || 1;
  const pad = 3;
  const x = (i) => pad + (i / (values.length - 1)) * (width - pad * 2);
  const y = (v) => pad + (1 - (v - low) / span) * (height - pad * 2);

  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(values.length - 1)},${height} L${x(0)},${height} Z`;
  const last = values.at(-1);
  const falling = last <= values[0];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true" className="overflow-visible">
      <path d={area} fill={falling ? 'var(--deal)' : 'var(--high)'} opacity="0.12" />
      <path d={line} fill="none" stroke={falling ? 'var(--deal)' : 'var(--high)'} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(values.length - 1)} cy={y(last)} r="3.5" fill="var(--surface)" stroke={falling ? 'var(--deal)' : 'var(--high)'} strokeWidth="2" />
    </svg>
  );
}
