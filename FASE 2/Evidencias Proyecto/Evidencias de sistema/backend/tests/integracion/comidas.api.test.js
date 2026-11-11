// API del gestor de alimentación (FS-HU-09 y FS-HU-10). El acceso a datos se simula.
jest.mock('../../src/models/comida.model');
jest.mock('../../src/models/usuario.model');
jest.mock('../../src/models/planAlimentacion.model');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const modelo = require('../../src/models/comida.model');
const usuarioModel = require('../../src/models/usuario.model');
const planModelo = require('../../src/models/planAlimentacion.model');
const { fechaEnChile, sumarDias } = require('../../src/utils/fechaChile');

const firmar = (rol) => jwt.sign({ rol }, process.env.JWT_SECRET, { subject: '1', expiresIn: '1h' });
const conSesion = (peticion, rol = 'usuario') => peticion.set('Authorization', `Bearer ${firmar(rol)}`);
const HOY = fechaEnChile();
const ARROZ = { id: 17, nombre: 'Arroz blanco cocido', sinonimos: 'arroz', calorias: '130.0', proteinasG: '2.7', carbohidratosG: '28.2', grasasG: '0.3', activo: true };
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
    objetivo: { calorias: 2525, proteinasG: 95, carbohidratosG: 347, grasasG: 84, plan: { tipo: 'meta' }, perfil: { objetivoPrincipal: 'Mantener peso', actividadFisica: 'Moderada' } },
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

