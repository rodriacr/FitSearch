// MapLibre GL JS se descarga solo al abrir la vista Mapa, con versión fija y
// huella SRI: el navegador rechaza el archivo si la CDN lo entrega alterado.
const VERSION = '5.24.0';
const CDN = `https://unpkg.com/maplibre-gl@${VERSION}/dist`;
const SCRIPT = {
  src: `${CDN}/maplibre-gl.js`,
  integrity: 'sha384-5+cfbwT0iiub6VsQAdn6yz16nr6sDiQoHx6tm4O8OVYXHYOxcffFmCJBL0dgdvGp',
};
const ESTILOS = {
  href: `${CDN}/maplibre-gl.css`,
  integrity: 'sha384-uTttxo/aOKbdE5RlD/SPzSDoDmNvGlUYPjONi2MN/b7c9HPSvW07OIuyP7uL6jxK',
};

// Teselas vectoriales de OpenFreeMap (datos de OpenStreetMap): gratuitas, sin clave ni registro.
export const ESTILO_MAPA = 'https://tiles.openfreemap.org/styles/liberty';

let carga;
export function cargarMapLibre() {
  if (window.maplibregl?.Map) return Promise.resolve(window.maplibregl);
  if (!document.querySelector(`link[href="${ESTILOS.href}"]`)) {
    const hoja = document.createElement('link');
    hoja.rel = 'stylesheet';
    hoja.href = ESTILOS.href;
    hoja.setAttribute('integrity', ESTILOS.integrity);
    hoja.setAttribute('crossorigin', 'anonymous');
    document.head.appendChild(hoja);
  }
  if (!carga) carga = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const fallar = () => {
      script.remove();
      carga = null;
      reject(
        new Error('No se pudo cargar el mapa. Reintenta o utiliza la lista.'),
      );
    };
    script.src = SCRIPT.src;
    script.setAttribute('integrity', SCRIPT.integrity);
    script.setAttribute('crossorigin', 'anonymous');
    script.async = true;
    script.onload = () => (window.maplibregl?.Map ? resolve(window.maplibregl) : fallar());
    script.onerror = fallar;
    document.head.appendChild(script);
  });
  // El plazo limita la espera de la pantalla, no la descarga compartida.
  // Una llegada tardía conserva el script y los reintentos lo reutilizan.
  return new Promise((resolve, reject) => {
    const temporizador = setTimeout(() => reject(new Error(
      'El mapa está tardando en cargar. Reintenta o utiliza la lista.',
    )), 15000);
    carga.then(
      (maplibregl) => { clearTimeout(temporizador); resolve(maplibregl); },
      (error) => { clearTimeout(temporizador); reject(error); },
    );
  });
}
