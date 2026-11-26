import { useId } from 'react';

// Medalla metálica de Mis logros (25-11-2026): cinta del color de la colección, borde y disco con el metal del nivel,
// ícono en el centro, brillo y de 1 a 4 estrellas según el nivel. Las bloqueadas se ven en gris con un candado.
const METALES = {
  bronce: ['#ffd9b5', '#c97a3d', '#6e3510', '#ffe8d2'],
  plata: ['#ffffff', '#b9c5d1', '#5d6d7d', '#ffffff'],
  oro: ['#fff4b8', '#f3b622', '#9a5a05', '#fffbe0'],
  platino: ['#effcff', '#86d3f2', '#1d5c9c', '#ffffff'],
  secreta: ['#f6e3ff', '#a77be6', '#4b2a8c', '#fbf2ff'],
  temporada: ['#ffe0c2', '#ff8a3d', '#c22f5e', '#ffffff'],
  bloqueada: ['#eef2f6', '#a9b6c3', '#6b7a89', '#ffffff'],
};
const ESTRELLAS = { bronce: 1, plata: 2, oro: 3, platino: 4 };
const ICONOS = {
  rayo: <path d="M13 2 4 14h6l-1 8 9-12h-6z" />,
  gota: <path d="M12 2.5S5 10.2 5 14.6a7 7 0 0 0 14 0C19 10.2 12 2.5 12 2.5z" />,
  balanza: <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M12 3v18M5 21h14M6 7h12M6 7l-3 7a3 3 0 0 0 6 0zM18 7l-3 7a3 3 0 0 0 6 0z" />,
  hoja: <path d="M20 3C9 3 4 9 4 16c0 1.6.4 3 1 4 1-5 4-8 9-10-4 3-6 6-7 10 9 0 13-6 13-17z" />,
  medico: <><path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M6 3v6a5 5 0 0 0 10 0V3M11 14v2a5 5 0 0 0 10 0v-2" /><circle cx="21" cy="12" r="2" /></>,
  brujula: <><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></>,
  amanecer: <><path d="M5 16a7 7 0 0 1 14 0z" /><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M2 19h20M12 3v4M4.9 7.9l2 2M19.1 7.9l-2 2" /></>,
  arcoiris: <path fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" d="M3 18a9 9 0 0 1 18 0M6.5 18a5.5 5.5 0 0 1 11 0M10 18a2 2 0 0 1 4 0" />,
  calendario: <><rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" /><path stroke="currentColor" strokeWidth="2" d="M3 10h18M8 3v4M16 3v4" /></>,
  estrella: <path d="m12 2.8 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.3l-5.7 3 1.1-6.3-4.6-4.5 6.4-.9z" />,
  sol: <><circle cx="12" cy="12" r="4.5" /><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1" /></>,
  pregunta: <><path fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" d="M9 9a3 3 0 1 1 4.2 2.8c-.8.4-1.2 1-1.2 1.9V15" /><circle cx="12" cy="19" r="1.4" /></>,
};

export default function Medalla({ nivel = 'bronce', icono = 'estrella', color = '#1565a0', tamano = 64, bloqueada = false, titulo }) {
  const id = useId().replace(/:/g, '');
  const [claro, medio, oscuro, brillo] = METALES[bloqueada ? 'bloqueada' : nivel] ?? METALES.bronce;
  const cinta = bloqueada ? '#b9c4ce' : color;
  const estrellas = bloqueada ? 0 : ESTRELLAS[nivel] ?? 0;
  const dibujo = ICONOS[icono] ?? ICONOS.estrella;
  return (
    <svg className={`medalla${bloqueada ? ' medalla--bloqueada' : ''}`} width={tamano} height={Math.round(tamano * 1.22)} viewBox="0 0 120 146"
      role={titulo ? 'img' : undefined} aria-label={titulo} aria-hidden={titulo ? undefined : 'true'} focusable="false">
      <defs>
        <linearGradient id={`${id}-borde`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={claro} /><stop offset=".45" stopColor={medio} /><stop offset="1" stopColor={oscuro} /></linearGradient>
        <radialGradient id={`${id}-disco`} cx=".35" cy=".3" r=".8"><stop offset="0" stopColor={brillo} /><stop offset=".5" stopColor={medio} /><stop offset="1" stopColor={oscuro} /></radialGradient>
      </defs>
      <path d="M38 2h18l10 40H48z" fill={cinta} />
      <path d="M64 2h18L72 42H54z" fill={cinta} opacity=".82" />
      <path d="M44 2h6l9 38h-6z" fill="#fff" opacity=".32" />
      <circle cx="60" cy="86" r="48" fill={`url(#${id}-borde)`} />
      <circle cx="60" cy="86" r="40" fill={`url(#${id}-disco)`} stroke={oscuro} strokeOpacity=".45" strokeWidth="2" />
      <circle cx="60" cy="86" r="34" fill="none" stroke={brillo} strokeOpacity=".55" strokeWidth="1.5" strokeDasharray="2 4" />
      <svg x="38" y="64" width="44" height="44" viewBox="0 0 24 24" fill={oscuro} color={oscuro} opacity=".4"><g transform="translate(.6 .8)">{dibujo}</g></svg>
      <svg x="38" y="64" width="44" height="44" viewBox="0 0 24 24" fill="#fff" color="#fff">{dibujo}</svg>
      <ellipse cx="44" cy="62" rx="22" ry="12" transform="rotate(-25 44 62)" fill="#fff" opacity=".28" />
      {nivel === 'platino' && !bloqueada && <path d="M88 52l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#fff" opacity=".95" />}
      {Array.from({ length: estrellas }, (_, k) => (
        <path key={k} transform={`translate(${60 + (k - (estrellas - 1) / 2) * 11} 128) scale(.42)`}
          d="M0-10 2.9-3.1 10-3.1 4.3 1.2 6.5 8.1 0 3.9-6.5 8.1-4.3 1.2-10-3.1-2.9-3.1z" fill={brillo} stroke={oscuro} strokeWidth="1.6" />
      ))}
      {bloqueada && (
        <g transform="translate(80 110)">
          <circle r="13" fill="#5f6f80" stroke="#fff" strokeWidth="3" />
          <path d="M-5 -1h10v8h-10zM-3 -1v-3a3 3 0 0 1 6 0v3" fill="none" stroke="#fff" strokeWidth="2" />
        </g>
      )}
    </svg>
  );
}
