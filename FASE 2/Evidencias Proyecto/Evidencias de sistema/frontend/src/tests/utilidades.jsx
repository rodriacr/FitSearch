import { render } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import App from '../App.jsx';
import { SesionProvider } from '../context/SesionContext.jsx';

// Igual que main.jsx: StrictMode repite los efectos y detecta los que no son seguros.
export function renderizarApp(rutaInicial = '/') {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={[rutaInicial]}>
        <SesionProvider>
          <App />
        </SesionProvider>
      </MemoryRouter>
    </StrictMode>,
  );
}

export function respuestaJson(estado, cuerpo) {
  return Promise.resolve(new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json' },
  }));
}

export const SESION = {
  token: 'token-de-prueba',
  usuario: { id: 1, nombre: 'Ana Pérez', correo: 'ana@correo.cl', rol: 'usuario' },
};

// Respuesta de GET /api/perfil con la forma completa (pasos del asistente incluidos).
// tipoCuenta llega en true por omisión: la mayoría de las pruebas trabajan con una cuenta que ya eligió su tipo.
export function respuestaPerfil({
  perfil = {}, objetivos = {}, salud = null, tipoCuenta = true, requerimientoCaloricoKcal = null, usuario = SESION.usuario,
} = {}) {
  const basico = { pesoKg: null, alturaCm: null, edad: null, sexo: null, actividadFisica: null, ...perfil };
  const metas = { objetivoPrincipal: null, comidasDia: null, horasSueno: null, ...objetivos };
  const completo = Object.values(basico).every((valor) => valor !== null);
  return {
    usuario, perfil: basico, completo, requerimientoCaloricoKcal, objetivos: metas, salud,
    pasos: { tipoCuenta, datosPersonales: completo, objetivos: Object.values(metas).every((valor) => valor !== null), salud: salud !== null },
  };
}

export const PERFIL_COMPLETO = {
  perfil: { pesoKg: 70, alturaCm: 175, edad: 30, sexo: 'masculino', actividadFisica: 'moderada' },
  objetivos: { objetivoPrincipal: 'bajar_peso', comidasDia: 3, horasSueno: '7_8' },
  salud: { condicionesMedicas: ['hipertension'], tomaMedicamentos: true, medicamentos: ['presion'], alergias: ['ninguna'] },
  requerimientoCaloricoKcal: 2556,
};

// Servidor simulado por rutas: gana el prefijo más largo que coincida con la URL ('/api/profesionales/filtros'
// antes que '/api/profesionales'). Cada respuesta es un cuerpo (200) o una función (url, opciones) => [estado, cuerpo].
export function simularApi(respuestas) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((url, opciones = {}) => {
    const prefijo = Object.keys(respuestas).filter((ruta) => url.startsWith(ruta)).sort((a, b) => b.length - a.length)[0];
    if (!prefijo) return respuestaJson(404, { error: 'Recurso no encontrado' });
    const respuesta = respuestas[prefijo];
    const [estado, cuerpo] = typeof respuesta === 'function' ? respuesta(url, opciones) : [200, respuesta];
    return estado === 204 ? Promise.resolve(new Response(null, { status: 204 })) : respuestaJson(estado, cuerpo);
  });
}

// Llamadas hechas a una ruta de la API (URL completa) y cuerpo JSON de la última.
export const llamadasA = (fetch, prefijo) => fetch.mock.calls.filter(([url]) => url.startsWith(prefijo));
export const parametrosDe = (url) => Object.fromEntries(new URL(url, 'http://localhost').searchParams);

// Ficha del directorio con la forma que devuelve GET /api/profesionales.
export function fichaProfesional(sobrescribir = {}) {
  return {
    id: 1, nombre: 'Ana Demo', especialidad: 'Nutrición', descripcion: 'Atención nutricional', comuna: 'Melipilla', modalidad: 'ambas',
    verificado: false, ubicacionLat: -33.686, ubicacionLng: -71.215, establecimiento: { nombre: 'Consulta Demo', direccion: 'Melipilla' },
    calificacion: { promedio: 4.5, total: 12 }, distanciaKm: null, esFavorito: false, ...sobrescribir,
  };
}

export function listado(profesionales = [fichaProfesional()], { pagina = 1, total = profesionales.length, porPagina = 12 } = {}) {
  const totalPaginas = Math.ceil(total / porPagina);
  return { profesionales, pagina, total, totalPaginas, hayMas: pagina < totalPaginas };
}

export const FILTROS = { especialidades: ['Kinesiología', 'Nutrición'], comunas: ['Melipilla', 'Ñuñoa'] };

// Geolocalización del navegador simulada: concedida con una posición o rechazada con un código de error.
export function simularUbicacion({ lat = -33.437123, lng = -70.650456, error = null, permiso = 'prompt' } = {}) {
  const getCurrentPosition = vi.fn((exito, fallo) => (error ? fallo({ code: error }) : exito({ coords: { latitude: lat, longitude: lng } })));
  Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition }, configurable: true });
  Object.defineProperty(navigator, 'permissions', { value: { query: vi.fn().mockResolvedValue({ state: permiso }) }, configurable: true });
  return getCurrentPosition;
}
