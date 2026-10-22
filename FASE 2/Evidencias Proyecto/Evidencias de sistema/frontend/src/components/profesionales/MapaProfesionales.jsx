import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cargarMapLibre, ESTILO_MAPA } from '../../services/mapas.js';
import { CHILE, coordenadas, enMapa, fueraDeChile } from './ubicacionMapa.js';
import './MapaProfesionales.css';

// MapLibre usa [longitud, latitud].
const SANTIAGO = [-70.66, -33.45];
// Textos de los controles de MapLibre en español (defecto 29): por defecto decían «Zoom in», «Close popup» y «Map marker».
const TEXTOS_MAPA = {
  'Map.Title': 'Mapa de profesionales',
  'NavigationControl.ZoomIn': 'Acercar',
  'NavigationControl.ZoomOut': 'Alejar',
  'NavigationControl.ResetBearing': 'Orientar al norte',
  'Popup.Close': 'Cerrar ventana',
  'Marker.Title': 'Marcador del mapa',
  'AttributionControl.ToggleAttribution': 'Mostrar u ocultar la atribución',
};
// Alfiler del marcador (SC-27): toma el color del texto, así el seleccionado cambia de color solo con CSS.
const ALFILER = '<svg viewBox="0 0 32 42" width="32" height="42" aria-hidden="true" focusable="false">'
  + '<path d="M16 1C7.7 1 1 7.6 1 15.8 1 27 16 41 16 41s15-14 15-25.2C31 7.6 24.3 1 16 1z" fill="currentColor" stroke="#fff" stroke-width="2"/>'
  + '<circle cx="16" cy="15.5" r="5.5" fill="#fff"/></svg>';

// Promesa de la primera carga del estilo. Si la descarga del estilo falla, MapLibre avisa con el evento error y el mapa
// nunca emite load: se rechaza de inmediato en vez de esperar el plazo (defecto 27). Una tesela que falla no la rechaza.
function cargaDelEstilo(mapa) {
  return new Promise((resolve, reject) => {
    const alCargar = () => { mapa.off('error', alFallar); resolve(); };
    const alFallar = ({ error } = {}) => {
      if (error?.url !== ESTILO_MAPA) return;
      mapa.off('load', alCargar);
      mapa.off('error', alFallar);
      reject(new Error('No se pudo cargar el mapa. Revisa tu conexión y reintenta, o utiliza la lista.'));
    };
    mapa.once('load', alCargar);
    mapa.on('error', alFallar);
  });
}

// Encuadrar antes de que cargue el estilo deja el mapa en una posición equivocada,
// así que se espera el evento load con el mismo plazo que la descarga del SDK.
// En una pestaña oculta el navegador pausa el dibujo y load no llega: el plazo empieza a correr cuando la pestaña se ve.
// Antes, abrir Profesionales en segundo plano terminaba en «El mapa está tardando en cargar» (defecto 37).
function esperarEstilo(cargaEstilo) {
  let temporizador;
  let alMostrarse;
  return Promise.race([
    cargaEstilo,
    new Promise((_, reject) => {
      const iniciarPlazo = () => {
        temporizador = setTimeout(() => reject(new Error(
          'El mapa está tardando en cargar. Reintenta o utiliza la lista.',
        )), 15000);
      };
      if (document.visibilityState !== 'hidden') { iniciarPlazo(); return; }
      alMostrarse = () => {
        if (document.visibilityState === 'hidden') return;
        document.removeEventListener('visibilitychange', alMostrarse);
        iniciarPlazo();
      };
      document.addEventListener('visibilitychange', alMostrarse);
    }),
  ]).finally(() => {
    clearTimeout(temporizador);
    if (alMostrarse) document.removeEventListener('visibilitychange', alMostrarse);
  });
}

// Cada marcador es un botón: se alcanza con Tab y se elige con Enter o Espacio sin código extra (defecto 28).
function crearAlfiler(p) {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'marcador-mapa';
  boton.title = `${p.nombre}, ${p.especialidad}`;
  boton.innerHTML = ALFILER;
  return boton;
}

