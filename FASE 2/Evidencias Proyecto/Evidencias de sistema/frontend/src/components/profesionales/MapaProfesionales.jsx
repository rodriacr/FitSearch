import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import reglas from '@shared/reglas.json';
import { cargarMapLibre, ESTILO_MAPA } from '../../services/mapas.js';
import DetalleEnMapa from './DetalleEnMapa.jsx';
import './MapaProfesionales.css';

// MapLibre usa [longitud, latitud].
const SANTIAGO = [-70.66, -33.45];
// FitSearch funciona en Chile: el mapa no se aleja ni se mueve fuera del Chile continental (con un margen que incluye
// Juan Fernández). [suroeste, noreste]. Una ubicación fuera de este recuadro no se dibuja ni se usa para encuadrar:
// antes, una sola ficha con coordenadas erróneas alejaba el mapa hasta mostrar medio continente. Desde la SC-24 el
// mismo recuadro (shared/reglas.json) valida las coordenadas al guardar la ficha.
const { latMin, latMax, lngMin, lngMax } = reglas.profesionales.ubicacionChile;
const CHILE = [[lngMin, latMin], [lngMax, latMax]];
const coordenadas = (p) => (p.ubicacionLat != null && p.ubicacionLng != null
  && Number.isFinite(Number(p.ubicacionLat)) && Number.isFinite(Number(p.ubicacionLng))
  ? [Number(p.ubicacionLng), Number(p.ubicacionLat)] : null);
const enChile = ([lng, lat]) => lng >= CHILE[0][0] && lng <= CHILE[1][0] && lat >= CHILE[0][1] && lat <= CHILE[1][1];

// Encuadrar antes de que cargue el estilo deja el mapa en una posición equivocada,
// así que se espera el evento load con el mismo plazo que la descarga del SDK.
function esperarEstilo(cargaEstilo) {
  let temporizador;
  return Promise.race([
    cargaEstilo,
    new Promise((_, reject) => {
      temporizador = setTimeout(() => reject(new Error(
        'El mapa está tardando en cargar. Reintenta o utiliza la lista.',
      )), 15000);
    }),
  ]).finally(() => clearTimeout(temporizador));
}

