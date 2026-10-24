import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cargarMapLibre, ESTILO_MAPA } from '../../services/mapas.js';
import { ALFILER, cargaDelEstilo, esperarEstilo, plegarAtribucion, TEXTOS_MAPA } from '../../services/cargaMapa.js';
import { CHILE } from '../profesionales/ubicacionMapa.js';
import './MapaUbicacion.css';

// Acercamiento según lo que se encontró: la puerta, la calle o el centro de la comuna.
const ZOOM = { guardada: 16, exacta: 16, calle: 15, comuna: 12 };
// Con el teclado cada flecha mueve el marcador unos píxeles; con Mayús, más.
const FLECHAS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
const PASO = 10;
const PASO_LARGO = 50;
const posicionDe = ({ lat, lng }) => [lng, lat];

// Mapa de la ficha del profesional (SC-28): muestra el lugar de atención encontrado con su comuna y su dirección.
// Si no quedó justo en su puerta, el profesional arrastra el marcador, hace clic en el mapa o lo mueve con las flechas;
// cada ajuste se avisa con onMover({ lat, lng }). Solo se encuadra cuando la ubicación viene de una búsqueda, no de un
// ajuste. El mapa solo pide gestos cooperativos (Ctrl + rueda, dos dedos) para no atrapar el desplazamiento del formulario.
export default function MapaUbicacion({ ubicacion, onMover }) {
  const contenedor = useRef(null);
  const mapa = useRef(null);
  const cargaEstilo = useRef(null);
  const marcador = useRef(null);
  // El mapa se crea una vez: lee la ubicación inicial y el aviso vigente desde aquí.
  const actual = useRef({ ubicacion, onMover });
  const [estado, setEstado] = useState('cargando');
  const [intento, setIntento] = useState(0);

  useLayoutEffect(() => { actual.current = { ubicacion, onMover }; });

  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const maplibregl = await cargarMapLibre();
        if (!vigente) return;
        if (!mapa.current) {
          const inicial = actual.current.ubicacion;
          mapa.current = new maplibregl.Map({
            container: contenedor.current,
            style: ESTILO_MAPA,
            center: posicionDe(inicial),
            zoom: ZOOM[inicial.precision] ?? 15,
            maxBounds: CHILE,
            renderWorldCopies: false,
            cooperativeGestures: true,
            attributionControl: { compact: true },
            locale: { ...TEXTOS_MAPA, 'Map.Title': 'Mapa de tu lugar de atención' },
          });
          mapa.current.addControl(new maplibregl.NavigationControl({ showCompass: false }));
          cargaEstilo.current = cargaDelEstilo(mapa.current);
          plegarAtribucion(mapa.current, contenedor);

          const elemento = document.createElement('button');
          elemento.type = 'button';
          elemento.className = 'mapa-ubicacion__marcador';
          elemento.innerHTML = ALFILER;
          // El marcador se mueve de inmediato (sin esperar a que React vuelva a dibujar): así varias flechas seguidas
          // suman su recorrido.
          const mover = (lngLat) => {
            marcador.current.setLngLat(lngLat);
            actual.current.onMover?.({ lat: lngLat.lat, lng: lngLat.lng });
          };
          marcador.current = new maplibregl.Marker({ element: elemento, anchor: 'bottom', draggable: true })
            .setLngLat(posicionDe(inicial))
            .addTo(mapa.current);
          // Se asigna después de addTo porque MapLibre pone ahí su texto genérico (defecto 29).
          elemento.setAttribute('aria-label', 'Tu lugar de atención. Puedes moverlo con las flechas del teclado.');
          marcador.current.on('dragend', () => mover(marcador.current.getLngLat()));
          elemento.addEventListener('keydown', (evento) => {
            const direccion = FLECHAS[evento.key];
            if (!direccion) return;
            // Sin stopPropagation el mapa también recibe la flecha y se desplaza 100 px bajo el marcador.
            evento.preventDefault();
            evento.stopPropagation();
            const paso = evento.shiftKey ? PASO_LARGO : PASO;
            const punto = mapa.current.project(marcador.current.getLngLat());
            mover(mapa.current.unproject([punto.x + direccion[0] * paso, punto.y + direccion[1] * paso]));
          });
          // Un clic en el mapa lleva el marcador ahí (no el clic sobre el propio marcador).
          mapa.current.on('click', (evento) => {
            if (elemento.contains(evento.originalEvent?.target)) return;
            mover(evento.lngLat);
          });
        }
        await esperarEstilo(cargaEstilo.current);
        if (vigente) setEstado('listo');
      } catch {
        if (vigente) {
          // Como en el mapa de profesionales (defecto 27): un mapa que no cargó se descarta y el reintento crea otro.
          mapa.current?.remove();
          mapa.current = null;
          marcador.current = null;
          cargaEstilo.current = null;
          setEstado('error');
        }
      }
    })();
    return () => { vigente = false; };
  }, [intento]);

  useEffect(() => {
    if (estado !== 'listo') return;
    marcador.current.setLngLat(posicionDe(ubicacion));
    if (ubicacion.origen === 'manual') return;
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    mapa.current.easeTo({ center: posicionDe(ubicacion), zoom: ZOOM[ubicacion.precision] ?? 15, duration: reducido ? 0 : 450 });
  }, [ubicacion, estado]);

  useEffect(() => () => {
    mapa.current?.remove();
    mapa.current = null;
  }, []);

  return (
    <div className="mapa-ubicacion">
      {estado === 'cargando' && <p className="mapa-ubicacion__aviso" role="status">Cargando mapa…</p>}
      {estado === 'error' && (
        <p className="mapa-ubicacion__aviso" role="alert">
          No se pudo cargar el mapa. Tu ubicación se guarda igual.{' '}
          <button className="boton-texto" type="button" onClick={() => { setEstado('cargando'); setIntento((i) => i + 1); }}>
            Reintentar mapa
          </button>
        </p>
      )}
      <div className="mapa-ubicacion__mapa" ref={contenedor} hidden={estado === 'error'} />
    </div>
  );
}
