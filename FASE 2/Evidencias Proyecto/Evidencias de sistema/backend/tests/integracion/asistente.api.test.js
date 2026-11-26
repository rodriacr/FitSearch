// Asistente IA (FS-HU-07, DAS D33; recomendación FS-HU-08, D34). El acceso a datos se simula y el proveedor responde
// en modo simulado.
jest.mock('../../src/models/asistente.model');
jest.mock('../../src/models/comida.model');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const modelo = require('../../src/models/asistente.model');
const comidaModel = require('../../src/models/comida.model');
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
  modelo.reservarUso.mockResolvedValue(true);
  modelo.liberarUso.mockResolvedValue({ count: 1 });
  modelo.enTransaccion.mockImplementation((trabajo) => trabajo('tx'));
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
    expect(res.body).toEqual({ modo: 'simulado', limiteDiario: 30, restantesHoy: 26, permisoPerfil: { valor: null, fecha: null } });
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
    modelo.usoDelDia.mockResolvedValue(3);
    modelo.crearConversacion.mockImplementation(async (usuarioId, titulo, mensajes) => ({
      ...conversacion({ titulo }), mensajes: mensajes.map((m, i) => ({ id: i + 1, ...m })),
    }));
    const res = await conSesion(request(app).post('/api/asistente/conversaciones')).send({ mensaje: '  ¿Cómo empiezo a trotar?  ' });
    expect(res.status).toBe(201);
    expect(res.body.restantesHoy).toBe(27);
    expect(res.body.conversacion.titulo).toBe('¿Cómo empiezo a trotar?');
    expect(res.body.mensajes.map((m) => m.remitente)).toEqual(['usuario', 'asistente']);
    expect(res.body.mensajes[1].contenido).toMatch(/^Modo de prueba/);
    expect(res.body.mensajes.map((m) => m.especialidad)).toEqual([null, null]);
    const [usuarioId, , mensajes] = modelo.crearConversacion.mock.calls[0];
    expect(usuarioId).toBe(1);
    expect(mensajes[0]).toMatchObject({ remitente: 'usuario', contenido: '¿Cómo empiezo a trotar?' });
    // El cupo se reserva una vez por mensaje, antes de responder; borrar la conversación no lo devuelve.
    expect(modelo.reservarUso).toHaveBeenCalledTimes(1);
    expect(modelo.reservarUso).toHaveBeenCalledWith(1, expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), 30);
    expect(modelo.liberarUso).not.toHaveBeenCalled();
  });

  test('un mensaje en una conversación envía al proveedor solo los últimos mensajes y guarda ambos', async () => {
    modelo.obtenerConversacion.mockResolvedValue({ ...conversacion(), mensajes: [] });
    modelo.ultimosMensajes.mockResolvedValue([mensajeDe(1, 'usuario', 'Hola'), mensajeDe(2, 'asistente', '¡Hola!')]);
    modelo.agregarMensajes.mockImplementation(async (id, mensajes) => mensajes.map((m, i) => ({ id: 10 + i, ...m })));
    modelo.usoDelDia.mockResolvedValue(1);
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
    ], 'tx');
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
    modelo.reservarUso.mockResolvedValue(false);
    const responder = jest.spyOn(proveedor, 'responder');
    const res = await conSesion(request(app).post('/api/asistente/conversaciones')).send({ mensaje: 'Hola' });
    expect(res.status).toBe(429);
    expect(res.body.error).toBe('Llegaste al límite de 30 mensajes de hoy. Vuelve a conversar mañana.');
    expect(responder).not.toHaveBeenCalled();
  });

  test('si el proveedor falla responde 503, no guarda el mensaje y devuelve el cupo (se puede reintentar)', async () => {
    modelo.obtenerConversacion.mockResolvedValue({ ...conversacion(), mensajes: [] });
    modelo.ultimosMensajes.mockResolvedValue([]);
    jest.spyOn(proveedor, 'responder').mockRejectedValue(new ErrorHttp(503, 'El asistente no está disponible en este momento. Intenta nuevamente en unos minutos.'));
    const res = await conSesion(request(app).post('/api/asistente/conversaciones/5/mensajes')).send({ mensaje: 'Hola' });
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/no está disponible/);
    expect(modelo.agregarMensajes).not.toHaveBeenCalled();
    expect(modelo.reservarUso).toHaveBeenCalledTimes(1);
    expect(modelo.liberarUso).toHaveBeenCalledWith(1, modelo.reservarUso.mock.calls[0][1]);
  });

  test('la respuesta guarda y devuelve la especialidad recomendada del catálogo (FS-HU-08)', async () => {
    modelo.obtenerConversacion.mockResolvedValue({ ...conversacion(), mensajes: [] });
    modelo.ultimosMensajes.mockResolvedValue([]);
    modelo.agregarMensajes.mockImplementation(async (id, mensajes) => mensajes.map((m, i) => ({ id: 10 + i, ...m })));
    const res = await conSesion(request(app).post('/api/asistente/conversaciones/5/mensajes')).send({ mensaje: 'Me duele la rodilla al correr' });
    expect(res.status).toBe(201);
    expect(res.body.mensajes[1]).toMatchObject({ remitente: 'asistente', especialidad: 'Kinesiología' });
    expect(modelo.agregarMensajes.mock.calls[0][1][1]).toMatchObject({ remitente: 'asistente', especialidad: 'Kinesiología' });
    // Una molestia leve no lleva el aviso del SAMU.
    expect(res.body.mensajes[1].contenido).not.toContain('131');
  });

  test('ante una señal de emergencia la respuesta indica llamar al SAMU', async () => {
    modelo.crearConversacion.mockImplementation(async (u, titulo, mensajes) => ({ ...conversacion({ titulo }), mensajes: mensajes.map((m, i) => ({ id: i + 1, ...m })) }));
    const res = await conSesion(request(app).post('/api/asistente/conversaciones')).send({ mensaje: 'Tengo dolor en el pecho al correr' });
    expect(res.body.mensajes[1].contenido).toContain('SAMU (131)');
  });
});

