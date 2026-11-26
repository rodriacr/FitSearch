// Logros y medallas (25-11-2026): racha con descanso, retos de temporada, niveles y el resumen con las medallas ganadas.
// El acceso a datos, el perfil y el objetivo diario se simulan.
jest.mock('../../src/models/logro.model');
jest.mock('../../src/services/perfil.service');
jest.mock('../../src/services/comida.service', () => ({ objetivoDiario: jest.fn() }));
const modelo = require('../../src/models/logro.model');
const perfil = require('../../src/services/perfil.service');
const { objetivoDiario } = require('../../src/services/comida.service');
const servicio = require('../../src/services/logro.service');

// 25-11-2026 (miércoles) a las 13:00 en Chile.
const AHORA = new Date('2026-11-25T16:00:00Z');
const fecha = (texto) => new Date(`${texto}T00:00:00Z`);
const dias = (desde, cuantos) => Array.from({ length: cuantos }, (_, i) => new Date(Date.parse(`${desde}T00:00:00Z`) + i * 864e5).toISOString().slice(0, 10));
let guardadas;

beforeEach(() => {
  jest.resetAllMocks();
  guardadas = [];
  modelo.caloriasPorDia.mockResolvedValue([]);
  modelo.aguaPorDia.mockResolvedValue([]);
  modelo.alimentosDistintos.mockResolvedValue(0);
  modelo.momentosPorDia.mockResolvedValue([]);
  modelo.desayunos.mockResolvedValue([]);
  modelo.citasConfirmadas.mockResolvedValue([]);
  modelo.conteos.mockResolvedValue({ resenas: 0, conversaciones: 0, favoritos: 0, planesPropios: 0 });
  // Guardar agrega las medallas nuevas sin duplicar, como skipDuplicates; la fecha es la del momento en que se ganan.
  modelo.guardar.mockImplementation(async (_, medallas) => {
    medallas.forEach((m) => {
      if (!guardadas.some((g) => g.clave === m.clave && g.nivel === m.nivel && g.periodo === m.periodo)) {
        guardadas.unshift({ id: guardadas.length + 1, ...m, fechaObtenida: AHORA, vista: false });
      }
    });
  });
  modelo.ganadas.mockImplementation(async () => guardadas);
  perfil.obtener.mockResolvedValue({ pasos: { tipoCuenta: true, datosPersonales: true, objetivos: true, salud: true } });
  objetivoDiario.mockResolvedValue({ calorias: 2000 });
});

describe('racha con descanso', () => {
  test('cuenta los días seguidos y la mejor racha', () => {
    const r = servicio.rachaConDescanso(new Set(dias('2026-11-20', 6)), '2026-11-25');
    expect(r).toEqual({ actual: 6, mejor: 6, descansoUsado: false });
  });

  test('un día sin registros a la semana no corta la racha y no suma', () => {
    // Lunes 23 sin registros: es el descanso de esa semana.
    const fechas = new Set([...dias('2026-11-18', 5), '2026-11-24', '2026-11-25']);
    expect(servicio.rachaConDescanso(fechas, '2026-11-25')).toEqual({ actual: 7, mejor: 7, descansoUsado: true });
  });

  test('dos días seguidos sin registros cortan la racha', () => {
    const fechas = new Set([...dias('2026-11-16', 5), '2026-11-23', '2026-11-24']);
    expect(servicio.rachaConDescanso(fechas, '2026-11-25')).toMatchObject({ actual: 2, mejor: 5 });
  });

  test('un segundo descanso en la misma semana corta la racha', () => {
    const fechas = new Set(['2026-11-23', '2026-11-25', '2026-11-27']);
    expect(servicio.rachaConDescanso(fechas, '2026-11-28')).toMatchObject({ actual: 1, mejor: 2 });
  });

  test('hoy sin registros no corta la racha; sin registros es 0', () => {
    expect(servicio.rachaConDescanso(new Set(dias('2026-11-22', 3)), '2026-11-25').actual).toBe(3);
    expect(servicio.rachaConDescanso(new Set(), '2026-11-25')).toEqual({ actual: 0, mejor: 0, descansoUsado: false });
  });
});

