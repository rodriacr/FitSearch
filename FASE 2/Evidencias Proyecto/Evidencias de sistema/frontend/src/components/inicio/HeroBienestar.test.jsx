import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import HeroBienestar from './HeroBienestar.jsx';

afterEach(() => vi.unstubAllGlobals());

function preparar(estatico = false) {
  let cambiar;
  let cuadro;
  const preferencia = {
    matches: estatico,
    addEventListener: vi.fn((_, callback) => { cambiar = callback; }),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal('matchMedia', () => preferencia);
  vi.stubGlobal('innerHeight', 720);
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback) => { cuadro = callback; return 10; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const vista = render(<MemoryRouter><HeroBienestar /></MemoryRouter>);
  const raiz = vista.container.querySelector('.hero-bienestar');
  return { ...vista, raiz, preferencia,
    avanzar: (progreso) => {
      vi.spyOn(raiz, 'getBoundingClientRect').mockReturnValue({ top: -progreso * 1296, height: 2016 });
      act(() => { fireEvent.scroll(window); cuadro(); });
    },
    reducir: () => act(() => { preferencia.matches = true; cambiar(); }),
  };
}

test('el scroll presenta las especialidades y el asistente, y vuelve a la entrada al subir', () => {
  const vista = preparar();
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tu bienestar');
  expect(screen.queryByRole('link', { name: 'Conoce al asistente IA' })).not.toBeInTheDocument();
  vista.avanzar(0.5);
  expect(screen.getByRole('link', { name: 'Nutrición' })).toHaveAttribute('href', '/profesionales?especialidad=Nutrici%C3%B3n');
  expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  vista.avanzar(0.9);
  expect(screen.getByRole('link', { name: 'Conoce al asistente IA' })).toHaveAttribute('href', '/asistente');
  expect(screen.getByText(/Conversa sobre tus objetivos/)).toBeVisible();
  expect(screen.getByRole('link', { name: /Ir al buscador/ })).toHaveAttribute('href', '#explorar-fitsearch');
  vista.avanzar(0);
  expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
});

test('movimiento reducido o poca altura presenta todo sin retener el scroll ni ocultar enlaces', () => {
  const vista = preparar(true);
  expect(vista.raiz).not.toHaveClass('hero-bienestar--animado');
  expect(screen.getByRole('link', { name: 'Nutrición' }).closest('[inert]')).toBeNull();
  expect(screen.getByRole('link', { name: 'Conoce al asistente IA' })).toBeInTheDocument();
  expect(window.requestAnimationFrame).not.toHaveBeenCalled();
});

test('el cambio de preferencia muestra todo y elimina valores de animación y escuchas al salir', () => {
  const vista = preparar();
  vista.avanzar(0.8);
  expect(vista.raiz.style.getPropertyValue('--apertura')).toBe('1');
  vista.reducir();
  expect(vista.raiz).not.toHaveClass('hero-bienestar--animado');
  expect(vista.raiz.style.getPropertyValue('--apertura')).toBe('');
  expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Conoce al asistente IA' })).toBeInTheDocument();
  vista.unmount();
  expect(vista.preferencia.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
});
