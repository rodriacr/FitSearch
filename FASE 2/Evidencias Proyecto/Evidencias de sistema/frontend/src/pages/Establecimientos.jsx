import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import reglas from '@shared/reglas.json';
import Alerta from '../components/Alerta.jsx';
import EstadoVacio from '../components/EstadoVacio.jsx';
import Icono from '../components/Icono.jsx';
import MapaProfesionales from '../components/profesionales/MapaProfesionales.jsx';
import { enMapa } from '../components/profesionales/ubicacionMapa.js';
import { CATEGORIAS, direccionCompleta } from '../components/establecimientos/categorias.js';
import { buscarEstablecimientos, obtenerComunasEstablecimientos } from '../services/establecimiento.service.js';
import { formatearKm } from '../services/formato.js';
import { obtenerUbicacion, ubicacionSiHayPermiso } from '../services/ubicacion.js';
import '../components/profesionales/TarjetaProfesional.css';
import './Profesionales.css';
import './Establecimientos.css';

const UBICACION_INICIAL = { estado: 'inactiva', coords: null, mensaje: '' };
const SIN_RESULTADOS = [];
const { distanciasKm } = reglas.profesionales;
// Desde este ancho la lista y el mapa van lado a lado (Profesionales.css); antes, el mapa va arriba de la lista.
const DOS_COLUMNAS = '(min-width: 75rem)';
const movimientoSuave = () => !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const describir = (e) => `${e.nombre}, ${direccionCompleta(e)}`;

// Tarjeta igual a la del buscador de profesionales junto al mapa (TarjetaProfesional, variante «fila»): toda la tarjeta
// abre la ficha, se marca con el acento naranjo cuando está elegida en el mapa y con el azul claro mientras el mouse o el
// foco están sobre ella o sobre su marcador.
function TarjetaEstablecimiento({ establecimiento, datos, desde, seleccionado, resaltado, onResaltar, onVerEnMapa }) {
  const { id, nombre, distanciaKm } = establecimiento;
  const clases = ['tarjeta-profesional', 'tarjeta-profesional--fila', 'tarjeta-establecimiento',
    seleccionado && 'tarjeta-profesional--seleccionada', resaltado && 'tarjeta-profesional--resaltada'].filter(Boolean).join(' ');
  const resaltar = onResaltar && { onMouseEnter: () => onResaltar(id), onMouseLeave: () => onResaltar(null),
    onFocus: () => onResaltar(id), onBlur: () => onResaltar(null) };
  const lugar = [direccionCompleta(establecimiento), distanciaKm != null && formatearKm(distanciaKm)].filter(Boolean).join(' · ');
  return (
    <article id={`establecimiento-${id}`} className={clases} {...resaltar}>
      <span className="tarjeta-profesional__iniciales" aria-hidden="true"><Icono nombre={datos.icono} tamano={24} /></span>
      <div className="tarjeta-profesional__cuerpo">
        <h3 className="tarjeta-profesional__nombre"><Link to={`${datos.ruta}/${id}`} state={{ desde }}>{nombre}</Link></h3>
        <p className="tarjeta-profesional__linea">
          <span className="tarjeta-profesional__especialidad">{datos.etiqueta}</span>
        </p>
        <p className="tarjeta-profesional__linea">
          <span className="tarjeta-profesional__lugar"><Icono nombre="pin" tamano={15} /> {lugar}</span>
        </p>
        <div className="tarjeta-profesional__acciones">
          {onVerEnMapa && (
            <button type="button" className="tarjeta-profesional__ver-mapa" aria-pressed={seleccionado}
              aria-label={`Ver ${nombre} en el mapa`} onClick={onVerEnMapa}>
              <Icono nombre="pin" tamano={16} /> Ver en el mapa
            </button>
          )}
          <span className="tarjeta-profesional__ver" aria-hidden="true">Ver ficha <Icono nombre="flecha" tamano={16} /></span>
        </div>
      </div>
    </article>
  );
}

