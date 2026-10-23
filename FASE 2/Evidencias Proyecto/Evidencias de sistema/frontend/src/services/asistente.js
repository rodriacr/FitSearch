// Contenido y formatos de la pantalla del asistente IA (FS-HU-07), según el mockup del PO del 21-10-2026.

// Tarjetas de acción y categorías: completan el campo con el comienzo de una pregunta, que la persona termina.
export const ACCIONES = [
  { icono: 'profesional', titulo: 'Buscar profesionales adecuados', inicio: '¿Qué tipo de profesional me conviene consultar para ' },
  { icono: 'chat', titulo: 'Resolver dudas de salud y deporte', inicio: 'Tengo una duda sobre ' },
  { icono: 'comida', titulo: 'Planificar tu alimentación y entrenamiento', inicio: 'Ayúdame a organizar mi alimentación y entrenamiento para ' },
  { icono: 'info', titulo: 'Aprender a usar FitSearch', inicio: '¿Cómo puedo ' },
];

export const CATEGORIAS = [
  { icono: 'comida', nombre: 'Nutrición', inicio: 'Tengo una duda de nutrición: ' },
  { icono: 'mancuerna', nombre: 'Entrenamiento', inicio: 'Tengo una duda de entrenamiento: ' },
  { icono: 'corazon', nombre: 'Salud general', inicio: 'Tengo una duda de salud: ' },
  { icono: 'chispa', nombre: 'Bienestar mental', inicio: 'Quiero mejorar mi bienestar: ' },
  { icono: 'actividad', nombre: 'Lesiones y recuperación', inicio: 'Sobre una lesión o mi recuperación: ' },
  { icono: 'pastilla', nombre: 'Suplementos', inicio: 'Tengo una duda sobre suplementos: ' },
];

// FS-HU-08: cómo nombrar en el botón de la recomendación a los profesionales de cada especialidad del catálogo.
const PROFESIONALES_DE = {
  'Entrenamiento personal': 'entrenadores personales',
  Kinesiología: 'kinesiólogos',
  'Medicina deportiva': 'médicos deportivos',
  Nutrición: 'nutricionistas',
  'Psicología deportiva': 'psicólogos deportivos',
};
export const nombreProfesionales = (especialidad) => PROFESIONALES_DE[especialidad] ?? `profesionales de ${especialidad}`;
// El buscador de profesionales (FS-HU-22) con el filtro de la especialidad ya aplicado.
export const enlaceProfesionales = (especialidad) => `/profesionales?${new URLSearchParams({ especialidad })}`;

// Sugerencias rápidas: preguntas completas que se envían al tocarlas.
export const SUGERENCIAS = [
  '¿Cuántas calorías necesito al día?',
  '¿Cómo calculo mi IMC?',
  '¿Qué profesional me ayuda a bajar de peso?',
  '¿Qué comer después de entrenar?',
  'Recomiéndame una rutina para empezar a entrenar',
];

export const CONSEJOS = [
  'Puedes guardar a tus profesionales favoritos con el corazón de su ficha y volver a encontrarlos en Favoritos.',
  'Fija las conversaciones que más usas: quedan arriba en tu historial del asistente.',
  'En Profesionales puedes filtrar por modalidad para encontrar quién atiende online.',
  'La OMS recomienda que las personas adultas hagan al menos 150 minutos de actividad física moderada a la semana.',
];

// Hora del mensaje y fecha del historial, como en el mockup: «10:24», «Ayer», «Lun» o «12-08».
const HORA = new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/Santiago' });
const DIA = new Intl.DateTimeFormat('es-CL', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Santiago' });
const SEMANA = new Intl.DateTimeFormat('es-CL', { weekday: 'short', timeZone: 'America/Santiago' });
// Año, mes y día en Chile, armados por partes (el separador de Intl cambia entre navegadores).
const partesDia = (fecha) => Object.fromEntries(DIA.formatToParts(fecha).map(({ type, value }) => [type, value]));
const claveDia = (fecha) => { const p = partesDia(fecha); return `${p.year}-${p.month}-${p.day}`; };

export const horaDe = (iso) => HORA.format(new Date(iso));

export function fechaCorta(iso, ahora = new Date()) {
  const fecha = new Date(iso);
  const dias = Math.round((Date.parse(claveDia(ahora)) - Date.parse(claveDia(fecha))) / 86400000);
  if (dias <= 0) return HORA.format(fecha);
  if (dias === 1) return 'Ayer';
  if (dias < 7) {
    const dia = SEMANA.format(fecha).replace('.', '');
    return dia.charAt(0).toUpperCase() + dia.slice(1);
  }
  const p = partesDia(fecha);
  return `${p.day}-${p.month}`;
}

// El asistente responde en texto simple: párrafos separados por una línea en blanco y listas con «- ».
// Se convierte en bloques para dibujarlos sin insertar HTML (el texto nunca se interpreta como código).
export function bloquesDe(texto) {
  return texto.split(/\n{2,}/).map((parrafo) => parrafo.split('\n').filter((linea) => linea.trim()))
    .filter((lineas) => lineas.length)
    .flatMap((lineas) => {
      const bloques = [];
      for (const linea of lineas) {
        const item = linea.match(/^\s*-\s+(.*)$/);
        const ultimo = bloques.at(-1);
        if (item) {
          if (ultimo?.tipo === 'lista') ultimo.items.push(item[1]);
          else bloques.push({ tipo: 'lista', items: [item[1]] });
        } else if (ultimo?.tipo === 'parrafo') ultimo.lineas.push(linea);
        else bloques.push({ tipo: 'parrafo', lineas: [linea] });
      }
      return bloques;
    });
}
