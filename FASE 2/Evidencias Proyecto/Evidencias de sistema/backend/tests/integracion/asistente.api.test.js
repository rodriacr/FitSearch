// Asistente IA (FS-HU-07, DAS D33). El acceso a datos se simula y el proveedor responde en modo simulado.
jest.mock('../../src/models/asistente.model');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const modelo = require('../../src/models/asistente.model');
const proveedor = require('../../src/services/proveedorIa.service');
const ErrorHttp = require('../../src/utils/ErrorHttp');

const firmar = (rol) => jwt.sign({ rol }, process.env.JWT_SECRET, { subject: '1', expiresIn: '1h' });
const conSesion = (peticion, rol = 'usuario') => peticion.set('Authorization', `Bearer ${firmar(rol)}`);
const fecha = new Date('2026-10-21T15:00:00Z');
const conversacion = (extra = {}) => ({ id: 5, titulo: '¿Cómo empiezo a trotar?', fijada: false, fechaInicio: fecha, fechaActualizacion: fecha, ...extra });
const mensajeDe = (id, remitente, contenido) => ({ id, remitente, contenido, fecha });

beforeEach(() => {
  jest.resetAllMocks();
  jest.restoreAllMocks();
  modelo.usoDelDia.mockResolvedValue(0);
  modelo.registrarUso.mockResolvedValue();
});

describe('acceso', () => {
  test('sin sesión responde 401 y un profesional recibe 403', async () => {
    expect((await request(app).get('/api/asistente/conversaciones')).status).toBe(401);
    expect((await conSesion(request(app).get('/api/asistente/conversaciones'), 'profesional')).status).toBe(403);
    expect((await conSesion(request(app).post('/api/asistente/conversaciones'), 'profesional').send({ mensaje: 'Hola' })).status).toBe(403);
  });
});

