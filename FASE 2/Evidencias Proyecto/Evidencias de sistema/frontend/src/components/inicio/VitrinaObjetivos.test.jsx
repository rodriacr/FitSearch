// Vitrina de objetivos de la portada: la rotación se pausa mientras el mouse o el foco estén dentro (revisión del PR #46).
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import VitrinaObjetivos from './VitrinaObjetivos.jsx';

beforeEach(() => vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
afterEach(() => vi.unstubAllGlobals());

const vitrina = () => document.querySelector('.vitrina');
const avanza = () => vitrina().hasAttribute('data-avanza');

test('con el foco dentro sigue pausada aunque se retire el mouse; reanuda cuando salen los dos', () => {
  render(<MemoryRouter><VitrinaObjetivos /><button type="button">Fuera</button></MemoryRouter>);
  expect(avanza()).toBe(true);

  fireEvent.mouseEnter(vitrina());
  expect(avanza()).toBe(false);
  act(() => screen.getAllByRole('button', { pressed: false })[0].focus());
  fireEvent.mouseLeave(vitrina());
  expect(avanza()).toBe(false);

  act(() => screen.getByRole('button', { name: 'Fuera' }).focus());
  expect(avanza()).toBe(true);
});

test('el mouse sin foco pausa y reanuda como antes', () => {
  render(<MemoryRouter><VitrinaObjetivos /></MemoryRouter>);
  fireEvent.mouseEnter(vitrina());
  expect(avanza()).toBe(false);
  fireEvent.mouseLeave(vitrina());
  expect(avanza()).toBe(true);
});
