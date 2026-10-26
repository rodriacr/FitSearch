import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import useAnimacionesScroll from './useAnimacionesScroll.js';

afterEach(() => vi.unstubAllGlobals());

function Ejemplo() {
  const ref = useAnimacionesScroll();
  return <main ref={ref}><section data-revelar><button>Explorar</button></section><div><img data-paralaje alt="" /></div></main>;
}

function preparar({ reducido = false } = {}) {
  let notificar;
  let cambiarPreferencia;
  const preferencia = {
    matches: reducido,
    addEventListener: vi.fn((_, callback) => { cambiarPreferencia = callback; }),
    removeEventListener: vi.fn(),
  };
  const observador = { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
  vi.stubGlobal('matchMedia', () => preferencia);
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback) { notificar = callback; Object.assign(this, observador); }
  });
  const pedirCuadro = vi.fn(() => 1);
  const cancelarCuadro = vi.fn();
  vi.stubGlobal('requestAnimationFrame', pedirCuadro);
  vi.stubGlobal('cancelAnimationFrame', cancelarCuadro);
  return { observador, preferencia, pedirCuadro, cancelarCuadro,
    entrar: (target) => act(() => notificar([{ target, isIntersecting: true }])),
    reducir: () => act(() => { preferencia.matches = true; cambiarPreferencia(); }),
  };
}

test('cada sección se anima una vez y el foco cancela el efecto para acceder al control', () => {
  const entorno = preparar();
  render(<Ejemplo />);
  const boton = screen.getByRole('button', { name: 'Explorar' });
  const seccion = boton.closest('section');
  const cancel = vi.fn();
  seccion.animate = vi.fn(() => ({ cancel }));
  entorno.entrar(seccion);
  entorno.entrar(seccion);
  expect(seccion.animate).toHaveBeenCalledTimes(1);
  fireEvent.focusIn(boton);
  expect(cancel).toHaveBeenCalledOnce();
  expect(boton).toBeVisible();
});

test('movimiento reducido evita observadores y trabajo de scroll', () => {
  const entorno = preparar({ reducido: true });
  render(<Ejemplo />);
  fireEvent.scroll(window);
  expect(entorno.observador.observe).not.toHaveBeenCalled();
  expect(entorno.pedirCuadro).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Explorar' })).toBeVisible();
});

test('cambiar a movimiento reducido cancela efectos y limpia la foto; desmontar desconecta', () => {
  const entorno = preparar();
  const { container, unmount } = render(<Ejemplo />);
  const seccion = container.querySelector('section');
  const foto = container.querySelector('img');
  const cancel = vi.fn();
  seccion.animate = vi.fn(() => ({ cancel }));
  entorno.entrar(seccion);
  foto.style.setProperty('--desplazamiento-hero', '10px');
  entorno.reducir();
  expect(cancel).toHaveBeenCalledOnce();
  expect(foto.style.getPropertyValue('--desplazamiento-hero')).toBe('');
  expect(entorno.cancelarCuadro).toHaveBeenCalledWith(1);
  const llamadas = entorno.pedirCuadro.mock.calls.length;
  fireEvent.scroll(window);
  expect(entorno.pedirCuadro).toHaveBeenCalledTimes(llamadas);
  unmount();
  expect(entorno.observador.disconnect).toHaveBeenCalled();
  expect(entorno.preferencia.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
});
