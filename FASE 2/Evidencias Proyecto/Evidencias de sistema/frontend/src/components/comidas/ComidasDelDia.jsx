import { useState } from 'react';
import Alerta from '../Alerta.jsx';
import Icono from '../Icono.jsx';
import { formatearNumero } from '../../services/formato.js';
import { actualizarComida, eliminarComida, GRAMOS_MAX, GRAMOS_MIN, leerGramos, MOMENTOS } from '../../services/comidas.service.js';

const ICONO_MOMENTO = { desayuno: 'sol', media_manana: 'reloj', almuerzo: 'comida', merienda: 'gota', cena: 'luna' };
const macros = ({ proteinasG, carbohidratosG, grasasG }) => (
  <span className="comida-del-dia__macros">
    <span>{formatearNumero(proteinasG)} g P</span><span>{formatearNumero(carbohidratosG)} g C</span><span>{formatearNumero(grasasG)} g G</span>
  </span>
);

// Un alimento registrado, con sus gramos editables, el momento y la opción de quitarlo.
function Registro({ registro, alCambiar }) {
  const [editando, setEditando] = useState(false);
  const [gramos, setGramos] = useState(String(registro.gramos).replace('.', ','));
  const [momento, setMomento] = useState(registro.momento);
  const [estado, setEstado] = useState({ ocupado: false, error: '' });

  async function guardar(evento) {
    evento.preventDefault();
    const valor = leerGramos(gramos);
    if (!valor) {
      setEstado({ ocupado: false, error: `Indica entre ${GRAMOS_MIN} y ${formatearNumero(GRAMOS_MAX)} gramos.` });
      return;
    }
    setEstado({ ocupado: true, error: '' });
    try {
      await actualizarComida(registro.id, { gramos: valor, momento });
      setEditando(false);
      setEstado({ ocupado: false, error: '' });
      alCambiar();
    } catch (error) {
      setEstado({ ocupado: false, error: error.message });
    }
  }

  async function quitar() {
    setEstado({ ocupado: true, error: '' });
    try {
      await eliminarComida(registro.id);
      alCambiar();
    } catch (error) {
      setEstado({ ocupado: false, error: error.message });
    }
  }

  return (
    <li className="registro-comida">
      <div className="registro-comida__datos">
        <p className="registro-comida__nombre">
          {registro.nombre}
          {registro.origen === 'asistente' && <span className="registro-comida__origen"><Icono nombre="chispa" tamano={13} /> Asistente</span>}
        </p>
        <p className="registro-comida__detalle">
          <span>{formatearNumero(registro.gramos)} g</span><span>{formatearNumero(registro.calorias ?? 0)} kcal</span>{macros(registro)}
        </p>
      </div>
      {editando ? (
        <form className="registro-comida__edicion" onSubmit={guardar} noValidate>
          <label>
            <span className="solo-lector">Gramos de {registro.nombre}</span>
            <input inputMode="decimal" value={gramos} onChange={(evento) => setGramos(evento.target.value)} />
          </label>
          <label>
            <span className="solo-lector">Momento del día de {registro.nombre}</span>
            <select value={momento} onChange={(evento) => setMomento(evento.target.value)}>
              {MOMENTOS.map(({ valor, etiqueta }) => <option key={valor} value={valor}>{etiqueta}</option>)}
            </select>
          </label>
          <button type="submit" className="boton boton--principal boton--compacto" disabled={estado.ocupado}>Guardar</button>
          <button type="button" className="boton-texto" onClick={() => setEditando(false)}>Cancelar</button>
        </form>
      ) : (
        <div className="registro-comida__acciones">
          <button type="button" className="boton-icono" onClick={() => setEditando(true)} aria-label={`Editar ${registro.nombre}`}><Icono nombre="lapiz" tamano={18} /></button>
          <button type="button" className="boton-icono" onClick={quitar} disabled={estado.ocupado} aria-label={`Quitar ${registro.nombre}`}><Icono nombre="basura" tamano={18} /></button>
        </div>
      )}
      {estado.error && <Alerta>{estado.error}</Alerta>}
    </li>
  );
}

// Comidas del día agrupadas por momento. Compacta (Resumen): una fila por momento con sus totales. Completa (pestaña
// Comidas): cada alimento con sus gramos, que se pueden editar o quitar.
export default function ComidasDelDia({ momentos, compacta = false, alRegistrar, alCambiar }) {
  if (compacta) {
    return (
      <ul className="comidas-del-dia comidas-del-dia--compacta">
        {momentos.map(({ momento, etiqueta, hora, registros, totales }) => (
          <li key={momento} className="comida-del-dia">
            <span className={`comida-del-dia__icono comida-del-dia__icono--${momento}`} aria-hidden="true"><Icono nombre={ICONO_MOMENTO[momento]} tamano={22} /></span>
            <div className="comida-del-dia__texto">
              <p className="comida-del-dia__titulo">{etiqueta}{hora && <time>{hora}</time>}</p>
              {registros.length > 0 ? (
                <>
                  <p className="comida-del-dia__descripcion">{registros.map(({ nombre }) => nombre).join(', ')}</p>
                  <p className="comida-del-dia__detalle"><strong>{formatearNumero(totales.calorias)} kcal</strong>{macros(totales)}</p>
                </>
              ) : <p className="comida-del-dia__descripcion texto-secundario">Sin registros</p>}
            </div>
            {registros.length > 0
              ? <span className="comida-del-dia__estado" aria-label="Con registros"><Icono nombre="check" tamano={16} /></span>
              : <button type="button" className="boton-icono" onClick={() => alRegistrar(momento)} aria-label={`Registrar ${etiqueta.toLowerCase()}`}><Icono nombre="mas" tamano={20} /></button>}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="comidas-del-dia">
      {momentos.map(({ momento, etiqueta, hora, registros, totales }) => (
        <section key={momento} className="momento-comida panel-tarjeta" aria-labelledby={`momento-${momento}`}>
          <header className="momento-comida__encabezado">
            <span className={`comida-del-dia__icono comida-del-dia__icono--${momento}`} aria-hidden="true"><Icono nombre={ICONO_MOMENTO[momento]} tamano={22} /></span>
            <h3 id={`momento-${momento}`}>{etiqueta}{hora && <time>{hora}</time>}</h3>
            {registros.length > 0 && <p className="momento-comida__total">{formatearNumero(totales.calorias)} kcal</p>}
            <button type="button" className="boton boton--secundario boton--compacto" onClick={() => alRegistrar(momento)}>
              <Icono nombre="mas" tamano={18} /> Agregar
            </button>
          </header>
          {registros.length > 0
            ? <ul className="momento-comida__lista">{registros.map((registro) => <Registro key={registro.id} registro={registro} alCambiar={alCambiar} />)}</ul>
            : <p className="texto-secundario momento-comida__vacio">Aún no registras alimentos en este momento.</p>}
        </section>
      ))}
    </div>
  );
}
