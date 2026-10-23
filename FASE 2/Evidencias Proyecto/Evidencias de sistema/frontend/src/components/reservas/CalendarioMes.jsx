import { useEffect, useRef } from 'react';
import Icono from '../Icono.jsx';
import { ahoraChile, diasDelMes, tituloMes } from '../../services/agenda.js';
import './CalendarioMes.css';

const DIAS_SEMANA = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const sumarDias = (fecha, dias) => new Date(Date.parse(`${fecha}T12:00:00Z`) + dias * 86400000).toISOString().slice(0, 10);

// Calendario de un mes, de lunes a domingo, compartido por la reserva del usuario (FS-HU-14) y la publicación de
// horarios del profesional (FS-HU-13). Quien lo usa decide con describirDia(fecha) qué días se pueden elegir
// ({ habilitado }), cuáles llevan punto ({ marcado }) y cómo se anuncia cada uno ({ etiqueta }).
// Teclado: las flechas pasan al día habilitado siguiente o anterior (arriba y abajo, una semana); Inicio y Fin, al
// primero y al último del mes. Solo el día elegido (o el primero habilitado) recibe Tab.
export default function CalendarioMes({
  id, mes, dia, onElegir, onMes, anterior, siguiente, describirDia,
  etiquetaAnterior = 'Mes anterior', etiquetaSiguiente = 'Mes siguiente',
}) {
  const contenedor = useRef(null);
  const enfocar = useRef(false);
  const hoy = ahoraChile().slice(0, 10);
  const celdas = diasDelMes(mes);
  const habilitados = celdas.filter((fecha) => fecha && describirDia(fecha).habilitado);
  const conTab = habilitados.includes(dia) ? dia : habilitados[0];

  useEffect(() => {
    if (!enfocar.current) return;
    enfocar.current = false;
    contenedor.current?.querySelector(`[data-fecha="${dia}"]`)?.focus();
  }, [dia]);

  const elegir = (fecha, conFoco = false) => {
    enfocar.current = conFoco;
    onElegir(fecha);
  };
  const moverConTeclado = (evento) => {
    const base = conTab;
    const destinos = {
      ArrowRight: () => habilitados.find((f) => f > base),
      ArrowLeft: () => habilitados.findLast((f) => f < base),
      ArrowDown: () => habilitados.find((f) => f >= sumarDias(base, 7)),
      ArrowUp: () => habilitados.findLast((f) => f <= sumarDias(base, -7)),
      Home: () => habilitados[0],
      End: () => habilitados.at(-1),
    };
    if (!destinos[evento.key] || !base) return;
    evento.preventDefault();
    const destino = destinos[evento.key]();
    if (destino) elegir(destino, true);
  };

  return (
    <div className="calendario">
      <div className="calendario__mes">
        <h3 id={id}>{tituloMes(mes)}</h3>
        <button type="button" className="boton-icono" aria-label={etiquetaAnterior} disabled={!anterior} onClick={() => onMes(anterior)}>
          <Icono nombre="flechaIzquierda" tamano={18} />
        </button>
        <button type="button" className="boton-icono" aria-label={etiquetaSiguiente} disabled={!siguiente} onClick={() => onMes(siguiente)}>
          <Icono nombre="flecha" tamano={18} />
        </button>
      </div>
      <div className="calendario__semana" aria-hidden="true">{DIAS_SEMANA.map((d) => <span key={d}>{d}</span>)}</div>
      <div ref={contenedor} className="calendario__dias" role="group" aria-labelledby={id} onKeyDown={moverConTeclado}>
        {celdas.map((fecha, i) => {
          if (!fecha) return <span key={`hueco-${i}`} />;
          const { habilitado, marcado, etiqueta } = describirDia(fecha);
          const clases = ['calendario__dia', habilitado && 'calendario__dia--habilitado', marcado && 'calendario__dia--marcado',
            fecha === dia && 'calendario__dia--elegido', fecha === hoy && 'calendario__dia--hoy'].filter(Boolean).join(' ');
          return (
            <button key={fecha} type="button" className={clases} data-fecha={fecha} disabled={!habilitado} aria-pressed={fecha === dia}
              aria-label={etiqueta} tabIndex={fecha === conTab ? 0 : -1} onClick={() => elegir(fecha)}>
              {Number(fecha.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
