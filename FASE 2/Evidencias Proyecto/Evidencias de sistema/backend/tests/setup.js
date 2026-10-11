// Variables de entorno para las pruebas: no se usa la base de datos real (el acceso a datos se simula).
process.env.DATABASE_URL = process.env.DATABASE_URL || 'mysql://prueba:prueba@localhost:3306/fitsearch_pruebas';
process.env.JWT_SECRET = 'secreto-de-pruebas';
process.env.JWT_EXPIRES_IN = '1h';
process.env.BCRYPT_COST = '4';
// ID de cliente de Google de prueba (FS-HU-16): la librería de Google se simula en las pruebas.
process.env.GOOGLE_CLIENT_ID = 'pruebas.apps.googleusercontent.com';
// Las pruebas existentes usan sesiones firmadas y modelos simulados, sin consultar MySQL.
// La invalidación de cuentas y versiones se prueba explícitamente en sesion.api.test.js.
jest.mock('../src/models/sesion.model', () => ({ estadoCuenta: async () => ({ activo: true, versionSesion: 0 }) }));
