import reglas from '@shared/reglas.json';

// Datos comunes del plan de alimentación (11-11-2026): macronutrientes con sus colores y gramos de un porcentaje.
const { kcalPorGramo } = reglas.comidas;
export const MACROS = [
  { clave: 'proteinas', nombre: 'Proteínas', color: '#2a7de1' },
  { clave: 'carbohidratos', nombre: 'Carbohidratos', color: '#1fa37a' },
  { clave: 'grasas', nombre: 'Grasas', color: '#f7931e' },
];
export const decimal = (valor) => valor.toLocaleString('es-CL', { maximumFractionDigits: 2 });
export const gramos = (kcal, porcentaje, macro) => Math.round((kcal * porcentaje) / 100 / kcalPorGramo[macro]);
