// Carga y valida las variables de entorno necesarias para la API.
require('dotenv').config({ quiet: true });

const obligatorias = ['DATABASE_URL', 'JWT_SECRET'];
const faltantes = obligatorias.filter((nombre) => !process.env[nombre]);
if (faltantes.length > 0) {
  throw new Error(`Faltan variables de entorno obligatorias: ${faltantes.join(', ')}. Revisa backend/.env (ver .env.example).`);
}

module.exports = {
  puerto: Number(process.env.PORT) || 3000,
  jwtSecreto: process.env.JWT_SECRET,
  jwtExpiracion: process.env.JWT_EXPIRES_IN || '8h',
  bcryptCosto: Number(process.env.BCRYPT_COST) || 10,
};
