// Secciones de la aplicación con sesión: las usan el menú lateral, la barra inferior, los accesos rápidos
// del Inicio y la página "Próximamente". Las marcadas como próximamente aún no están construidas.
// El usuario y el profesional tienen cada uno su propio espacio, con su menú y su Inicio (DAS, D25).
export const SECCIONES = {
  inicio: { ruta: '/inicio', nombre: 'Inicio', icono: 'casa' },
  profesionales: { ruta: '/profesionales', nombre: 'Profesionales', icono: 'profesional' },
  // Directorio de establecimientos que registra el administrador (FS-HU-25 y FS-HU-30).
  centros: { ruta: '/centros-salud', nombre: 'Centros de salud', icono: 'hospital' },
  gimnasios: { ruta: '/gimnasios', nombre: 'Gimnasios', icono: 'mancuerna' },
  // El historial de chats vive dentro del asistente IA, no en el menú (decisión del PO del 05-10-2026; FS-HU-07).
  asistente: { ruta: '/asistente', nombre: 'Asistente IA', icono: 'chispa' },
  // Gestor de alimentación (FS-HU-09 y FS-HU-10).
  comidas: { ruta: '/comidas', nombre: 'Comidas', icono: 'comida' },
  perfil: { ruta: '/perfil', nombre: 'Mi perfil', icono: 'usuario' },
  favoritos: { ruta: '/favoritos', nombre: 'Favoritos', icono: 'corazon' },
  citas: {
    ruta: '/citas', nombre: 'Mis citas', icono: 'calendario',
    descripcion: 'Pronto podrás reservar horas con profesionales y ver aquí tus próximas citas.',
  },
};

export const MENU_LATERAL = ['inicio', 'profesionales', 'centros', 'gimnasios', 'asistente', 'comidas', 'perfil', 'favoritos', 'citas'];
export const ACCESOS_RAPIDOS = ['profesionales', 'centros', 'gimnasios', 'citas', 'asistente', 'comidas'];
export const BARRA_INFERIOR = [
  { seccion: 'inicio', nombre: 'Inicio', icono: 'casa' },
  { seccion: 'profesionales', nombre: 'Profesionales', icono: 'buscar' },
  { seccion: 'asistente', nombre: 'Chat IA', icono: 'chat' },
  { seccion: 'comidas', nombre: 'Comidas', icono: 'comida' },
  { seccion: 'perfil', nombre: 'Perfil', icono: 'usuario' },
];

// Espacio del profesional (mockup del PO del 04-10-2026).
export const SECCIONES_PROFESIONAL = {
  inicio: { ruta: '/profesional/inicio', nombre: 'Inicio', icono: 'casa' },
  agenda: {
    ruta: '/profesional/agenda', nombre: 'Agenda', icono: 'calendario',
    descripcion: 'Pronto podrás publicar tus horarios disponibles y ver tus citas de la semana.',
  },
  // FS-HU-27, FS-HU-31, FS-HU-28 y FS-HU-29 (mejoras del 09-11-2026).
  clientes: { ruta: '/profesional/clientes', nombre: 'Clientes', icono: 'grupo' },
  perfil: { ruta: '/profesional/perfil', nombre: 'Perfil profesional', icono: 'medico' },
  mensajes: { ruta: '/profesional/mensajes', nombre: 'Mensajes', icono: 'chat' },
  reportes: { ruta: '/profesional/reportes', nombre: 'Reportes', icono: 'grafico' },
  configuracion: { ruta: '/profesional/configuracion', nombre: 'Configuración', icono: 'ajustes' },
};

export const ESPACIOS = {
  // Mensajes de las reservas (FS-HU-31) va al final del menú del usuario, después de Mis citas.
  usuario: { secciones: { ...SECCIONES, mensajes: { ruta: '/mensajes', nombre: 'Mensajes', icono: 'chat' } }, menu: [...MENU_LATERAL, 'mensajes'], barra: BARRA_INFERIOR },
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
