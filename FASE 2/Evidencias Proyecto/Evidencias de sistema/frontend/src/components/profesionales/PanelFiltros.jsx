import { useEffect } from 'react';
import reglas from '@shared/reglas.json';
import Icono from '../Icono.jsx';

const { distanciasKm, calificacionesMinimas, filtroModalidad } = reglas.profesionales;

// Si la URL trae un valor que ya no está en el catálogo (enlace antiguo), se conserva para que se vea seleccionado.
const conValorActual = (lista, actual) => (actual && !lista.includes(actual) ? [actual, ...lista] : lista);

function textoUbicacion({ buscando, estado }) {
  if (buscando) return 'Obteniendo tu ubicación…';
  if (estado === 'lista') return 'Usando tu ubicación aproximada.';
  if (estado === 'inactiva') return 'Al elegir una distancia te pediremos permiso para usar tu ubicación.';
  return 'Sin acceso a tu ubicación.';
}

// Filtros del buscador: columna lateral en escritorio y panel inferior en celular (FS-HU-22).
// Cada cambio se aplica de inmediato y queda en la URL.
export default function PanelFiltros({ id, abierto, onCerrar, filtros, catalogo, ubicacion, onCambiar, onLimpiar, total, hayFiltros }) {
  useEffect(() => {
    if (!abierto) return undefined;
    const alTeclear = (evento) => { if (evento.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [abierto, onCerrar]);

  const opcionesRadio = (nombre, leyenda, opciones) => (
    <fieldset className="grupo-opciones panel-filtros__grupo">
      <legend>{leyenda}</legend>
      {opciones.map(([valor, etiqueta]) => (
        <label key={valor || 'todas'} className="casilla casilla--opcion">
          <input type="radio" name={`filtro-${nombre}`} value={valor} checked={filtros[nombre] === valor} onChange={() => onCambiar({ [nombre]: valor })} />
          {etiqueta}
        </label>
      ))}
    </fieldset>
  );

  return (
    <>
      {abierto && <div className="panel-filtros__fondo" onClick={onCerrar} aria-hidden="true" />}
      <aside id={id} className={`panel-filtros${abierto ? ' panel-filtros--abierto' : ''}`} aria-label="Filtros">
        <div className="panel-filtros__cabecera">
          <h2>Filtros</h2>
          <button type="button" className="boton-icono panel-filtros__cerrar" aria-label="Cerrar filtros" onClick={onCerrar}><Icono nombre="cerrar" tamano={22} /></button>
        </div>
        <div className="campo">
          <label className="campo__etiqueta" htmlFor="filtro-especialidad">Especialidad</label>
          <select className="campo__control" id="filtro-especialidad" value={filtros.especialidad} onChange={(evento) => onCambiar({ especialidad: evento.target.value })}>
            <option value="">Todas</option>
            {conValorActual(catalogo.especialidades, filtros.especialidad).map((valor) => <option key={valor} value={valor}>{valor}</option>)}
          </select>
        </div>
        <div className="campo">
          <label className="campo__etiqueta" htmlFor="filtro-comuna">Comuna</label>
          <select className="campo__control" id="filtro-comuna" value={filtros.comuna} onChange={(evento) => onCambiar({ comuna: evento.target.value })}>
            <option value="">Todas</option>
            {conValorActual(catalogo.comunas, filtros.comuna).map((valor) => <option key={valor} value={valor}>{valor}</option>)}
          </select>
        </div>
        <div className="campo">
          <label className="campo__etiqueta" htmlFor="filtro-distancia">Distancia máxima</label>
          <select className="campo__control" id="filtro-distancia" value={filtros.distancia} aria-describedby="estado-ubicacion"
            onChange={(evento) => onCambiar({ distancia: evento.target.value })}>
            <option value="">Sin límite</option>
            {distanciasKm.map((km) => <option key={km} value={String(km)}>Hasta {km} km</option>)}
          </select>
          <p id="estado-ubicacion" className="panel-filtros__ubicacion"><Icono nombre="mira" tamano={15} /> {textoUbicacion(ubicacion)}</p>
        </div>
        {opcionesRadio('calificacion', 'Calificación mínima', [['', 'Cualquiera'], ...calificacionesMinimas.map((n) => [String(n), `${n} estrellas o más`])])}
        {opcionesRadio('modalidad', 'Modalidad', [['', 'Todas'], ...filtroModalidad.map(({ valor, etiqueta }) => [valor, etiqueta])])}
        <div className="panel-filtros__pie">
          {hayFiltros && <button type="button" className="boton boton--secundario" onClick={onLimpiar}>Limpiar filtros</button>}
          <button type="button" className="boton boton--principal panel-filtros__ver" onClick={onCerrar}>
            {total === undefined ? 'Ver resultados' : `Ver ${total} ${total === 1 ? 'resultado' : 'resultados'}`}
          </button>
        </div>
      </aside>
    </>
  );
}
