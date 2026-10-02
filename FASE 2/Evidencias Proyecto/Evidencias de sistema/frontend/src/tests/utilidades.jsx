import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App.jsx';
import { SesionProvider } from '../context/SesionContext.jsx';

export function renderizarApp(rutaInicial = '/') {
  return render(
    <MemoryRouter initialEntries={[rutaInicial]}>
      <SesionProvider>
        <App />
      </SesionProvider>
    </MemoryRouter>,
  );
}

export function respuestaJson(estado, cuerpo) {
  return Promise.resolve(new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json' },
  }));
}

export const SESION = {
  token: 'token-de-prueba',
  usuario: { id: 1, nombre: 'Ana Pérez', correo: 'ana@correo.cl', rol: 'usuario' },
};
