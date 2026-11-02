// API del gestor de alimentación (FS-HU-09 y FS-HU-10). El acceso a datos se simula.
jest.mock('../../src/models/comida.model');
jest.mock('../../src/models/usuario.model');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const modelo = require('../../src/models/comida.model');
const usuarioModel = require('../../src/models/usuario.model');
const { fechaEnChile, sumarDias } = require('../../src/utils/fechaChile');

const firmar = (rol) => jwt.sign({ rol }, process.env.JWT_SECRET, { subject: '1', expiresIn: '1h' });
const conSesion = (peticion, rol = 'usuario') => peticion.set('Authorization', `Bearer ${firmar(rol)}`);
const HOY = fechaEnChile();
const ARROZ = { id: 17, nombre: 'Arroz blanco cocido', sinonimos: 'arroz', calorias: '130.0', proteinasG: '2.7', carbohidratosG: '28.2', grasasG: '0.3' };
const registro = (extra = {}) => ({
  id: 7, fecha: new Date(`${HOY}T00:00:00Z`), momento: 'almuerzo', alimentoId: 17, descripcionAlimento: 'Arroz blanco cocido', gramos: '150.0',
  calorias: 195, proteinasG: '4.10', carbohidratosG: '42.30', grasasG: '0.50', origen: 'manual', fechaCreacion: new Date(), ...extra,
});

beforeEach(() => {
  jest.resetAllMocks();
  usuarioModel.buscarPorIdConPerfil.mockResolvedValue({ id: 1, perfil: { pesoKg: '68', alturaCm: '175', edad: 30, sexo: 'masculino', actividadFisica: 'moderada', objetivoPrincipal: 'mantener_peso' } });
  modelo.crear.mockImplementation(async ({ fecha, ...datos }) => registro({ fecha: new Date(`${fecha}T00:00:00Z`), ...datos, gramos: String(datos.gramos) }));
});

test('sin sesión responde 401 y un profesional recibe 403', async () => {
  expect((await request(app).get('/api/comidas')).status).toBe(401);
  expect((await conSesion(request(app).get('/api/comidas'), 'profesional')).status).toBe(403);
  expect((await conSesion(request(app).post('/api/comidas'), 'profesional').send({})).status).toBe(403);
});

test('busca alimentos del catálogo con al menos 2 letras', async () => {
  modelo.buscarAlimentos.mockResolvedValue([ARROZ]);
  const res = await conSesion(request(app).get('/api/comidas/alimentos?q=arroz'));
  expect(res.status).toBe(200);
  expect(res.body.alimentos).toEqual([{ id: 17, nombre: 'Arroz blanco cocido', calorias: 130, proteinasG: 2.7, carbohidratosG: 28.2, grasasG: 0.3 }]);
  expect(modelo.buscarAlimentos).toHaveBeenCalledWith(['arroz'], 12);
  const corta = await conSesion(request(app).get('/api/comidas/alimentos?q=a'));
  expect(corta.status).toBe(400);
  expect(corta.body.detalles.q).toBe('Escribe entre 2 y 60 caracteres');
});

test('registra un alimento con sus gramos y devuelve el aporte calculado', async () => {
  modelo.obtenerAlimento.mockResolvedValue(ARROZ);
  const res = await conSesion(request(app).post('/api/comidas')).send({ momento: 'almuerzo', alimentoId: 17, gramos: '150' });
  expect(res.status).toBe(201);
  expect(res.body.registro).toMatchObject({ fecha: HOY, momento: 'almuerzo', nombre: 'Arroz blanco cocido', gramos: 150, calorias: 195, proteinasG: 4.1, origen: 'manual' });
  expect(modelo.crear).toHaveBeenCalledWith(expect.objectContaining({ usuarioId: 1, fecha: HOY, gramos: 150, calorias: 195, carbohidratosG: 42.3 }));
});

