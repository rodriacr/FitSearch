import { useRef, useState } from 'react';
import Icono from '../Icono.jsx';

// Menú de la ficha pública del profesional (15-11-2026): su información en pestañas, una a la vez, para que la ficha no
// se vea saturada. Sigue el patrón de pestañas de WAI-ARIA: un solo Tab entra a la pestaña elegida y las flechas,
// Inicio y Fin recorren las demás.
export default function PestanasFicha({ pestanas, etiqueta }) {
  const [activa, setActiva] = useState(pestanas[0].id);
  const botones = useRef(new Map());
  const actual = pestanas.find(({ id }) => id === activa) ?? pestanas[0];
  const indice = pestanas.indexOf(actual);

  const alPresionar = (evento) => {
    const paso = { ArrowRight: 1, ArrowLeft: -1 }[evento.key];
    let siguiente = null;
    if (paso) siguiente = (indice + paso + pestanas.length) % pestanas.length;
    if (evento.key === 'Home') siguiente = 0;
    if (evento.key === 'End') siguiente = pestanas.length - 1;
    if (siguiente === null) return;
    evento.preventDefault();
    setActiva(pestanas[siguiente].id);
    botones.current.get(pestanas[siguiente].id)?.focus();
  };

  return (
    <section className="ficha__seccion ficha-pestanas" aria-label={etiqueta}>
      <div className="ficha-pestanas__lista" role="tablist" aria-label={etiqueta} onKeyDown={alPresionar}>
        {pestanas.map(({ id, titulo, icono }) => (
          <button key={id} ref={(boton) => { botones.current.set(id, boton); }} type="button" role="tab" id={`pestana-${id}`}
            aria-selected={id === actual.id} aria-controls={`panel-${id}`} tabIndex={id === actual.id ? 0 : -1} onClick={() => setActiva(id)}>
            <Icono nombre={icono} tamano={18} activo={id === actual.id} /> {titulo}
          </button>
        ))}
      </div>
      <div className="ficha-pestanas__panel" role="tabpanel" id={`panel-${actual.id}`} aria-labelledby={`pestana-${actual.id}`} tabIndex={0}>
        {actual.contenido}
      </div>
    </section>
  );
}
