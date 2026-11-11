// Clientes (FS-HU-27), reportes (FS-HU-28), configuración y experiencia (FS-HU-29) del profesional.
import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import { llamadasA, renderizarApp, simularApi, SESION_PROFESIONAL } from '../../tests/utilidades.jsx';

beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION_PROFESIONAL)));

const cita = (reservaId, fecha, estado) => ({ reservaId, fecha, horaInicio: '09:00', horaFin: '10:00', estado });
const CLIENTES = {
  total: 2,
  clientes: [
    { id: 4, nombre: 'Ana Pérez', totalCitas: 3, citasRealizadas: 2, canceladas: 0, clienteDesde: '2099-08-01', ultimaCita: cita(2, '2099-10-01', 'confirmada'), proximaCita: cita(4, '2099-10-20', 'pendiente') },
    { id: 5, nombre: 'Luis Soto', totalCitas: 1, citasRealizadas: 0, canceladas: 1, clienteDesde: '2099-09-01', ultimaCita: null, proximaCita: null },
  ],
};

describe('Clientes (FS-HU-27)', () => {
  test('escenario 1: lista a cada persona con su próxima o última cita y la cantidad de citas, y se puede buscar', async () => {
    simularApi({ '/api/profesional/clientes': CLIENTES });
    renderizarApp('/profesional/clientes');
    const ana = await screen.findByRole('link', { name: /Ana Pérez/ });
    expect(ana).toHaveTextContent('Próxima: mar 20 oct, 09:00');
    expect(within(ana).getByLabelText('3 citas')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Luis Soto/ })).toHaveTextContent('Sin citas realizadas');
    expect(screen.getByText('2 personas han reservado contigo')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar un cliente por nombre' }), 'perez');
    expect(screen.queryByRole('link', { name: /Luis Soto/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ana Pérez/ })).toBeInTheDocument();
  });

  test('escenario 2: el historial muestra sus citas con estado, datos de la reserva y mensaje, sin datos de salud', async () => {
    simularApi({
      '/api/profesional/clientes/4': {
        cliente: { id: 4, nombre: 'Ana Pérez' },
        citas: [
          { ...cita(4, '2099-10-20', 'pendiente'), mensaje: 'Control de fuerza', modalidad: 'online', primeraVisita: false, canceladaPor: null },
          { ...cita(1, '2099-08-01', 'cancelada'), mensaje: 'Primera evaluación', modalidad: 'presencial', primeraVisita: true, canceladaPor: 'usuario' },
        ],
      },
      '/api/profesional/clientes': CLIENTES,
    });
    renderizarApp('/profesional/clientes/4');
    expect(await screen.findByRole('heading', { level: 2, name: 'Ana Pérez' })).toBeInTheDocument();
    const historial = screen.getByText('Historial de citas').nextElementSibling;
    const [reciente, antigua] = within(historial).getAllByRole('listitem');
    expect(reciente).toHaveTextContent('Por confirmar');
    expect(reciente).toHaveTextContent('Online');
    expect(reciente).toHaveTextContent('Control de fuerza');
    expect(antigua).toHaveTextContent('Cancelada por la persona');
    expect(antigua).toHaveTextContent('Primera visita');
    expect(within(screen.getByRole('region', { name: 'Historial del cliente' })).getByRole('link', { name: /Mensajes/ })).toHaveAttribute('href', '/profesional/mensajes?reserva=4');
    expect(document.body.textContent).not.toMatch(/alergia|medicamento|@/i);
  });

  test('un cliente que no reservó con él muestra que no existe', async () => {
    simularApi({ '/api/profesional/clientes/99': () => [404, { error: 'No encontramos a este cliente' }], '/api/profesional/clientes': CLIENTES });
    renderizarApp('/profesional/clientes/99');
    expect(await screen.findByText('No encontramos a este cliente entre tus reservas.')).toBeInTheDocument();
  });
});

