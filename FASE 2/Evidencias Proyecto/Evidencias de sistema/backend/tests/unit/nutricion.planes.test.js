// Planes de alimentación según la meta (11-11-2026; fuentes en el README): proteína por kilo de peso, grasas entre 20 % y
// 35 % de las calorías y carbohidratos con el resto; calorías ajustadas por la meta con un piso de seguridad.
const { planPorMeta, caloriasSegunMeta, repartoEnteros, gramosDe, kcalPorRitmo } = require('../../src/services/nutricion.service');

const base = { kcalBase: 2300, pesoKg: 70, sexo: 'femenino' };

test.each([
  ['bajar_peso', 1955, { proteinas: 26, carbohidratos: 44, grasas: 30 }],
  ['mantener_peso', 2300, { proteinas: 17, carbohidratos: 53, grasas: 30 }],
  ['aumentar_masa', 2530, { proteinas: 22, carbohidratos: 53, grasas: 25 }],
  ['mejorar_rendimiento', 2300, { proteinas: 19, carbohidratos: 61, grasas: 20 }],
  ['otro', 2300, { proteinas: 17, carbohidratos: 53, grasas: 30 }],
])('70 kg y 2.300 kcal, meta %s: %i kcal y su reparto', (objetivo, kcal, porcentajes) => {
  const plan = planPorMeta({ objetivo, ...base });
  expect(plan.kcal).toBe(kcal);
  expect(plan.porcentajes).toEqual(porcentajes);
  expect(plan.porcentajes.proteinas + plan.porcentajes.carbohidratos + plan.porcentajes.grasas).toBe(100);
});

test('sin meta elegida usa el plan de «Otro» y los gramos salen de las calorías y el reparto', () => {
  expect(planPorMeta({ objetivo: null, ...base })).toEqual(planPorMeta({ objetivo: 'otro', ...base }));
  expect(planPorMeta({ objetivo: 'bajar_peso', ...base })).toMatchObject({ proteinasG: 127, carbohidratosG: 215, grasasG: 65 });
  expect(gramosDe(null, { proteinas: 30, carbohidratos: 45, grasas: 25 })).toEqual({ proteinasG: null, carbohidratosG: null, grasasG: null });
});

test('sin requerimiento ni peso muestra el reparto de referencia, sin calorías ni gramos', () => {
  expect(planPorMeta({ objetivo: 'bajar_peso' })).toMatchObject({ kcal: null, porcentajes: { proteinas: 26, carbohidratos: 44, grasas: 30 }, proteinasG: null });
});

test('al bajar de peso las calorías no quedan bajo el piso de seguridad, salvo que el requerimiento ya sea menor', () => {
  expect(caloriasSegunMeta('bajar_peso', 1300, 'femenino')).toBe(1200);
  expect(caloriasSegunMeta('bajar_peso', 1700, 'masculino')).toBe(1500);
  expect(caloriasSegunMeta('bajar_peso', 1100, 'femenino')).toBe(1100);
  expect(caloriasSegunMeta('aumentar_masa', 2000, 'femenino')).toBe(2200);
  expect(caloriasSegunMeta('mantener_peso', null, 'femenino')).toBeNull();
});

test('la proteína no pasa del 35 % y las grasas quedan entre 20 % y 35 %', () => {
  // 120 kg con 1.800 kcal: 1,8 g/kg serían 864 kcal (48 %); se limita al 35 %.
  expect(planPorMeta({ objetivo: 'bajar_peso', kcalBase: 1800, pesoKg: 120, sexo: 'masculino' }).porcentajes).toEqual({ proteinas: 35, carbohidratos: 35, grasas: 30 });
  // 50 kg con 3.000 kcal en rendimiento: las grasas serían el 56 %; se limitan al 35 % y el resto va a carbohidratos.
  expect(planPorMeta({ objetivo: 'mejorar_rendimiento', kcalBase: 3000, pesoKg: 50, sexo: 'femenino' }).porcentajes).toEqual({ proteinas: 11, carbohidratos: 54, grasas: 35 });
});

test('el reparto en enteros siempre suma 100', () => {
  expect(repartoEnteros([25.78, 44.22, 30])).toEqual([26, 44, 30]);
  expect(repartoEnteros([33.34, 33.33, 33.33])).toEqual([34, 33, 33]);
});

// Meta de peso (11-11-2026): con un ritmo semanal, el ajuste son unas 7.700 kcal por kilo repartidas en los 7 días.
test('con ritmo semanal las calorías se ajustan por kilo, con el mismo piso de seguridad al bajar', () => {
  expect(kcalPorRitmo(0.5)).toBe(550);
  expect(caloriasSegunMeta('bajar_peso', 2300, 'femenino', 0.5)).toBe(1750);
  expect(caloriasSegunMeta('bajar_peso', 1800, 'femenino', 0.75)).toBe(1200);
  expect(caloriasSegunMeta('aumentar_masa', 2300, 'masculino', 0.25)).toBe(2575);
  // En otras metas el ritmo no cambia nada.
  expect(caloriasSegunMeta('mantener_peso', 2300, 'masculino', 0.5)).toBe(2300);
  expect(planPorMeta({ objetivo: 'bajar_peso', kcalBase: 2300, pesoKg: 70, sexo: 'femenino', ritmoSemanalKg: 0.5 })).toMatchObject({ kcal: 1750, ajusteKcal: -550 });
});
