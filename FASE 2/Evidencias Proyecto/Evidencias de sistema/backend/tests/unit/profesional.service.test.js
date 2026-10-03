// Formato del directorio y de las reseñas (FS-HU-22, FS-HU-24), sin base de datos.
const { escaparLike } = jest.requireActual('../../src/models/profesional.model');
const { formatearFicha, nombrePublico, resumirResenas } = require('../../src/services/profesional.service');

test('el nombre público del autor es el nombre y la inicial del apellido', () => {
  expect(nombrePublico('Rodrigo Cárcamo Rojas')).toBe('Rodrigo C.');
  expect(nombrePublico('  ana   pérez ')).toBe('ana P.');
  expect(nombrePublico('Luis')).toBe('Luis');
});

test('el resumen de reseñas calcula el promedio con un decimal y completa las estrellas sin votos', () => {
  expect(resumirResenas([{ puntaje: 5, cantidad: 2 }, { puntaje: 2, cantidad: 1 }]))
    .toEqual({ promedio: 4, total: 3, distribucion: { 5: 2, 4: 0, 3: 0, 2: 1, 1: 0 } });
  expect(resumirResenas([{ puntaje: 5, cantidad: 1 }, { puntaje: 4, cantidad: 2 }]).promedio).toBe(4.3);
  expect(resumirResenas([])).toEqual({ promedio: null, total: 0, distribucion: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
});

test('la ficha convierte los tipos de MySQL y redondea la distancia', () => {
  const ficha = formatearFicha({
    id: 2n, nombre: 'Diego Demo', especialidad: 'Kinesiología', descripcion: null, comuna: null, modalidad: 'ambas', verificado: true,
    ubicacionLat: '-33.6890000', ubicacionLng: '-71.2130000', establecimientoNombre: null, promedio: '3.6667', totalResenas: 3n,
    distanciaKm: 12.349, esFavorito: 0n,
  });
  expect(ficha).toEqual({
    id: 2, nombre: 'Diego Demo', especialidad: 'Kinesiología', descripcion: null, comuna: null, modalidad: 'ambas', verificado: true,
    ubicacionLat: -33.689, ubicacionLng: -71.213, establecimiento: null, calificacion: { promedio: 3.7, total: 3 }, distanciaKm: 12.3, esFavorito: false,
  });
});

test('la búsqueda por texto escapa los comodines de LIKE', () => {
  expect(escaparLike('50% de_descuento\\')).toBe('50\\% de\\_descuento\\\\');
  expect(escaparLike('nutrición')).toBe('nutrición');
});
