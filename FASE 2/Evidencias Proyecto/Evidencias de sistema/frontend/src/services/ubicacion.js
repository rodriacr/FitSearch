// Ubicación del navegador para buscar por cercanía (FS-HU-05). Se pide solo cuando la persona elige
// una distancia o "Más cercanos", se redondea a 3 decimales (unos 100 m) y se guarda solo en memoria:
// nunca en la URL, en el navegador ni en la base de datos (DAS, D23).
let ubicacionActual = null;

const redondear = (valor) => Math.round(valor * 1000) / 1000;

export class ErrorUbicacion extends Error {
  constructor(motivo) {
    super(motivo === 'denegada'
      ? 'No tenemos permiso para usar tu ubicación. Actívalo en tu navegador o elige una comuna.'
      : 'No pudimos obtener tu ubicación. Intenta nuevamente o elige una comuna.');
    this.motivo = motivo;
  }
}

export function obtenerUbicacion() {
  if (ubicacionActual) return Promise.resolve(ubicacionActual);
  if (!navigator.geolocation) return Promise.reject(new ErrorUbicacion('no-disponible'));
  return new Promise((resolver, rechazar) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        ubicacionActual = { lat: redondear(coords.latitude), lng: redondear(coords.longitude) };
        resolver(ubicacionActual);
      },
      (error) => rechazar(new ErrorUbicacion(error.code === 1 ? 'denegada' : 'no-disponible')),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  });
}

// Solo si la persona ya dio permiso antes: así el Inicio muestra distancias sin abrir el aviso del navegador.
export async function ubicacionSiHayPermiso() {
  if (ubicacionActual) return ubicacionActual;
  try {
    const permiso = await navigator.permissions?.query({ name: 'geolocation' });
    return permiso?.state === 'granted' ? await obtenerUbicacion() : null;
  } catch {
    return null;
  }
}

// Al cerrar sesión se olvida la ubicación.
export function olvidarUbicacion() {
  ubicacionActual = null;
}