test('las estadísticas responden la semana por defecto o el mes pedido, y validan el período y la fecha', async () => {
  modelo.totalesPorDia.mockResolvedValue([]);
  const semana = await conSesion(request(app).get('/api/comidas/estadisticas'));
  expect(semana.status).toBe(200);
  expect(semana.body).toMatchObject({ periodo: 'semana', diasConRegistros: 0, promedio: null });
  expect(semana.body.dias).toHaveLength(7);
  expect(semana.body.objetivo.calorias).toBe(2525);
  const mes = await conSesion(request(app).get('/api/comidas/estadisticas?periodo=mes&fecha=2026-02-10'));
  expect(mes.status).toBe(200);
  expect(mes.body).toMatchObject({ desde: '2026-02-01', hasta: '2026-02-28' });
  const malo = await conSesion(request(app).get('/api/comidas/estadisticas?periodo=anio'));
  expect(malo.status).toBe(400);
  expect(malo.body.detalles.periodo).toBe('Elige semana o mes');
  expect((await conSesion(request(app).get('/api/comidas/estadisticas?fecha=2026-13-01'))).status).toBe(400);
  expect((await conSesion(request(app).get(`/api/comidas/estadisticas?fecha=${sumarDias(HOY, 1)}`))).status).toBe(400);
  expect((await conSesion(request(app).get('/api/comidas/estadisticas'), 'profesional')).status).toBe(403);
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

describe('plan de alimentación', () => {
  const VOLUMEN = { id: 4, nombre: 'Volumen', proteinasPct: 40, carbohidratosPct: 35, grasasPct: 25, fechaCreacion: new Date() };
  beforeEach(() => {
    planModelo.personalizados.mockResolvedValue([VOLUMEN]);
    planModelo.obtenerPersonalizado.mockImplementation(async (id, usuarioId) => (id === 4 && usuarioId === 1 ? VOLUMEN : null));
    planModelo.contarPersonalizados.mockResolvedValue(1);
    planModelo.crearPersonalizado.mockImplementation(async (usuarioId, datos) => ({ id: 9, ...datos }));
  });

  test('muestra el plan de la meta y la lista de personalizados', async () => {
    const res = await conSesion(request(app).get('/api/comidas/plan'));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      plan: { tipo: 'meta', desde: null, personalizadoId: null, kcal: 2525, porcentajes: { proteinas: 15, carbohidratos: 55, grasas: 30 } },
      meta: { valor: 'mantener_peso', etiqueta: 'Mantener peso', ajusteCalorias: 0 },
      metaPeso: null, opcionesMetaPeso: null,
      perfil: { kcalBase: 2525, pesoKg: 68, completo: true },
      personalizados: [{ id: 4, nombre: 'Volumen', porcentajes: { proteinas: 40, carbohidratos: 35, grasas: 25 }, proteinasG: 253, enUso: false }],
      maxPersonalizados: 10,
    });
    expect((await conSesion(request(app).get('/api/comidas/plan'), 'profesional')).status).toBe(403);
  });

  test('crea un personalizado y lo usa desde hoy; valida nombre, porcentajes y el tipo de «usar»', async () => {
    const creado = await conSesion(request(app).post('/api/comidas/plan/personalizados')).send({ nombre: 'Competencia', proteinas: '25', carbohidratos: 55, grasas: 20, usar: true });
    expect(creado.status).toBe(201);
    expect(planModelo.crearPersonalizado).toHaveBeenCalledWith(1, { nombre: 'Competencia', proteinasPct: 25, carbohidratosPct: 55, grasasPct: 20 });
    expect(planModelo.guardar).toHaveBeenCalledWith(1, HOY, { tipo: 'personalizado', planPersonalizadoId: 9, proteinasPct: 25, carbohidratosPct: 55, grasasPct: 20 });

    const suma = await conSesion(request(app).post('/api/comidas/plan/personalizados')).send({ nombre: 'Mal', proteinas: 30, carbohidratos: 50, grasas: 25 });
    expect(suma.status).toBe(400);
    expect(suma.body.error).toBe('Los porcentajes suman 105 % y deben sumar 100 %');
    const sinNombre = await conSesion(request(app).post('/api/comidas/plan/personalizados')).send({ proteinas: 30, carbohidratos: 45, grasas: 25 });
    expect(sinNombre.status).toBe(400);
    expect(sinNombre.body.detalles.nombre).toBe('Ponle un nombre a tu plan');
    const usar = await conSesion(request(app).post('/api/comidas/plan/personalizados')).send({ nombre: 'X', proteinas: 30, carbohidratos: 45, grasas: 25, usar: 'sí' });
    expect(usar.status).toBe(400);
    expect(planModelo.crearPersonalizado).toHaveBeenCalledTimes(1);
  });

  test('elige un personalizado propio o el de la meta; uno ajeno responde 404', async () => {
    const usar = await conSesion(request(app).put('/api/comidas/plan')).send({ tipo: 'personalizado', personalizadoId: '4' });
    expect(usar.status).toBe(200);
    expect(planModelo.guardar).toHaveBeenCalledWith(1, HOY, { tipo: 'personalizado', planPersonalizadoId: 4, proteinasPct: 40, carbohidratosPct: 35, grasasPct: 25 });
    expect((await conSesion(request(app).put('/api/comidas/plan')).send({ tipo: 'personalizado', personalizadoId: 8 })).status).toBe(404);
    const tipo = await conSesion(request(app).put('/api/comidas/plan')).send({ tipo: 'estandar' });
    expect(tipo.status).toBe(400);
    expect(tipo.body.detalles.tipo).toBe('Elige «Según tu meta» o «Personalizado»');
    expect((await conSesion(request(app).put('/api/comidas/plan')).send({ tipo: 'meta' })).status).toBe(200);
    expect((await request(app).put('/api/comidas/plan').send({ tipo: 'meta' })).status).toBe(401);
  });

  test('edita y borra personalizados propios; uno ajeno o un id inválido no', async () => {
    planModelo.actualizarPersonalizado.mockImplementation(async (id, datos) => ({ id, ...datos }));
    const editado = await conSesion(request(app).put('/api/comidas/plan/personalizados/4')).send({ nombre: 'Volumen fuerte', proteinas: 35, carbohidratos: 40, grasas: 25 });
    expect(editado.status).toBe(200);
    expect(planModelo.actualizarPersonalizado).toHaveBeenCalledWith(4, { nombre: 'Volumen fuerte', proteinasPct: 35, carbohidratosPct: 40, grasasPct: 25 });
    expect((await conSesion(request(app).put('/api/comidas/plan/personalizados/8')).send({ nombre: 'X', proteinas: 35, carbohidratos: 40, grasas: 25 })).status).toBe(404);
    expect((await conSesion(request(app).delete('/api/comidas/plan/personalizados/4'))).status).toBe(200);
    expect(planModelo.eliminarPersonalizado).toHaveBeenCalledWith(4);
    expect((await conSesion(request(app).delete('/api/comidas/plan/personalizados/8'))).status).toBe(404);
    expect((await conSesion(request(app).delete('/api/comidas/plan/personalizados/abc'))).status).toBe(400);
  });

  test('guarda y quita la meta de peso; valida el peso y el ritmo', async () => {
    usuarioModel.buscarPorIdConPerfil.mockResolvedValue({ id: 1, perfil: { pesoKg: '68', alturaCm: '175', edad: 30, sexo: 'masculino', actividadFisica: 'moderada', objetivoPrincipal: 'bajar_peso' } });
    const guardada = await conSesion(request(app).put('/api/comidas/plan/meta-peso')).send({ pesoObjetivoKg: '63.5', ritmoSemanalKg: 0.5 });
    expect(guardada.status).toBe(200);
    expect(planModelo.guardarMetaPeso).toHaveBeenCalledWith(1, expect.objectContaining({ objetivo: 'bajar_peso', pesoObjetivoKg: 63.5, ritmoSemanalKg: 0.5, pesoInicialKg: 68 }));
    expect(guardada.body.opcionesMetaPeso).toMatchObject({ ritmos: [0.25, 0.5, 0.75], rango: { min: 56.7, max: 67.9 } });
    const fuera = await conSesion(request(app).put('/api/comidas/plan/meta-peso')).send({ pesoObjetivoKg: 20, ritmoSemanalKg: 0.5 });
    expect(fuera.status).toBe(400);
    expect(fuera.body.detalles.pesoObjetivoKg).toBe('Escribe un peso entre 30 y 300 kg');
    const ritmo = await conSesion(request(app).put('/api/comidas/plan/meta-peso')).send({ pesoObjetivoKg: 64 });
    expect(ritmo.body.detalles.ritmoSemanalKg).toBe('Elige a qué ritmo quieres avanzar');
    expect((await conSesion(request(app).delete('/api/comidas/plan/meta-peso'))).status).toBe(200);
    expect(planModelo.eliminarMetaPeso).toHaveBeenCalledWith(1);
  });
});
