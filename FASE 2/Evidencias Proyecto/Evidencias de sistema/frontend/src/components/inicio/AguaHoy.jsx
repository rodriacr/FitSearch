import { useEffect, useId, useState } from 'react';
import reglas from '@shared/reglas.json';
import Icono from '../Icono.jsx';
import { deshacerAgua, obtenerAguaHoy, sumarAgua } from '../../services/agua.service.js';
import { formatearNumero } from '../../services/formato.js';
import './AguaHoy.css';

const { vasoMl, metaDiariaMl, registro } = reglas.agua;
const RANGO = `Indica entre ${formatearNumero(registro.min)} y ${formatearNumero(registro.max)} ml`;
// Vacía, negativa, con decimales o fuera del rango: no se envía y se indica el rango (escenario 2 de FS-HU-33).
const cantidadValida = (texto) => /^\d+$/.test(texto) && Number(texto) >= registro.min && Number(texto) <= registro.max;

// «Agua hoy» en la tarjeta de progreso del Inicio (FS-HU-33): suma vasos o mililitros al día de hoy y muestra el
// avance frente a una meta general. Cada suma se puede deshacer, por si se tocó de más.
export default function AguaHoy() {
  const idCampo = useId();
  const [dia, setDia] = useState(null);
  const [errorCarga, setErrorCarga] = useState(false);
  const [intento, setIntento] = useState(0);
  const [otraCantidad, setOtraCantidad] = useState(false);
  const [cantidad, setCantidad] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    let activo = true;
    obtenerAguaHoy()
      .then((datos) => { if (activo) { setDia(datos); setErrorCarga(false); } })
      .catch(() => activo && setErrorCarga(true));
    return () => { activo = false; };
  }, [intento]);

  async function guardar(accion, avisoListo) {
    setGuardando(true);
    setError('');
    setAviso('');
    try {
      setDia(await accion());
      setAviso(avisoListo);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setGuardando(false);
    }
  }

  const sumar = (ml) => guardar(() => sumarAgua(ml), `Sumaste ${formatearNumero(ml)} ml.`);
  async function sumarOtra(evento) {
    evento.preventDefault();
    const texto = cantidad.trim();
    if (!cantidadValida(texto)) { setAviso(''); setError(RANGO); return; }
    if (await sumar(Number(texto))) { setCantidad(''); setOtraCantidad(false); }
  }

  const meta = dia?.metaMl ?? metaDiariaMl;
  const total = dia?.totalMl ?? 0;
  const ultimo = dia?.registros.at(-1);
  const avance = Math.min(total / meta, 1);

  if (errorCarga && !dia) {
    return (
      <div className="agua-hoy">
        <span className="progreso__nombre">Agua hoy</span>
        <strong className="progreso__valor"><span aria-hidden="true">—</span><small> / {formatearNumero(meta)} ml</small></strong>
        <p className="agua-hoy__mensaje agua-hoy__mensaje--error" role="alert">
          No pudimos cargar el agua de hoy.{' '}
          <button type="button" className="boton-texto" onClick={() => setIntento(intento + 1)}>Reintentar</button>
        </p>
      </div>
    );
  }

  return (
    <div className="agua-hoy">
      <span className="progreso__nombre">Agua hoy</span>
      <strong className="progreso__valor">
        {dia ? formatearNumero(total) : <span aria-hidden="true">—</span>}<small> / {formatearNumero(meta)} ml</small>
      </strong>
      <span className="agua-hoy__barra" aria-hidden="true"><span style={{ transform: `scaleX(${avance})` }} /></span>
      {total >= meta && <span className="agua-hoy__meta"><Icono nombre="check" tamano={14} /> Llegaste a la meta de hoy</span>}

      <div className="agua-hoy__acciones">
        <button type="button" className="agua-hoy__vaso" disabled={!dia || guardando} onClick={() => sumar(vasoMl)}
          aria-label={`Sumar 1 vaso de ${vasoMl} ml`}>
          <Icono nombre="mas" tamano={16} /> 1 vaso
        </button>
        <button type="button" className="boton-texto" aria-expanded={otraCantidad} disabled={!dia}
          onClick={() => { setOtraCantidad(!otraCantidad); setError(''); }}>
          Otra cantidad
        </button>
        {ultimo && (
          <button type="button" className="boton-texto agua-hoy__deshacer" disabled={guardando}
            aria-label={`Deshacer la última suma de ${formatearNumero(ultimo.ml)} ml`}
            onClick={() => guardar(() => deshacerAgua(ultimo.id), `Quitaste ${formatearNumero(ultimo.ml)} ml.`)}>
            Deshacer
          </button>
        )}
      </div>

      {otraCantidad && (
        <form className="agua-hoy__formulario" onSubmit={sumarOtra} noValidate>
          <label htmlFor={idCampo}>Mililitros</label>
          <input id={idCampo} className="campo__control" type="text" inputMode="numeric" autoComplete="off" value={cantidad}
            placeholder={`Ej. ${vasoMl * 2}`} aria-describedby={`${idCampo}-ayuda`} aria-invalid={error === RANGO}
            onChange={(evento) => setCantidad(evento.target.value)} />
          <button type="submit" className="boton boton--secundario boton--compacto" disabled={guardando}>Sumar</button>
          <span id={`${idCampo}-ayuda`} className="agua-hoy__ayuda">Entre {formatearNumero(registro.min)} y {formatearNumero(registro.max)} ml por vez.</span>
        </form>
      )}

      {error && <p className="agua-hoy__mensaje agua-hoy__mensaje--error" role="alert">{error}</p>}
      <p className="agua-hoy__mensaje solo-lector" role="status">{aviso}</p>
    </div>
  );
}
