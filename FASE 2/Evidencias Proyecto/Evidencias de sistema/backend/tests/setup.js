// Variables de entorno para las pruebas: no se usa la base de datos real (el acceso a datos se simula).
process.env.DATABASE_URL = process.env.DATABASE_URL || 'mysql://prueba:prueba@localhost:3306/fitsearch_pruebas';
process.env.JWT_SECRET = 'secreto-de-pruebas';
process.env.JWT_EXPIRES_IN = '1h';
process.env.BCRYPT_COST = '4';