test('valida momento, alimento, gramos y fecha', async () => {
  const enviar = (cuerpo) => conSesion(request(app).post('/api/comidas')).send(cuerpo);
  let res = await enviar({ momento: 'brunch', alimentoId: 'x', gramos: 0 });
  expect(res.status).toBe(400);
  expect(res.body.detalles).toEqual({
    momento: 'Elige el momento del día', alimentoId: 'Elige un alimento del catálogo', gramos: 'Indica entre 1 y 2000 gramos',
  });
  res = await enviar({ momento: 'cena', alimentoId: 17, gramos: 2001, fecha: '26-10-2026' });
  expect(res.body.detalles).toEqual({ gramos: 'Indica entre 1 y 2000 gramos', fecha: 'La fecha debe tener el formato AAAA-MM-DD' });
  modelo.obtenerAlimento.mockResolvedValue(ARROZ);
  res = await enviar({ momento: 'cena', alimentoId: 17, gramos: 100, fecha: sumarDias(HOY, 1) });
  expect(res.status).toBe(400);
  expect(res.body.error).toBe('No puedes registrar comidas en días que aún no llegan');
  modelo.obtenerAlimento.mockResolvedValue(null);
  expect((await enviar({ momento: 'cena', alimentoId: 99, gramos: 100 })).status).toBe(404);
  expect(modelo.crear).not.toHaveBeenCalled();
});

test('el resumen del día trae objetivo, consumo y los cinco momentos; acepta días pasados', async () => {
  modelo.delDia.mockResolvedValue([registro()]);
  const res = await conSesion(request(app).get('/api/comidas'));
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({
    fecha: HOY, hoy: HOY,
    objetivo: { calorias: 2525, proteinasG: 189, carbohidratosG: 284, grasasG: 70, perfil: { objetivoPrincipal: 'Mantener peso', actividadFisica: 'Moderada' } },
    consumo: { calorias: 195, proteinasG: 4.1, carbohidratosG: 42.3, grasasG: 0.5 },
  });
  expect(res.body.momentos.map((m) => m.etiqueta)).toEqual(['Desayuno', 'Media mañana', 'Almuerzo', 'Merienda', 'Cena']);
  const ayer = sumarDias(HOY, -1);
  await conSesion(request(app).get(`/api/comidas?fecha=${ayer}`));
  expect(modelo.delDia).toHaveBeenLastCalledWith(1, ayer);
});

test('el progreso semanal trae los 7 días de la semana', async () => {
  modelo.caloriasPorDia.mockResolvedValue([]);
  const res = await conSesion(request(app).get('/api/comidas/semana'));
  expect(res.status).toBe(200);
  expect(res.body.dias).toHaveLength(7);
  expect(res.body.objetivoCalorias).toBe(2525);
});

test('cambia los gramos o el momento de un registro propio; un registro ajeno responde 404', async () => {
  modelo.obtener.mockResolvedValueOnce(registro()).mockResolvedValueOnce(null);
  modelo.obtenerAlimento.mockResolvedValue(ARROZ);
  modelo.actualizar.mockImplementation(async (id, datos) => registro({ ...datos, gramos: String(datos.gramos) }));
  const res = await conSesion(request(app).patch('/api/comidas/7')).send({ gramos: 300 });
  expect(res.status).toBe(200);
  expect(res.body.registro).toMatchObject({ gramos: 300, calorias: 390 });
  expect(modelo.obtener).toHaveBeenCalledWith(7, 1);
  expect((await conSesion(request(app).patch('/api/comidas/8')).send({ momento: 'cena' })).status).toBe(404);
  const vacio = await conSesion(request(app).patch('/api/comidas/7')).send({});
  expect(vacio.status).toBe(400);
  expect(Object.values(vacio.body.detalles)).toContain('Indica los gramos o el momento del día');
});

test('borra un registro propio (204) y responde 404 si no existe o es ajeno', async () => {
  modelo.eliminar.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
  expect((await conSesion(request(app).delete('/api/comidas/7'))).status).toBe(204);
  expect(modelo.eliminar).toHaveBeenCalledWith(7, 1);
  expect((await conSesion(request(app).delete('/api/comidas/7'))).status).toBe(404);
  expect((await conSesion(request(app).delete('/api/comidas/abc'))).status).toBe(400);
});
