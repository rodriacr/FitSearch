import { ESTILO_MAPA } from './mapas.js';

// Piezas comunes de los mapas de FitSearch: el de los profesionales (FS-HU-06) y el de la ficha del profesional (SC-28).

// Textos de los controles de MapLibre en español (defecto 29): por defecto decían «Zoom in», «Close popup» y «Map marker».
export const TEXTOS_MAPA = {
  'Map.Title': 'Mapa de profesionales',
  'NavigationControl.ZoomIn': 'Acercar',
  'NavigationControl.ZoomOut': 'Alejar',
  'NavigationControl.ResetBearing': 'Orientar al norte',
  'Popup.Close': 'Cerrar ventana',
  'Marker.Title': 'Marcador del mapa',
  'AttributionControl.ToggleAttribution': 'Mostrar u ocultar la atribución',
  'CooperativeGesturesHandler.WindowsHelpText': 'Usa Ctrl + rueda del mouse para acercar o alejar el mapa',
  'CooperativeGesturesHandler.MacHelpText': 'Usa ⌘ + rueda del mouse para acercar o alejar el mapa',
  'CooperativeGesturesHandler.MobileHelpText': 'Usa dos dedos para mover el mapa',
};

// Alfiler del marcador (SC-27): toma el color del texto, así el seleccionado cambia de color solo con CSS.
export const ALFILER = '<svg viewBox="0 0 32 42" width="32" height="42" aria-hidden="true" focusable="false">'
  + '<path d="M16 1C7.7 1 1 7.6 1 15.8 1 27 16 41 16 41s15-14 15-25.2C31 7.6 24.3 1 16 1z" fill="currentColor" stroke="#fff" stroke-width="2"/>'
  + '<circle cx="16" cy="15.5" r="5.5" fill="#fff"/></svg>';

// En un mapa angosto (celular, o el recuadro de la ficha) MapLibre abre la atribución y solo la pliega al arrastrar:
// tapaba un tercio del mapa. Se pliega al terminar de cargar; sigue disponible en su botón (i).
export function plegarAtribucion(mapa, contenedor) {
  mapa.once('idle', () => {
    if (contenedor.current?.offsetWidth >= 640) return;
    const atribucion = contenedor.current.querySelector('.maplibregl-compact-show');
    atribucion?.classList.remove('maplibregl-compact-show');
    atribucion?.removeAttribute('open');
  });
}

// Promesa de la primera carga del estilo. Si la descarga del estilo falla, MapLibre avisa con el evento error y el mapa
// nunca emite load: se rechaza de inmediato en vez de esperar el plazo (defecto 27). Una tesela que falla no la rechaza.
export function cargaDelEstilo(mapa) {
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
export function esperarEstilo(cargaEstilo) {
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
