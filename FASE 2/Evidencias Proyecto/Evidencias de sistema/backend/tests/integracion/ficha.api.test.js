jest.mock('../../src/models/profesional.model');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const modelo = require('../../src/models/profesional.model');

// Ficha propia del profesional (FS-HU-04): GET y PUT /api/profesionales/mi-ficha.
const tokenDe = (rol) => jwt.sign({ rol }, process.env.JWT_SECRET, { subject: '7', expiresIn: '1h' });
const enviar = (rol, cuerpo) => request(app).put('/api/profesionales/mi-ficha').set('Authorization', `Bearer ${tokenDe(rol)}`).send(cuerpo);
const obtener = (rol) => request(app).get('/api/profesionales/mi-ficha').set('Authorization', `Bearer ${tokenDe(rol)}`);
const valido = {
  especialidad: 'Nutrición', descripcion: 'Atención nutricional', comuna: 'Providencia', direccion: 'Av. Providencia 1234, oficina 501',
  modalidad: 'ambas', ubicacionLat: -33.4372, ubicacionLng: -70.6506,
};
// MySQL entrega las coordenadas como Decimal: la API las devuelve como número.
const fila = { ...valido, ubicacionLat: '-33.4372000', ubicacionLng: '-70.6506000' };
beforeEach(() => jest.resetAllMocks());

test('un profesional guarda su ficha (se crea la primera vez y luego se actualiza)', async () => {
  modelo.guardarFicha.mockResolvedValue(fila);
  const res = await enviar('profesional', valido);
  expect(res.status).toBe(200);
  expect(res.body.ficha).toEqual({ ...valido, verificado: false });
  expect(modelo.guardarFicha).toHaveBeenCalledWith(7, valido);
});

test('la descripción es opcional y se guarda vacía como null', async () => {
  modelo.guardarFicha.mockResolvedValue({ ...fila, descripcion: null });
  const res = await enviar('profesional', { ...valido, descripcion: '' });
  expect(res.status).toBe(200);
  expect(res.body.ficha.descripcion).toBe('');
  expect(modelo.guardarFicha).toHaveBeenCalledWith(7, { ...valido, descripcion: null });
});

test('solo guarda los campos de la ficha, aunque el cuerpo traiga otros', async () => {
  modelo.guardarFicha.mockResolvedValue(fila);
  await enviar('profesional', { ...valido, verificado: true, usuarioId: 99 });
  expect(modelo.guardarFicha).toHaveBeenCalledWith(7, valido);
});

test('rechaza especialidad fuera del catálogo, comuna vacía, modalidad inválida y coordenadas fuera de rango', async () => {
  const res = await enviar('profesional', { ...valido, especialidad: 'Astrología', comuna: '  ', modalidad: 'domicilio', ubicacionLat: 120 });
  expect(res.status).toBe(400);
  expect(res.body.detalles).toMatchObject({
    especialidad: 'Selecciona tu especialidad',
    comuna: 'Ingresa la comuna donde atiendes',
    modalidad: 'Selecciona cómo atiendes',
    ubicacionLat: 'La latitud debe estar en Chile (entre -56,5 y -17)',
  });
  expect(modelo.guardarFicha).not.toHaveBeenCalled();
});

// SC-24: dirección de atención propia y coordenadas dentro de Chile.
test.each([['presencial', undefined], ['ambas', '   ']])('la dirección es obligatoria si atiende %s', async (modalidad, direccion) => {
  const res = await enviar('profesional', { ...valido, modalidad, direccion });
  expect(res.status).toBe(400);
  expect(res.body.detalles.direccion).toBe('Ingresa la dirección donde atiendes');
  expect(modelo.guardarFicha).not.toHaveBeenCalled();
});

