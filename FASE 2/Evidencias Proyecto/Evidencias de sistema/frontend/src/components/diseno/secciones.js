// Secciones de la aplicación con sesión: las usan el menú lateral, la barra inferior, los accesos rápidos
// del Inicio y la página "Próximamente". Las marcadas como próximamente aún no están construidas.
export const SECCIONES = {
  inicio: { ruta: '/inicio', nombre: 'Inicio', icono: 'casa' },
  profesionales: { ruta: '/profesionales', nombre: 'Profesionales', icono: 'profesional' },
  centros: {
    ruta: '/centros-salud', nombre: 'Centros de salud', icono: 'hospital', proximamente: true,
    descripcion: 'Pronto podrás encontrar centros de salud y clínicas cerca de ti.',
  },
  gimnasios: {
    ruta: '/gimnasios', nombre: 'Gimnasios', icono: 'mancuerna', proximamente: true,
    descripcion: 'Pronto podrás descubrir gimnasios y centros deportivos para entrenar cerca de ti.',
  },
  farmacias: {
    ruta: '/farmacias', nombre: 'Farmacias', icono: 'pastilla', proximamente: true,
    descripcion: 'Pronto podrás ubicar farmacias cercanas cuando las necesites.',
  },
  asistente: {
    ruta: '/asistente', nombre: 'Asistente IA', icono: 'chispa', proximamente: true,
    descripcion: 'Pronto podrás conversar con un asistente que te orienta sobre salud y bienestar y te recomienda qué tipo de profesional buscar. No reemplazará la atención de un profesional de salud.',
  },
  perfil: { ruta: '/perfil', nombre: 'Mi perfil', icono: 'usuario' },
  historial: {
    ruta: '/historial-chats', nombre: 'Historial de chats', icono: 'chat', proximamente: true,
    descripcion: 'Aquí verás tus conversaciones con el asistente IA cuando esté disponible.',
  },
  favoritos: { ruta: '/favoritos', nombre: 'Favoritos', icono: 'corazon' },
  citas: {
    ruta: '/citas', nombre: 'Mis citas', icono: 'calendario', proximamente: true,
    descripcion: 'Pronto podrás reservar horas con profesionales y ver aquí tus próximas citas.',
  },
};

export const MENU_LATERAL = ['inicio', 'profesionales', 'centros', 'gimnasios', 'farmacias', 'asistente', 'perfil', 'historial', 'favoritos'];
export const ACCESOS_RAPIDOS = ['profesionales', 'centros', 'gimnasios', 'farmacias', 'asistente'];
export const BARRA_INFERIOR = [
  { seccion: 'inicio', nombre: 'Inicio', icono: 'casa' },
  { seccion: 'profesionales', nombre: 'Profesionales', icono: 'buscar' },
  { seccion: 'asistente', nombre: 'Chat IA', icono: 'chat' },
  { seccion: 'perfil', nombre: 'Perfil', icono: 'usuario' },
];
export const SECCIONES_PROXIMAMENTE = Object.keys(SECCIONES).filter((clave) => SECCIONES[clave].proximamente);