// Mapa junto a la lista de resultados (FS-HU-06, SC-27). Muestra los profesionales de la página actual; elegir un
// marcador avisa a la página (onSeleccionar), que muestra el detalle bajo el mapa y marca la tarjeta en la lista.
// Pasar el mouse o el foco por un marcador lo resalta junto con su tarjeta (onResaltar), y al revés.
// centrar: selección hecha desde la lista; el mapa se mueve hasta ese marcador.
// visible: el mapa sigue montado al ocultarlo, pero solo dibuja marcadores y encuadra cuando se ve
// (un mapa oculto mide 0 y fitBounds calcularía un zoom equivocado).
export default function MapaProfesionales({
  profesionales, visible = true, seleccionadoId = null, resaltadoId = null, centrar = null, onSeleccionar, onResaltar,
}) {
  const contenedor = useRef(null);
  const mapa = useRef(null);
  const cargaEstilo = useRef(null);
  const api = useRef(null);
  const marcadores = useRef(new Map());
  // Los marcadores se crean una vez por página de resultados: leen los avisos vigentes desde aquí.
  const avisos = useRef({});
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);
  const sinMapa = profesionales.filter(fueraDeChile);
  const seleccionado = profesionales.find((p) => p.id === seleccionadoId);

  useLayoutEffect(() => { avisos.current = { onSeleccionar, onResaltar }; });

  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const maplibregl = await cargarMapLibre();
        if (!vigente) return;
        api.current = maplibregl;
        if (!mapa.current) {
          mapa.current = new maplibregl.Map({
            container: contenedor.current,
            style: ESTILO_MAPA,
            center: SANTIAGO,
            zoom: 11,
            maxBounds: CHILE,
            renderWorldCopies: false,
            attributionControl: { compact: true },
            locale: TEXTOS_MAPA,
          });
          mapa.current.addControl(new maplibregl.NavigationControl({ showCompass: false }));
          cargaEstilo.current = cargaDelEstilo(mapa.current);
          // En un mapa angosto (celular) MapLibre abre la atribución y solo la pliega al arrastrar: tapaba un tercio del
          // mapa. Se pliega al terminar de cargar; sigue disponible en su botón (i).
          mapa.current.once('idle', () => {
            if (contenedor.current?.offsetWidth >= 640) return;
            const atribucion = contenedor.current.querySelector('.maplibregl-compact-show');
            atribucion?.classList.remove('maplibregl-compact-show');
            atribucion?.removeAttribute('open');
          });
        }
        await esperarEstilo(cargaEstilo.current);
        if (!vigente) return;
        setEstado('listo');
        setError('');
      } catch (e) {
        if (vigente) {
          // Un mapa que no terminó de cargar no se recupera solo: se descarta para que «Reintentar mapa» cree uno nuevo.
          // Antes el reintento reutilizaba el mismo mapa y esperaba un load que nunca llegaba (defecto 27).
          mapa.current?.remove();
          mapa.current = null;
          cargaEstilo.current = null;
          setEstado('error');
          setError(e.message);
        }
      }
    })();
    return () => { vigente = false; };
  }, [intento]);

  useEffect(() => {
    if (estado !== 'listo' || !visible) return undefined;
    const maplibregl = api.current;
    // El contenedor pudo estar oculto: se recalcula su tamaño antes de encuadrar.
    mapa.current.resize();
    const creados = new Map();
    const puntos = profesionales.filter(enMapa);
    const limites = new maplibregl.LngLatBounds();
    for (const p of puntos) {
      const posicion = coordenadas(p);
      limites.extend(posicion);
      const elemento = crearAlfiler(p);
      const marcador = new maplibregl.Marker({ element: elemento, anchor: 'bottom' })
        .setLngLat(posicion)
        .addTo(mapa.current);
      // El lector de pantalla anuncia a quién corresponde el marcador, no «Marcador del mapa» (defecto 29).
      // Se asigna después de addTo porque MapLibre pone ahí su texto genérico.
      elemento.setAttribute('aria-label', `${p.nombre}, ${p.especialidad}`);
      elemento.addEventListener('click', () => avisos.current.onSeleccionar?.(p.id));
      for (const evento of ['mouseenter', 'focus']) elemento.addEventListener(evento, () => avisos.current.onResaltar?.(p.id));
      for (const evento of ['mouseleave', 'blur']) elemento.addEventListener(evento, () => avisos.current.onResaltar?.(null));
      creados.set(p.id, { marcador, elemento, posicion });
    }
    marcadores.current = creados;
    if (puntos.length > 1) mapa.current.fitBounds(limites, { padding: 48, maxZoom: 15, duration: 0 });
    else if (puntos.length === 1) {
      mapa.current.setCenter(coordenadas(puntos[0]));
      mapa.current.setZoom(13);
    }
    else { mapa.current.setCenter(SANTIAGO); mapa.current.setZoom(11); }
    return () => {
      creados.forEach(({ marcador }) => marcador.remove());
      marcadores.current = new Map();
    };
  }, [profesionales, estado, visible]);

  // Declarado después de crear los marcadores: con una página nueva, marca los recién creados.
  useEffect(() => {
    marcadores.current.forEach(({ elemento }, id) => {
      elemento.classList.toggle('marcador-mapa--seleccionado', id === seleccionadoId);
      elemento.classList.toggle('marcador-mapa--resaltado', id === resaltadoId);
      elemento.setAttribute('aria-pressed', String(id === seleccionadoId));
    });
  }, [seleccionadoId, resaltadoId, profesionales, estado, visible]);

  // «Ver en el mapa» desde una tarjeta: el mapa se desliza hasta el marcador (sin animación si se pidió reducir movimiento).
  useEffect(() => {
    const destino = centrar && marcadores.current.get(centrar.id);
    if (!destino || estado !== 'listo' || !visible) return;
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    mapa.current.easeTo({ center: destino.posicion, zoom: Math.max(mapa.current.getZoom(), 13), duration: reducido ? 0 : 450 });
  }, [centrar, estado, visible, profesionales]);

  // Declarado al final: al desmontar, React limpia los marcadores antes de destruir el mapa.
  useEffect(() => () => {
    mapa.current?.remove();
    mapa.current = null;
    cargaEstilo.current = null;
  }, []);
  return (
    <section className="mapa-profesionales" aria-label="Profesionales en el mapa">
      {estado === 'cargando' && <p className="mapa-profesionales__aviso" role="status">Cargando mapa…</p>}
      {error && (
        <p className="mapa-profesionales__aviso" role="alert">
          {error}{' '}
          <button
            className="boton-texto"
            type="button"
            onClick={() => {
              setEstado('cargando');
              setError('');
              setIntento((i) => i + 1);
            }}
          >
            Reintentar mapa
          </button>
        </p>
      )}
      <div
        className="mapa-profesionales__mapa"
        ref={contenedor}
        aria-label="Mapa de los resultados de esta página"
        hidden={estado === 'error'}
      />
      <p className="solo-lector" role="status">
        {seleccionado ? `Seleccionado: ${seleccionado.nombre}, ${seleccionado.especialidad}. Su detalle está bajo el mapa.` : ''}
      </p>
      {sinMapa.length > 0 && (
        <p className="texto-secundario mapa-profesionales__nota">
          {sinMapa.length === 1
            ? `${sinMapa[0].nombre} no aparece en el mapa porque su ubicación registrada está fuera de Chile.`
            : `${sinMapa.length} profesionales de esta página no aparecen en el mapa porque su ubicación registrada está fuera de Chile.`}
          {' '}Puedes abrir su ficha desde la lista.
        </p>
      )}
    </section>
  );
}
