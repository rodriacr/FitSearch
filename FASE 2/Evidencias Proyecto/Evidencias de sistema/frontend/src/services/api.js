// Cliente HTTP de la API REST de FitSearch.
const CLAVE_SESION = 'fitsearch_sesion';

export function leerSesionGuardada() {
  try {
    const guardada = localStorage.getItem(CLAVE_SESION);
    return guardada ? JSON.parse(guardada) : null;
  } catch {
    return null;
  }
}

export function guardarSesion(sesion) {
  if (sesion) {
    localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
  } else {
    localStorage.removeItem(CLAVE_SESION);
  }
}

export class ErrorApi extends Error {
  constructor(estado, mensaje, detalles = {}) {
    super(mensaje);
    this.estado = estado;
    this.detalles = detalles;
  }
}

let alExpirarSesion = () => {};
export function registrarManejadorSesionExpirada(manejador) {
  alExpirarSesion = manejador;
}

export async function solicitar(ruta, { metodo = 'GET', cuerpo, conSesion = true } = {}) {
  const cabeceras = { Accept: 'application/json' };
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';
  const token = leerSesionGuardada()?.token;
  if (conSesion && token) cabeceras.Authorization = `Bearer ${token}`;

  let respuesta;
  try {
    respuesta = await fetch(`/api${ruta}`, {
      method: metodo,
      headers: cabeceras,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new ErrorApi(0, 'No fue posible conectar con el servidor. Revisa tu conexión e intenta nuevamente');
  }

  if (respuesta.status === 204) return null;
  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    if (respuesta.status === 401 && conSesion && token) alExpirarSesion();
    throw new ErrorApi(respuesta.status, datos.error || 'Ocurrió un error inesperado', datos.detalles);
  }
  return datos;
}
