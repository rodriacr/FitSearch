// Dashboard y reportes del administrador (11-11-2026): agrupación por día de Chile, comparaciones con el período anterior,
// cola de verificación, embudo, rankings, días para verificar y calidad. Datos simulados.
jest.mock('../../src/models/estadisticasAdmin.model');
const modelo = require('../../src/models/estadisticasAdmin.model');
const servicio = require('../../src/services/estadisticasAdmin.service');

// Miércoles 11-11-2026 a las 10:00 en Chile (UTC−3).
const AHORA = new Date('2026-11-11T13:00:00Z');
const enChile = (fecha, hora = '12:00') => new Date(`${fecha}T${hora}:00-03:00`);
const cuenta = (fecha, rol = 'usuario', hora) => ({ fechaRegistro: enChile(fecha, hora), rol: { nombre: rol } });
const reserva = (fecha, estado = 'confirmada', profesionalId = 1, especialidad = 'Nutrición') => ({
  fechaCreacion: enChile(fecha), estado, usuarioId: 9, disponibilidad: { profesionalId, profesional: { especialidad } },
});
const ficha = (id, cambios = {}) => ({
  id, especialidad: 'Nutrición', comuna: 'San Antonio', verificado: false, estadoVerificacion: 'sin_solicitud', historialVerificacion: [],
  usuario: { nombre: `Profesional ${id}`, activo: true }, _count: { documentos: 0 }, ...cambios,
});

beforeEach(() => {
  jest.resetAllMocks();
  modelo.cuentas.mockResolvedValue([]);
  modelo.reservas.mockResolvedValue([]);
  modelo.resenas.mockResolvedValue([]);
  modelo.preguntasAsistente.mockResolvedValue([]);
  modelo.profesionales.mockResolvedValue([]);
  modelo.ultimasCuentas.mockResolvedValue([]);
  modelo.plataforma.mockResolvedValue({ usuariosActivos: 40, usuariosInactivos: 2, profesionalesActivos: 6, establecimientos: { gimnasio: 3 } });
  modelo.personasPorFuncion.mockResolvedValue({ asistente: 12, comidas: 8, agua: 5, reservas: 6, favoritos: 4, planes: 2 });
});

test('la medianoche de Chile cambia con el horario de verano', () => {
  expect(servicio.inicioDelDia('2026-11-11').toISOString()).toBe('2026-11-11T03:00:00.000Z');
  expect(servicio.inicioDelDia('2026-07-01').toISOString()).toBe('2026-07-01T04:00:00.000Z');
});

test('el dashboard compara los últimos 7 días con los 7 anteriores y agrupa por día de Chile', async () => {
  modelo.cuentas.mockResolvedValue([
    cuenta('2026-11-11'), cuenta('2026-11-05', 'profesional'), cuenta('2026-11-04'),
    // 23:30 del 10 en Chile ya es el 11 en UTC: cuenta para el día 10.
    cuenta('2026-11-10', 'usuario', '23:30'),
  ]);
  modelo.reservas.mockResolvedValue([reserva('2026-11-11'), reserva('2026-11-02', 'cancelada')]);
  modelo.ultimasCuentas.mockResolvedValue([{ id: 3, nombre: 'Ana', rol: { nombre: 'usuario' }, activo: true, fechaRegistro: new Date('2026-11-11T12:00:00Z') }]);
  modelo.profesionales.mockResolvedValue([ficha(1, { verificado: true, estadoVerificacion: 'verificado' }), ficha(2)]);
  const d = await servicio.dashboard(AHORA);
  expect(modelo.cuentas).toHaveBeenCalledWith(new Date('2026-10-29T03:00:00Z'), new Date('2026-11-12T03:00:00Z'));
  expect(d.hoy).toBe('2026-11-11');
  expect(d.cifras.cuentas).toEqual({ actual: 3, anterior: 1 });
  expect(d.cifras.reservas).toEqual({ actual: 1, anterior: 1 });
  expect(d.actividad).toHaveLength(14);
  expect(d.actividad.at(-1)).toEqual({ fecha: '2026-11-11', cuentas: 1, reservas: 1, resenas: 0 });
  expect(d.actividad.find((dia) => dia.fecha === '2026-11-10').cuentas).toBe(1);
  expect(d.ultimasCuentas).toEqual([{ id: 3, nombre: 'Ana', rol: 'usuario', activo: true, fechaRegistro: '2026-11-11T12:00:00.000Z' }]);
  expect(d.plataforma).toMatchObject({ profesionales: 2, verificados: 1, establecimientos: { gimnasio: 3 } });
});

test('la cola de verificación pone primero la solicitud más antigua y cuenta los días de espera', async () => {
  modelo.profesionales.mockResolvedValue([
    ficha(1, { estadoVerificacion: 'pendiente', historialVerificacion: [{ accion: 'solicitud', fecha: '2026-11-09T13:00:00Z' }], _count: { documentos: 2 } }),
    ficha(2, { estadoVerificacion: 'pendiente', historialVerificacion: [{ accion: 'solicitud', fecha: '2026-10-01T10:00:00Z' }, { accion: 'rechazar', fecha: '2026-10-02T10:00:00Z' }, { accion: 'solicitud', fecha: '2026-11-01T13:00:00Z' }] }),
    ficha(3, { verificado: true, estadoVerificacion: 'verificado' }),
  ]);
  const { cola } = await servicio.dashboard(AHORA);
  expect(cola.total).toBe(2);
  expect(cola.masAntiguaDias).toBe(10);
  expect(cola.primeras.map(({ id, diasEsperando, documentos }) => [id, diasEsperando, documentos])).toEqual([[2, 10, 0], [1, 2, 2]]);
});

