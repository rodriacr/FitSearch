import { useEffect } from 'react';
import reglas from '@shared/reglas.json';
import Icono from '../Icono.jsx';
import useBloquearScroll from '../diseno/useBloquearScroll.js';

const { distanciasKm, calificacionesMinimas, filtroModalidad } = reglas.profesionales;

// Si la URL trae un valor que ya no está en el catálogo (enlace antiguo), se conserva para que se vea seleccionado.
const conValorActual = (lista, actual) => (actual && !lista.includes(actual) ? [actual, ...lista] : lista);

function textoUbicacion({ buscando, estado }) {
  if (buscando) return 'Obteniendo tu ubicación…';
  if (estado === 'lista') return 'Usando tu ubicación aproximada.';
  if (estado === 'inactiva') return 'Al elegir una distancia te pediremos permiso para usar tu ubicación.';
  return 'Sin acceso a tu ubicación.';
}

// Filtros del buscador (FS-HU-22): barra horizontal sobre la lista y el mapa en escritorio, y panel inferior en celular.
// Desde la SC-27 todos son listas desplegables (antes la calificación y la modalidad eran opciones en columna), para
// que quepan en una sola franja y dejen el ancho a la lista y al mapa. Cada cambio se aplica de inmediato y queda en la URL.
export default function PanelFiltros({ id, abierto, onCerrar, filtros, catalogo, ubicacion, onCambiar, onLimpiar, total, hayFiltros }) {
  useBloquearScroll(abierto);
  useEffect(() => {
    if (!abierto) return undefined;
    const alTeclear = (evento) => { if (evento.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [abierto, onCerrar]);

  const lista = (nombre, etiqueta, opciones, extra = {}) => (
    <div className="campo">
      <label className="campo__etiqueta" htmlFor={`filtro-${nombre}`}>{etiqueta}</label>
      <select className="campo__control" id={`filtro-${nombre}`} value={filtros[nombre]} {...extra}
        onChange={(evento) => onCambiar({ [nombre]: evento.target.value })}>
        {opciones.map(([valor, texto]) => <option key={valor || 'todas'} value={valor}>{texto}</option>)}
      </select>
      {/* El aviso previo («te pediremos permiso…») en la barra de escritorio solo lo lee el lector de pantalla
          (Profesionales.css): ocupaba tres líneas y alargaba la barra. El estado real de la ubicación sí se ve. */}
      {nombre === 'distancia' && (
        <p id="estado-ubicacion" className={`panel-filtros__ubicacion${ubicacion.estado === 'inactiva' && !ubicacion.buscando ? ' panel-filtros__ubicacion--previa' : ''}`}>
          <Icono nombre="mira" tamano={15} /> {textoUbicacion(ubicacion)}
        </p>
      )}
    </div>
  );
  const valores = (catalogoActual, actual) => conValorActual(catalogoActual, actual).map((valor) => [valor, valor]);

  return (
    <>
      {/* El fondo siempre está montado para fundirse junto con la hoja de filtros (al abrir y al cerrar). */}
      <div className={`panel-filtros__fondo${abierto ? ' panel-filtros__fondo--visible' : ''}`} onClick={onCerrar} aria-hidden="true" />
      <aside id={id} className={`panel-filtros${abierto ? ' panel-filtros--abierto' : ''}`} aria-label="Filtros">
        <div className="panel-filtros__cabecera">
          <h2>Filtros</h2>
          <button type="button" className="boton-icono panel-filtros__cerrar" aria-label="Cerrar filtros" onClick={onCerrar}><Icono nombre="cerrar" tamano={22} /></button>
        </div>
        {lista('comuna', 'Comuna', [['', 'Todas'], ...valores(catalogo.comunas, filtros.comuna)])}
        {lista('distancia', 'Distancia máxima', [['', 'Sin límite'], ...distanciasKm.map((km) => [String(km), `Hasta ${km} km`])],
          { 'aria-describedby': 'estado-ubicacion' })}
        {lista('especialidad', 'Especialidad', [['', 'Todas'], ...valores(catalogo.especialidades, filtros.especialidad)])}
        {lista('modalidad', 'Modalidad', [['', 'Todas'], ...filtroModalidad.map(({ valor, etiqueta }) => [valor, etiqueta])])}
        {lista('calificacion', 'Calificación mínima', [['', 'Cualquiera'], ...calificacionesMinimas.map((n) => [String(n), `${n} estrellas o más`])])}
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
