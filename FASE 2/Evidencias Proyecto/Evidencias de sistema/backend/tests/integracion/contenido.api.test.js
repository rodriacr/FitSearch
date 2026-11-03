// API del contenido del administrador (FS-HU-30) y catálogo público de especialidades. El acceso a datos se simula.
jest.mock('../../src/models/contenido.model');
jest.mock('../../src/services/geocodificacion.service');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const modelo = require('../../src/models/contenido.model');
const geocodificacion = require('../../src/services/geocodificacion.service');
const ErrorHttp = require('../../src/utils/ErrorHttp');

const token = (rol = 'administrador') => jwt.sign({ rol }, process.env.JWT_SECRET, { subject: '1', expiresIn: '1h' });
const conSesion = (peticion, rol) => peticion.set('Authorization', `Bearer ${token(rol)}`);
const RUTA = '/api/administrador/contenido';
const ARROZ = { id: 17, nombre: 'Arroz blanco cocido', sinonimos: 'arroz', calorias: '130.0', proteinasG: '2.7', carbohidratosG: '28.2', grasasG: '0.3', activo: true, enUso: 4, _count: { registros: 4 } };
const GIMNASIO = {
  nombre: 'Gimnasio Demo Ñuñoa', categoria: 'gimnasio', comuna: 'Ñuñoa', direccion: 'Av. Irarrázaval 3000', ubicacionLat: -33.4569, ubicacionLng: -70.5976,
};

beforeEach(() => jest.resetAllMocks());

test('el catálogo público de especialidades no requiere sesión y solo trae las activas', async () => {
  const res = await request(app).get('/api/especialidades');
  expect(res.status).toBe(200);
  expect(res.body.especialidades).toEqual(['Entrenamiento personal', 'Kinesiología', 'Medicina deportiva', 'Nutrición', 'Psicología deportiva']);
});

test('el contenido exige sesión de administrador', async () => {
  expect((await request(app).get(`${RUTA}/alimentos`)).status).toBe(401);
  for (const rol of ['usuario', 'profesional']) expect((await conSesion(request(app).get(`${RUTA}/alimentos`), rol)).status).toBe(403);
  expect((await conSesion(request(app).post(`${RUTA}/especialidades`), 'profesional').send({ nombre: 'Yoga' })).status).toBe(403);
  expect(modelo.listar).not.toHaveBeenCalled();
  expect(modelo.crear).not.toHaveBeenCalled();
});

test('lista un catálogo con búsqueda, estado y página, sin exponer los conteos internos', async () => {
  modelo.listar.mockResolvedValue({ filas: [ARROZ], total: 13 });
  const res = await conSesion(request(app).get(`${RUTA}/alimentos?q=arroz&estado=activos&pagina=2`));
  expect(res.status).toBe(200);
  expect(modelo.listar).toHaveBeenCalledWith('alimentos', { q: 'arroz', estado: 'activos', pagina: 2, limite: 12 });
  expect(res.body).toEqual({
    total: 13, pagina: 2, totalPaginas: 2,
    resultados: [{ id: 17, nombre: 'Arroz blanco cocido', sinonimos: 'arroz', calorias: 130, proteinasG: 2.7, carbohidratosG: 28.2, grasasG: 0.3, activo: true, enUso: 4 }],
  });
  expect((await conSesion(request(app).get(`${RUTA}/recetas`))).status).toBe(400);
  expect((await conSesion(request(app).get(`${RUTA}/alimentos?estado=borrados`))).status).toBe(400);
});

test('crea una especialidad con el nombre sin espacios sobrantes y responde activo en la API', async () => {
  modelo.crear.mockResolvedValue({ id: 9, nombre: 'Terapia ocupacional', activa: true, enUso: 0 });
  const res = await conSesion(request(app).post(`${RUTA}/especialidades`)).send({ nombre: '  Terapia ocupacional ', activa: false });
  expect(res.status).toBe(201);
  expect(res.body.elemento).toEqual({ id: 9, nombre: 'Terapia ocupacional', activo: true, enUso: 0 });
  expect(modelo.crear).toHaveBeenCalledWith('especialidades', { nombre: 'Terapia ocupacional' });
  const corto = await conSesion(request(app).post(`${RUTA}/especialidades`)).send({ nombre: 'Y' });
  expect(corto.status).toBe(400);
  expect(corto.body.detalles.nombre).toBe('Escribe entre 2 y 100 caracteres');
});