test('los reportes agrupan por semana (o por mes en 365 días) y comparan con el período anterior', async () => {
  modelo.cuentas.mockResolvedValue([cuenta('2026-11-10'), cuenta('2026-11-02', 'profesional'), cuenta('2026-10-01'), cuenta('2026-09-20')]);
  modelo.reservas.mockResolvedValue([
    reserva('2026-11-10'), reserva('2026-11-09', 'pendiente', 2, 'Kinesiología'), reserva('2026-11-03', 'cancelada'), reserva('2026-10-01'),
  ]);
  modelo.profesionales.mockResolvedValue([
    ficha(1, { verificado: true, estadoVerificacion: 'verificado' }), ficha(2, { verificado: true, estadoVerificacion: 'verificado', especialidad: 'Kinesiología', comuna: 'Cartagena' }),
    ficha(3, { estadoVerificacion: 'pendiente' }), ficha(4, { estadoVerificacion: 'rechazado' }), ficha(5),
    ficha(6, { verificado: true, estadoVerificacion: 'verificado', usuario: { nombre: 'Inactivo', activo: false } }),
  ]);
  const r = await servicio.reportes(30, AHORA);
  expect(r.periodo).toEqual({ dias: 30, desde: '2026-10-13', hasta: '2026-11-11', agrupacion: 'semana' });
  expect(r.anterior).toEqual({ desde: '2026-09-13', hasta: '2026-10-12' });
  expect(r.crecimiento.grupos.map((g) => g.clave)).toEqual(['2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09']);
  expect(r.crecimiento.grupos.at(-1)).toMatchObject({ desde: '2026-11-09', hasta: '2026-11-11', actual: true, usuario: 1, profesional: 0 });
  expect(r.crecimiento).toMatchObject({ nuevas: 2, nuevasAnterior: 2, profesionalesNuevos: 1 });
  expect(r.demanda).toMatchObject({ reservas: 3, reservasAnterior: 1, canceladas: 1, tasaCancelacion: 33, profesionalesConReservas: 2, verificados: 2 });
  expect(r.demanda.grupos.at(-1)).toMatchObject({ confirmada: 1, pendiente: 1, cancelada: 0 });
  expect(r.demanda.porEspecialidad).toEqual([{ etiqueta: 'Nutrición', valor: 2 }, { etiqueta: 'Kinesiología', valor: 1 }]);
  // Las cuentas desactivadas no cuentan en la oferta.
  expect(r.oferta.embudo).toEqual({ sinSolicitud: 1, pendiente: 1, verificado: 2, rechazado: 1 });
  expect(r.oferta.porComuna).toEqual([{ etiqueta: 'Cartagena', valor: 1 }, { etiqueta: 'San Antonio', valor: 1 }]);
  expect(r.uso).toEqual({ asistente: 12, comidas: 8, agua: 5, reservas: 6, favoritos: 4, planes: 2, usuariosActivos: 40 });

  const anual = await servicio.reportes(365, AHORA);
  expect(anual.periodo.agrupacion).toBe('mes');
  expect(anual.crecimiento.grupos).toHaveLength(13);
  expect(anual.crecimiento.grupos[0]).toMatchObject({ clave: '2025-11', desde: '2025-11-12', hasta: '2025-11-30' });
});

test('los rankings juntan lo que pasa de ocho en «Otras» y los días para verificar usan la solicitud previa', async () => {
  const especialidades = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  modelo.profesionales.mockResolvedValue([
    ...especialidades.map((especialidad, i) => ficha(i + 1, { verificado: true, estadoVerificacion: 'verificado', especialidad })),
    ficha(20, { verificado: true, estadoVerificacion: 'verificado', historialVerificacion: [
      { accion: 'solicitud', fecha: '2026-11-01T12:00:00Z' }, { accion: 'aprobar', fecha: '2026-11-04T12:00:00Z' },
    ] }),
    ficha(21, { verificado: true, estadoVerificacion: 'verificado', historialVerificacion: [
      { accion: 'solicitud', fecha: '2026-10-20T12:00:00Z' }, { accion: 'aprobar', fecha: '2026-10-21T00:00:00Z' },
    ] }),
  ]);
  const r = await servicio.reportes(30, AHORA);
  expect(r.oferta.porEspecialidad).toHaveLength(8);
  expect(r.oferta.porEspecialidad[0]).toEqual({ etiqueta: 'Nutrición', valor: 2 });
  expect(r.oferta.porEspecialidad.at(-1)).toEqual({ etiqueta: 'Otras', valor: 4 });
  expect(r.oferta.verificacion).toEqual({ aprobadas: 2, promedio: 1.8, mediana: 1.8 });
});

test('la calidad resume las reseñas del período', async () => {
  modelo.resenas.mockResolvedValue([
    { fechaCreacion: enChile('2026-11-10'), puntaje: 5, reservaId: 1 }, { fechaCreacion: enChile('2026-11-01'), puntaje: 4, reservaId: null },
    { fechaCreacion: enChile('2026-10-20'), puntaje: 3, reservaId: 4 },
  ]);
  const { calidad } = await servicio.reportes(30, AHORA);
  expect(calidad).toEqual({ resenas: 3, promedio: 4, distribucion: { 5: 1, 4: 1, 3: 1, 2: 0, 1: 0 }, conCita: 2 });
});
