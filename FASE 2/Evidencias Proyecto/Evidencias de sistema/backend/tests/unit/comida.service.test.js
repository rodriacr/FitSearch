// Gestor de alimentación (FS-HU-09 y FS-HU-10): cálculo por gramos, objetivo diario, resumen del día y de la semana, y
// alimentos agregados desde el asistente. El acceso a datos se simula.
jest.mock('../../src/models/comida.model');
jest.mock('../../src/models/usuario.model');
const modelo = require('../../src/models/comida.model');
const usuarioModel = require('../../src/models/usuario.model');
const servicio = require('../../src/services/comida.service');

const POLLO = { id: 1, nombre: 'Pechuga de pollo cocida', sinonimos: 'pollo, pechuga, pollo a la plancha', calorias: '165.0', proteinasG: '31.0', carbohidratosG: '0.0', grasasG: '3.6' };
const TRUTRO = { id: 2, nombre: 'Trutro de pollo cocido, sin piel', sinonimos: 'trutro, muslo de pollo', calorias: '209.0', proteinasG: '25.9', carbohidratosG: '0.0', grasasG: '10.9' };
const ARROZ = { id: 17, nombre: 'Arroz blanco cocido', sinonimos: 'arroz', calorias: '130.0', proteinasG: '2.7', carbohidratosG: '28.2', grasasG: '0.3' };
// 26-10-2026 a las 13:00 en Chile (UTC-3 en horario de verano).
const AHORA = new Date('2026-10-26T16:00:00Z');
const registro = (extra = {}) => ({
  id: 7, fecha: new Date('2026-10-26T00:00:00Z'), momento: 'almuerzo', alimentoId: 1, descripcionAlimento: 'Pechuga de pollo cocida',
  gramos: '100.0', calorias: 165, proteinasG: '31.00', carbohidratosG: '0.00', grasasG: '3.60', origen: 'manual',
  fechaCreacion: new Date('2026-10-26T16:05:00Z'), ...extra,
});
const perfilCompleto = { pesoKg: '68.00', alturaCm: '175.00', edad: 30, sexo: 'masculino', actividadFisica: 'moderada', objetivoPrincipal: 'mantener_peso' };

beforeEach(() => {
  jest.resetAllMocks();
  usuarioModel.buscarPorIdConPerfil.mockResolvedValue({ id: 1, perfil: perfilCompleto });
  modelo.crear.mockImplementation(async ({ fecha, ...datos }) => registro({ id: 50, fecha: new Date(`${fecha}T00:00:00Z`), ...datos, fechaCreacion: AHORA }));
});

test('calcula el aporte de una porción a partir del valor por 100 g', () => {
  expect(servicio.aporte(POLLO, 100)).toEqual({ calorias: 165, proteinasG: 31, carbohidratosG: 0, grasasG: 3.6 });
  expect(servicio.aporte(ARROZ, 150)).toEqual({ calorias: 195, proteinasG: 4.1, carbohidratosG: 42.3, grasasG: 0.5 });
});

test('elige el momento del día según la hora en Chile', () => {
  const momento = (iso) => servicio.momentoSegunHora(new Date(iso));
  expect(momento('2026-10-26T11:00:00Z')).toBe('desayuno');
  expect(momento('2026-10-26T14:00:00Z')).toBe('media_manana');
  expect(momento('2026-10-26T16:00:00Z')).toBe('almuerzo');
  expect(momento('2026-10-26T20:00:00Z')).toBe('merienda');
  expect(momento('2026-10-26T23:30:00Z')).toBe('cena');
  expect(momento('2026-10-26T05:00:00Z')).toBe('cena');
});

test('el objetivo diario sale del requerimiento calórico y reparte 30 % proteínas, 45 % carbohidratos y 25 % grasas', async () => {
  // Mifflin-St Jeor: 10·68 + 6,25·175 − 5·30 + 5 = 1.628,75 kcal × 1,55 (moderada) = 2.525 kcal.
  expect(await servicio.objetivoDiario(1)).toEqual({
    calorias: 2525, proteinasG: 189, carbohidratosG: 284, grasasG: 70,
    perfil: { objetivoPrincipal: 'Mantener peso', pesoKg: 68, alturaCm: 175, actividadFisica: 'Moderada' },
  });
  usuarioModel.buscarPorIdConPerfil.mockResolvedValue({ id: 1, perfil: { ...perfilCompleto, edad: null } });
  expect(await servicio.objetivoDiario(1)).toMatchObject({ calorias: null, proteinasG: null, carbohidratosG: null, grasasG: null });
});

