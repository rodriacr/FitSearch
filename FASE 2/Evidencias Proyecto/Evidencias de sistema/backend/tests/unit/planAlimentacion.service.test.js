// Plan de alimentación (11-11-2026): según la meta o uno de la lista de personalizados, que rige desde el día en que se
// elige; y la meta de peso con su ritmo semanal. Datos simulados.
jest.mock('../../src/models/planAlimentacion.model');
jest.mock('../../src/models/usuario.model');
const modelo = require('../../src/models/planAlimentacion.model');
const usuarioModel = require('../../src/models/usuario.model');
const servicio = require('../../src/services/planAlimentacion.service');

// 11-11-2026 a las 10:00 en Chile.
const AHORA = new Date('2026-11-11T13:00:00Z');
const HOY = '2026-11-11';
// 10·70 + 6,25·165 − 5·30 − 161 = 1.420,25 kcal × 1,375 (ligera) = 1.953 kcal.
const perfil = { pesoKg: '70.00', alturaCm: '165.00', edad: 30, sexo: 'femenino', actividadFisica: 'ligera', objetivoPrincipal: 'bajar_peso' };
const VOLUMEN = { id: 4, nombre: 'Volumen', proteinasPct: 40, carbohidratosPct: 35, grasasPct: 25, fechaCreacion: new Date() };
const DESCANSO = { id: 5, nombre: 'Días de descanso', proteinasPct: 30, carbohidratosPct: 40, grasasPct: 30, fechaCreacion: new Date() };
const conPerfil = (cambios = {}) => usuarioModel.buscarPorIdConPerfil.mockResolvedValue({ id: 7, perfil: { ...perfil, ...cambios } });
const usandoVolumen = () => modelo.vigente.mockResolvedValue({ tipo: 'personalizado', desde: new Date(`${HOY}T00:00:00Z`), planPersonalizadoId: 4, proteinasPct: 40, carbohidratosPct: 35, grasasPct: 25 });

beforeEach(() => {
  jest.resetAllMocks();
  conPerfil();
  modelo.personalizados.mockResolvedValue([VOLUMEN, DESCANSO]);
  modelo.obtenerPersonalizado.mockImplementation(async (id) => [VOLUMEN, DESCANSO].find((plan) => plan.id === id) ?? null);
});

describe('plan vigente', () => {
  test('sin plan elegido rige el de la meta, y la lista trae los personalizados con sus gramos', async () => {
    const r = await servicio.obtener(7, AHORA);
    expect(modelo.vigente).toHaveBeenCalledWith(7, HOY);
    expect(r.meta).toMatchObject({ valor: 'bajar_peso', etiqueta: 'Bajar de peso', ajusteCalorias: -0.15, ajusteKcal: -293, ritmoSemanalKg: null });
    expect(r.perfil).toEqual({ kcalBase: 1953, pesoKg: 70, completo: true });
    expect(r.plan).toMatchObject({ tipo: 'meta', desde: null, personalizadoId: null, nombre: null, kcal: 1660 });
    expect(r.plan.porcentajes).toEqual(r.recomendado.porcentajes);
    expect(r.personalizados).toEqual([
      { id: 4, nombre: 'Volumen', porcentajes: { proteinas: 40, carbohidratos: 35, grasas: 25 }, proteinasG: 166, carbohidratosG: 145, grasasG: 46, enUso: false },
      { id: 5, nombre: 'Días de descanso', porcentajes: { proteinas: 30, carbohidratos: 40, grasas: 30 }, proteinasG: 125, carbohidratosG: 166, grasasG: 55, enUso: false },
    ]);
    expect(r.maxPersonalizados).toBe(10);
  });

  test('con un personalizado en uso, el plan lleva su nombre, sus porcentajes y la proteína por kilo', async () => {
    usandoVolumen();
    const r = await servicio.obtener(7, AHORA);
    expect(r.plan).toMatchObject({ tipo: 'personalizado', desde: HOY, personalizadoId: 4, nombre: 'Volumen', porcentajes: { proteinas: 40, carbohidratos: 35, grasas: 25 }, proteinasG: 166, proteinaGKg: 2.4 });
    expect(r.personalizados.map(({ enUso }) => enUso)).toEqual([true, false]);
  });

  test('con el perfil incompleto muestra el reparto de su meta sin calorías ni gramos', async () => {
    conPerfil({ edad: null });
    const r = await servicio.obtener(7, AHORA);
    expect(r.perfil.completo).toBe(false);
    expect(r.plan).toMatchObject({ kcal: null, proteinasG: null, proteinaGKg: null, porcentajes: { proteinas: 26, carbohidratos: 44, grasas: 30 } });
  });
});

