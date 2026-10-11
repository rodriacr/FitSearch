import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { test, expect } from 'vitest';
import Certificaciones, { Documentos } from './Certificaciones.jsx';
import { simularApi as simularApiBase, SESION } from '../../tests/utilidades.jsx';
function simularApi(respuestas) {
  return simularApiBase({ '/api/verificaciones/documentos': (url) => {
    const parametros = new URL(url, 'http://localhost').searchParams;
    return [201, { documento: { id: parametros.get('tipo') === 'identidad' ? 10 : 11, tipo: parametros.get('tipo'), nombre: parametros.get('nombre') } }];
  }, ...respuestas });
}
async function adjuntarObligatorios() {
  for (const nombre of ['Documento de identidad', 'Título profesional']) {
    const input = screen.getByLabelText(`Seleccionar archivo: ${nombre}`);
    await userEvent.upload(input, new File(['prueba'], `${nombre}.pdf`, { type: 'application/pdf' }));
    fireEvent.submit(input.closest('form'));
    await waitFor(() => expect(screen.getByRole('button', { name: `Reemplazar documento: ${nombre}` })).toBeDisabled());
  }
}

test('permite corregir y reenviar una solicitud rechazada con documentos nuevos', async () => {
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
  const fetch = simularApi({ '/api/verificaciones/mi-solicitud': (_url, opciones) => opciones.method === 'POST' ? [200, { estado: 'pendiente' }] : [200, { solicitud: { estado: 'rechazado', motivo: 'Documento ilegible', rut: '12345678-5', telefono: '', documentos: [], historial: [] } }] });
  render(<Certificaciones />);
  expect(await screen.findByText('Motivo: Documento ilegible')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'titulo: titulo.pdf' })).not.toBeInTheDocument();
  await adjuntarObligatorios();
  await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitud a revisión' }));
  const [, opciones] = fetch.mock.calls.find(([url, o]) => url === '/api/verificaciones/mi-solicitud' && o.method === 'POST');
  expect(JSON.parse(opciones.body)).toEqual({ rut: '12345678-5', telefono: '' });
});

test('muestra el motivo de validación y permite corregir el RUT sin perder los datos', async () => {
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
  const fetch = simularApi({ '/api/verificaciones/mi-solicitud': (_url, opciones) => {
    if (opciones.method !== 'POST') return [200, { solicitud: { estado: 'rechazado', motivo: 'Verificación revocada', rut: '123456784', telefono: '987654321', documentos: [], historial: [] } }];
    return JSON.parse(opciones.body).rut === '12345678-5' ? [200, { estado: 'pendiente' }] : [400, { error: 'Hay campos incompletos o inválidos', detalles: { rut: 'Ingresa un RUT válido, con guion y dígito verificador' } }];
  } });
  render(<Certificaciones />);
  expect(await screen.findByRole('textbox', { name: 'RUT' })).toBeInTheDocument();
  await adjuntarObligatorios();
  await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitud a revisión' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Ingresa un RUT válido, con guion y dígito verificador');
  const rut = screen.getByRole('textbox', { name: 'RUT' });
  expect(rut).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByRole('textbox', { name: 'Teléfono (opcional)' })).toHaveValue('987654321');
  await userEvent.clear(rut);
  await userEvent.type(rut, '12345678-5');
  await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitud a revisión' }));
  expect(await screen.findByText('Solicitud enviada para revisión.')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(fetch.mock.calls.filter(([url, opciones]) => url === '/api/verificaciones/mi-solicitud' && opciones.method === 'POST')).toHaveLength(2);
});

test('seleccionar un archivo no lo sube ni lo presenta como adjuntado', async () => {
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
  const fetch = simularApi({ '/api/verificaciones/mi-solicitud': () => [200, { solicitud: { estado: 'rechazado', motivo: '', rut: '', telefono: '', documentos: [], historial: [] } }] });
  render(<Certificaciones />);
  await screen.findByRole('textbox', { name: 'RUT' });
  await userEvent.upload(screen.getByLabelText('Seleccionar archivo: Documento de identidad'), new File(['prueba'], 'identidad.pdf', { type: 'application/pdf' }));
  expect(screen.getByText(/Archivo seleccionado. Pulsa/)).toBeInTheDocument();
  expect(fetch.mock.calls.some(([, opciones]) => opciones.method === 'POST')).toBe(false);
});

test.each([['202223334', '20222333-4'], ['71112225', '7111222-5'], ['12.345.678-k', '12345678-K']])('formatea el RUT %s al salir del campo y antes de enviar', async (entrada, esperado) => {
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
  const fetch = simularApi({ '/api/verificaciones/mi-solicitud': (_url, opciones) => opciones.method === 'POST' ? [200, { estado: 'pendiente' }] : [200, { solicitud: { estado: 'pendiente', rut: '', telefono: '', documentos: [], historial: [] } }] });
  render(<Certificaciones />);
  const rut = await screen.findByRole('textbox', { name: 'RUT' });
  await adjuntarObligatorios();
  await userEvent.type(rut, entrada);
  await userEvent.tab();
  expect(rut).toHaveValue(esperado);
  fireEvent.change(rut, { target: { value: entrada } });
  fireEvent.submit(rut.closest('form'));
  await screen.findByText('Solicitud enviada para revisión.');
  const [, opciones] = fetch.mock.calls.find(([url, llamada]) => url === '/api/verificaciones/mi-solicitud' && llamada.method === 'POST');
  expect(JSON.parse(opciones.body).rut).toBe(esperado);
});