test('el resumen del día agrupa por momento, suma el consumo y no acepta días futuros', async () => {
  modelo.delDia.mockResolvedValue([
    registro({ id: 1, momento: 'desayuno', descripcionAlimento: 'Avena', calorias: 389, proteinasG: '16.90', carbohidratosG: '66.30', grasasG: '6.90', fechaCreacion: new Date('2026-10-26T11:12:00Z') }),
    registro({ id: 2 }),
    registro({ id: 3, alimentoId: 17, descripcionAlimento: 'Arroz blanco cocido', gramos: '150.0', calorias: 195, proteinasG: '4.10', carbohidratosG: '42.30', grasasG: '0.50', origen: 'asistente' }),
  ]);
  const dia = await servicio.delDia(1, '2026-10-26', AHORA);
  expect(modelo.delDia).toHaveBeenCalledWith(1, '2026-10-26');
  expect(dia.consumo).toEqual({ calorias: 749, proteinasG: 52, carbohidratosG: 108.6, grasasG: 11 });
  expect(dia.objetivo.calorias).toBe(2525);
  expect(dia.momentos.map(({ momento, registros }) => [momento, registros.length])).toEqual([
    ['desayuno', 1], ['media_manana', 0], ['almuerzo', 2], ['merienda', 0], ['cena', 0],
  ]);
  expect(dia.momentos[0]).toMatchObject({ etiqueta: 'Desayuno', hora: '08:12', totales: { calorias: 389 } });
  expect(dia.momentos[2].registros[1]).toMatchObject({ nombre: 'Arroz blanco cocido', gramos: 150, origen: 'asistente', hora: '13:05' });
  await expect(servicio.delDia(1, '2026-10-27', AHORA)).rejects.toMatchObject({ estado: 400 });
});

test('el progreso semanal va de lunes a domingo, completa los días sin registros y marca los futuros', async () => {
  modelo.caloriasPorDia.mockResolvedValue([
    { fecha: new Date('2026-10-26T00:00:00Z'), _sum: { calorias: 1420 } },
    { fecha: new Date('2026-10-27T00:00:00Z'), _sum: { calorias: null } },
  ]);
  const semana = await servicio.semana(1, '2026-10-26', AHORA);
  expect(modelo.caloriasPorDia).toHaveBeenCalledWith(1, '2026-10-26', '2026-11-01');
  expect(semana).toMatchObject({ desde: '2026-10-26', hasta: '2026-11-01', objetivoCalorias: 2525 });
  expect(semana.dias).toHaveLength(7);
  expect(semana.dias[0]).toEqual({ fecha: '2026-10-26', calorias: 1420, futuro: false });
  expect(semana.dias[1]).toEqual({ fecha: '2026-10-27', calorias: 0, futuro: true });
  // Un domingo pertenece a la semana que empezó el lunes anterior.
  await servicio.semana(1, '2026-10-25', AHORA);
  expect(modelo.caloriasPorDia).toHaveBeenLastCalledWith(1, '2026-10-19', '2026-10-25');
});

test('agregar calcula y guarda el aporte con el nombre del catálogo; un alimento inexistente responde 404', async () => {
  modelo.obtenerAlimento.mockResolvedValueOnce(ARROZ).mockResolvedValueOnce(null);
  const { registro: guardado } = await servicio.agregar(1, { fecha: '2026-10-26', momento: 'almuerzo', alimentoId: 17, gramos: 150 }, AHORA);
  expect(modelo.crear).toHaveBeenCalledWith({
    usuarioId: 1, fecha: '2026-10-26', momento: 'almuerzo', alimentoId: 17, descripcionAlimento: 'Arroz blanco cocido', gramos: 150, origen: 'manual',
    calorias: 195, proteinasG: 4.1, carbohidratosG: 42.3, grasasG: 0.5,
  });
  expect(guardado).toMatchObject({ id: 50, nombre: 'Arroz blanco cocido', gramos: 150, calorias: 195 });
  await expect(servicio.agregar(1, { fecha: '2026-10-26', momento: 'almuerzo', alimentoId: 99, gramos: 10 }, AHORA)).rejects.toMatchObject({ estado: 404 });
});

test('cambiar los gramos recalcula con el catálogo, o escala lo guardado si el alimento ya no existe', async () => {
  modelo.obtener.mockResolvedValue(registro());
  modelo.obtenerAlimento.mockResolvedValueOnce(POLLO);
  modelo.actualizar.mockImplementation(async (id, datos) => registro({ ...datos, gramos: String(datos.gramos ?? 100) }));
  await servicio.actualizar(1, 7, { gramos: 200 });
  expect(modelo.actualizar).toHaveBeenLastCalledWith(7, { gramos: 200, calorias: 330, proteinasG: 62, carbohidratosG: 0, grasasG: 7.2 });

  modelo.obtener.mockResolvedValue(registro({ alimentoId: null }));
  await servicio.actualizar(1, 7, { gramos: 50, momento: 'cena' });
  expect(modelo.actualizar).toHaveBeenLastCalledWith(7, { momento: 'cena', gramos: 50, calorias: 83, proteinasG: 15.5, carbohidratosG: 0, grasasG: 1.8 });

  modelo.obtener.mockResolvedValue(null);
  await expect(servicio.actualizar(1, 99, { gramos: 10 })).rejects.toMatchObject({ estado: 404 });
});

