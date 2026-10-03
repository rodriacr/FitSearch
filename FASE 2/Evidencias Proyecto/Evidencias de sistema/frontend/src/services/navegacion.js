// Ruta a la que se vuelve después de iniciar sesión: la que se pidió sin sesión (con sus filtros) o el Inicio.
// Solo se aceptan rutas internas, para no redirigir fuera de FitSearch.
export function destinoTrasIngreso(estado) {
  const desde = estado?.desde;
  return typeof desde === 'string' && desde.startsWith('/') && !desde.startsWith('//') ? desde : '/inicio';
}
