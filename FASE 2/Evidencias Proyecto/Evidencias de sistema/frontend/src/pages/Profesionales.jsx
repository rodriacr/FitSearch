import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import reglas from '@shared/reglas.json';
import Alerta from '../components/Alerta.jsx';
import EstadoVacio from '../components/EstadoVacio.jsx';
import Icono from '../components/Icono.jsx';
import PanelFiltros from '../components/profesionales/PanelFiltros.jsx';
import TarjetaProfesional from '../components/profesionales/TarjetaProfesional.jsx';
import MapaProfesionales from '../components/profesionales/MapaProfesionales.jsx';
import DetalleEnMapa from '../components/profesionales/DetalleEnMapa.jsx';
import { enMapa } from '../components/profesionales/ubicacionMapa.js';
import { buscarProfesionales, obtenerFiltros } from '../services/profesional.service.js';
import { obtenerUbicacion, ubicacionSiHayPermiso } from '../services/ubicacion.js';
import './Profesionales.css';

// Parámetros de la URL: la búsqueda se puede compartir y el buscador del Inicio llega con ?q=.
const CLAVES = ['q', 'especialidad', 'comuna', 'distancia', 'calificacion', 'modalidad', 'orden', 'pagina'];
const FILTROS = ['especialidad', 'comuna', 'distancia', 'calificacion', 'modalidad'];
const { ordenes, filtroModalidad, busqueda } = reglas.profesionales;
const UBICACION_INICIAL = { estado: 'inactiva', coords: null, mensaje: '' };
const SIN_RESULTADOS = [];
// Accesos rápidos por especialidad sobre los filtros (SC-27): las primeras del catálogo y «+N más» para el resto.
const ESPECIALIDADES_VISIBLES = 3;
const ICONOS_ESPECIALIDAD = {
  'Entrenamiento personal': 'mancuerna', Kinesiología: 'actividad', 'Medicina deportiva': 'medico', Nutrición: 'comida',
  'Psicología deportiva': 'chat',
};
// Desde este ancho la lista y el mapa van lado a lado (Profesionales.css); antes, el mapa va arriba de la lista.
const DOS_COLUMNAS = '(min-width: 75rem)';

