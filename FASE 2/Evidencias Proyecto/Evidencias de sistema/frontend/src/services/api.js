import { avisarOperacion } from './avisosGuardado.js';

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

export async function solicitar(ruta, { metodo = 'GET', cuerpo, conSesion = true, archivo, descargar = false } = {}) {
  const cabeceras = { Accept: 'application/json' };
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';
  if (archivo) cabeceras['Content-Type'] = 'application/octet-stream';
  const token = leerSesionGuardada()?.token;
  if (conSesion && token) cabeceras.Authorization = `Bearer ${token}`;

  let respuesta;
  try {
    respuesta = await fetch(`/api${ruta}`, {
      method: metodo,
      headers: cabeceras,
      body: archivo || (cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined),
    });
  } catch {
    throw new ErrorApi(0, 'No fue posible conectar con el servidor. Revisa tu conexión e intenta nuevamente');
  }

  if (respuesta.status === 204) { avisarOperacion(ruta, metodo); return null; }
  if (respuesta.ok && descargar) return respuesta.blob();
  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    if (respuesta.status === 401 && conSesion && token) alExpirarSesion();
    throw new ErrorApi(respuesta.status, datos.error || 'Ocurrió un error inesperado', datos.detalles);
  }
  avisarOperacion(ruta, metodo);
  if (/^\/chats\/\d+(?:\/|$)/.test(ruta)) window.dispatchEvent(new Event('fitsearch:mensajes-actualizados'));
  return datos;
}

// Respuesta en vivo del asistente (SC-47): pide eventos (text/event-stream) y llama alEvento(nombre, datos) con cada parte.
// Devuelve los datos del evento «fin». Si el servidor contesta JSON (un error antes de empezar, o un servidor sin respuesta
// en vivo), se trata igual que solicitar().
const CORTE = 'Se cortó la conexión con el servidor. Revisa tu conexión e intenta nuevamente';
export async function solicitarEnVivo(ruta, { metodo = 'POST', cuerpo } = {}, alEvento = () => {}) {
  const cabeceras = { Accept: 'text/event-stream, application/json', 'Content-Type': 'application/json' };
  const token = leerSesionGuardada()?.token;
  if (token) cabeceras.Authorization = `Bearer ${token}`;
  let respuesta;
  try {
    respuesta = await fetch(`/api${ruta}`, { method: metodo, headers: cabeceras, body: JSON.stringify(cuerpo) });
  } catch {
    throw new ErrorApi(0, 'No fue posible conectar con el servidor. Revisa tu conexión e intenta nuevamente');
  }
  if (!(respuesta.headers.get('Content-Type') || '').includes('text/event-stream') || !respuesta.body) {
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      if (respuesta.status === 401 && token) alExpirarSesion();
      throw new ErrorApi(respuesta.status, datos.error || 'Ocurrió un error inesperado', datos.detalles);
    }
    avisarOperacion(ruta, metodo);
    return datos;
  }
  let final = null;
  const procesar = (bloque) => {
    let nombre = 'message';
    let dato = '';
    for (const linea of bloque.split('\n')) {
      if (linea.startsWith('event:')) nombre = linea.slice(6).trim();
      else if (linea.startsWith('data:')) dato += linea.slice(5).trim();
    }
    if (!dato) return;
    const datos = JSON.parse(dato);
    if (nombre === 'error') throw new ErrorApi(datos.estado ?? 500, datos.error || 'Ocurrió un error inesperado');
    if (nombre === 'fin') final = datos;
    else alEvento(nombre, datos);
  };
  const lector = respuesta.body.getReader();
  const decodificador = new TextDecoder();
  let pendiente = '';
  try {
    for (;;) {
      const { value, done } = await lector.read();
      if (done) break;
      pendiente += decodificador.decode(value, { stream: true });
      const bloques = pendiente.split('\n\n');
      pendiente = bloques.pop();
      bloques.forEach(procesar);
    }
    if (pendiente.trim()) procesar(pendiente);
  } catch (error) {
    throw error instanceof ErrorApi ? error : new ErrorApi(0, CORTE);
  }
  if (!final) throw new ErrorApi(0, CORTE);
  avisarOperacion(ruta, metodo);
  return final;
}