const REPORTE = {
  periodo: { desde: '2099-08-24', hasta: '2099-10-18', semanas: 8, hoy: '2099-10-12' },
  totales: { reservas: 6, confirmadas: 3, pendientes: 1, canceladas: 2, clientes: 4, clientesNuevos: 2, tasaCancelacion: 33, ocupacion: 60, horariosPublicados: 10, fueraDeHorario: 2 },
  anterior: { desde: '2099-06-29', hasta: '2099-08-23', reservas: 4, confirmadas: 2, pendientes: 0, canceladas: 2, clientes: 3, clientesNuevos: 1 },
  porSemana: Array.from({ length: 8 }, (_, i) => ({ desde: `2099-${i < 2 ? '08' : i < 6 ? '09' : '10'}-0${(i % 4) + 1}`, hasta: '2099-10-18', actual: i === 7, pendiente: i === 7 ? 1 : 0, confirmada: i % 2, cancelada: i === 3 ? 2 : 0 })),
  demandaDia: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((dia, i) => ({ dia, reservas: i === 1 ? 3 : 0 })),
  demandaFranja: [{ franja: 'manana', reservas: 2 }, { franja: 'tarde', reservas: 2 }, { franja: 'noche', reservas: 0 }],
  calificacion: { promedio: 4.5, total: 2, verificadas: 1, distribucion: { 5: 1, 4: 1, 3: 0, 2: 0, 1: 0 } },
  semanaActual: { reservas: 1, confirmadas: 0, pendientes: 1, canceladas: 0, clientesNuevos: 1 },
};