// visible: el mapa sigue montado al volver a la lista, pero solo dibuja marcadores y encuadra cuando se ve
// (un mapa oculto mide 0 y fitBounds calcularía un zoom equivocado).
export default function MapaProfesionales({ profesionales, desde, visible = true }) {
  const contenedor = useRef(null);
  const mapa = useRef(null);
  const cargaEstilo = useRef(null);
  const api = useRef(null);
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);
  const [seleccion, setSeleccion] = useState(null);
  const seleccionado = seleccion?.resultados === profesionales ? seleccion.profesional : null;
  const ventanaSeleccionada = seleccionado ? seleccion.detalle : null;
  const fueraDeChile = profesionales.filter((p) => coordenadas(p) && !enChile(coordenadas(p)));
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
          });
          mapa.current.addControl(new maplibregl.NavigationControl({ showCompass: false }));
          const creado = mapa.current;
          cargaEstilo.current = new Promise((resolve) => creado.once('load', resolve));
        }
        // Un reintento reutiliza el mismo mapa y su carga de estilo.
        await esperarEstilo(cargaEstilo.current);
        if (!vigente) return;
        setEstado('listo');
        setError('');
      } catch (e) {
        if (vigente) {
          setEstado('error');
          setError(e.message);
        }
      }
    })();
    return () => { vigente = false; };
  }, [intento]);

  useEffect(() => {
    if (estado !== 'listo' || !visible) return;
    const maplibregl = api.current;
    // El contenedor pudo estar oculto: se recalcula su tamaño antes de encuadrar.
    mapa.current.resize();
    const marcadores = [];
    const ventanas = [];
    const puntos = profesionales.filter((p) => coordenadas(p) && enChile(coordenadas(p)));
    const limites = new maplibregl.LngLatBounds();
    for (const p of puntos) {
      const posicion = coordenadas(p);
      limites.extend(posicion);
      const marcador = new maplibregl.Marker({ color: '#0b4f80' })
        .setLngLat(posicion)
        .addTo(mapa.current);
      const elemento = marcador.getElement();
      elemento.title = `${p.nombre}, ${p.especialidad}`;
      // La ventana trae el nombre de inmediato; el detalle (tipo, verificación, lugar y próxima hora) lo dibuja React
      // dentro de "detalle" cuando se abre (DetalleEnMapa).
      const tarjeta = document.createElement('div');
      tarjeta.className = 'ventana-mapa';
      const nombre = document.createElement('strong');
      nombre.className = 'ventana-mapa__nombre';
      nombre.textContent = p.nombre;
      const detalle = document.createElement('div');
      tarjeta.append(nombre, detalle);
      const ventana = new maplibregl.Popup({ offset: 25, maxWidth: '18rem' }).setDOMContent(tarjeta);
      marcador.setPopup(ventana);
      // Se registra al abrirse la ventana (con el mouse o con Enter sobre el marcador) y se cierran las demás. Antes se
      // escuchaba solo el clic, y con el teclado quedaban dos ventanas abiertas y la selección anterior (defecto 28).
      const alSeleccionar = () => {
        ventanas.forEach((v) => v !== ventana && v.remove());
        setSeleccion({ profesional: p, resultados: profesionales, detalle });
      };
      ventana.on('open', alSeleccionar);
      marcadores.push({ marcador, ventana, alSeleccionar });
      ventanas.push(ventana);
    }
    if (puntos.length > 1) mapa.current.fitBounds(limites, { padding: 40, maxZoom: 15, duration: 0 });
    else if (puntos.length === 1) {
      mapa.current.setCenter(coordenadas(puntos[0]));
      mapa.current.setZoom(13);
    }
    else { mapa.current.setCenter(SANTIAGO); mapa.current.setZoom(11); }
    return () => {
      marcadores.forEach(({ marcador, ventana, alSeleccionar }) => {
        ventana.off('open', alSeleccionar);
        marcador.remove();
      });
      ventanas.forEach((v) => v.remove());
    };
  }, [profesionales, estado, visible]);

  // Declarado al final: al desmontar, React limpia los marcadores antes de destruir el mapa.
  useEffect(() => () => {
    mapa.current?.remove();
    mapa.current = null;
    cargaEstilo.current = null;
  }, []);
  return (
    <section
      className="mapa-profesionales"
      aria-label="Profesionales en el mapa"
    >
      {estado === 'cargando' && <p role="status">Cargando mapa…</p>}
      {error && (
        <p role="alert">
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
      <p className="texto-secundario">
        El mapa muestra los mismos resultados y filtros de esta página.
        Selecciona un marcador o un profesional de la lista accesible.
      </p>
      {fueraDeChile.length > 0 && (
        <p className="texto-secundario">
          {fueraDeChile.length === 1
            ? `${fueraDeChile[0].nombre} no aparece en el mapa porque su ubicación registrada está fuera de Chile.`
            : `${fueraDeChile.length} profesionales de esta página no aparecen en el mapa porque su ubicación registrada está fuera de Chile.`}
          {' '}Puedes abrir su ficha desde la lista.
        </p>
      )}
      {ventanaSeleccionada && createPortal(<DetalleEnMapa key={seleccionado.id} profesional={seleccionado} desde={desde} />, ventanaSeleccionada)}
      {seleccionado && (
        <p role="status">
          <strong>{seleccionado.nombre}</strong> · {seleccionado.especialidad} ·{' '}
          <Link to={`/profesionales/${seleccionado.id}`} state={{ desde }}>
            Ver ficha de {seleccionado.nombre}
          </Link>
        </p>
      )}
      <ul className="mapa-profesionales__alternativa">
        {profesionales.map((p) => (
          <li key={p.id}>
            <Link to={`/profesionales/${p.id}`} state={{ desde }}>
              {p.nombre}
            </Link>
            <span>
              {p.especialidad} · {p.comuna || 'Comuna por confirmar'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