// Revisión del PR #29: con 29 de 30 mensajes usados, tres solicitudes simultáneas no pueden pasar todas. El contador
// simulado reserva igual que el modelo (comprobar y sumar en un solo paso) y el proveedor tarda, para que se crucen.
describe('límite diario con solicitudes simultáneas', () => {
  let usados;
  beforeEach(() => {
    usados = 29;
    modelo.reservarUso.mockImplementation(async (usuarioId, dia, limite) => {
      if (usados >= limite) return false;
      usados += 1;
      return true;
    });
    modelo.liberarUso.mockImplementation(async () => { usados -= 1; });
    modelo.usoDelDia.mockImplementation(async () => usados);
    modelo.obtenerConversacion.mockResolvedValue({ ...conversacion(), mensajes: [] });
    modelo.ultimosMensajes.mockResolvedValue([]);
    modelo.crearConversacion.mockImplementation(async (u, titulo, mensajes) => ({ ...conversacion({ titulo }), mensajes: mensajes.map((m, i) => ({ id: i + 1, ...m })) }));
    modelo.agregarMensajes.mockImplementation(async (id, mensajes) => mensajes.map((m, i) => ({ id: 10 + i, ...m })));
  });

  const responderLento = (falla = () => false) => {
    let llamada = 0;
    return jest.spyOn(proveedor, 'responder').mockImplementation(async () => {
      const esta = (llamada += 1);
      await new Promise((resolver) => setTimeout(resolver, 30));
      if (falla(esta)) throw new ErrorHttp(503, 'El asistente no está disponible en este momento. Intenta nuevamente en unos minutos.');
      return { contenido: 'Respuesta', especialidad: null };
    });
  };
  const enParalelo = (crear) => Promise.all([1, 2, 3].map(() => crear()));
  const estados = (respuestas) => respuestas.map((r) => r.status).sort();

  test('al iniciar conversaciones solo pasa una y el contador queda en 30', async () => {
    const responder = responderLento();
    const respuestas = await enParalelo(() => conSesion(request(app).post('/api/asistente/conversaciones')).send({ mensaje: 'Hola' }));
    expect(estados(respuestas)).toEqual([201, 429, 429]);
    expect(responder).toHaveBeenCalledTimes(1);
    expect(modelo.crearConversacion).toHaveBeenCalledTimes(1);
    expect(usados).toBe(30);
    expect(respuestas.find((r) => r.status === 201).body.restantesHoy).toBe(0);
  });

  test('al continuar una conversación solo pasa una y el contador queda en 30', async () => {
    const responder = responderLento();
    const respuestas = await enParalelo(() => conSesion(request(app).post('/api/asistente/conversaciones/5/mensajes')).send({ mensaje: '¿Y si llueve?' }));
    expect(estados(respuestas)).toEqual([201, 429, 429]);
    expect(responder).toHaveBeenCalledTimes(1);
    expect(modelo.agregarMensajes).toHaveBeenCalledTimes(1);
    expect(usados).toBe(30);
  });

  test('si el proveedor falla, el cupo se devuelve y el siguiente mensaje puede usarlo', async () => {
    responderLento((llamada) => llamada === 1);
    const fallida = await conSesion(request(app).post('/api/asistente/conversaciones/5/mensajes')).send({ mensaje: 'Hola' });
    expect(fallida.status).toBe(503);
    expect(usados).toBe(29);
    const reintento = await conSesion(request(app).post('/api/asistente/conversaciones/5/mensajes')).send({ mensaje: 'Hola' });
    expect(reintento.status).toBe(201);
    expect(usados).toBe(30);
  });
});