describe('Reportes (FS-HU-28)', () => {
  test('escenario 1: cifras con comparación, reservas por semana y estado, calificación y demanda; cambiar el período pide otra vez', async () => {
    const fetch = simularApi({ '/api/profesional/reportes': REPORTE });
    renderizarApp('/profesional/reportes');
    expect(await screen.findByText('+2 vs. período anterior')).toBeInTheDocument();
    expect(screen.getByText('Igual que el período anterior')).toBeInTheDocument();
    expect(screen.getByText('33 %')).toBeInTheDocument();
    expect(screen.getByText('de 10 horarios publicados')).toBeInTheDocument();
    const grafico = screen.getByRole('heading', { name: 'Reservas por semana' }).closest('section');
    expect(within(grafico).getByRole('table', { name: 'Reservas por semana y estado' })).toBeInTheDocument();
    expect(within(grafico).getAllByRole('row')).toHaveLength(9);
    expect(within(grafico.querySelector('figcaption')).getByText('Por confirmar')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Reservas por día de la semana' })).toHaveTextContent('Martes3');
    expect(screen.getByText('1 con cita verificada', { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/2 reservas llegaron fuera del horario de oficina/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '12 semanas' }));
    expect(llamadasA(fetch, '/api/profesional/reportes?semanas=12')).toHaveLength(1);
  });

  test('sin reservas en el período lo dice y lleva a publicar horarios', async () => {
    simularApi({ '/api/profesional/reportes': { ...REPORTE, totales: { ...REPORTE.totales, reservas: 0, fueraDeHorario: 0 } } });
    renderizarApp('/profesional/reportes');
    expect(await screen.findByText(/Aún no tienes reservas en estas semanas/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Publica horarios' })).toHaveAttribute('href', '/profesional/agenda');
  });
});

describe('Configuración y experiencia (FS-HU-29)', () => {
  test('escenario 2: cada interruptor guarda solo su preferencia y vuelve atrás si falla', async () => {
    let falla = false;
    const fetch = simularApi({
      '/api/profesionales/mi-ficha/configuracion': (_u, o) => {
        if (o.method !== 'PUT') return [200, { configuracion: { autoconfirmar: false, avisosCorreo: true, recordatorios: true } }];
        if (falla) return [500, { error: 'No se pudo guardar' }];
        return [200, { configuracion: { autoconfirmar: true, avisosCorreo: true, recordatorios: true } }];
      },
    });
    renderizarApp('/profesional/configuracion');
    const auto = await screen.findByRole('switch', { name: 'Confirmar reservas automáticamente' });
    expect(auto).not.toBeChecked();
    await userEvent.click(auto);
    expect(await screen.findByText('Preferencia guardada.')).toBeInTheDocument();
    expect(auto).toBeChecked();
    expect(JSON.parse(llamadasA(fetch, '/api/profesionales/mi-ficha/configuracion').find(([, o]) => o.method === 'PUT')[1].body)).toEqual({ autoconfirmar: true });
    falla = true;
    const recordatorio = screen.getByRole('switch', { name: 'Recordatorio a tus clientes' });
    await userEvent.click(recordatorio);
    expect(await screen.findByText('No se pudo guardar')).toBeInTheDocument();
    expect(recordatorio).toBeChecked();
  });

  test('sin ficha, la configuración pide completarla', async () => {
    simularApi({ '/api/profesionales/mi-ficha/configuracion': () => [409, { error: 'Completa tu ficha profesional antes de continuar' }] });
    renderizarApp('/profesional/configuracion');
    expect(await screen.findByRole('link', { name: 'Ir a mi perfil' })).toHaveAttribute('href', '/profesional/perfil');
  });

  test('escenario 1: registra años, formación, a quién atiende, registro SIS y precio, y muestra los errores por campo', async () => {
    const vacia = { aniosExperiencia: null, formacion: [], atiendeA: [], registroSis: null, precioDesde: null };
    const guardada = { aniosExperiencia: 8, formacion: [{ titulo: 'Nutricionista', institucion: 'Universidad de Chile', anio: 2016 }], atiendeA: ['adultos'], registroSis: '93952', precioDesde: 30000 };
    let intento = 0;
    const fetch = simularApi({
      '/api/profesionales/mi-ficha/experiencia': (_u, o) => {
        if (o.method !== 'PUT') return [200, { experiencia: vacia }];
        intento += 1;
        return intento === 1
          ? [400, { error: 'Revisa los datos de tu experiencia', detalles: { 'formacion.0.anio': 'Indica un año entre 1960 y 2026' } }]
          : [200, { experiencia: guardada }];
      },
      '/api/profesionales/mi-ficha': { ficha: { id: 3, especialidad: 'Nutrición', modalidad: 'online', ubicacionLat: -33.4, ubicacionLng: -70.6 } },
      '/api/profesionales/3': { profesional: { id: 3, nombre: 'Matías Rojas', especialidad: 'Nutrición', modalidad: 'online', verificado: false, comuna: 'Ñuñoa', calificacion: { promedio: null, total: 0 } }, resumenResenas: { promedio: null, total: 0, distribucion: {} }, miResena: null, puedeResenar: false },
    });
    renderizarApp('/profesional/perfil');
    await userEvent.click(await screen.findByRole('tab', { name: 'Experiencia' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Agregar experiencia' }));
    fireEvent.change(screen.getByLabelText('Años de experiencia'), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText(/Consulta desde/), { target: { value: '30000' } });
    await userEvent.type(screen.getByLabelText(/Superintendencia de Salud/), '93.952');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Adultos' }));
    await userEvent.click(screen.getByRole('button', { name: 'Agregar estudio' }));
    await userEvent.type(screen.getByLabelText('Título o estudio'), 'Nutricionista');
    await userEvent.type(screen.getByLabelText('Institución'), 'Universidad de Chile');
    fireEvent.change(screen.getByLabelText(/^Año(?!s)/), { target: { value: '3000' } });
    await userEvent.click(screen.getByRole('button', { name: 'Guardar experiencia' }));
    expect(await screen.findByText('Indica un año entre 1960 y 2026')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^Año(?!s)/), { target: { value: '2016' } });
    await userEvent.click(screen.getByRole('button', { name: 'Guardar experiencia' }));
    expect(await screen.findByText('Tu experiencia se guardó y ya se ve en tu ficha pública.')).toBeInTheDocument();
    expect(screen.getByText('8 años')).toBeInTheDocument();
    expect(screen.getByText('N.º 93952')).toBeInTheDocument();
    const cuerpo = JSON.parse(llamadasA(fetch, '/api/profesionales/mi-ficha/experiencia').filter(([, o]) => o.method === 'PUT').at(-1)[1].body);
    expect(cuerpo).toEqual({
      aniosExperiencia: 8, precioDesde: 30000, registroSis: '93.952', atiendeA: ['adultos'],
      formacion: [{ titulo: 'Nutricionista', institucion: 'Universidad de Chile', anio: 2016 }],
    });
  });
});
