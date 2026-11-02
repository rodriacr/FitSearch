import reglas from '@shared/reglas.json';

const { min } = reglas.usuario.password;
const NIVELES = ['debil', 'media', 'fuerte'];

// Requisitos que se marcan mientras se escribe. Solo el largo mínimo es obligatorio (lo valida también el backend);
// los demás orientan hacia una contraseña más segura.
export function evaluarContrasena(password) {
  const requisitos = [
    { clave: 'largo', texto: `Al menos ${min} caracteres`, cumple: password.length >= min },
    { clave: 'letraNumero', texto: 'Una letra y un número', cumple: /[a-záéíóúñ]/i.test(password) && /\d/.test(password) },
    { clave: 'simbolo', texto: 'Un símbolo (opcional)', cumple: /[^a-z0-9áéíóúñ\s]/i.test(password) },
  ];
  const cumplidos = requisitos.filter((r) => r.cumple).length;
  const nivel = !requisitos[0].cumple ? 'debil' : NIVELES[Math.max(0, cumplidos - 1)];
  return { requisitos, nivel };
}
