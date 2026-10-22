import reglas from '@shared/reglas.json';
import Icono from './Icono.jsx';

const { min } = reglas.usuario.password;
const NIVELES = ['debil', 'media', 'fuerte'];
const NOMBRES = { debil: 'débil', media: 'media', fuerte: 'fuerte' };

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

export default function IndicadorContrasena({ password }) {
  if (!password) return null;
  const { requisitos, nivel } = evaluarContrasena(password);
  return (
    <div className={`fortaleza fortaleza--${nivel}`} aria-live="polite">
      <div className="fortaleza__barras" aria-hidden="true"><span /><span /><span /></div>
      <p className="fortaleza__nivel">Seguridad: {NOMBRES[nivel]}</p>
      <ul className="fortaleza__requisitos">
        {requisitos.map(({ clave, texto, cumple }) => (
          <li key={clave} className={cumple ? 'cumple' : undefined}>
            <Icono nombre={cumple ? 'check' : 'info'} tamano={14} />
            <span>{texto}<span className="solo-lector">{cumple ? ': cumple' : ': pendiente'}</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}
