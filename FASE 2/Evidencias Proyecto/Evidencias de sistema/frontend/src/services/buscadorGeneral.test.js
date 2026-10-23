// Sugerencias del buscador general del Inicio (FS-HU-21, SC-23).
import { expect, test } from 'vitest';
import { SECCIONES } from '../components/diseno/secciones.js';
import { normalizar, sugerencias } from './buscadorGeneral.js';

const ESPECIALIDADES = ['Entrenamiento personal', 'Kinesiología', 'Nutrición', 'Psicología deportiva'];
const buscar = (texto) => sugerencias(texto, { secciones: SECCIONES, especialidades: ESPECIALIDADES });
const titulos = (texto) => buscar(texto).map((s) => s.titulo);

test('normaliza mayúsculas y tildes', () => {
  expect(normalizar('  Clínica ÁGIL ')).toBe('clinica agil');
});

test('lleva a las secciones por su nombre o por palabras relacionadas', () => {
  expect(buscar('perfil')[0]).toMatchObject({ tipo: 'seccion', titulo: 'Mi perfil', ruta: '/perfil' });
  expect(buscar('chat ia')[0]).toMatchObject({ titulo: 'Asistente IA', ruta: '/asistente' });
  // Desde FS-HU-07 el asistente está disponible: ya no se marca como «Próximamente».
  expect(buscar('chat ia')[0].proximamente).toBeFalsy();
  expect(buscar('IA')[0].titulo).toBe('Asistente IA');
  expect(buscar('reservas')[0]).toMatchObject({ titulo: 'Mis citas', ruta: '/citas' });
  expect(buscar('CLÍNICA')[0].titulo).toBe('Centros de salud');
  expect(buscar('gym')[0].titulo).toBe('Gimnasios');
  expect(buscar('dieta')[0].titulo).toBe('Comidas');
  expect(buscar('guardados')[0].titulo).toBe('Favoritos');
});

test('si una palabra calza con varias secciones las ofrece todas, primero la que calza mejor', () => {
  expect(titulos('salud')).toEqual(['Mi perfil', 'Centros de salud', 'Buscar «salud» en profesionales']);
});

test('ofrece las especialidades del directorio y siempre, al final, buscar en profesionales', () => {
  const resultado = buscar('nutri');
  expect(resultado.find((s) => s.tipo === 'especialidad')).toMatchObject({
    titulo: 'Ver profesionales de Nutrición', ruta: '/profesionales?especialidad=Nutrici%C3%B3n',
  });
  expect(resultado.at(-1)).toMatchObject({ tipo: 'busqueda', titulo: 'Buscar «nutri» en profesionales', ruta: '/profesionales?q=nutri' });
  expect(titulos('kine')).toEqual(['Ver profesionales de Kinesiología', 'Buscar «kine» en profesionales']);
});

test('sin coincidencias o con una sola letra solo ofrece buscar en profesionales; vacío no ofrece nada', () => {
  expect(titulos('dolor de rodilla')).toEqual(['Buscar «dolor de rodilla» en profesionales']);
  expect(titulos('p')).toEqual(['Buscar «p» en profesionales']);
  expect(buscar('   ')).toEqual([]);
});