describe('estado e historial', () => {
  test('informa el modo y los mensajes que quedan hoy', async () => {
    modelo.usoDelDia.mockResolvedValue(4);
    const res = await conSesion(request(app).get('/api/asistente/estado'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ modo: 'simulado', limiteDiario: 30, restantesHoy: 26 });
    expect(modelo.usoDelDia).toHaveBeenCalledWith(1, expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
  });

  test('lista las conversaciones propias con una vista previa del último mensaje', async () => {
    const largo = 'Para empezar a trotar, alterna un minuto de trote con dos de caminata durante veinte minutos y aumenta poco a poco.';
    modelo.listarConversaciones.mockResolvedValue([
      { ...conversacion({ fijada: true }), mensajes: [mensajeDe(9, 'asistente', largo)] },
      { ...conversacion({ id: 6, titulo: 'Sueño' }), mensajes: [] },
    ]);
    const res = await conSesion(request(app).get('/api/asistente/conversaciones'));
    expect(res.status).toBe(200);
    expect(modelo.listarConversaciones).toHaveBeenCalledWith(1, 50);
    expect(res.body.conversaciones[0]).toMatchObject({ id: 5, fijada: true, vistaPrevia: expect.stringMatching(/…$/) });
    expect(res.body.conversaciones[0].vistaPrevia.length).toBeLessThanOrEqual(90);
    expect(res.body.conversaciones[1].vistaPrevia).toBe('');
  });

  test('abre una conversación propia; una ajena o inexistente responde 404 y un id inválido 400', async () => {
    modelo.obtenerConversacion.mockResolvedValueOnce({ ...conversacion(), mensajes: [mensajeDe(1, 'usuario', 'Hola'), mensajeDe(2, 'asistente', '¡Hola!')] });
    const res = await conSesion(request(app).get('/api/asistente/conversaciones/5'));
    expect(res.status).toBe(200);
    expect(res.body.mensajes.map((m) => m.remitente)).toEqual(['usuario', 'asistente']);
    expect(modelo.obtenerConversacion).toHaveBeenCalledWith(5, 1);

    modelo.obtenerConversacion.mockResolvedValueOnce(null);
    expect((await conSesion(request(app).get('/api/asistente/conversaciones/77'))).status).toBe(404);
    expect((await conSesion(request(app).get('/api/asistente/conversaciones/abc'))).status).toBe(400);
  });
});

describe('conversar', () => {
  test('el primer mensaje crea la conversación con su respuesta y descuenta del límite', async () => {
    modelo.usoDelDia.mockResolvedValue(2);
    modelo.crearConversacion.mockImplementation(async (usuarioId, titulo, mensajes) => ({
      ...conversacion({ titulo }), mensajes: mensajes.map((m, i) => ({ id: i + 1, ...m })),
    }));
    const res = await conSesion(request(app).post('/api/asistente/conversaciones')).send({ mensaje: '  ¿Cómo empiezo a trotar?  ' });
    expect(res.status).toBe(201);
    expect(res.body.restantesHoy).toBe(27);
    expect(res.body.conversacion.titulo).toBe('¿Cómo empiezo a trotar?');
    expect(res.body.mensajes.map((m) => m.remitente)).toEqual(['usuario', 'asistente']);
    expect(res.body.mensajes[1].contenido).toMatch(/^Modo de prueba/);
    const [usuarioId, , mensajes] = modelo.crearConversacion.mock.calls[0];
    expect(usuarioId).toBe(1);
    expect(mensajes[0]).toMatchObject({ remitente: 'usuario', contenido: '¿Cómo empiezo a trotar?' });
    // El uso se registra una vez por mensaje respondido; borrar la conversación no lo devuelve.
    expect(modelo.registrarUso).toHaveBeenCalledTimes(1);
    expect(modelo.registrarUso).toHaveBeenCalledWith(1, expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
  });

  test('un mensaje en una conversación envía al proveedor solo los últimos mensajes y guarda ambos', async () => {
    modelo.obtenerConversacion.mockResolvedValue({ ...conversacion(), mensajes: [] });
    modelo.ultimosMensajes.mockResolvedValue([mensajeDe(1, 'usuario', 'Hola'), mensajeDe(2, 'asistente', '¡Hola!')]);
    modelo.agregarMensajes.mockImplementation(async (id, mensajes) => mensajes.map((m, i) => ({ id: 10 + i, ...m })));
    const responder = jest.spyOn(proveedor, 'responder');
    const res = await conSesion(request(app).post('/api/asistente/conversaciones/5/mensajes')).send({ mensaje: '¿Y si llueve?' });
    expect(res.status).toBe(201);
    expect(res.body.restantesHoy).toBe(29);
    expect(modelo.ultimosMensajes).toHaveBeenCalledWith(5, 9);
    expect(responder.mock.calls[0][0].map((m) => m.contenido)).toEqual(['Hola', '¡Hola!', '¿Y si llueve?']);
    // El proveedor solo recibe los mensajes: nada del perfil ni de la cuenta.
    expect(Object.keys(responder.mock.calls[0][0][2])).toEqual(['remitente', 'contenido']);
    expect(modelo.agregarMensajes).toHaveBeenCalledWith(5, [
      expect.objectContaining({ remitente: 'usuario', contenido: '¿Y si llueve?' }),
      expect.objectContaining({ remitente: 'asistente' }),
    ]);
  });

  test('valida el mensaje: vacío, demasiado largo o no texto responde 400', async () => {
    for (const [cuerpo, error] of [[{ mensaje: '   ' }, 'Escribe un mensaje'], [{ mensaje: 'a'.repeat(1001) }, 'El mensaje admite hasta 1000 caracteres'], [{ mensaje: 5 }, 'Escribe un mensaje'], [{}, 'Escribe un mensaje']]) {
      const res = await conSesion(request(app).post('/api/asistente/conversaciones')).send(cuerpo);
      expect(res.status).toBe(400);
      expect(res.body.detalles.mensaje).toBe(error);
    }
    expect(modelo.crearConversacion).not.toHaveBeenCalled();
  });

  test('al llegar al límite diario responde 429 sin llamar al proveedor', async () => {
    modelo.usoDelDia.mockResolvedValue(30);
    const responder = jest.spyOn(proveedor, 'responder');
    const res = await conSesion(request(app).post('/api/asistente/conversaciones')).send({ mensaje: 'Hola' });
    expect(res.status).toBe(429);
    expect(res.body.error).toBe('Llegaste al límite de 30 mensajes de hoy. Vuelve a conversar mañana.');
    expect(responder).not.toHaveBeenCalled();
  });

  test('si el proveedor falla responde 503 y no guarda el mensaje (se puede reintentar)', async () => {
    modelo.obtenerConversacion.mockResolvedValue({ ...conversacion(), mensajes: [] });
    modelo.ultimosMensajes.mockResolvedValue([]);
    jest.spyOn(proveedor, 'responder').mockRejectedValue(new ErrorHttp(503, 'El asistente no está disponible en este momento. Intenta nuevamente en unos minutos.'));
    const res = await conSesion(request(app).post('/api/asistente/conversaciones/5/mensajes')).send({ mensaje: 'Hola' });
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/no está disponible/);
    expect(modelo.agregarMensajes).not.toHaveBeenCalled();
    expect(modelo.registrarUso).not.toHaveBeenCalled();
  });

  test('ante una señal de emergencia la respuesta indica llamar al SAMU', async () => {
    modelo.crearConversacion.mockImplementation(async (u, titulo, mensajes) => ({ ...conversacion({ titulo }), mensajes: mensajes.map((m, i) => ({ id: i + 1, ...m })) }));
    const res = await conSesion(request(app).post('/api/asistente/conversaciones')).send({ mensaje: 'Tengo dolor en el pecho al correr' });
    expect(res.body.mensajes[1].contenido).toContain('SAMU (131)');
  });
});

describe('fijar y borrar', () => {
  test('fija una conversación, pero no más de 5', async () => {
    modelo.obtenerConversacion.mockResolvedValue({ ...conversacion(), mensajes: [] });
    modelo.contarFijadas.mockResolvedValueOnce(2).mockResolvedValueOnce(5);
    modelo.fijar.mockResolvedValue({ count: 1 });
    const ok = await conSesion(request(app).patch('/api/asistente/conversaciones/5')).send({ fijada: true });
    expect(ok.status).toBe(200);
    expect(ok.body.conversacion).toMatchObject({ id: 5, fijada: true });
    expect(modelo.fijar).toHaveBeenCalledWith(5, 1, true);
    const lleno = await conSesion(request(app).patch('/api/asistente/conversaciones/5')).send({ fijada: true });
    expect(lleno.status).toBe(409);
    expect((await conSesion(request(app).patch('/api/asistente/conversaciones/5')).send({ fijada: 'si' })).status).toBe(400);
  });

  test('borra una conversación propia (204) y responde 404 si no existe o es ajena', async () => {
    modelo.eliminar.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    expect((await conSesion(request(app).delete('/api/asistente/conversaciones/5'))).status).toBe(204);
    expect(modelo.eliminar).toHaveBeenCalledWith(5, 1);
    expect((await conSesion(request(app).delete('/api/asistente/conversaciones/5'))).status).toBe(404);
  });
});