// FS-HU-09: en modo de prueba, «agrega 100 g de pollo…» se reconoce sin proveedor y registra los alimentos de hoy.
describe('agregar alimentos desde el chat', () => {
  const POLLO = { id: 1, nombre: 'Pechuga de pollo cocida', sinonimos: 'pollo', calorias: '165.0', proteinasG: '31.0', carbohidratosG: '0.0', grasasG: '3.6', activo: true };
  const ARROZ = { id: 17, nombre: 'Arroz blanco cocido', sinonimos: 'arroz', calorias: '130.0', proteinasG: '2.7', carbohidratosG: '28.2', grasasG: '0.3', activo: true };
  beforeEach(() => {
    comidaModel.buscarAlimentos.mockImplementation(async ([palabra]) => ({ pollo: [POLLO], arroz: [ARROZ] }[palabra] ?? []));
    let id = 40;
    comidaModel.crear.mockImplementation(async (datos) => ({ id: (id += 1), ...datos }));
    modelo.obtenerConversacion.mockResolvedValue({ ...conversacion(), mensajes: [] });
    modelo.ultimosMensajes.mockResolvedValue([]);
    modelo.agregarMensajes.mockImplementation(async (cid, mensajes) => mensajes.map((m, i) => ({ id: 10 + i, ...m })));
    modelo.crearConversacion.mockImplementation(async (u, titulo, mensajes) => ({ ...conversacion({ titulo }), mensajes: mensajes.map((m, i) => ({ id: i + 1, ...m })) }));
  });

  test('agrega los alimentos con sus gramos al almuerzo de hoy y la respuesta los muestra', async () => {
    const res = await conSesion(request(app).post('/api/asistente/conversaciones/5/mensajes')).send({ mensaje: 'Añádeme 100 g de pollo y 150g de arroz al almuerzo' });
    expect(res.status).toBe(201);
    expect(comidaModel.crear).toHaveBeenCalledTimes(2);
    expect(comidaModel.crear).toHaveBeenCalledWith(expect.objectContaining({
      usuarioId: 1, momento: 'almuerzo', alimentoId: 1, gramos: 100, calorias: 165, origen: 'asistente', fecha: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    }), 'tx');
    const respuesta = res.body.mensajes[1];
    expect(respuesta.contenido).toMatch(/^Listo, agregué a tu almuerzo de hoy: 100 g de pechuga de pollo cocida \(165 kcal\) y 150 g de arroz blanco cocido \(195 kcal\)/);
    expect(respuesta.comidasAgregadas).toEqual([
      { id: 41, nombre: 'Pechuga de pollo cocida', gramos: 100, calorias: 165, momento: 'almuerzo' },
      { id: 42, nombre: 'Arroz blanco cocido', gramos: 150, calorias: 195, momento: 'almuerzo' },
    ]);
    expect(modelo.agregarMensajes.mock.calls[0][1][1]).toMatchObject({ remitente: 'asistente', comidasAgregadas: respuesta.comidasAgregadas });
    // Agregar comidas usa un mensaje del límite diario, como cualquier otro.
    expect(modelo.reservarUso).toHaveBeenCalledTimes(1);
  });

  test('un alimento que no está en el catálogo no se agrega y el asistente lo explica', async () => {
    const res = await conSesion(request(app).post('/api/asistente/conversaciones')).send({ mensaje: 'anota 80 g de unicornio' });
    expect(res.status).toBe(201);
    expect(comidaModel.crear).not.toHaveBeenCalled();
    expect(res.body.mensajes[1].contenido).toMatch(/^No encontré «unicornio» en la tabla de alimentos de FitSearch/);
    expect(res.body.mensajes[1].comidasAgregadas).toBeNull();
    expect(modelo.crearConversacion.mock.calls[0][2][1]).not.toHaveProperty('comidasAgregadas');
  });

  test('sin gramos o sin pedido de agregar, responde como un mensaje normal', async () => {
    const res = await conSesion(request(app).post('/api/asistente/conversaciones')).send({ mensaje: '¿Cuántas calorías tiene 100 g de pollo?' });
    expect(res.body.mensajes[1].contenido).toMatch(/^Modo de prueba/);
    expect(comidaModel.crear).not.toHaveBeenCalled();
  });

  // Revisión del PR #35 (Luis Méndez): los alimentos y los mensajes se guardan en una sola transacción. La transacción
  // simulada solo confirma las comidas si todo el guardado termina bien, como MySQL; los fallos son inducidos.
  describe('si falla el guardado no quedan comidas a medias', () => {
    const PEDIDO = 'Agrega 150 g de arroz y 100 g de pollo al almuerzo';
    const iniciar = () => conSesion(request(app).post('/api/asistente/conversaciones')).send({ mensaje: PEDIDO });
    const continuar = () => conSesion(request(app).post('/api/asistente/conversaciones/5/mensajes')).send({ mensaje: PEDIDO });
    const falla = () => new ErrorHttp(503, 'Fallo de guardado simulado');
    let confirmadas;

    beforeEach(() => {
      confirmadas = [];
      let id = 60;
      modelo.enTransaccion.mockImplementation(async (trabajo) => {
        const tx = { pendientes: [] };
        const resultado = await trabajo(tx);
        confirmadas.push(...tx.pendientes);
        return resultado;
      });
      comidaModel.crear.mockImplementation(async (datos, tx) => {
        tx.pendientes.push(datos);
        return { id: (id += 1), ...datos };
      });
    });

    test('al iniciar una conversación: no queda ninguna comida, se devuelve el cupo y el reintento no duplica', async () => {
      modelo.crearConversacion.mockRejectedValueOnce(falla());
      expect((await iniciar()).status).toBe(503);
      expect(confirmadas).toEqual([]);
      expect(modelo.liberarUso).toHaveBeenCalledTimes(1);

      const reintento = await iniciar();
      expect(reintento.status).toBe(201);
      expect(confirmadas.map(({ alimentoId }) => alimentoId)).toEqual([17, 1]);
      expect(reintento.body.mensajes[1].comidasAgregadas.map(({ id }) => id)).toEqual([63, 64]);
    });

    test('al continuar una conversación existente: no queda ninguna comida y el reintento no duplica', async () => {
      modelo.agregarMensajes.mockRejectedValueOnce(falla());
      expect((await continuar()).status).toBe(503);
      expect(confirmadas).toEqual([]);
      expect(modelo.liberarUso).toHaveBeenCalledTimes(1);

      expect((await continuar()).status).toBe(201);
      expect(confirmadas).toHaveLength(2);
      expect(modelo.agregarMensajes).toHaveBeenLastCalledWith(5, [
        expect.objectContaining({ remitente: 'usuario', contenido: PEDIDO }),
        expect.objectContaining({ remitente: 'asistente', comidasAgregadas: expect.any(Array) }),
      ], expect.objectContaining({ pendientes: expect.any(Array) }));
    });

    test('si falla el segundo alimento, el primero tampoco queda guardado ni se guardan los mensajes', async () => {
      comidaModel.crear
        .mockImplementationOnce(async (datos, tx) => { tx.pendientes.push(datos); return { id: 61, ...datos }; })
        .mockRejectedValueOnce(falla());
      expect((await iniciar()).status).toBe(503);
      expect(confirmadas).toEqual([]);
      expect(modelo.crearConversacion).not.toHaveBeenCalled();
      expect(modelo.liberarUso).toHaveBeenCalledTimes(1);
    });
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

// SC-47: mejora del asistente de IA.
describe('mejora del asistente (SC-47)', () => {
  const comidaServicio = require('../../src/services/comida.service');
  const resumenDia = require('../../src/services/resumenDia.service');
  const guardarConId = () => {
    modelo.obtenerConversacion.mockResolvedValue({ ...conversacion(), mensajes: [] });
    modelo.agregarMensajes.mockImplementation(async (id, mensajes) => mensajes.map((m, i) => ({ id: 10 + i, ...m })));
    modelo.crearConversacion.mockImplementation(async (u, titulo, mensajes) => ({ ...conversacion({ titulo }), mensajes: mensajes.map((m, i) => ({ id: i + 1, ...m })) }));
  };
  const enviarEn5 = (mensaje) => conSesion(request(app).post('/api/asistente/conversaciones/5/mensajes')).send({ mensaje });

  describe('recomendación: modalidad y orden según lo que escribió', () => {
    beforeEach(guardarConId);

    test.each([
      ['Me duele la rodilla, busco un kinesiólogo cerca de mi casa', 'Kinesiología', 'presencial', 'cercania'],
      ['Necesito una nutricionista online con buenas reseñas para bajar de peso', 'Nutrición', 'online', 'calificacion'],
      ['Quiero un kinesiólogo verificado para mi esguince', 'Kinesiología', null, 'verificados'],
      ['Me duele la rodilla al correr', 'Kinesiología', null, null],
      // Online no se ordena por cercanía: queda el orden propio de esa modalidad.
      ['Busco un nutricionista online cerca para mi dieta', 'Nutrición', 'online', null],
    ])('«%s» → %s, %s, %s', async (texto, especialidad, modalidad, criterio) => {
      modelo.ultimosMensajes.mockResolvedValue([]);
      const res = await enviarEn5(texto);
      expect(res.status).toBe(201);
      expect(res.body.mensajes[1]).toMatchObject({ especialidad, modalidad, criterio, valoracion: null, resumenDia: null });
      expect(modelo.agregarMensajes.mock.calls[0][1][1]).toMatchObject({ especialidad, modalidad, criterio });
    });

    test('si el último mensaje no lo dice, usa lo que escribió antes en la conversación', async () => {
      modelo.ultimosMensajes.mockResolvedValue([mensajeDe(1, 'usuario', 'Prefiero atenderme online'), mensajeDe(2, 'asistente', 'Perfecto.')]);
      const res = await enviarEn5('Me duele la espalda');
      expect(res.body.mensajes[1]).toMatchObject({ especialidad: 'Kinesiología', modalidad: 'online', criterio: null });
    });

    test('sin recomendación no guarda modalidad ni orden aunque los mencione', async () => {
      modelo.ultimosMensajes.mockResolvedValue([]);
      const res = await enviarEn5('¿Cómo empiezo a trotar cerca de mi casa?');
      expect(res.body.mensajes[1]).toMatchObject({ especialidad: null, modalidad: null, criterio: null });
    });
  });

  describe('¿Cómo voy hoy?', () => {
    beforeEach(guardarConId);
    const RESUMEN = {
      fecha: '2026-11-26', calorias: { consumo: 1250, meta: 1900 }, proteinasG: { consumo: 50, meta: 110 },
      carbohidratosG: { consumo: 140, meta: 210 }, grasasG: { consumo: 40, meta: 60 }, aguaMl: { consumo: 750, meta: 2000 },
    };

    test('responde con el resumen del día armado en el backend y lo guarda en el mensaje', async () => {
      modelo.ultimosMensajes.mockResolvedValue([]);
      const resumir = jest.spyOn(resumenDia, 'resumenDelDia').mockResolvedValue(RESUMEN);
      const responder = jest.spyOn(proveedor, 'responder');
      const res = await enviarEn5('¿Cómo voy hoy?');
      expect(res.status).toBe(201);
      expect(resumir).toHaveBeenCalledWith(1, expect.any(Date));
      expect(res.body.mensajes[1].resumenDia).toEqual(RESUMEN);
      expect(res.body.mensajes[1].contenido).toMatch(/^Así vas hoy:/);
      expect(res.body.mensajes[1].contenido).toContain('llevas 1.250 de 1.900 kcal (66 %) y 750 de 2.000 ml (38 %) de agua.');
      expect(res.body.mensajes[1].contenido).toContain('Te faltan unos 60 g de proteína');
      expect(res.body.mensajes[1].contenido).toContain('Te faltan 1.250 ml de agua: unos 5 vasos.');
      expect(modelo.agregarMensajes.mock.calls[0][1][1]).toMatchObject({ resumenDia: RESUMEN, especialidad: null });
      // Al proveedor solo fue la pregunta: los datos del día nunca salen del backend.
      expect(JSON.stringify(responder.mock.calls[0])).not.toContain('1250');
    });
  });

  describe('valorar una respuesta y elegir modalidad u orden', () => {
    const respuesta = (extra = {}) => ({ id: 12, remitente: 'asistente', contenido: 'Te recomiendo un kinesiólogo.', especialidad: 'Kinesiología', modalidad: null, criterio: null, valoracion: null, fecha, ...extra });
    const patch = (id, cuerpo) => conSesion(request(app).patch(`/api/asistente/mensajes/${id}`)).send(cuerpo);
    beforeEach(() => {
      modelo.mensajeDelAsistente.mockResolvedValue(respuesta());
      modelo.actualizarMensaje.mockImplementation(async (id, datos) => respuesta(datos));
    });

    test('guarda útil, no útil o quita la valoración', async () => {
      for (const valoracion of [1, -1, null]) {
        const res = await patch(12, { valoracion });
        expect(res.status).toBe(200);
        expect(res.body.mensaje.valoracion).toBe(valoracion);
      }
      expect(modelo.mensajeDelAsistente).toHaveBeenCalledWith(12, 1);
      expect(modelo.actualizarMensaje).toHaveBeenLastCalledWith(12, { valoracion: null });
    });

    test('guarda la modalidad y el orden elegidos en la tarjeta', async () => {
      const res = await patch(12, { modalidad: 'presencial', criterio: 'verificados' });
      expect(res.status).toBe(200);
      expect(modelo.actualizarMensaje).toHaveBeenCalledWith(12, { modalidad: 'presencial', criterio: 'verificados' });
      expect(res.body.mensaje).toMatchObject({ modalidad: 'presencial', criterio: 'verificados' });
    });

    test('valida los valores y exige al menos un cambio', async () => {
      for (const cuerpo of [{ valoracion: 2 }, { valoracion: '1' }, { modalidad: 'domicilio' }, { criterio: 'precio' }, {}]) {
        expect((await patch(12, cuerpo)).status).toBe(400);
      }
      expect((await patch('abc', { valoracion: 1 })).status).toBe(400);
      expect(modelo.actualizarMensaje).not.toHaveBeenCalled();
    });

    test('una respuesta ajena o inexistente da 404; sin recomendación no acepta modalidad (409); online no va por cercanía (400)', async () => {
      modelo.mensajeDelAsistente.mockResolvedValueOnce(null);
      expect((await patch(99, { valoracion: 1 })).status).toBe(404);
      modelo.mensajeDelAsistente.mockResolvedValueOnce(respuesta({ especialidad: null }));
      expect((await patch(12, { modalidad: 'online' })).status).toBe(409);
      modelo.mensajeDelAsistente.mockResolvedValueOnce(respuesta({ modalidad: 'online' }));
      const res = await patch(12, { criterio: 'cercania' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/online no se ordena por cercanía/);
      expect(modelo.actualizarMensaje).not.toHaveBeenCalled();
    });

    test('solo cuentas de usuario', async () => {
      expect((await conSesion(request(app).patch('/api/asistente/mensajes/12'), 'profesional').send({ valoracion: 1 })).status).toBe(403);
    });
  });

  describe('permiso para usar el perfil', () => {
    const PERFIL = {
      perfil: { edad: 30, sexo: 'femenino', pesoKg: '70.00', alturaCm: '165.00', actividadFisica: 'moderada', objetivoPrincipal: 'bajar_peso', comidasDia: 4, horasSueno: '7_8' },
      informacionSalud: { condicionesMedicas: ['respiratoria'], tomaMedicamentos: false, medicamentos: [], alergias: ['alimentarias'] },
    };
    beforeEach(() => {
      guardarConId();
      modelo.ultimosMensajes.mockResolvedValue([]);
      jest.spyOn(comidaServicio, 'objetivoDiario').mockResolvedValue({ calorias: 1800, proteinasG: 100, carbohidratosG: 200, grasasG: 60 });
    });

    test('el estado informa si la persona ya decidió; mientras no responde es null', async () => {
      modelo.permisoPerfil.mockResolvedValueOnce({ permisoPerfilIa: null, permisoPerfilIaFecha: null });
      expect((await conSesion(request(app).get('/api/asistente/estado'))).body.permisoPerfil).toEqual({ valor: null, fecha: null });
      modelo.permisoPerfil.mockResolvedValueOnce({ permisoPerfilIa: 'perfil', permisoPerfilIaFecha: fecha });
      expect((await conSesion(request(app).get('/api/asistente/estado'))).body.permisoPerfil).toEqual({ valor: 'perfil', fecha: fecha.toISOString() });
    });

    test('guarda la decisión (sí, sí con salud o no) y rechaza otro valor', async () => {
      modelo.guardarPermisoPerfil.mockImplementation(async (u, permiso, cuando) => ({ permisoPerfilIa: permiso, permisoPerfilIaFecha: cuando }));
      for (const permiso of ['perfil_salud', 'perfil', 'no']) {
        const res = await conSesion(request(app).put('/api/asistente/permiso-perfil')).send({ permiso });
        expect(res.status).toBe(200);
        expect(res.body.permisoPerfil.valor).toBe(permiso);
      }
      expect(modelo.guardarPermisoPerfil).toHaveBeenCalledWith(1, 'no', expect.any(Date));
      expect((await conSesion(request(app).put('/api/asistente/permiso-perfil')).send({ permiso: 'todo' })).status).toBe(400);
      expect((await conSesion(request(app).put('/api/asistente/permiso-perfil'), 'profesional').send({ permiso: 'perfil' })).status).toBe(403);
    });

    test('sin permiso, al proveedor no llega nada del perfil', async () => {
      for (const permiso of [null, 'no']) {
        modelo.permisoPerfil.mockResolvedValueOnce({ permisoPerfilIa: permiso });
        const responder = jest.spyOn(proveedor, 'responder');
        await enviarEn5('¿Qué como antes de entrenar?');
        expect(responder.mock.calls.at(-1)[2]).toEqual({});
      }
      expect(modelo.datosDelPerfil).not.toHaveBeenCalled();
    });

    test('con permiso, el proveedor recibe el resumen del perfil sin datos que identifiquen; la salud solo con su permiso', async () => {
      modelo.permisoPerfil.mockResolvedValueOnce({ permisoPerfilIa: 'perfil' });
      modelo.datosDelPerfil.mockResolvedValueOnce({ perfil: PERFIL.perfil });
      const responder = jest.spyOn(proveedor, 'responder');
      const res = await enviarEn5('¿Qué como antes de entrenar?');
      expect(modelo.datosDelPerfil).toHaveBeenCalledWith(1, false);
      const { perfil } = responder.mock.calls[0][2];
      expect(perfil).toContain('- Edad: 30 años');
      expect(perfil).toContain('- IMC: 25,7');
      expect(perfil).toContain('- Objetivo principal: Bajar de peso');
      expect(perfil).toContain('- Plan de alimentación de hoy: 1.800 kcal');
      expect(perfil).not.toMatch(/Alergias|Condiciones/);
      // En modo de prueba la respuesta avisa que usó el perfil.
      expect(res.body.mensajes[1].contenido).toContain('tomé en cuenta los datos de tu perfil');

      modelo.permisoPerfil.mockResolvedValueOnce({ permisoPerfilIa: 'perfil_salud' });
      modelo.datosDelPerfil.mockResolvedValueOnce(PERFIL);
      await enviarEn5('¿Puedo comer maní?');
      expect(modelo.datosDelPerfil).toHaveBeenLastCalledWith(1, true);
      const conSalud = responder.mock.calls[1][2].perfil;
      expect(conSalud).toContain('- Condiciones médicas: Asma u otra enfermedad respiratoria');
      expect(conSalud).toContain('- Medicamentos: no toma');
      expect(conSalud).toContain('- Alergias: Alimentarias');
    });
  });

  describe('respuesta en vivo', () => {
    beforeEach(() => {
      guardarConId();
      modelo.ultimosMensajes.mockResolvedValue([]);
    });
    const eventos = (texto) => texto.trim().split('\n\n').map((bloque) => {
      const [linea1, linea2] = bloque.split('\n');
      return { nombre: linea1.replace('event: ', ''), datos: JSON.parse(linea2.replace('data: ', '')) };
    });
    const enVivo = (peticion) => conSesion(peticion).set('Accept', 'text/event-stream');

    test('entrega el texto por partes y termina con lo mismo que la respuesta normal', async () => {
      const res = await enVivo(request(app).post('/api/asistente/conversaciones')).send({ mensaje: '¿Cómo empiezo a trotar?' });
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/^text\/event-stream/);
      expect(res.headers['x-accel-buffering']).toBe('no');
      const lista = eventos(res.text);
      expect(lista.filter((e) => e.nombre === 'texto').length).toBeGreaterThan(2);
      const fin = lista.at(-1);
      expect(fin.nombre).toBe('fin');
      expect(fin.datos).toMatchObject({ conversacion: { titulo: '¿Cómo empiezo a trotar?' }, restantesHoy: 30 });
      expect(fin.datos.mensajes[1].contenido).toBe(lista.filter((e) => e.nombre === 'texto').at(-1).datos.texto);
    });

    test('en una conversación también responde en vivo', async () => {
      const res = await enVivo(request(app).post('/api/asistente/conversaciones/5/mensajes')).send({ mensaje: 'Me duele la rodilla cerca de mi casa' });
      const fin = eventos(res.text).at(-1);
      expect(fin.datos.mensajes[1]).toMatchObject({ especialidad: 'Kinesiología', modalidad: 'presencial', criterio: 'cercania' });
    });

    test('el límite diario y una conversación ajena se informan con la respuesta JSON de siempre', async () => {
      modelo.reservarUso.mockResolvedValueOnce(false);
      const sinCupo = await enVivo(request(app).post('/api/asistente/conversaciones')).send({ mensaje: 'Hola' });
      expect(sinCupo.status).toBe(429);
      expect(sinCupo.body.error).toMatch(/límite de 30 mensajes/);
      modelo.obtenerConversacion.mockResolvedValueOnce(null);
      expect((await enVivo(request(app).post('/api/asistente/conversaciones/77/mensajes')).send({ mensaje: 'Hola' })).status).toBe(404);
    });

    test('si el proveedor se corta a mitad, llega un evento de error, no se guarda nada y se devuelve el cupo', async () => {
      jest.spyOn(proveedor, 'responderEnVivo').mockImplementation(async (mensajes, activas, alTexto) => {
        alTexto('Para empezar');
        throw new ErrorHttp(503, 'El asistente no está disponible en este momento. Intenta nuevamente en unos minutos.');
      });
      const res = await enVivo(request(app).post('/api/asistente/conversaciones/5/mensajes')).send({ mensaje: 'Hola' });
      expect(res.status).toBe(200);
      const lista = eventos(res.text);
      expect(lista.map((e) => e.nombre)).toEqual(['texto', 'error']);
      expect(lista[1].datos).toEqual({ estado: 503, error: expect.stringMatching(/no está disponible/) });
      expect(modelo.agregarMensajes).not.toHaveBeenCalled();
      expect(modelo.liberarUso).toHaveBeenCalledTimes(1);
    });

    test('sin pedirlo, la respuesta sigue siendo JSON con 201', async () => {
      const res = await conSesion(request(app).post('/api/asistente/conversaciones')).send({ mensaje: 'Hola' });
      expect(res.status).toBe(201);
      expect(res.headers['content-type']).toMatch(/json/);
    });
  });
});