// Detalle bajo el mapa, igual al del profesional elegido (DetalleEnMapa): qué es, dónde está, su ficha (con los
// profesionales que atienden ahí) y «Cómo llegar» al punto exacto en Google Maps.
function DetalleEstablecimiento({ establecimiento, datos, desde, onCerrar }) {
  const { id, nombre, distanciaKm, ubicacionLat, ubicacionLng } = establecimiento;
  return (
    <section className="detalle-mapa" aria-labelledby="detalle-mapa-nombre">
      <h2 className="solo-lector">{datos.etiqueta} seleccionado</h2>
      <div className="detalle-mapa__cabecera">
        <span className="detalle-mapa__avatar" aria-hidden="true"><Icono nombre={datos.icono} tamano={22} /></span>
        <div className="detalle-mapa__identidad">
          <h3 id="detalle-mapa-nombre" className="detalle-mapa__nombre">{nombre}</h3>
          <p className="detalle-mapa__tipo">{datos.etiqueta}</p>
          {distanciaKm != null && <p className="detalle-mapa__valoracion"><span>{formatearKm(distanciaKm)}</span></p>}
        </div>
        <button type="button" className="boton-icono detalle-mapa__cerrar" aria-label="Cerrar detalle" onClick={onCerrar}>
          <Icono nombre="cerrar" tamano={20} />
        </button>
      </div>
      <ul className="detalle-mapa__datos">
        <li className="detalle-mapa__dato"><Icono nombre="pin" tamano={16} /> <span>{direccionCompleta(establecimiento)}</span></li>
      </ul>
      <p className="detalle-mapa__acciones">
        <Link className="boton boton--principal boton--compacto" to={`${datos.ruta}/${id}`} state={{ desde }}>Ver ficha</Link>
        <a className="boton boton--secundario boton--compacto"
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ubicacionLat},${ubicacionLng}`)}`}
          target="_blank" rel="noopener noreferrer">Cómo llegar <span className="solo-lector">(Google Maps, nueva pestaña)</span></a>
      </p>
    </section>
  );
}

