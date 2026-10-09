// Secciones de la aplicación con sesión: las usan el menú lateral, la barra inferior, los accesos rápidos
// del Inicio y la página "Próximamente". Las marcadas como próximamente aún no están construidas.
// El usuario y el profesional tienen cada uno su propio espacio, con su menú y su Inicio (DAS, D25).
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
  // El historial de chats vivirá dentro del asistente IA, no en el menú (decisión del PO del 05-10-2026).
  asistente: {
    ruta: '/asistente', nombre: 'Asistente IA', icono: 'chispa', proximamente: true,
    descripcion: 'Pronto podrás conversar con un asistente que te orienta sobre salud y bienestar y te recomienda qué tipo de profesional buscar. Ahí mismo encontrarás tus conversaciones anteriores. No reemplazará la atención de un profesional de salud.',
  },
  comidas: {
    ruta: '/comidas', nombre: 'Comidas', icono: 'comida', proximamente: true,
    descripcion: 'Pronto podrás anotar lo que comes, ver tus calorías y macronutrientes del día y revisar cómo te fue en la semana y el mes.',
  },
  perfil: { ruta: '/perfil', nombre: 'Mi perfil', icono: 'usuario' },
  favoritos: { ruta: '/favoritos', nombre: 'Favoritos', icono: 'corazon' },
  citas: {
    ruta: '/citas', nombre: 'Mis citas', icono: 'calendario', proximamente: true,
    descripcion: 'Pronto podrás reservar horas con profesionales y ver aquí tus próximas citas.',
  },
};

export const MENU_LATERAL = ['inicio', 'profesionales', 'centros', 'gimnasios', 'asistente', 'comidas', 'perfil', 'favoritos'];
export const ACCESOS_RAPIDOS = ['profesionales', 'centros', 'gimnasios', 'asistente', 'comidas'];
export const BARRA_INFERIOR = [
  { seccion: 'inicio', nombre: 'Inicio', icono: 'casa' },
  { seccion: 'profesionales', nombre: 'Profesionales', icono: 'buscar' },
  { seccion: 'asistente', nombre: 'Chat IA', icono: 'chat' },
  { seccion: 'perfil', nombre: 'Perfil', icono: 'usuario' },
];

// Espacio del profesional (mockup del PO del 04-10-2026).
export const SECCIONES_PROFESIONAL = {
  inicio: { ruta: '/profesional/inicio', nombre: 'Inicio', icono: 'casa' },
  agenda: {
    ruta: '/profesional/agenda', nombre: 'Agenda', icono: 'calendario', proximamente: true,
    descripcion: 'Pronto podrás publicar tus horarios disponibles y ver tus citas de la semana.',
  },
  clientes: {
    ruta: '/profesional/clientes', nombre: 'Clientes', icono: 'grupo', proximamente: true,
    descripcion: 'Aquí verás a las personas que reserven una hora contigo y el estado de cada cita.',
  },
  perfil: { ruta: '/profesional/perfil', nombre: 'Perfil profesional', icono: 'medico' },
  mensajes: {
    ruta: '/profesional/mensajes', nombre: 'Mensajes', icono: 'chat', proximamente: true,
    descripcion: 'Pronto podrás leer los mensajes que te dejen las personas al reservar una hora contigo.',
  },
  reportes: {
    ruta: '/profesional/reportes', nombre: 'Reportes', icono: 'grafico', proximamente: true,
    descripcion: 'Pronto verás un resumen de tus citas y clientes por semana y por mes.',
  },
  configuracion: {
    ruta: '/profesional/configuracion', nombre: 'Configuración', icono: 'ajustes', proximamente: true,
    descripcion: 'Pronto podrás ajustar las preferencias de tu cuenta profesional.',
  },
};

export const ESPACIOS = {
  usuario: { secciones: SECCIONES, menu: MENU_LATERAL, barra: BARRA_INFERIOR },
  profesional: {
    secciones: SECCIONES_PROFESIONAL,
    menu: ['inicio', 'agenda', 'clientes', 'perfil', 'mensajes', 'reportes', 'configuracion'],
    barra: [
      { seccion: 'inicio', nombre: 'Inicio', icono: 'casa' },
      { seccion: 'agenda', nombre: 'Agenda', icono: 'calendario' },
      { seccion: 'clientes', nombre: 'Clientes', icono: 'grupo' },
      { seccion: 'perfil', nombre: 'Perfil', icono: 'usuario' },
    ],
  },
};

const proximasDe = (secciones) => Object.keys(secciones).filter((clave) => secciones[clave].proximamente);
export const SECCIONES_PROXIMAMENTE = proximasDe(SECCIONES);
export const SECCIONES_PROXIMAMENTE_PROFESIONAL = proximasDe(SECCIONES_PROFESIONAL);