test('busca alimentos por palabras sin las palabras vacías', async () => {
  modelo.buscarAlimentos.mockResolvedValue([POLLO]);
  expect(await servicio.buscarAlimentos('pechuga de pollo')).toEqual({
    alimentos: [{ id: 1, nombre: 'Pechuga de pollo cocida', calorias: 165, proteinasG: 31, carbohidratosG: 0, grasasG: 3.6 }],
  });
  expect(modelo.buscarAlimentos).toHaveBeenCalledWith(['pechuga', 'pollo'], 12);
  expect(await servicio.buscarAlimentos('de la')).toEqual({ alimentos: [] });
});

test('un texto libre se resuelve primero por nombre o sinónimo exacto y si no, por el nombre más corto', async () => {
  modelo.buscarAlimentos.mockResolvedValue([TRUTRO, POLLO]);
  expect((await servicio.resolverAlimento('Pollo')).id).toBe(1);
  expect((await servicio.resolverAlimento('muslo de pollo')).id).toBe(2);
  modelo.buscarAlimentos.mockResolvedValue([TRUTRO, POLLO]);
  expect((await servicio.resolverAlimento('pollo cocido')).id).toBe(1);
  modelo.buscarAlimentos.mockResolvedValue([]);
  expect(await servicio.resolverAlimento('unicornio')).toBeNull();
});

describe('alimentos pedidos en el chat (FS-HU-09)', () => {
  test('se agregan hoy en Chile, en el momento indicado o según la hora, con origen asistente', async () => {
    modelo.buscarAlimentos.mockImplementation(async ([palabra]) => (palabra === 'pollo' ? [POLLO] : palabra === 'arroz' ? [ARROZ] : []));
    const resultado = await servicio.agregarDesdeAsistente(1, { alimentos: [{ nombre: 'pollo', gramos: 100 }, { nombre: 'arroz', gramos: 150 }] }, AHORA);
    expect(resultado).toEqual({
      momento: 'almuerzo',
      noEncontrados: [],
      agregados: [
        { id: 50, nombre: 'Pechuga de pollo cocida', gramos: 100, calorias: 165, momento: 'almuerzo' },
        { id: 50, nombre: 'Arroz blanco cocido', gramos: 150, calorias: 195, momento: 'almuerzo' },
      ],
    });
    expect(modelo.crear).toHaveBeenCalledWith(expect.objectContaining({ usuarioId: 1, fecha: '2026-10-26', momento: 'almuerzo', origen: 'asistente', alimentoId: 1 }));
    expect(servicio.textoAgregados(resultado)).toBe('Listo, agregué a tu almuerzo de hoy: 100 g de pechuga de pollo cocida (165 kcal) y '
      + '150 g de arroz blanco cocido (195 kcal). En total suman 360 kcal.\nPuedes revisarlo o cambiar los gramos en Comidas.');

    const cena = await servicio.agregarDesdeAsistente(1, { alimentos: [{ nombre: 'pollo', gramos: 120.04 }], momento: 'cena' }, AHORA);
    expect(cena.agregados[0]).toMatchObject({ momento: 'cena', gramos: 120 });
  });

  test('lo que no está en el catálogo o tiene gramos inválidos no se agrega y se informa', async () => {
    modelo.buscarAlimentos.mockImplementation(async ([palabra]) => (palabra === 'pollo' ? [POLLO] : []));
    const resultado = await servicio.agregarDesdeAsistente(1, {
      alimentos: [{ nombre: 'unicornio', gramos: 100 }, { nombre: 'pollo', gramos: 0 }, { nombre: 'pollo', gramos: 'mucho' }, { gramos: 10 }, null],
    }, AHORA);
    expect(resultado.agregados).toEqual([]);
    expect(resultado.noEncontrados).toEqual(['unicornio', 'pollo', 'pollo']);
    expect(modelo.crear).not.toHaveBeenCalled();
    expect(servicio.textoAgregados(resultado)).toMatch(/^No encontré «unicornio», «pollo» y «pollo» en la tabla de alimentos de FitSearch/);
    expect(servicio.textoAgregados({ agregados: [], noEncontrados: [], momento: 'cena' })).toMatch(/^No entendí qué alimento/);
  });

  test('no agrega más alimentos de los permitidos por mensaje', async () => {
    modelo.buscarAlimentos.mockResolvedValue([POLLO]);
    const alimentos = Array.from({ length: 12 }, () => ({ nombre: 'pollo', gramos: 10 }));
    const { agregados } = await servicio.agregarDesdeAsistente(1, { alimentos }, AHORA);
    expect(agregados).toHaveLength(8);
  });
});