describe('retos de temporada', () => {
  test('la edición en curso, la próxima y la que cruza el año', () => {
    expect(servicio.ventanaDe({ desde: '11-01', hasta: '11-30' }, '2026-11-25')).toEqual({ inicio: '2026-11-01', termino: '2026-11-30', periodo: '2026', activa: true });
    expect(servicio.ventanaDe({ desde: '12-01', hasta: '12-31' }, '2026-11-25')).toEqual({ inicio: '2026-12-01', termino: '2026-12-31', periodo: '2026', activa: false });
    expect(servicio.ventanaDe({ desde: '12-01', hasta: '02-28' }, '2027-01-10')).toEqual({ inicio: '2026-12-01', termino: '2027-02-28', periodo: '2027', activa: true });
    expect(servicio.ventanaDe({ desde: '11-01', hasta: '11-30' }, '2026-12-05')).toMatchObject({ inicio: '2027-11-01', activa: false });
  });
});

test('el nivel sale de los puntos y muestra cuánto falta para el siguiente', () => {
  expect(servicio.nivelDe(0)).toMatchObject({ numero: 1, nombre: 'Primeros pasos', siguiente: { numero: 2, desde: 100 }, progreso: 0 });
  expect(servicio.nivelDe(850)).toMatchObject({ numero: 5, nombre: 'Constante', siguiente: { nombre: 'Equilibrado', desde: 1000 }, progreso: 0.5 });
  expect(servicio.nivelDe(5000)).toMatchObject({ numero: 8, siguiente: null, progreso: 1 });
});

