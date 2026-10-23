// Buscador general del Inicio (FS-HU-21, SC-23): convierte lo que la persona escribe en sugerencias para recorrer la
// aplicación. Primero las secciones (por su nombre o por palabras relacionadas), luego las especialidades del
// directorio y, al final, siempre, buscar el texto en profesionales (lo que hacía el buscador antes).

// Minúsculas y sin tildes: "Clínica" y "clinica" son lo mismo.
export const normalizar = (texto) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

// Palabras relacionadas con cada sección del usuario, además de su nombre (components/diseno/secciones.js).
export const PALABRAS_SECCIONES = {
  inicio: ['inicio', 'portada', 'resumen'],
  profesionales: ['profesionales', 'especialistas', 'directorio', 'mapa', 'buscar profesional'],
  centros: ['centros de salud', 'clinica', 'hospital', 'consultorio', 'cesfam', 'urgencia'],
  gimnasios: ['gimnasio', 'gym', 'entrenar', 'deporte', 'centro deportivo'],
  asistente: ['asistente', 'chat', 'ia', 'inteligencia artificial', 'pregunta', 'consulta', 'recomendacion', 'conversacion'],
  comidas: ['comidas', 'comida', 'dieta', 'calorias', 'alimentacion', 'macros', 'almuerzo', 'desayuno', 'cena'],
  perfil: ['perfil', 'mis datos', 'cuenta', 'peso', 'estatura', 'altura', 'salud', 'objetivo', 'alergias', 'medicamentos', 'edad'],
  favoritos: ['favoritos', 'guardados', 'me gusta', 'corazon'],
  citas: ['citas', 'reservas', 'reserva', 'hora', 'horas', 'agenda', 'cancelar cita'],
};

// Palabras de relleno que no cuentan al comparar ("dolor de rodilla" no debe llevar a "centros de salud").
const RELLENO = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'en', 'y', 'a', 'al', 'mi', 'mis', 'con', 'para', 'por', 'un', 'una', 'que']);
const palabras = (texto) => texto.split(/\s+/).filter((p) => p && !RELLENO.has(p));

// Qué tan bien calza la búsqueda con una palabra clave: 4 igual, 3 la palabra clave empieza con la búsqueda,
// 2 alguna palabra de la clave empieza con la búsqueda, 1 alguna palabra buscada (2 letras o más) está en la clave.
function puntaje(busqueda, clave) {
  if (clave === busqueda) return 4;
  if (clave.startsWith(busqueda)) return 3;
  const delaClave = palabras(clave);
  if (busqueda.length >= 3 && delaClave.some((p) => p.startsWith(busqueda))) return 2;
  const buscadas = palabras(busqueda).filter((p) => p.length >= 2);
  return buscadas.some((b) => delaClave.some((p) => p === b || (b.length >= 3 && p.startsWith(b)))) ? 1 : 0;
}

const MAX_SECCIONES = 4;
const MAX_ESPECIALIDADES = 3;

export function sugerencias(texto, { secciones, especialidades = [] }) {
  const original = texto.trim();
  const busqueda = normalizar(original);
  if (!busqueda) return [];
  const resultado = [];
  // Con una sola letra calzan casi todas las secciones: solo se ofrece buscar en profesionales.
  if (busqueda.length >= 2) {
    const orden = Object.keys(secciones);
    resultado.push(...orden
      .map((clave) => {
        const claves = [normalizar(secciones[clave].nombre), ...(PALABRAS_SECCIONES[clave] || [])];
        return { clave, valor: Math.max(...claves.map((c) => puntaje(busqueda, c))) };
      })
      .filter(({ valor }) => valor > 0)
      .sort((a, b) => b.valor - a.valor || orden.indexOf(a.clave) - orden.indexOf(b.clave))
      .slice(0, MAX_SECCIONES)
      .map(({ clave }) => {
        const { nombre, ruta, icono, proximamente } = secciones[clave];
        return { id: `seccion-${clave}`, tipo: 'seccion', titulo: nombre, ruta, icono, proximamente: Boolean(proximamente) };
      }));
    resultado.push(...especialidades
      .filter((especialidad) => puntaje(busqueda, normalizar(especialidad)) > 0)
      .slice(0, MAX_ESPECIALIDADES)
      .map((especialidad) => ({
        id: `especialidad-${normalizar(especialidad).replace(/\s+/g, '-')}`, tipo: 'especialidad',
        titulo: `Ver profesionales de ${especialidad}`, ruta: `/profesionales?especialidad=${encodeURIComponent(especialidad)}`, icono: 'profesional',
      })));
  }
  resultado.push({
    id: 'buscar-profesionales', tipo: 'busqueda', titulo: `Buscar «${original}» en profesionales`,
    ruta: `/profesionales?q=${encodeURIComponent(original)}`, icono: 'buscar',
  });
  return resultado;
}
