import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { cargarMapLibre, ESTILO_MAPA } from '../../services/mapas.js';
import './MapaProfesionales.css';

// MapLibre usa [longitud, latitud].
const SANTIAGO = [-70.66, -33.45];

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
    const puntos = profesionales.filter((p) =>
      p.ubicacionLat != null && p.ubicacionLng != null &&
      Number.isFinite(Number(p.ubicacionLat)) &&
      Number.isFinite(Number(p.ubicacionLng)));
    const limites = new maplibregl.LngLatBounds();
    for (const p of puntos) {
      const posicion = [Number(p.ubicacionLng), Number(p.ubicacionLat)];
      limites.extend(posicion);
      const marcador = new maplibregl.Marker({ color: '#0b4f80' })
        .setLngLat(posicion)
        .addTo(mapa.current);
      const elemento = marcador.getElement();
      elemento.title = `${p.nombre}, ${p.especialidad}`;
      const tarjeta = document.createElement('div');
      const nombre = document.createElement('strong');
      nombre.textContent = p.nombre;
      const especialidad = document.createElement('p');
      especialidad.textContent = p.especialidad;
      tarjeta.append(nombre, especialidad);
      const ventana = new maplibregl.Popup({ offset: 25 }).setDOMContent(tarjeta);
      // MapLibre abre la ventana del marcador; aquí solo se cierran las demás y se registra la selección.
      marcador.setPopup(ventana);
      const alSeleccionar = () => {
        ventanas.forEach((v) => v !== ventana && v.remove());
        setSeleccion({ profesional: p, resultados: profesionales });
      };
      elemento.addEventListener('click', alSeleccionar);
      marcadores.push({ marcador, elemento, alSeleccionar });
      ventanas.push(ventana);
    }
    if (puntos.length > 1) mapa.current.fitBounds(limites, { padding: 40, maxZoom: 15, duration: 0 });
    else if (puntos.length === 1) {
      mapa.current.setCenter([Number(puntos[0].ubicacionLng), Number(puntos[0].ubicacionLat)]);
      mapa.current.setZoom(13);
    }
    else { mapa.current.setCenter(SANTIAGO); mapa.current.setZoom(11); }
    return () => {
      marcadores.forEach(({ marcador, elemento, alSeleccionar }) => {
        elemento.removeEventListener('click', alSeleccionar);
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