describe('resumen', () => {
  test('sin datos, no hay medallas y el nivel es el primero', async () => {
    perfil.obtener.mockResolvedValue({ pasos: { tipoCuenta: true, datosPersonales: false, objetivos: false, salud: false } });
    const r = await servicio.resumen(1, AHORA);
    expect(modelo.guardar).not.toHaveBeenCalled();
    expect(r.nivel).toMatchObject({ numero: 1, puntos: 0 });
    expect(r.colecciones).toHaveLength(6);
    expect(r.colecciones.every((c) => c.obtenidas === 0)).toBe(true);
    expect(r.nuevas).toEqual([]);
    expect(r.totales).toEqual({ obtenidas: 0, total: 27 });
  });

  test('gana las medallas de constancia, hidratación y equilibrio, y las avisa como nuevas', async () => {
    const semana = dias('2026-11-19', 7);
    modelo.caloriasPorDia.mockResolvedValue(semana.map((f) => ({ fecha: fecha(f), _sum: { calorias: 2050 } })));
    modelo.aguaPorDia.mockResolvedValue(semana.slice(0, 3).map((f) => ({ fecha: fecha(f), _sum: { ml: 2000 } })));
    const r = await servicio.resumen(1, AHORA);
    const coleccion = (clave) => r.colecciones.find((c) => c.clave === clave);
    expect(coleccion('constancia').niveles.map((n) => n.obtenida)).toEqual([true, true, false, false]);
    expect(coleccion('hidratacion').obtenidas).toBe(1);
    // Hoy no cuenta para Equilibrio: 6 días terminados cerca de la meta.
    expect(coleccion('equilibrio').niveles[0]).toMatchObject({ obtenida: true, valor: 3 });
    expect(coleccion('equilibrio').niveles[1]).toMatchObject({ obtenida: false, valor: 6, meta: 10 });
    expect(r.nuevas.map((m) => m.nombre)).toEqual(expect.arrayContaining(['Constancia · Bronce', 'Constancia · Plata', 'Hidratación · Bronce', 'Equilibrio · Bronce']));
    // Constancia Bronce y Plata, Hidratación Bronce, Equilibrio Bronce y Explorador Bronce (perfil completo).
    expect(r.nivel.puntos).toBe(50 + 100 + 50 + 50 + 50);
    expect(r.cerca[0]).toMatchObject({ clave: 'equilibrio', faltan: 4 });
  });

  test('premia los días cerca de la meta, no los días bajo ella', async () => {
    modelo.caloriasPorDia.mockResolvedValue(dias('2026-11-20', 5).map((f) => ({ fecha: fecha(f), _sum: { calorias: 1200 } })));
    const r = await servicio.resumen(1, AHORA);
    expect(r.colecciones.find((c) => c.clave === 'equilibrio').niveles[0].valor).toBe(0);
  });

  test('cuidado profesional, explorador, secretas y temporada usan sus propios hitos', async () => {
    modelo.citasConfirmadas.mockResolvedValue([{ disponibilidad: { fecha: fecha('2026-11-10') } }, { disponibilidad: { fecha: fecha('2026-12-02') } }]);
    modelo.conteos.mockResolvedValue({ resenas: 1, conversaciones: 2, favoritos: 0, planesPropios: 1 });
    modelo.desayunos.mockResolvedValue(dias('2026-11-01', 5).map((f) => ({ fecha: fecha(f), fechaCreacion: new Date(`${f}T10:30:00Z`) })));
    modelo.momentosPorDia.mockResolvedValue(['desayuno', 'media_manana', 'almuerzo', 'merienda', 'cena'].map((momento) => ({ fecha: fecha('2026-11-10'), momento })));
    modelo.caloriasPorDia.mockResolvedValue(dias('2026-11-01', 15).map((f) => ({ fecha: fecha(f), _sum: { calorias: 900 } })));
    const r = await servicio.resumen(1, AHORA);
    const cuidado = r.colecciones.find((c) => c.clave === 'cuidado');
    expect(cuidado.niveles.map((n) => [n.valor, n.obtenida])).toEqual([[1, true], [1, true], [1, false], [1, false]]);
    expect(r.colecciones.find((c) => c.clave === 'explorador').niveles.map((n) => n.obtenida)).toEqual([true, true, false, true]);
    // 10:30 UTC son las 07:30 en Chile: cinco desayunos tempranos.
    expect(r.secretas.find((s) => s.clave === 'madrugador')).toMatchObject({ obtenida: true, nombre: 'Madrugador' });
    expect(r.secretas.find((s) => s.clave === 'arcoiris')).toMatchObject({ obtenida: true, nombre: 'Plato arcoíris' });
    expect(r.secretas.find((s) => s.clave === 'finde')).toMatchObject({ obtenida: false, nombre: null, pista: 'Sábado y domingo' });
    expect(r.temporada.find((t) => t.clave === 'noviembre-constante')).toMatchObject({ activa: true, valor: 15, obtenida: true, periodo: '2026' });
    expect(r.temporada.find((t) => t.clave === 'fiestas-equilibrio')).toMatchObject({ activa: false, inicio: '2026-12-01', obtenida: false });
  });

  test('una medalla ganada se conserva aunque los datos cambien después', async () => {
    guardadas = [{ id: 1, clave: 'hidratacion', nivel: 'bronce', periodo: '', fechaObtenida: new Date('2026-11-02T12:00:00Z'), vista: true }];
    perfil.obtener.mockResolvedValue({ pasos: { tipoCuenta: true, datosPersonales: false, objetivos: true, salud: true } });
    const r = await servicio.resumen(1, AHORA);
    expect(r.colecciones.find((c) => c.clave === 'hidratacion').niveles[0]).toMatchObject({ obtenida: true, valor: 0, fecha: '2026-11-02T12:00:00.000Z' });
    expect(r.historial).toEqual([expect.objectContaining({ nombre: 'Hidratación · Bronce', puntos: 50 })]);
    expect(r.nuevas).toEqual([]);
  });

  test('sin meta de calorías no hay días de equilibrio y lo informa', async () => {
    objetivoDiario.mockResolvedValue({ calorias: null });
    modelo.caloriasPorDia.mockResolvedValue(dias('2026-11-20', 5).map((f) => ({ fecha: fecha(f), _sum: { calorias: 2000 } })));
    const r = await servicio.resumen(1, AHORA);
    expect(r.sinMeta).toBe(true);
    expect(r.colecciones.find((c) => c.clave === 'equilibrio').niveles[0].valor).toBe(0);
  });
});

test('marcar vistas delega en el modelo', async () => {
  await servicio.marcarVistas(7);
  expect(modelo.marcarVistas).toHaveBeenCalledWith(7);
});
