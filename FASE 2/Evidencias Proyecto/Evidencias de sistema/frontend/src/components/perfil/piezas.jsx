// Piezas compartidas por los pasos del asistente de perfil.
import Icono from '../Icono.jsx';

// Botones inferiores de cada paso: "Volver" (o "Cancelar" al editar) y el botón principal.
export function PieAsistente({ onVolver, textoVolver = 'Volver', textoPrincipal = 'Siguiente', enviando = false }) {
  return (
    <div className="asistente__pie">
      {onVolver
        ? <button type="button" className="boton-texto" onClick={onVolver}><Icono nombre="flechaIzquierda" tamano={18} /> {textoVolver}</button>
        : <span />}
      <button type="submit" className="boton boton--principal boton--compacto" disabled={enviando}>
        {enviando ? 'Guardando…' : <>{textoPrincipal} <Icono nombre="flecha" tamano={18} /></>}
      </button>
    </div>
  );
}

// Grupo de casillas de un catálogo. La opción "ninguna" es excluyente: al marcarla se desmarcan las demás y viceversa.
export function GrupoCasillas({ nombre, leyenda, opciones, seleccion, onCambio, error, columnas = 2 }) {
  const alternar = (valor) => {
    if (seleccion.includes(valor)) return onCambio(seleccion.filter((v) => v !== valor));
    if (valor === 'ninguna') return onCambio(['ninguna']);
    return onCambio([...seleccion.filter((v) => v !== 'ninguna'), valor]);
  };
  const idError = `${nombre}-error`;
  return (
    <fieldset className="grupo-opciones" aria-describedby={error ? idError : undefined}>
      <legend>{leyenda}</legend>
      <div className={`grupo-opciones__lista grupo-opciones__lista--${columnas}`}>
        {opciones.map(({ valor, etiqueta }) => (
          <label key={valor} className="casilla casilla--opcion">
            <input type="checkbox" name={nombre} value={valor} checked={seleccion.includes(valor)} onChange={() => alternar(valor)} />
            {etiqueta}
          </label>
        ))}
      </div>
      {error && <p id={idError} className="campo__mensaje" role="alert">{error}</p>}
    </fieldset>
  );
}

// Tarjeta con el requerimiento calórico estimado (FS-HU-02).
export function TarjetaEstimacion({ kcal }) {
  if (kcal === null || kcal === undefined) return null;
  return (
    <div className="estimacion" aria-live="polite">
      <p className="estimacion__titulo">Requerimiento calórico diario estimado</p>
      <p className="estimacion__valor">{kcal.toLocaleString('es-CL')} kcal/día</p>
      <p className="estimacion__nota">
        Estimación referencial calculada con la ecuación de Mifflin-St Jeor y tu nivel de actividad física.
        No reemplaza la evaluación de un profesional de la salud.
      </p>
    </div>
  );
}