test('valida los valores por 100 g de un alimento y ordena sus sinónimos', async () => {
  modelo.crear.mockImplementation(async (_, datos) => ({ id: 60, ...datos, activo: true, enUso: 0 }));
  const res = await conSesion(request(app).post(`${RUTA}/alimentos`)).send({
    nombre: 'Quínoa cocida', sinonimos: 'quinoa,  quínoa cocida ,', calorias: '120', proteinasG: 4.4, carbohidratosG: '21,3', grasasG: 1.92,
  });
  // «21,3» con coma no es un número válido para la API: la interfaz envía punto.
  expect(res.status).toBe(400);
  expect(res.body.detalles.carbohidratosG).toBe('Ingresa los carbohidratos por 100 g entre 0 y 100');
  const bien = await conSesion(request(app).post(`${RUTA}/alimentos`)).send({
    nombre: 'Quínoa cocida', sinonimos: 'quinoa,  quínoa cocida ,', calorias: '120', proteinasG: 4.4, carbohidratosG: 21.3, grasasG: 1.92,
  });
  expect(bien.status).toBe(201);
  expect(modelo.crear).toHaveBeenLastCalledWith('alimentos', {
    nombre: 'Quínoa cocida', sinonimos: 'quinoa, quínoa cocida', calorias: 120, proteinasG: 4.4, carbohidratosG: 21.3, grasasG: 1.9,
  });
  const imposible = await conSesion(request(app).post(`${RUTA}/alimentos`)).send({ nombre: 'Error', calorias: 950, proteinasG: 60, carbohidratosG: 50, grasasG: 10 });
  expect(imposible.status).toBe(400);
  expect(imposible.body.detalles).toMatchObject({
    calorias: 'Ingresa las calorías por 100 g entre 0 y 900',
    grasasG: 'Las proteínas, los carbohidratos y las grasas no pueden sumar más de 100 g por cada 100 g',
  });
});

test('un establecimiento necesita categoría del catálogo, comuna, dirección y ubicación en Chile', async () => {
  modelo.crear.mockImplementation(async (_, datos) => ({ id: 3, ...datos, activo: true, enUso: 0 }));
  const res = await conSesion(request(app).post(`${RUTA}/establecimientos`)).send(GIMNASIO);
  expect(res.status).toBe(201);
  expect(res.body.elemento).toEqual({ id: 3, ...GIMNASIO, activo: true, enUso: 0 });
  const malo = await conSesion(request(app).post(`${RUTA}/establecimientos`)).send({ ...GIMNASIO, categoria: 'farmacia', comuna: ' ', ubicacionLat: -10 });
  expect(malo.status).toBe(400);
  expect(malo.body.detalles).toMatchObject({
    categoria: 'Elige si es un centro de salud o un gimnasio',
    comuna: 'Ingresa la comuna del establecimiento',
    ubicacionLat: 'La latitud debe estar en Chile (entre -56,5 y -17)',
  });
});

test('edita, cambia el estado y elimina; un elemento en uso responde 409 sin borrarse', async () => {
  modelo.actualizar.mockResolvedValue({ id: 3, ...GIMNASIO, nombre: 'Gimnasio Demo', activo: true, enUso: 1 });
  const editado = await conSesion(request(app).put(`${RUTA}/establecimientos/3`)).send({ ...GIMNASIO, nombre: 'Gimnasio Demo' });
  expect(editado.status).toBe(200);
  expect(modelo.actualizar).toHaveBeenCalledWith('establecimientos', 3, { ...GIMNASIO, nombre: 'Gimnasio Demo' });

  modelo.cambiarEstado.mockResolvedValue({ id: 3, ...GIMNASIO, activo: false, enUso: 1 });
  const estado = await conSesion(request(app).patch(`${RUTA}/establecimientos/3/estado`)).send({ activo: false });
  expect(estado.status).toBe(200);
  expect(estado.body.elemento.activo).toBe(false);
  expect(modelo.cambiarEstado).toHaveBeenCalledWith('establecimientos', 3, false);
  expect((await conSesion(request(app).patch(`${RUTA}/establecimientos/3/estado`)).send({ activo: 'no' })).status).toBe(400);

  modelo.eliminar.mockRejectedValueOnce(new ErrorHttp(409, 'No se puede eliminar «Gimnasio Demo»: tiene 1 profesional asociado.', { enUso: 1 }));
  const enUso = await conSesion(request(app).delete(`${RUTA}/establecimientos/3`));
  expect(enUso.status).toBe(409);
  expect(enUso.body).toMatchObject({ error: 'No se puede eliminar «Gimnasio Demo»: tiene 1 profesional asociado.', detalles: { enUso: 1 } });
  modelo.eliminar.mockResolvedValueOnce();
  expect((await conSesion(request(app).delete(`${RUTA}/establecimientos/4`))).status).toBe(204);
  expect((await conSesion(request(app).delete(`${RUTA}/establecimientos/abc`))).status).toBe(400);
});

test('busca la ubicación de un establecimiento con su comuna y su dirección', async () => {
  geocodificacion.ubicar.mockResolvedValue({ lat: -33.4569, lng: -70.5976, precision: 'exacta', encontrada: 'Avenida Irarrázaval 3000, Ñuñoa' });
  const res = await conSesion(request(app).get(`${RUTA}/establecimientos/ubicacion?comuna=%C3%91u%C3%B1oa&direccion=Av.%20Irarr%C3%A1zaval%203000`));
  expect(res.status).toBe(200);
  expect(res.body.precision).toBe('exacta');
  expect(geocodificacion.ubicar).toHaveBeenCalledWith({ comuna: 'Ñuñoa', direccion: 'Av. Irarrázaval 3000' });
  const sinComuna = await conSesion(request(app).get(`${RUTA}/establecimientos/ubicacion`));
  expect(sinComuna.status).toBe(400);
  expect(sinComuna.body.detalles.comuna).toBe('Ingresa la comuna del establecimiento');
});