test('quien atiende solo online puede no indicar dirección: se guarda null', async () => {
  modelo.guardarFicha.mockResolvedValue({ ...fila, modalidad: 'online', direccion: null });
  const res = await enviar('profesional', { ...valido, modalidad: 'online', direccion: '' });
  expect(res.status).toBe(200);
  expect(res.body.ficha.direccion).toBe('');
  expect(modelo.guardarFicha).toHaveBeenCalledWith(7, { ...valido, modalidad: 'online', direccion: null });
});

test('guarda la dirección sin espacios sobrantes y rechaza una de más de 150 caracteres', async () => {
  modelo.guardarFicha.mockResolvedValue(fila);
  await enviar('profesional', { ...valido, direccion: `  ${valido.direccion}  ` });
  expect(modelo.guardarFicha).toHaveBeenCalledWith(7, valido);
  const res = await enviar('profesional', { ...valido, direccion: 'a'.repeat(151) });
  expect(res.status).toBe(400);
  expect(res.body.detalles.direccion).toBe('La dirección admite hasta 150 caracteres');
});

test.each([
  ['-90 y -90 (Antártida)', -90, -90, ['ubicacionLat', 'ubicacionLng']],
  ['Buenos Aires', -34.6, -58.4, ['ubicacionLng']],
  ['coordenadas positivas', 33.4, 70.6, ['ubicacionLat', 'ubicacionLng']],
])('rechaza coordenadas fuera de Chile: %s', async (_caso, ubicacionLat, ubicacionLng, campos) => {
  const res = await enviar('profesional', { ...valido, ubicacionLat, ubicacionLng });
  expect(res.status).toBe(400);
  expect(Object.keys(res.body.detalles).sort()).toEqual(campos);
  if (campos.includes('ubicacionLng')) expect(res.body.detalles.ubicacionLng).toBe('La longitud debe estar en Chile (entre -81 y -65,5)');
  expect(modelo.guardarFicha).not.toHaveBeenCalled();
});

test('acepta coordenadas en los extremos de Chile (Arica, Punta Arenas y Juan Fernández)', async () => {
  modelo.guardarFicha.mockResolvedValue(fila);
  for (const [ubicacionLat, ubicacionLng] of [[-18.47, -70.31], [-53.16, -70.91], [-33.64, -78.83]]) {
    expect((await enviar('profesional', { ...valido, ubicacionLat, ubicacionLng })).status).toBe(200);
  }
});

test('rechaza una descripción de más de 500 caracteres', async () => {
  const res = await enviar('profesional', { ...valido, descripcion: 'a'.repeat(501) });
  expect(res.status).toBe(400);
  expect(res.body.detalles.descripcion).toBe('La descripción admite hasta 500 caracteres');
});

test('una cuenta de usuario no puede ver ni crear una ficha', async () => {
  expect((await enviar('usuario', valido)).status).toBe(403);
  expect((await obtener('usuario')).status).toBe(403);
  expect(modelo.guardarFicha).not.toHaveBeenCalled();
});

test('devuelve ficha null si el profesional aún no la completa', async () => {
  modelo.obtenerPorUsuario.mockResolvedValue(null);
  const res = await obtener('profesional');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ ficha: null });
});

test('devuelve la ficha guardada con su id y las coordenadas como número', async () => {
  modelo.obtenerPorUsuario.mockResolvedValue({ id: 5, ...fila });
  const res = await obtener('profesional');
  expect(res.body).toEqual({ ficha: { id: 5, ...valido, verificado: false } });
});

test('la ficha propia muestra la verificación aprobada por el administrador', async () => {
  modelo.obtenerPorUsuario.mockResolvedValue({ id: 5, ...fila, verificado: true });
  const res = await obtener('profesional');
  expect(res.body.ficha).toMatchObject({ id: 5, verificado: true });
});

test('"mi-ficha" no se confunde con la ficha pública de un profesional por id', async () => {
  modelo.obtenerPorUsuario.mockResolvedValue(null);
  await obtener('profesional');
  expect(modelo.buscarPorId).not.toHaveBeenCalled();
});
