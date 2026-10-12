import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { cargarGoogleMaps } from '../../services/mapas.js';
import './MapaProfesionales.css';

// visible: el mapa sigue montado al volver a la lista, pero solo dibuja marcadores y encuadra cuando se ve
// (un mapa oculto mide 0 y fitBounds calcularía un zoom equivocado).
export default function MapaProfesionales({ profesionales, desde, visible = true }) {
  const contenedor = useRef(null);
  const mapa = useRef(null);
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
        const maps = await cargarGoogleMaps();
        const { Map } = await maps.importLibrary('maps');
        const { AdvancedMarkerElement } = await maps.importLibrary('marker');
        if (!vigente) return;
        api.current = { maps, AdvancedMarkerElement };
        if (!mapa.current) mapa.current = new Map(contenedor.current, {
          center: { lat: -33.45, lng: -70.66 },
          zoom: 11,
          mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID',
          streetViewControl: false,
          mapTypeControl: false,
        });
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
    const { maps, AdvancedMarkerElement } = api.current;
    const marcadores = [];
    const informacion = [];
    const puntos = profesionales.filter((p) =>
      p.ubicacionLat != null && p.ubicacionLng != null &&
      Number.isFinite(Number(p.ubicacionLat)) &&
      Number.isFinite(Number(p.ubicacionLng)));
    const limites = new maps.LatLngBounds();
        for (const p of puntos) {
          const position = {
            lat: Number(p.ubicacionLat),
            lng: Number(p.ubicacionLng),
          };
          limites.extend(position);
          const marcador = new AdvancedMarkerElement({
            map: mapa.current,
            position,
            title: `${p.nombre}, ${p.especialidad}`,
          });
          const tarjeta = document.createElement('div');
          const nombre = document.createElement('strong');
          nombre.textContent = p.nombre;
          const especialidad = document.createElement('p');
          especialidad.textContent = p.especialidad;
          tarjeta.append(nombre, especialidad);
          const ventana = new maps.InfoWindow({ content: tarjeta });
          const listener = marcador.addListener('click', () => {
            informacion.forEach((v) => v.close());
            ventana.open({ map: mapa.current, anchor: marcador });
            setSeleccion({ profesional: p, resultados: profesionales });
          });
          marcadores.push({ marcador, listener });
          informacion.push(ventana);
        }
        if (puntos.length > 1) mapa.current.fitBounds(limites, 40);
        else if (puntos.length === 1) {
          mapa.current.setCenter({
            lat: Number(puntos[0].ubicacionLat),
            lng: Number(puntos[0].ubicacionLng),
          });
          mapa.current.setZoom(13);
        }
        else { mapa.current.setCenter({ lat: -33.45, lng: -70.66 }); mapa.current.setZoom(11); }
    return () => {
      marcadores.forEach(({ marcador, listener }) => {
        listener.remove();
        marcador.map = null;
      });
      informacion.forEach((v) => v.close());
    };
  }, [profesionales, estado, visible]);
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
