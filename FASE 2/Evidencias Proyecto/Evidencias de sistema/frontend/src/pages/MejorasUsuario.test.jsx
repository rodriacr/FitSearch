// Mejoras del lado del usuario (09-11-2026): horas en el buscador, hora preelegida en la ficha,
// lista de espera, experiencia en la ficha, reseñas verificadas y sugerencia por objetivo.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  fichaProfesional, FILTROS, listado, llamadasA, parametrosDe, PERFIL_COMPLETO, renderizarApp, respuestaPerfil, SESION, simularApi,
} from '../tests/utilidades.jsx';

vi.mock('../services/mapas.js', () => ({ cargarMapLibre: () => new Promise(() => {}), ESTILO_MAPA: 'https://estilo.prueba/style.json' }));

const camila = fichaProfesional({
  id: 3, nombre: 'Camila Rojas', especialidad: 'Nutrición', modalidad: 'online', establecimiento: null,
  precioDesde: 30000, aniosExperiencia: 8,
  proximaHora: { fecha: '2099-10-13', horaInicio: '09:00' },
  proximasHoras: [
    { id: 21, fecha: '2099-10-13', horaInicio: '09:00', horaFin: '09:45' },
    { id: 22, fecha: '2099-10-13', horaInicio: '09:45', horaFin: '10:30' },
    { id: 23, fecha: '2099-10-14', horaInicio: '11:00', horaFin: '12:00' },
  ],
});
const sinHoras = fichaProfesional({ id: 4, nombre: 'Diego Soto', proximaHora: null, proximasHoras: [] });

beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION)));

describe('buscador', () => {
  test('cada tarjeta muestra precio, experiencia y sus próximas horas; cada hora abre la ficha con esa hora elegida', async () => {
    simularApi({ '/api/profesionales/filtros': FILTROS, '/api/profesionales': listado([camila, sinHoras]), '/api/perfil': respuestaPerfil() });
    renderizarApp('/profesionales');
    const tarjeta = (await screen.findByRole('link', { name: 'Camila Rojas' })).closest('article');
    expect(tarjeta).toHaveTextContent('Consulta desde $30.000');
    expect(tarjeta).toHaveTextContent('8 años de experiencia');
    expect(within(tarjeta).getByText('mar 13 oct, 09:00')).toBeInTheDocument();
    const horas = within(tarjeta).getByRole('list', { name: 'Horas disponibles con Camila Rojas' });
    expect(within(horas).getAllByRole('link')).toHaveLength(3);
    expect(within(horas).getByRole('link', { name: 'Reservar con Camila Rojas el mar 13 oct a las 09:45' })).toHaveAttribute('href', '/profesionales/3?hora=22');
    const otra = screen.getByRole('link', { name: 'Diego Soto' }).closest('article');
    expect(otra).toHaveTextContent('Sin horas disponibles por ahora');
  });

  test('el filtro «Con horas libres» y el orden «Disponibles antes» viajan a la API', async () => {
    const fetch = simularApi({ '/api/profesionales/filtros': FILTROS, '/api/profesionales': listado([camila]), '/api/perfil': respuestaPerfil() });
    renderizarApp('/profesionales');
    await screen.findByRole('link', { name: 'Camila Rojas' });
    await userEvent.selectOptions(screen.getByLabelText('Con horas libres'), 'Próximos 3 días');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Ordenar por' }), 'Disponibles antes');
    await waitFor(() => {
      const ultima = llamadasA(fetch, '/api/profesionales').filter(([url]) => /^\/api\/profesionales(\?|$)/.test(url)).at(-1)[0];
      expect(parametrosDe(ultima)).toMatchObject({ disponible: '3dias', orden: 'disponibilidad' });
    });
    expect(screen.getByRole('button', { name: 'Quitar filtro: Con horas: próximos 3 días' })).toBeInTheDocument();
  });

  test('sugiere especialidades según el objetivo del perfil y al elegir una la filtra', async () => {
    const fetch = simularApi({
      '/api/profesionales/filtros': { especialidades: ['Entrenamiento personal', 'Nutrición'], comunas: [] },
      '/api/profesionales': listado([camila]), '/api/perfil': respuestaPerfil(PERFIL_COMPLETO),
    });
    renderizarApp('/profesionales');
    const sugerencia = (await screen.findByText(/Para tu objetivo/)).closest('p');
    expect(sugerencia).toHaveTextContent('«Bajar de peso»');
    await userEvent.click(within(sugerencia).getByRole('button', { name: 'Nutrición' }));
    await waitFor(() => expect(llamadasA(fetch, '/api/profesionales?especialidad=Nutrici%C3%B3n')).not.toHaveLength(0));
    expect(screen.queryByText(/Para tu objetivo/)).not.toBeInTheDocument();
  });
});

const fichaDe = (sobrescribir = {}, extra = {}) => ({
  '/api/profesionales/3/resenas': { resenas: [], pagina: 1, total: 0, totalPaginas: 0 },
  '/api/profesionales/3': {
    profesional: { ...camila, modalidad: 'online', ...sobrescribir },
    resumenResenas: { promedio: null, total: 0, distribucion: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } }, miResena: null, puedeResenar: true, ...extra,
  },
});

