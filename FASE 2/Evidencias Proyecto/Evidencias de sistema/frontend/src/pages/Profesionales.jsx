import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import reglas from '@shared/reglas.json';
import Alerta from '../components/Alerta.jsx';
import EstadoVacio from '../components/EstadoVacio.jsx';
import Icono from '../components/Icono.jsx';
import PanelFiltros from '../components/profesionales/PanelFiltros.jsx';
import TarjetaProfesional from '../components/profesionales/TarjetaProfesional.jsx';
import { buscarProfesionales, obtenerFiltros } from '../services/profesional.service.js';
import { obtenerUbicacion, ubicacionSiHayPermiso } from '../services/ubicacion.js';
import './Profesionales.css';

// Parámetros de la URL: la búsqueda se puede compartir y el buscador del Inicio llega con ?q=.
const CLAVES = ['q', 'especialidad', 'comuna', 'distancia', 'calificacion', 'modalidad', 'orden', 'pagina'];
const FILTROS = ['especialidad', 'comuna', 'distancia', 'calificacion', 'modalidad'];
const { ordenes, filtroModalidad, busqueda } = reglas.profesionales;
const UBICACION_INICIAL = { estado: 'inactiva', coords: null, mensaje: '' };

function etiquetaFiltro(clave, valor) {
  if (clave === 'distancia') return `Hasta ${valor} km`;
  if (clave === 'calificacion') return `${valor} estrellas o más`;
  if (clave === 'modalidad') return filtroModalidad.find((opcion) => opcion.valor === valor)?.etiqueta || valor;
  return valor;
}

// Buscador de profesionales con texto, filtros, orden y páginas (FS-HU-03, FS-HU-05, FS-HU-22).
export default function Profesionales() {
  const [parametros, setParametros] = useSearchParams();
  const { pathname, search } = useLocation();
  const filtros = Object.fromEntries(CLAVES.map((clave) => [clave, parametros.get(clave) || '']));
  const necesitaUbicacion = Boolean(filtros.distancia) || filtros.orden === 'cercania';
  // estado: inactiva | lista | denegada | no-disponible
  const [ubicacion, setUbicacion] = useState(UBICACION_INICIAL);
  const [catalogo, setCatalogo] = useState({ especialidades: [], comunas: [] });
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [intento, setIntento] = useState(0);
  const [resultado, setResultado] = useState(null);

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
  const limpiar = () => setParametros({});
  const cerrarPanel = () => setPanelAbierto(false);
  const buscar = (evento) => {
    evento.preventDefault();
    actualizar({ q: new FormData(evento.currentTarget).get('q').trim() });
  };
  const cambiarPagina = (numero) => {
    actualizar({ pagina: numero > 1 ? String(numero) : '' });
    document.getElementById('resultados')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  const activos = [
    ...(filtros.q ? [{ clave: 'q', texto: `“${filtros.q}”` }] : []),
    ...FILTROS.filter((nombre) => filtros[nombre]).map((nombre) => ({ clave: nombre, texto: etiquetaFiltro(nombre, filtros[nombre]) })),
  ];
  const cantidadFiltros = FILTROS.filter((nombre) => filtros[nombre]).length;
  const listo = !cargando && !resultado.error;

  let contenido;
  if (cargando) {
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
    const { profesionales, pagina, totalPaginas, hayMas } = resultado;
    contenido = (
      <>
        <h2 className="solo-lector">Resultados de la búsqueda</h2>
        <div className="buscador__lista">
          {profesionales.map((profesional) => (
            <TarjetaProfesional key={profesional.id} profesional={profesional} desde={`${pathname}${search}`} />
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
        <p>Busca por nombre, especialidad o palabra clave y filtra según lo que necesitas.</p>
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

      <div className="buscador__cuerpo">
        <PanelFiltros id="panel-filtros" abierto={panelAbierto} onCerrar={cerrarPanel} filtros={filtros} catalogo={catalogo}
          ubicacion={{ estado: ubicacion.estado, buscando: pidiendoUbicacion }} onCambiar={cambiarFiltros} onLimpiar={limpiar}
          total={listo ? resultado.total : undefined} hayFiltros={activos.length > 0} />

        <div className="buscador__resultados" id="resultados">
          <div className="buscador__barra">
            <p className="buscador__contador" role="status">
              {listo && `${resultado.total} ${resultado.total === 1 ? 'profesional encontrado' : 'profesionales encontrados'}`}
            </p>
            <div className="buscador__controles">
              <button type="button" className="boton boton--secundario buscador__boton-filtros" aria-expanded={panelAbierto} aria-controls="panel-filtros"
                onClick={() => setPanelAbierto(true)}>
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

          {contenido}
        </div>
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
