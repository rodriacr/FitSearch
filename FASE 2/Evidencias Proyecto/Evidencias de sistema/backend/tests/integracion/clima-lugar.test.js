const { lugarDelPunto, reiniciar } = require('../../src/services/geocodificacion.service');
let consultar;
beforeEach(() => {
  reiniciar({ intervaloMs: 0 });
  consultar = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ address: { suburb: 'Barrancas', city: 'San Antonio', state: 'Región de Valparaíso', country_code: 'cl' } }) });
});
afterEach(() => consultar.mockRestore());
test('identifica San Antonio como comuna en lugar de mostrar su barrio Barrancas', async () => {
  expect(await lugarDelPunto({ lat: -33.59, lng: -71.62 })).toBe('San Antonio');
  const url = new URL(consultar.mock.calls[0][0]);
  expect(url.searchParams.get('zoom')).toBe('12');
  expect(url.searchParams.get('lat')).toBe('-33.59');
});
test('recuerda el nombre del lugar sin volver a consultar Nominatim', async () => {
  await lugarDelPunto({ lat: -33.59, lng: -71.62 });
  await lugarDelPunto({ lat: -33.59, lng: -71.62 });
  expect(consultar).toHaveBeenCalledTimes(1);
});
