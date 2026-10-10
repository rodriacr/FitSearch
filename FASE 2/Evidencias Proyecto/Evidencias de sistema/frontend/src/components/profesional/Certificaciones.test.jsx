import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { test, expect } from 'vitest';
import Certificaciones from './Certificaciones.jsx';
import { simularApi, SESION } from '../../tests/utilidades.jsx';

test('permite corregir y reenviar una solicitud rechazada con los documentos existentes', async () => {
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
  const fetch = simularApi({ '/api/verificaciones/mi-solicitud': (_url, opciones) => opciones.method === 'POST' ? [200, { estado: 'pendiente' }] : [200, { solicitud: { estado: 'rechazado', motivo: 'Documento ilegible', rut: '12345678-5', telefono: '', documentos: [{ id: 3, tipo: 'titulo', nombre: 'titulo.pdf' }], historial: [] } }] });
  render(<Certificaciones />);
  expect(await screen.findByText('Motivo: Documento ilegible')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'titulo: titulo.pdf' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitud a revisión' }));
  const [, opciones] = fetch.mock.calls.find(([, o]) => o.method === 'POST');
  expect(JSON.parse(opciones.body)).toEqual({ rut: '12345678-5', telefono: '' });
});

test('muestra el motivo de validación y permite corregir el RUT sin perder los datos', async () => {
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
  const fetch = simularApi({ '/api/verificaciones/mi-solicitud': (_url, opciones) => {
    if (opciones.method !== 'POST') return [200, { solicitud: { estado: 'rechazado', motivo: 'Verificación revocada', rut: '123456785', telefono: '987654321', documentos: [], historial: [] } }];
    return JSON.parse(opciones.body).rut === '12345678-5' ? [200, { estado: 'pendiente' }] : [400, { error: 'Hay campos incompletos o inválidos', detalles: { rut: 'Ingresa un RUT válido, con guion y dígito verificador' } }];
  } });
  render(<Certificaciones />);
  expect(await screen.findByText('Todavía no has adjuntado documentos.')).toBeInTheDocument();
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
  expect(fetch.mock.calls.filter(([, opciones]) => opciones.method === 'POST')).toHaveLength(2);
});

test('seleccionar un archivo no lo sube ni lo presenta como adjuntado', async () => {
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
  const fetch = simularApi({ '/api/verificaciones/mi-solicitud': () => [200, { solicitud: { estado: 'rechazado', motivo: '', rut: '', telefono: '', documentos: [], historial: [] } }] });
  render(<Certificaciones />);
  await screen.findByText('Todavía no has adjuntado documentos.');
  await userEvent.upload(screen.getByLabelText('Archivo PDF, JPG o PNG (máximo 5 MB)'), new File(['prueba'], 'identidad.pdf', { type: 'application/pdf' }));
  expect(screen.getByText(/Archivo seleccionado. Pulsa/)).toBeInTheDocument();
  expect(fetch.mock.calls.some(([, opciones]) => opciones.method === 'POST')).toBe(false);
});