// Directorio de centros de salud y gimnasios (FS-HU-25): lista y mapa de los establecimientos que registró el
// administrador (FS-HU-30), filtrados por comuna o por distancia a la ubicación de la persona. Con ubicación, la lista
// va del más cercano al más lejano. Los filtros quedan en la URL (?comuna=, ?distancia=, ?pagina=) para poder volver.
export default function Establecimientos({ categoria }) {
  const datos = CATEGORIAS[categoria];
  const [parametros, setParametros] = useSearchParams();
  const { pathname, search } = useLocation();
  const filtros = { comuna: parametros.get('comuna') || '', distancia: parametros.get('distancia') || '', pagina: parametros.get('pagina') || '' };
  // estado: inactiva | lista | denegada | no-disponible
  const [ubicacion, setUbicacion] = useState(UBICACION_INICIAL);
  const [comunas, setComunas] = useState([]);
  const [intento, setIntento] = useState(0);
  const [resultado, setResultado] = useState(null);
  // Elegido y resaltado guardan la búsqueda a la que pertenecen: al cambiar de página o de filtros se descartan solos.
  const [seleccion, setSeleccion] = useState(null);
  const [resaltado, setResaltado] = useState(null);

  useEffect(() => {
    let activo = true;
    obtenerComunasEstablecimientos(categoria).then((respuesta) => activo && setComunas(respuesta.comunas)).catch(() => {});
    return () => { activo = false; };
  }, [categoria]);

  // Si la persona ya dio permiso antes, se ordena por cercanía sin volver a preguntar.
  useEffect(() => {
    let activo = true;
    ubicacionSiHayPermiso().then((coords) => { if (activo && coords) setUbicacion({ estado: 'lista', coords, mensaje: '' }); });
    return () => { activo = false; };
  }, []);

  // Una distancia sin ubicación disponible: se pide al navegador, como en el buscador de profesionales (FS-HU-05).
  const pidiendoUbicacion = Boolean(filtros.distancia) && ubicacion.estado === 'inactiva';
  useEffect(() => {
    if (!pidiendoUbicacion) return undefined;
    let activo = true;
    obtenerUbicacion()
      .then((coords) => activo && setUbicacion({ estado: 'lista', coords, mensaje: '' }))
      .catch((error) => activo && setUbicacion({ estado: error.motivo || 'no-disponible', coords: null, mensaje: error.message }));
    return () => { activo = false; };
  }, [pidiendoUbicacion]);

  // Sin ubicación, la distancia no se envía y se ofrece la comuna (el aviso explica por qué).
  const coords = ubicacion.estado === 'lista' ? ubicacion.coords : null;
  const consulta = { comuna: filtros.comuna, distancia: coords ? filtros.distancia : '', pagina: filtros.pagina };
  const clave = JSON.stringify([consulta, coords, intento]);
  const cargando = pidiendoUbicacion || resultado?.clave !== clave;

  useEffect(() => {
    if (pidiendoUbicacion) return undefined;
    let activo = true;
    const [consultaActual, coordsActuales] = JSON.parse(clave);
    buscarEstablecimientos(categoria, consultaActual, coordsActuales)
      .then((respuesta) => activo && setResultado({ clave, ...respuesta }))
      .catch((error) => activo && setResultado({ clave, error: error.message }));
    return () => { activo = false; };
  }, [categoria, clave, pidiendoUbicacion]);

  // «Ver en el mapa» en celular sube hasta el mapa; un marcador elegido lado a lado trae su tarjeta a la vista.
  useEffect(() => {
    if (!seleccion) return;
    const behavior = movimientoSuave() ? 'smooth' : 'auto';
    const dosColumnas = window.matchMedia?.(DOS_COLUMNAS).matches;
    if (seleccion.origen === 'lista' && !dosColumnas) document.querySelector('.buscador__mapa')?.scrollIntoView?.({ behavior, block: 'start' });
    if (seleccion.origen === 'mapa' && dosColumnas) document.getElementById(`establecimiento-${seleccion.id}`)?.scrollIntoView?.({ behavior, block: 'nearest' });
  }, [seleccion]);

  const actualizar = (cambios) => {
    const siguiente = new URLSearchParams(parametros);
    for (const [nombre, valor] of Object.entries(cambios)) {
      if (valor) siguiente.set(nombre, valor); else siguiente.delete(nombre);
    }
    // Cualquier cambio de filtros vuelve a la primera página.
    if (!('pagina' in cambios)) siguiente.delete('pagina');
    setParametros(siguiente);
  };
  const reintentarUbicacion = () => setUbicacion(UBICACION_INICIAL);
  const cambiarDistancia = (valor) => {
    // Elegir otra vez una distancia después de un rechazo vuelve a pedir la ubicación.
    if (valor && ubicacion.estado !== 'lista') reintentarUbicacion();
    actualizar({ distancia: valor });
  };
  const quitarFiltros = () => setParametros({});
  const cambiarPagina = (numero) => {
    actualizar({ pagina: numero > 1 ? String(numero) : '' });
    document.getElementById('resultados')?.scrollIntoView?.({ behavior: movimientoSuave() ? 'smooth' : 'auto', block: 'start' });
  };

  const hayFiltros = Boolean(filtros.comuna || filtros.distancia);
  // Mientras llega una búsqueda nueva se dejan los resultados anteriores, atenuados, para que la página no salte.
  const actualizando = cargando && Boolean(resultado?.establecimientos?.length);
  const vigente = cargando && !actualizando ? null : resultado;
  const listo = Boolean(vigente) && !vigente.error;
  const establecimientos = listo ? vigente.establecimientos : SIN_RESULTADOS;
  // Sin resultados se muestra solo el estado vacío, no un mapa vacío al lado.
  const mapaVisible = establecimientos.length > 0;
  const deEstaBusqueda = (marca) => (marca && listo && marca.clave === vigente.clave ? marca.id : null);
  const seleccionadoId = deEstaBusqueda(seleccion);
  const resaltadoId = deEstaBusqueda(resaltado);
  const seleccionado = establecimientos.find((e) => e.id === seleccionadoId) || null;
  const desde = `${pathname}${search}`;
  const seleccionar = (id, origen) => setSeleccion(id == null ? null : { id, origen, clave: vigente.clave });
  const resaltar = (id) => setResaltado(id == null ? null : { id, clave: vigente.clave });
  const verEnMapa = (id) => (id === seleccionadoId ? seleccionar(null) : seleccionar(id, 'lista'));
  // Una comuna de la URL que ya no está en la lista se muestra igual, para que el filtro se vea elegido.
  const opcionesComuna = filtros.comuna && !comunas.includes(filtros.comuna) ? [...comunas, filtros.comuna] : comunas;

  let contenido;
  if (!vigente) {
    contenido = <p className="buscador__estado" role="status">Cargando {datos.plural}…</p>;
  } else if (vigente.error) {
    contenido = (
      <div className="buscador__estado">
        <Alerta>{vigente.error}</Alerta>
        <button type="button" className="boton boton--secundario boton--compacto" onClick={() => setIntento(intento + 1)}>Reintentar</button>
      </div>
    );
  } else if (!establecimientos.length) {
    contenido = hayFiltros || filtros.pagina ? (
      <EstadoVacio nivel={2} icono="buscar" titulo={`No encontramos ${datos.plural} con esos filtros`}
        accion={<button type="button" className="boton boton--secundario boton--compacto" onClick={quitarFiltros}>Quitar filtros</button>}>
        Prueba con otra comuna o amplía la distancia.
      </EstadoVacio>
    ) : (
      <EstadoVacio nivel={2} icono={datos.icono} titulo={`Aún no hay ${datos.plural} para mostrar`}>
        Cuando se registren {datos.plural} en FitSearch, aparecerán aquí con su dirección y su ubicación en el mapa.
      </EstadoVacio>
    );
  } else {
    const { pagina, totalPaginas, hayMas } = vigente;
    contenido = (
      <>
        <h2 className="solo-lector">Resultados</h2>
        <div className="buscador__lista">
          {establecimientos.map((establecimiento) => (
            <TarjetaEstablecimiento key={establecimiento.id} establecimiento={establecimiento} datos={datos} desde={desde}
              seleccionado={establecimiento.id === seleccionadoId} resaltado={establecimiento.id === resaltadoId}
              onResaltar={resaltar} onVerEnMapa={enMapa(establecimiento) ? () => verEnMapa(establecimiento.id) : undefined} />
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

  let contador = '';
  if (pidiendoUbicacion) contador = 'Buscando tu ubicación…';
  else if (actualizando) contador = 'Actualizando resultados…';
  // Sin resultados, el estado vacío ya lo dice: no se repite «0 gimnasios encontrados».
  else if (listo && vigente.total > 0) {
    const { total } = vigente;
    contador = `${total} ${total === 1 ? `${datos.singular} encontrado` : `${datos.plural} encontrados`}`;
    if (coords && total > 1) contador += ', del más cercano al más lejano';
  }

  return (
    <section className="buscador establecimientos" aria-labelledby="titulo-establecimientos">
      <header className="buscador__cabecera">
        <h1 id="titulo-establecimientos">{datos.titulo}</h1>
        <p>{datos.bajada}</p>
      </header>

      {/* Las etiquetas ya nombran cada filtro: las opciones van cortas para que quepan en dos columnas a 360 px. */}
      <div className="filtros-establecimientos" role="group" aria-label={`Filtrar ${datos.plural}`}>
        <label className="campo">
          <span className="campo__etiqueta">Comuna</span>
          <select className="campo__control" value={filtros.comuna} onChange={(evento) => actualizar({ comuna: evento.target.value })}>
            <option value="">Todas</option>
            {opcionesComuna.map((comuna) => <option key={comuna}>{comuna}</option>)}
          </select>
        </label>
        <label className="campo">
          <span className="campo__etiqueta">Distancia</span>
          <select className="campo__control" value={filtros.distancia} onChange={(evento) => cambiarDistancia(evento.target.value)}>
            <option value="">Cualquiera</option>
            {distanciasKm.map((km) => <option key={km} value={String(km)}>Hasta {km} km</option>)}
          </select>
        </label>
        {hayFiltros && <button type="button" className="boton-texto filtros-establecimientos__quitar" onClick={quitarFiltros}>Quitar filtros</button>}
      </div>

      {filtros.distancia && ubicacion.mensaje && (
        <Alerta tipo="info">
          {ubicacion.mensaje}{' '}
          <button type="button" className="boton-texto" onClick={reintentarUbicacion}>Intentar de nuevo</button>
        </Alerta>
      )}

      <div className={`buscador__vista${mapaVisible ? ' buscador__vista--con-mapa' : ''}`}>
        <div className="buscador__resultados" id="resultados">
          <p className="buscador__contador" role="status">{contador}</p>
          <div className={`buscador__contenido${actualizando ? ' buscador__contenido--actualizando' : ''}`} aria-busy={actualizando}>
            {contenido}
          </div>
        </div>

        <div className="buscador__mapa" hidden={!mapaVisible}>
          <MapaProfesionales profesionales={establecimientos} visible={mapaVisible} seleccionadoId={seleccionadoId} resaltadoId={resaltadoId}
            centrar={seleccion?.origen === 'lista' && seleccionadoId != null ? seleccion : null}
            onSeleccionar={(id) => seleccionar(id, 'mapa')} onResaltar={resaltar}
            describir={describir} titulo={`${datos.titulo} en el mapa`} plural={datos.plural} />
          {seleccionado ? (
            <DetalleEstablecimiento key={seleccionado.id} establecimiento={seleccionado} datos={datos} desde={desde}
              onCerrar={() => seleccionar(null)} />
          ) : (
            <p className="buscador__pista">
              <Icono nombre="pin" tamano={16} /> Elige un marcador o «Ver en el mapa» en una tarjeta para ver aquí su detalle.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
