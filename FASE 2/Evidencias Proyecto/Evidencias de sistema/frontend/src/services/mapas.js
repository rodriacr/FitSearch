let carga;
export function cargarGoogleMaps(
  clave = import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
) {
  if (!clave)
    return Promise.reject(
      new Error(
        'La vista de mapa todavía no está disponible. Puedes seguir usando la lista.',
      ),
    );
  if (window.google?.maps?.importLibrary)
    return Promise.resolve(window.google.maps);
  if (!carga) carga = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const fallar = () => {
      script.remove();
      delete window.fitsearchMapsListo;
      carga = null;
      reject(
        new Error('No se pudo cargar el mapa. Reintenta o utiliza la lista.'),
      );
    };
    window.fitsearchMapsListo = () => {
      delete window.fitsearchMapsListo;
      resolve(window.google.maps);
    };
    script.src = `https://maps.googleapis.com/maps/api/js?${new URLSearchParams({ key: clave, v: 'weekly', loading: 'async', libraries: 'marker', callback: 'fitsearchMapsListo', language: 'es', region: 'CL' })}`;
    script.async = true;
    script.onerror = fallar;
    document.head.appendChild(script);
  });
  // El plazo limita la espera de la pantalla, no la descarga compartida.
  // Una llegada tardía mantiene su callback y los reintentos usan el mismo script.
  return new Promise((resolve, reject) => {
    const temporizador = setTimeout(() => reject(new Error(
      'El mapa está tardando en cargar. Reintenta o utiliza la lista.',
    )), 15000);
    carga.then(
      (maps) => { clearTimeout(temporizador); resolve(maps); },
      (error) => { clearTimeout(temporizador); reject(error); },
    );
  });
}