describe('ficha', () => {
  test('llega con la hora elegida en el buscador lista para confirmar, y pide la primera visita (online no pregunta modalidad)', async () => {
    const horarios = camila.proximasHoras;
    const fetch = simularApi({ ...fichaDe(), '/api/profesionales/3/disponibilidades': { horarios },
      '/api/reservas': (_u, o) => (o.method === 'POST' ? [201, { reserva: { id: 9, estado: 'pendiente', horario: horarios[1] } }] : [200, { reservas: [] }]) });
    renderizarApp('/profesionales/3?hora=22');
    const elegida = await screen.findByRole('button', { name: '09:45 a 10:30' });
    expect(elegida).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar 09:45 a 10:30' }));
    await userEvent.type(screen.getByLabelText('Qué necesitas consultar'), 'Quiero ordenar mi alimentación');
    expect(screen.queryByRole('radio', { name: 'Online' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar solicitud de reserva' })).toBeDisabled();
    await userEvent.click(screen.getByRole('radio', { name: 'No, ya me atendió' }));
    await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitud de reserva' }));
    expect(await screen.findByRole('heading', { name: 'Solicitud enviada' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Escribirle/ })).toHaveAttribute('href', '/mensajes?reserva=9');
    const cuerpo = JSON.parse(llamadasA(fetch, '/api/reservas').find(([, o]) => o.method === 'POST')[1].body);
    expect(cuerpo).toEqual({ disponibilidadId: 22, mensaje: 'Quiero ordenar mi alimentación', primeraVisita: false });
  });

  test('sin horas ofrece la lista de espera: anotarse y salir', async () => {
    let enLista = false;
    const fetch = simularApi({ ...fichaDe(), '/api/profesionales/3/lista-espera': (_u, o) => {
      if (o.method === 'POST') enLista = true;
      if (o.method === 'DELETE') enLista = false;
      return [o.method === 'POST' ? 201 : 200, { enLista }];
    } });
    renderizarApp('/profesionales/3');
    expect(await screen.findByText('Camila no tiene horas disponibles por ahora')).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: 'Avísame si se libera una hora' }));
    expect(await screen.findByText(/Estás en la lista de espera/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Salir de la lista' }));
    expect(await screen.findByRole('button', { name: 'Avísame si se libera una hora' })).toBeInTheDocument();
    expect(llamadasA(fetch, '/api/profesionales/3/lista-espera').map(([, o]) => o.method || 'GET')).toEqual(['GET', 'GET', 'POST', 'DELETE']);
  });

  test('muestra la experiencia, el registro de la Superintendencia de Salud y el precio referencial', async () => {
    simularApi(fichaDe({ registroSis: '93952', atiendeA: ['adultos', 'deportistas'], formacion: [{ titulo: 'Nutricionista', institucion: 'Universidad de Chile', anio: 2016 }] }));
    renderizarApp('/profesionales/3');
    const seccion = await screen.findByRole('region', { name: 'Experiencia y formación' });
    expect(seccion).toHaveTextContent('8 años');
    expect(seccion).toHaveTextContent('$30.000');
    expect(seccion).toHaveTextContent('Adultos, Deportistas');
    expect(seccion).toHaveTextContent('Registro N.º 93952');
    expect(within(seccion).getByRole('link', { name: /Comprobar en el registro/ })).toHaveAttribute('href', 'https://rnpi.superdesalud.gob.cl/');
    expect(seccion).toHaveTextContent('Universidad de Chile · 2016');
  });

  test('reseñas verificadas: sello, filtro positivas/negativas y aviso si aún no tuvo su cita', async () => {
    const resena = { id: 5, autor: 'Ana P.', puntaje: 5, comentario: 'Excelente atención', fecha: '2099-10-01T12:00:00.000Z', propia: false, verificada: true };
    const fetch = simularApi({
      ...fichaDe({}, { puedeResenar: false, motivoSinResena: 'sin_cita', resumenResenas: { promedio: 4.5, total: 2, distribucion: { 5: 1, 4: 1, 3: 0, 2: 0, 1: 0 } } }),
      '/api/profesionales/3/resenas': { resenas: [resena], pagina: 1, total: 1, totalPaginas: 1 },
    });
    renderizarApp('/profesionales/3');
    expect(await screen.findByText('Cita verificada')).toBeInTheDocument();
    expect(screen.getByText(/Podrás calificar a Camila Rojas después de tu cita confirmada/)).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    const filtro = screen.getByRole('group', { name: 'Filtrar reseñas' });
    expect(within(filtro).getByRole('button', { name: /Positivas \(2\)/ })).toBeInTheDocument();
    await userEvent.click(within(filtro).getByRole('button', { name: /Negativas \(0\)/ }));
    await waitFor(() => expect(llamadasA(fetch, '/api/profesionales/3/resenas?pagina=1&tipo=negativas')).not.toHaveLength(0));
  });
});