describe('elegir el plan', () => {
  test('usar un personalizado de la lista copia sus porcentajes desde hoy', async () => {
    await servicio.guardar(7, { tipo: 'personalizado', personalizadoId: 5 }, AHORA);
    expect(modelo.obtenerPersonalizado).toHaveBeenCalledWith(5, 7);
    expect(modelo.guardar).toHaveBeenCalledWith(7, HOY, { tipo: 'personalizado', planPersonalizadoId: 5, proteinasPct: 30, carbohidratosPct: 40, grasasPct: 30 });
  });

  test('volver al plan de la meta guarda el día sin porcentajes', async () => {
    await servicio.guardar(7, { tipo: 'meta' }, AHORA);
    expect(modelo.guardar).toHaveBeenCalledWith(7, HOY, { tipo: 'meta', planPersonalizadoId: null, proteinasPct: null, carbohidratosPct: null, grasasPct: null });
  });

  test('un plan ajeno o inexistente responde 404, y sin plan elegido o con un tipo desconocido, 400', async () => {
    await expect(servicio.guardar(7, { tipo: 'personalizado', personalizadoId: 99 }, AHORA)).rejects.toMatchObject({ estado: 404 });
    await expect(servicio.guardar(7, { tipo: 'personalizado' }, AHORA)).rejects.toMatchObject({ estado: 400 });
    await expect(servicio.guardar(7, { tipo: 'estandar' }, AHORA)).rejects.toMatchObject({ estado: 400 });
    expect(modelo.guardar).not.toHaveBeenCalled();
  });
});

describe('lista de personalizados', () => {
  test('crea uno con el nombre ordenado y, si se pide, lo usa desde hoy', async () => {
    modelo.contarPersonalizados.mockResolvedValue(2);
    modelo.crearPersonalizado.mockResolvedValue({ id: 6, nombre: 'Competencia', proteinasPct: 25, carbohidratosPct: 55, grasasPct: 20 });
    await servicio.crearPersonalizado(7, { nombre: '  Competencia  ', proteinas: 25, carbohidratos: 55, grasas: 20, usar: true }, AHORA);
    expect(modelo.crearPersonalizado).toHaveBeenCalledWith(7, { nombre: 'Competencia', proteinasPct: 25, carbohidratosPct: 55, grasasPct: 20 });
    expect(modelo.guardar).toHaveBeenCalledWith(7, HOY, { tipo: 'personalizado', planPersonalizadoId: 6, proteinasPct: 25, carbohidratosPct: 55, grasasPct: 20 });
  });

  test('crear sin «usar» solo lo agrega a la lista', async () => {
    modelo.contarPersonalizados.mockResolvedValue(0);
    modelo.crearPersonalizado.mockResolvedValue({ id: 6, nombre: 'Competencia', proteinasPct: 25, carbohidratosPct: 55, grasasPct: 20 });
    await servicio.crearPersonalizado(7, { nombre: 'Competencia', proteinas: 25, carbohidratos: 55, grasas: 20 }, AHORA);
    expect(modelo.guardar).not.toHaveBeenCalled();
  });

  test.each([
    ['no suman 100', { nombre: 'A', proteinas: 40, carbohidratos: 40, grasas: 25 }, 'total'],
    ['uno bajo el mínimo', { nombre: 'A', proteinas: 4, carbohidratos: 66, grasas: 30 }, 'proteinas'],
    ['uno sobre el máximo', { nombre: 'A', proteinas: 10, carbohidratos: 81, grasas: 9 }, 'carbohidratos'],
    ['falta uno', { nombre: 'A', proteinas: 50, carbohidratos: 50 }, 'grasas'],
    ['no tiene nombre', { nombre: '   ', proteinas: 30, carbohidratos: 40, grasas: 30 }, 'nombre'],
    ['el nombre es muy largo', { nombre: 'x'.repeat(41), proteinas: 30, carbohidratos: 40, grasas: 30 }, 'nombre'],
  ])('rechaza un personalizado si %s', async (_caso, valores, campo) => {
    await expect(servicio.crearPersonalizado(7, valores, AHORA)).rejects.toMatchObject({ estado: 400, detalles: expect.objectContaining({ [campo]: expect.any(String) }) });
    expect(modelo.crearPersonalizado).not.toHaveBeenCalled();
  });

  test('un nombre repetido responde 409 y no se pasa del máximo de 10', async () => {
    modelo.contarPersonalizados.mockResolvedValue(3);
    modelo.crearPersonalizado.mockRejectedValue(Object.assign(new Error('único'), { code: 'P2002' }));
    await expect(servicio.crearPersonalizado(7, { nombre: 'volumen', proteinas: 30, carbohidratos: 40, grasas: 30 }, AHORA))
      .rejects.toMatchObject({ estado: 409, message: 'Ya tienes un plan con ese nombre' });
    modelo.contarPersonalizados.mockResolvedValue(10);
    await expect(servicio.crearPersonalizado(7, { nombre: 'Otro', proteinas: 30, carbohidratos: 40, grasas: 30 }, AHORA)).rejects.toMatchObject({ estado: 409 });
  });

  test('editar el plan en uso cambia el de hoy; editar otro no toca el plan vigente', async () => {
    usandoVolumen();
    modelo.actualizarPersonalizado.mockImplementation(async (id, datos) => ({ id, ...datos }));
    await servicio.actualizarPersonalizado(7, 4, { nombre: 'Volumen', proteinas: 35, carbohidratos: 40, grasas: 25 }, AHORA);
    expect(modelo.actualizarPersonalizado).toHaveBeenCalledWith(4, { nombre: 'Volumen', proteinasPct: 35, carbohidratosPct: 40, grasasPct: 25 });
    expect(modelo.guardar).toHaveBeenCalledWith(7, HOY, { tipo: 'personalizado', planPersonalizadoId: 4, proteinasPct: 35, carbohidratosPct: 40, grasasPct: 25 });
    modelo.guardar.mockClear();
    await servicio.actualizarPersonalizado(7, 5, { nombre: 'Descanso', proteinas: 30, carbohidratos: 40, grasas: 30 }, AHORA);
    expect(modelo.guardar).not.toHaveBeenCalled();
    await expect(servicio.actualizarPersonalizado(7, 99, { nombre: 'X', proteinas: 30, carbohidratos: 40, grasas: 30 }, AHORA)).rejects.toMatchObject({ estado: 404 });
  });

  test('borrar el plan en uso vuelve al plan de la meta desde hoy; borrar otro no toca el plan vigente', async () => {
    usandoVolumen();
    await servicio.eliminarPersonalizado(7, 4, AHORA);
    expect(modelo.guardar).toHaveBeenCalledWith(7, HOY, { tipo: 'meta', planPersonalizadoId: null, proteinasPct: null, carbohidratosPct: null, grasasPct: null });
    expect(modelo.eliminarPersonalizado).toHaveBeenCalledWith(4);
    modelo.guardar.mockClear();
    await servicio.eliminarPersonalizado(7, 5, AHORA);
    expect(modelo.guardar).not.toHaveBeenCalled();
    expect(modelo.eliminarPersonalizado).toHaveBeenLastCalledWith(5);
    await expect(servicio.eliminarPersonalizado(7, 99, AHORA)).rejects.toMatchObject({ estado: 404 });
  });
});

