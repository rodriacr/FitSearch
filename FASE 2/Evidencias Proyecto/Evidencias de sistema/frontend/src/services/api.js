// Cliente HTTP de la API REST de FitSearch.
const CLAVE_SESION = 'fitsearch_sesion';

// Con "Recordarme" la sesión se guarda en localStorage (sobrevive al cerrar el navegador);
// sin marcarlo, en sessionStorage (se borra al cerrar el navegador). Ver DAS, D17.
export function leerSesionGuardada() {
  try {
    const guardada = localStorage.getItem(CLAVE_SESION) ?? sessionStorage.getItem(CLAVE_SESION);
    return guardada ? JSON.parse(guardada) : null;
  } catch {
    return null;
  }
}

export function guardarSesion(sesion, recordar = false) {
  localStorage.removeItem(CLAVE_SESION);
  sessionStorage.removeItem(CLAVE_SESION);
  if (sesion) (recordar ? localStorage : sessionStorage).setItem(CLAVE_SESION, JSON.stringify(sesion));
}

// Reemplaza la sesión guardada conservando dónde estaba: el backend emite un token nuevo cuando
// la persona confirma su tipo de cuenta, porque el rol viaja dentro del token.
export function actualizarSesionGuardada(sesion) {
  guardarSesion(sesion, localStorage.getItem(CLAVE_SESION) !== null);
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
