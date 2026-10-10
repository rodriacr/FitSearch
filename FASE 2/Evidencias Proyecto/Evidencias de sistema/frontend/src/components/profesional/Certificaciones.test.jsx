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