describe('meta de peso', () => {
  const META = { objetivo: 'bajar_peso', pesoInicialKg: '74.00', pesoObjetivoKg: '64.00', ritmoSemanalKg: '0.50', fechaInicio: new Date('2026-10-01T00:00:00Z') };

  test('ajusta las calorías al ritmo elegido y muestra cuánto falta, el avance y la fecha estimada', async () => {
    modelo.metaPeso.mockResolvedValue(META);
    const r = await servicio.obtener(7, AHORA);
    // 0,5 kg por semana × 7.700 kcal / 7 días = 550 kcal menos al día: 1.953 − 550 = 1.403 kcal.
    expect(r.plan.kcal).toBe(1403);
    expect(r.meta).toMatchObject({ ajusteKcal: -550, ritmoSemanalKg: 0.5 });
    // De 74 a 64 kg y hoy pesa 70: lleva 4 de 10 kg (40 %); faltan 6 kg = 12 semanas.
    expect(r.metaPeso).toEqual({
      objetivo: 'bajar_peso', aplica: true, pesoInicialKg: 74, pesoObjetivoKg: 64, pesoActualKg: 70, ritmoSemanalKg: 0.5, ajusteKcal: -550,
      fechaInicio: '2026-10-01', faltanKg: 6, alcanzada: false, semanas: 12, fechaEstimada: '2027-02-03', avancePct: 40,
    });
    expect(r.opcionesMetaPeso).toEqual({ ritmos: [0.25, 0.5, 0.75], ritmoPorDefecto: 0.5, rango: { min: 50.4, max: 69.9, porImc: true } });
  });

  test('si la meta del perfil cambió, la meta de peso queda guardada pero no se aplica', async () => {
    conPerfil({ objetivoPrincipal: 'mantener_peso' });
    modelo.metaPeso.mockResolvedValue(META);
    const r = await servicio.obtener(7, AHORA);
    expect(r.plan.kcal).toBe(1953);
    expect(r.metaPeso.aplica).toBe(false);
    expect(r.opcionesMetaPeso).toBeNull();
  });

  test('al llegar al peso, la meta queda alcanzada', async () => {
    modelo.metaPeso.mockResolvedValue({ ...META, pesoObjetivoKg: '70.00' });
    expect((await servicio.obtener(7, AHORA)).metaPeso).toMatchObject({ faltanKg: 0, alcanzada: true, semanas: null, fechaEstimada: null, avancePct: 100 });
  });

  test('guarda la meta desde el peso actual, y al ajustarla en la misma dirección conserva el punto de partida', async () => {
    await servicio.guardarMetaPeso(7, { pesoObjetivoKg: 62.04, ritmoSemanalKg: 0.25 }, AHORA);
    expect(modelo.guardarMetaPeso).toHaveBeenCalledWith(7, {
      objetivo: 'bajar_peso', pesoObjetivoKg: 62, ritmoSemanalKg: 0.25, pesoInicialKg: 70, fechaInicio: new Date(`${HOY}T00:00:00Z`),
    });
    modelo.metaPeso.mockResolvedValue(META);
    await servicio.guardarMetaPeso(7, { pesoObjetivoKg: 66, ritmoSemanalKg: 0.75 }, AHORA);
    expect(modelo.guardarMetaPeso).toHaveBeenLastCalledWith(7, expect.objectContaining({ pesoInicialKg: 74, fechaInicio: META.fechaInicio, pesoObjetivoKg: 66 }));
  });

  test.each([
    ['un peso igual o mayor al actual para bajar', { pesoObjetivoKg: 70, ritmoSemanalKg: 0.5 }, 'pesoObjetivoKg', 'Para bajar de peso, elige un peso menor a tu peso actual (70 kg)'],
    ['un peso bajo un IMC de 18,5', { pesoObjetivoKg: 50, ritmoSemanalKg: 0.5 }, 'pesoObjetivoKg', 'Con tu altura, bajo 50,4 kg quedarías bajo el rango saludable (IMC 18,5)'],
    ['un ritmo que no está en la lista', { pesoObjetivoKg: 65, ritmoSemanalKg: 1 }, 'ritmoSemanalKg', 'Elige uno de los ritmos disponibles'],
  ])('rechaza %s', async (_caso, datos, campo, mensaje) => {
    await expect(servicio.guardarMetaPeso(7, datos, AHORA)).rejects.toMatchObject({ estado: 400, detalles: { [campo]: mensaje } });
    expect(modelo.guardarMetaPeso).not.toHaveBeenCalled();
  });

  test('para ganar masa el peso debe ser mayor al actual y sin pasar un IMC de 30', async () => {
    conPerfil({ objetivoPrincipal: 'aumentar_masa' });
    await expect(servicio.guardarMetaPeso(7, { pesoObjetivoKg: 69, ritmoSemanalKg: 0.25 }, AHORA)).rejects.toMatchObject({ estado: 400 });
    await expect(servicio.guardarMetaPeso(7, { pesoObjetivoKg: 82, ritmoSemanalKg: 0.25 }, AHORA))
      .rejects.toMatchObject({ detalles: { pesoObjetivoKg: 'Con tu altura, sobre 81,6 kg pasarías un IMC de 30' } });
    await servicio.guardarMetaPeso(7, { pesoObjetivoKg: 74, ritmoSemanalKg: 0.25 }, AHORA);
    expect(modelo.guardarMetaPeso).toHaveBeenCalledWith(7, expect.objectContaining({ objetivo: 'aumentar_masa', pesoInicialKg: 70, pesoObjetivoKg: 74 }));
  });

  test('sin una meta de peso en el perfil o sin peso actual no se puede guardar', async () => {
    conPerfil({ objetivoPrincipal: 'mejorar_rendimiento' });
    await expect(servicio.guardarMetaPeso(7, { pesoObjetivoKg: 65, ritmoSemanalKg: 0.5 }, AHORA)).rejects.toMatchObject({ estado: 400 });
    conPerfil({ pesoKg: null });
    await expect(servicio.guardarMetaPeso(7, { pesoObjetivoKg: 65, ritmoSemanalKg: 0.5 }, AHORA)).rejects.toMatchObject({ estado: 400, message: 'Primero anota tu peso actual en Mi perfil' });
  });

  test('quitar la meta de peso la borra', async () => {
    await servicio.eliminarMetaPeso(7, AHORA);
    expect(modelo.eliminarMetaPeso).toHaveBeenCalledWith(7);
  });
});
