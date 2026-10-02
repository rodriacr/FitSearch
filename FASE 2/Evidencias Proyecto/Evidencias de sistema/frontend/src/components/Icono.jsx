// Íconos de línea usados en la interfaz (SVG en línea, heredan el color del texto).
const TRAZOS = {
  buscar: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
  usuario: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></>,
  correo: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  candado: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  ojo: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  ojoTachado: <><path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-2.2 3.2M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /><path d="m3 3 18 18" /></>,
  flecha: <path d="M5 12h14m-6-6 6 6-6 6" />,
  flechaIzquierda: <path d="M19 12H5m6-6-6 6 6 6" />,
  maletin: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" /></>,
  salir: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9" />,
  balanza: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 9a4 4 0 0 1 8 0Z" /><path d="m12 9 1.2-2" /></>,
  regla: <><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M7 6h4M7 10h3M7 14h4M7 18h3" /></>,
  calendario: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  persona: <><circle cx="10" cy="14" r="5" /><path d="M14 10l6-6m-5 0h5v5" /></>,
  actividad: <><circle cx="14" cy="4" r="2" /><path d="m7 21 3-6 3 2v5M10 15l1-6 4 3 3-1M11 9 7 10l-2 3" /></>,
  objetivoBajar: <><path d="M12 3v14m-5-5 5 5 5-5" /><path d="M5 21h14" /></>,
  objetivoMantener: <><path d="M4 12h16" /><path d="M4 8h16M4 16h16" opacity=".35" /></>,
  mancuerna: <><path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12" /></>,
  rayo: <path d="M13 2 4 14h7l-1 8 9-12h-7Z" />,
  mas: <><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>,
  check: <path d="m5 12 5 5 9-10" />,
  lapiz: <><path d="M4 20h4L19 9l-4-4L4 16Z" /><path d="m13.5 6.5 4 4" /></>,
  escudo: <><path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6Z" /><path d="m9 12 2 2 4-4" /></>,
  corazon: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  grafico: <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />,
  estrella: <path d="m12 3 2.7 5.6 6.1.8-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.8Z" />,
  candadoCerrado: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4M12 15v2" /></>,
  medico: <><path d="M6 3v6a4 4 0 0 0 8 0V3" /><path d="M10 13v2a5 5 0 0 0 10 0v-2" /><circle cx="20" cy="11" r="2" /></>,
};

export default function Icono({ nombre, tamano = 20, className = '' }) {
  return (
    <svg className={`icono ${className}`} width={tamano} height={tamano} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {TRAZOS[nombre]}
    </svg>
  );
}

export function LogoGoogle({ tamano = 20 }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