function etiquetaFiltro(clave, valor) {
  if (clave === 'distancia') return `Hasta ${valor} km`;
  if (clave === 'calificacion') return `${valor} estrellas o más`;
  if (clave === 'modalidad') return filtroModalidad.find((opcion) => opcion.valor === valor)?.etiqueta || valor;
  return valor;
}
const movimientoSuave = () => !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Buscador de profesionales con texto, filtros, orden y páginas (FS-HU-03, FS-HU-05, FS-HU-22), con la lista y el mapa
// juntos (FS-HU-06, SC-27): elegir un marcador muestra su detalle bajo el mapa y marca su tarjeta; «Ver en el mapa» en
// una tarjeta hace lo mismo desde la lista. El mapa se puede ocultar (?mapa=oculto) y la lista ocupa todo el ancho.
export default function Profesionales() {
  const [parametros, setParametros] = useSearchParams();
  const mapaOculto = parametros.get('mapa') === 'oculto';
  const [mapaIniciado, setMapaIniciado] = useState(!mapaOculto);
  const { pathname, search } = useLocation();
  const filtros = Object.fromEntries(CLAVES.map((clave) => [clave, parametros.get(clave) || '']));
  const necesitaUbicacion = Boolean(filtros.distancia) || filtros.orden === 'cercania';
  // estado: inactiva | lista | denegada | no-disponible
  const [ubicacion, setUbicacion] = useState(UBICACION_INICIAL);
  const [catalogo, setCatalogo] = useState({ especialidades: [], comunas: [] });
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [todasEspecialidades, setTodasEspecialidades] = useState(false);
  const [intento, setIntento] = useState(0);
  const [resultado, setResultado] = useState(null);
  // Elegido y resaltado guardan la búsqueda a la que pertenecen: al cambiar de página o de filtros se descartan solos.
  const [seleccion, setSeleccion] = useState(null);
  const [resaltado, setResaltado] = useState(null);

  useEffect(() => {
    let activo = true;
    obtenerFiltros().then((datos) => activo && setCatalogo(datos)).catch(() => {});
    return () => { activo = false; };
  }, []);

  // Si la persona ya dio permiso antes, se muestran las distancias sin volver a preguntar.
  useEffect(() => {
    let activo = true;
    ubicacionSiHayPermiso().then((coords) => { if (activo && coords) setUbicacion({ estado: 'lista', coords, mensaje: '' }); });
    return () => { activo = false; };
  }, []);

  // Una distancia o "Más cercanos" sin ubicación disponible: se pide al navegador (FS-HU-05).
  const pidiendoUbicacion = necesitaUbicacion && ubicacion.estado === 'inactiva';
  useEffect(() => {
    if (!pidiendoUbicacion) return undefined;
    let activo = true;
    obtenerUbicacion()
      .then((coords) => activo && setUbicacion({ estado: 'lista', coords, mensaje: '' }))
      .catch((error) => activo && setUbicacion({ estado: error.motivo || 'no-disponible', coords: null, mensaje: error.message }));
    return () => { activo = false; };
  }, [pidiendoUbicacion]);

  // Sin ubicación, la distancia y el orden por cercanía no se envían (escenario 2 de FS-HU-05: se ofrece la comuna).
  const coords = ubicacion.estado === 'lista' ? ubicacion.coords : null;
  const consulta = {
    ...filtros,
    distancia: coords ? filtros.distancia : '',
    orden: !coords && filtros.orden === 'cercania' ? '' : filtros.orden,
  };
  const clave = JSON.stringify([consulta, coords, intento]);
  const cargando = pidiendoUbicacion || resultado?.clave !== clave;

  useEffect(() => {
    if (pidiendoUbicacion) return undefined;
    let activo = true;
    const [consultaActual, coordsActuales] = JSON.parse(clave);
    buscarProfesionales(consultaActual, coordsActuales)
      .then((respuesta) => activo && setResultado({ clave, ...respuesta }))
      .catch((error) => activo && setResultado({ clave, error: error.message }));
    return () => { activo = false; };
  }, [clave, pidiendoUbicacion]);

  // Al elegir a alguien, su detalle (bajo el mapa) tiene que quedar a la vista.
  useEffect(() => {
    const detalle = seleccion && document.querySelector('.buscador__mapa .detalle-mapa');
    if (!detalle) return;
    const behavior = movimientoSuave() ? 'smooth' : 'auto';
    const columna = detalle.parentElement;
    // En celular el mapa va arriba de la lista: «Ver en el mapa» sube hasta él para ver el marcador y el detalle.
    if (!window.matchMedia?.(DOS_COLUMNAS).matches && seleccion.origen === 'lista') {
      columna.scrollIntoView?.({ behavior, block: 'start' });
      return;
    }
    // Se baja la página lo justo para ver el detalle entero. Lado a lado basta con poco: la columna del mapa queda fija
    // arriba al bajar. Si se eligió en el mapa, también se trae su tarjeta, sin subir tanto que la columna se suelte.
    const margen = 16;
    const piso = window.innerHeight - (document.querySelector('.barra-inferior')?.offsetHeight || 0) - margen;
    let desplazar = Math.max(0, detalle.getBoundingClientRect().bottom - piso);
    const tarjeta = seleccion.origen === 'mapa' && document.getElementById(`profesional-${seleccion.id}`);
    if (tarjeta && window.matchMedia?.(DOS_COLUMNAS).matches) {
      const techo = parseFloat(getComputedStyle(columna).top) || 0;
      const { top, bottom } = tarjeta.getBoundingClientRect();
      if (bottom > piso) desplazar = Math.max(desplazar, bottom - piso);
      else if (top < techo + margen && !desplazar) {
        const sinSoltarColumna = techo - columna.parentElement.getBoundingClientRect().top;
        desplazar = Math.max(top - techo - margen, -Math.max(0, sinSoltarColumna));
      }
    }
    if (desplazar) window.scrollBy({ top: desplazar, behavior });
  }, [seleccion]);

  const actualizar = (cambios) => {
    const siguiente = new URLSearchParams(parametros);
    for (const [nombre, valor] of Object.entries(cambios)) {
      if (valor) siguiente.set(nombre, valor); else siguiente.delete(nombre);
    }
    // Cualquier cambio de búsqueda vuelve a la primera página.
    if (!('pagina' in cambios)) siguiente.delete('pagina');
    setParametros(siguiente);
  };
  const reintentarUbicacion = () => setUbicacion(UBICACION_INICIAL);
  const cambiarFiltros = (cambios) => {
    // Elegir otra vez una opción por cercanía después de un rechazo vuelve a pedir la ubicación.
    if ((cambios.distancia || cambios.orden === 'cercania') && ubicacion.estado !== 'lista') reintentarUbicacion();
    actualizar(cambios);
  };
  // Limpiar los filtros no vuelve a mostrar un mapa que la persona ocultó.
  const limpiar = () => setParametros(mapaOculto ? { mapa: 'oculto' } : {});
  const cerrarPanel = () => setPanelAbierto(false);
  const buscar = (evento) => {
    evento.preventDefault();
    actualizar({ q: new FormData(evento.currentTarget).get('q').trim() });
  };
  const cambiarPagina = (numero) => {
    actualizar({ pagina: numero > 1 ? String(numero) : '' });
    // Con "reducir movimiento" activado en el sistema, el salto a los resultados es directo, sin desplazamiento animado.
    document.getElementById('resultados')?.scrollIntoView?.({ behavior: movimientoSuave() ? 'smooth' : 'auto', block: 'start' });
  };
  // Mostrar u ocultar el mapa no repite la búsqueda: conserva filtros, orden y página.
  const mostrarMapa = (mostrar) => {
    const siguiente = new URLSearchParams(parametros);
    if (mostrar) siguiente.delete('mapa'); else siguiente.set('mapa', 'oculto');
    if (mostrar) setMapaIniciado(true);
    setParametros(siguiente);
  };

  const activos = [
    ...(filtros.q ? [{ clave: 'q', texto: `“${filtros.q}”` }] : []),
    ...FILTROS.filter((nombre) => filtros[nombre]).map((nombre) => ({ clave: nombre, texto: etiquetaFiltro(nombre, filtros[nombre]) })),
  ];
  const cantidadFiltros = FILTROS.filter((nombre) => filtros[nombre]).length;
  // Mientras llega una búsqueda nueva se dejan los resultados anteriores, atenuados, en vez de cambiarlos por
  // "Cargando…": así la página no salta con cada filtro, página u orden.
  const actualizando = cargando && Boolean(resultado?.profesionales?.length);
  const vigente = cargando && !actualizando ? null : resultado;
  const listo = Boolean(vigente) && !vigente.error;
  const profesionales = listo ? vigente.profesionales : SIN_RESULTADOS;
  // Sin resultados se muestra solo el estado vacío, no un mapa vacío al lado.
  const mapaVisible = !mapaOculto && profesionales.length > 0;
  const deEstaBusqueda = (marca) => (marca && listo && marca.clave === vigente.clave ? marca.id : null);
  const seleccionadoId = deEstaBusqueda(seleccion);
  const resaltadoId = deEstaBusqueda(resaltado);
  const seleccionado = profesionales.find((p) => p.id === seleccionadoId) || null;
  const desde = `${pathname}${search}`;

  const seleccionar = (id, origen) => setSeleccion(id == null ? null : { id, origen, clave: vigente.clave });
  const resaltar = (id) => setResaltado(id == null ? null : { id, clave: vigente.clave });
  const verEnMapa = (id) => {
    if (id === seleccionadoId && !mapaOculto) { seleccionar(null); return; }
    if (mapaOculto) mostrarMapa(true);
    seleccionar(id, 'lista');
  };

  // Accesos por especialidad: si la elegida está entre las escondidas, se muestra igual para que se vea marcada.
  const { especialidades } = catalogo;
  const primeras = todasEspecialidades ? especialidades : especialidades.slice(0, ESPECIALIDADES_VISIBLES);
  const visibles = filtros.especialidad && !primeras.includes(filtros.especialidad) ? [...primeras, filtros.especialidad] : primeras;
  const escondidas = especialidades.filter((valor) => !visibles.includes(valor)).length;

  let contenido;
  if (!vigente) {
    contenido = <p className="buscador__estado" role="status">Cargando profesionales…</p>;
  } else if (resultado.error) {
    contenido = (
      <div className="buscador__estado">
        <Alerta>{resultado.error}</Alerta>
        <button type="button" className="boton boton--secundario boton--compacto" onClick={() => setIntento(intento + 1)}>Reintentar</button>
      </div>
    );
  } else if (!resultado.profesionales.length) {
    contenido = activos.length || filtros.pagina ? (
      <EstadoVacio nivel={2} icono="buscar" titulo="No encontramos profesionales con esos filtros"
        accion={<button type="button" className="boton boton--secundario boton--compacto" onClick={limpiar}>Limpiar filtros</button>}>
        Prueba con otra búsqueda, amplía la distancia o quita algún filtro.
      </EstadoVacio>
    ) : (
      <EstadoVacio nivel={2} icono="profesional" titulo="Aún no hay profesionales para mostrar">
        Cuando se incorporen fichas profesionales, aparecerán aquí.
      </EstadoVacio>
    );
  } else {
    const { pagina, totalPaginas, hayMas } = resultado;
    contenido = (
      <>
        <h2 className="solo-lector">Resultados de la búsqueda</h2>
        <div className="buscador__lista">
          {profesionales.map((profesional) => (
            <TarjetaProfesional key={profesional.id} id={`profesional-${profesional.id}`} profesional={profesional} variante="fila"
              desde={desde} seleccionado={profesional.id === seleccionadoId} resaltado={profesional.id === resaltadoId}
              onResaltar={mapaVisible ? resaltar : undefined}
              onVerEnMapa={enMapa(profesional) ? () => verEnMapa(profesional.id) : undefined} />
          ))}
        </div>
        {totalPaginas > 1 && (
          <nav className="paginacion" aria-label="Páginas de resultados">
            <button type="button" className="boton boton--secundario boton--compacto" disabled={pagina === 1} onClick={() => cambiarPagina(pagina - 1)}>Anterior</button>
            <span>Página {pagina} de {totalPaginas}</span>
            <button type="button" className="boton boton--secundario boton--compacto" disabled={!hayMas} onClick={() => cambiarPagina(pagina + 1)}>Siguiente</button>
          </nav>
        )}
      </>
    );
  }

  return (
    <section className="buscador" aria-labelledby="titulo-profesionales">
      <header className="buscador__cabecera">
        <h1 id="titulo-profesionales">Profesionales</h1>
        <p>Busca por nombre, especialidad o palabra clave y encuentra en el mapa a quienes atienden cerca de ti.</p>
        <form className="buscador__formulario" role="search" onSubmit={buscar} key={filtros.q}>
          <label htmlFor="busqueda-profesionales" className="solo-lector">Buscar profesionales</label>
          <span className="buscador__campo">
            <Icono nombre="buscar" tamano={20} />
            <input id="busqueda-profesionales" name="q" type="search" defaultValue={filtros.q} maxLength={busqueda.max}
              placeholder="Nombre, especialidad o palabra clave" autoComplete="off" />
          </span>
          <button type="submit" className="boton boton--principal boton--compacto">Buscar</button>
        </form>
      </header>

      {especialidades.length > 0 && (
        <div className="accesos-especialidad" role="group" aria-label="Especialidades">
          {[['', 'Todas'], ...visibles.map((valor) => [valor, valor])].map(([valor, nombre]) => (
            <button key={valor || 'todas'} type="button" className="acceso-especialidad" aria-pressed={filtros.especialidad === valor}
              onClick={() => cambiarFiltros({ especialidad: valor })}>
              <Icono nombre={valor ? ICONOS_ESPECIALIDAD[valor] || 'profesional' : 'grupo'} tamano={18} /> {nombre}
            </button>
          ))}
          {(escondidas > 0 || todasEspecialidades) && (
            <button type="button" className="acceso-especialidad acceso-especialidad--mas" aria-expanded={todasEspecialidades}
              onClick={() => setTodasEspecialidades(!todasEspecialidades)}>
              {todasEspecialidades ? 'Ver menos' : `+${escondidas} más`}
            </button>
          )}
        </div>
      )}

      <PanelFiltros id="panel-filtros" abierto={panelAbierto} onCerrar={cerrarPanel} filtros={filtros} catalogo={catalogo}
        ubicacion={{ estado: ubicacion.estado, buscando: pidiendoUbicacion }} onCambiar={cambiarFiltros} onLimpiar={limpiar}
        total={listo && !actualizando ? resultado.total : undefined} hayFiltros={activos.length > 0} />

      <div className={`buscador__vista${mapaVisible ? ' buscador__vista--con-mapa' : ''}`}>
        <div className="buscador__resultados" id="resultados">
          <div className="buscador__barra">
            <p className="buscador__contador" role="status">
              {actualizando ? 'Actualizando resultados…'
                : listo && `${resultado.total} ${resultado.total === 1 ? 'profesional encontrado' : 'profesionales encontrados'}`}
            </p>
            <div className="buscador__controles">
              <button type="button" className="boton boton--secundario boton--compacto buscador__alternar-mapa"
                onClick={() => mostrarMapa(mapaOculto)}>
                <Icono nombre="pin" tamano={18} /> {mapaOculto ? 'Mostrar mapa' : 'Ocultar mapa'}
              </button>
              <button type="button" className="boton boton--secundario boton--compacto buscador__boton-filtros" aria-expanded={panelAbierto}
                aria-controls="panel-filtros" onClick={() => setPanelAbierto(true)}>
                <Icono nombre="filtro" tamano={18} /> Filtros{cantidadFiltros ? ` (${cantidadFiltros})` : ''}
              </button>
              <label className="buscador__orden">
                <span>Ordenar por</span>
                <select className="campo__control" value={filtros.orden || 'nombre'}
                  onChange={(evento) => cambiarFiltros({ orden: evento.target.value === 'nombre' ? '' : evento.target.value })}>
                  {ordenes.map(({ valor, etiqueta }) => <option key={valor} value={valor}>{etiqueta}</option>)}
                </select>
              </label>
            </div>
          </div>

          {activos.length > 0 && (
            <div className="chips" role="group" aria-label="Filtros aplicados">
              {activos.map(({ clave: nombre, texto }) => (
                <button key={nombre} type="button" className="chip" aria-label={`Quitar filtro: ${texto}`} onClick={() => actualizar({ [nombre]: '' })}>
                  {texto} <Icono nombre="cerrar" tamano={14} />
                </button>
              ))}
              <button type="button" className="boton-texto" onClick={limpiar}>Limpiar filtros</button>
            </div>
          )}

          {necesitaUbicacion && ubicacion.mensaje && (
            <Alerta tipo="info">
              {ubicacion.mensaje}{' '}
              <button type="button" className="boton-texto" onClick={reintentarUbicacion}>Intentar de nuevo</button>
            </Alerta>
          )}

          <div className={`buscador__contenido${actualizando ? ' buscador__contenido--actualizando' : ''}`} aria-busy={actualizando}>
            {contenido}
          </div>
        </div>

        {/* El mapa se monta una vez y al ocultarlo solo se esconde: volver a mostrarlo no descarga MapLibre de nuevo. */}
        {mapaIniciado && (
          <div className="buscador__mapa" hidden={!mapaVisible}>
            <MapaProfesionales profesionales={profesionales} visible={mapaVisible} seleccionadoId={seleccionadoId}
              resaltadoId={resaltadoId} centrar={seleccion?.origen === 'lista' && seleccionadoId != null ? seleccion : null}
              onSeleccionar={(id) => seleccionar(id, 'mapa')} onResaltar={resaltar} />
            {seleccionado ? (
              <DetalleEnMapa key={seleccionado.id} profesional={seleccionado} desde={desde} onCerrar={() => seleccionar(null)} />
            ) : (
              <p className="buscador__pista">
                <Icono nombre="pin" tamano={16} /> Elige un marcador o «Ver en el mapa» en una tarjeta para ver aquí su detalle.
              </p>
            )}
          </div>
        )}
      </div>

      <aside className="buscador__ayuda" aria-labelledby="titulo-ayuda">
        <h2 id="titulo-ayuda">Antes de elegir</h2>
        <ul>
          <li><strong>Revisa la especialidad.</strong> Busca un área relacionada con lo que necesitas.</li>
          <li><strong>Lee las reseñas.</strong> Conoce la experiencia de otras personas con el profesional.</li>
          <li><strong>Confirma los detalles.</strong> Consulta directamente al profesional por horarios, valores y servicios.</li>
        </ul>
      </aside>
    </section>
  );
}
