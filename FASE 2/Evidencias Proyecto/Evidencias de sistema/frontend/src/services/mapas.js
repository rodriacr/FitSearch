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
  if (carga) return carga;
  carga = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    let temporizador;
    const fallar = () => {
      clearTimeout(temporizador);
      script.remove();
      delete window.fitsearchMapsListo;
      carga = null;
      reject(
        new Error('No se pudo cargar el mapa. Reintenta o utiliza la lista.'),
      );
    };
    window.fitsearchMapsListo = () => {
      clearTimeout(temporizador);
      delete window.fitsearchMapsListo;
      resolve(window.google.maps);
    };
    script.src = `https://maps.googleapis.com/maps/api/js?${new URLSearchParams({ key: clave, v: 'weekly', loading: 'async', libraries: 'marker', callback: 'fitsearchMapsListo', language: 'es', region: 'CL' })}`;
    script.async = true;
    script.onerror = fallar;
    temporizador = setTimeout(fallar, 15000);
    document.head.appendChild(script);
  });
  return carga;
}