test('cada documento sube con su propio tipo y conserva la selección de los otros', async () => {
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
  const documentos = [];
  const fetch = simularApi({
    '/api/verificaciones/mi-solicitud': () => [200, { solicitud: { estado: 'pendiente', rut: '', telefono: '', documentos: [...documentos], historial: [] } }],
    '/api/verificaciones/documentos': (url) => {
      const datos = new URL(url, 'http://localhost').searchParams;
      documentos.push({ id: documentos.length + 1, tipo: datos.get('tipo'), nombre: datos.get('nombre') });
      return [201, { documento: documentos.at(-1) }];
    },
  });
  render(<Certificaciones />);
  const identidad = await screen.findByLabelText('Seleccionar archivo: Documento de identidad');
  const titulo = screen.getByLabelText('Seleccionar archivo: Título profesional');
  const archivoIdentidad = new File(['identidad'], 'identidad.png', { type: 'image/png' });
  const archivoTitulo = new File(['titulo'], 'titulo.pdf', { type: 'application/pdf' });
  await userEvent.upload(identidad, archivoIdentidad);
  await userEvent.upload(titulo, archivoTitulo);
  expect(titulo.files[0]).toBe(archivoTitulo);
  fireEvent.submit(titulo.closest('form'));
  await screen.findByRole('button', { name: 'titulo: titulo.pdf' });
  expect(screen.getByText('Sin solicitud enviada')).toBeInTheDocument();
  expect(identidad.files[0]).toBe(archivoIdentidad);
  expect(screen.getByRole('button', { name: 'Reemplazar documento: Título profesional' })).toBeDisabled();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Adjuntar documento: Documento de identidad' })).toBeEnabled());
  fireEvent.submit(identidad.closest('form'));
  await screen.findByRole('button', { name: 'identidad: identidad.png' });
  const subidas = fetch.mock.calls.filter(([url]) => url.startsWith('/api/verificaciones/documentos'));
  expect(subidas.map(([url]) => new URL(url, 'http://localhost').searchParams.get('tipo'))).toEqual(['titulo', 'identidad']);
  expect(subidas.map(([, opciones]) => opciones.body)).toEqual([archivoTitulo, archivoIdentidad]);
});

test('muestra solo el último archivo sin ofrecer versiones anteriores', () => {
  render(<Documentos documentos={[
    { id: 1, tipo: 'identidad', nombre: 'anterior.png', fechaCreacion: '2026-10-09T12:00:00Z' },
    { id: 3, tipo: 'identidad', nombre: 'nuevo.png', fechaCreacion: '2026-10-10T12:00:00Z' },
    { id: 2, tipo: 'titulo', nombre: 'titulo.pdf', fechaCreacion: '2026-10-09T12:00:00Z' },
  ]} onError={() => {}} />);
  expect(screen.getByRole('button', { name: 'identidad: nuevo.png' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'titulo: titulo.pdf' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'identidad: anterior.png' })).not.toBeInTheDocument();
  expect(screen.queryByText(/Versiones anteriores/)).not.toBeInTheDocument();
});

test('una solicitud rechazada sin archivos actuales solicita adjuntarlos nuevamente', async () => {
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
  simularApi({ '/api/verificaciones/mi-solicitud': { solicitud: { estado: 'rechazado', motivo: 'Título ilegible', rut: '', telefono: '', documentos: [], historial: [] } } });
  render(<Certificaciones />);
  expect(await screen.findByText(/Adjunta nuevamente el documento de identidad/)).toBeInTheDocument();
  expect(screen.getAllByText('Sin adjuntar')).toHaveLength(3);
  expect(screen.getByRole('button', { name: 'Adjuntar documento: Título profesional' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Adjuntar documento: Documento de identidad' })).toBeDisabled();
});

test('recargar conserva los documentos actuales y permite enviar sin volver a subirlos', async () => {
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
  const solicitud = { estado: 'sin_solicitud', rut: '12345678-5', telefono: '', documentos: [{ id: 8, tipo: 'identidad', nombre: 'guardado.png' }, { id: 9, tipo: 'titulo', nombre: 'titulo.pdf' }], historial: [] };
  const fetch = simularApi({ '/api/verificaciones/mi-solicitud': (_url, opciones) => opciones.method === 'POST' ? [200, { estado: 'pendiente' }] : [200, { solicitud }] });
  const vista = render(<Certificaciones />);
  expect(await screen.findByText('Sin solicitud enviada')).toBeInTheDocument();
  expect(screen.getAllByText('Adjuntado')).toHaveLength(2);
  vista.unmount();
  render(<Certificaciones />);
  expect(await screen.findByRole('button', { name: 'identidad: guardado.png' })).toBeInTheDocument();
  expect(screen.getAllByText('Adjuntado')).toHaveLength(2);
  await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitud a revisión' }));
  expect(await screen.findByText('Solicitud enviada para revisión.')).toBeInTheDocument();
  expect(fetch.mock.calls.some(([url]) => url.startsWith('/api/verificaciones/documentos'))).toBe(false);
});

test('bloquea el envío si la API no contiene ambos documentos actuales', async () => {
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
  const fetch = simularApi({ '/api/verificaciones/mi-solicitud': { solicitud: { estado: 'sin_solicitud', rut: '12345678-5', documentos: [{ id: 8, tipo: 'identidad', nombre: 'guardado.png' }], historial: [] } } });
  render(<Certificaciones />);
  await screen.findByRole('textbox', { name: 'RUT' });
  await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitud a revisión' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Adjunta el documento de identidad y el título profesional');
  expect(fetch.mock.calls.some(([, opciones]) => opciones.method === 'POST')).toBe(false);
});
