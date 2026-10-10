// Navegación según el rol (DAS, D25): el usuario y el profesional tienen cada uno su propio espacio, y una cuenta
// que todavía no elige cómo usar FitSearch pasa primero por "Elegir perfil".
export const ELEGIR_PERFIL = '/elegir-perfil';
const INICIO_POR_ROL = { usuario: '/inicio', profesional: '/profesional/inicio' };

export const esRutaProfesional = (ruta) => ruta === '/profesional' || ruta.startsWith('/profesional/');

// Inicio que le corresponde a la cuenta. rolConfirmado solo se considera pendiente cuando viene en false
// (las sesiones guardadas antes de este cambio no lo traen).
export function inicioDe(usuario) {
  if (usuario?.rolConfirmado === false) return ELEGIR_PERFIL;
  if (usuario?.rol && !INICIO_POR_ROL[usuario.rol]) return '/acceso-no-disponible';
  return INICIO_POR_ROL[usuario?.rol] ?? INICIO_POR_ROL.usuario;
}

// Ruta a la que se vuelve después de iniciar sesión: la que se pidió sin sesión (con sus filtros), si es interna
// y corresponde al espacio de su rol, o su Inicio. Nunca se redirige fuera de FitSearch.
export function destinoTrasIngreso(estado, usuario) {
  const inicio = inicioDe(usuario);
  const desde = estado?.desde;
  const interna = typeof desde === 'string' && desde.startsWith('/') && !desde.startsWith('//');
  if (!interna || inicio === ELEGIR_PERFIL) return inicio;
  return esRutaProfesional(desde) === (usuario?.rol === 'profesional') ? desde : inicio;
}
