// Validaciones del lado del cliente con las mismas reglas que usa el backend (shared/reglas.json).
import reglas from '@shared/reglas.json';

const vacio = (valor) => valor === undefined || valor === null || String(valor).trim() === '';
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const opcionesActividad = reglas.perfil.actividadFisica;
export const opcionesSexo = reglas.perfil.sexo;

export function validarRegistro({ nombre, correo, password }) {
  const errores = {};
  const { usuario } = reglas;
  if (vacio(nombre)) errores.nombre = 'El nombre es obligatorio';
  else if (nombre.trim().length < usuario.nombre.min || nombre.trim().length > usuario.nombre.max)
    errores.nombre = `El nombre debe tener entre ${usuario.nombre.min} y ${usuario.nombre.max} caracteres`;
  Object.assign(errores, validarInicioSesion({ correo, password }));
  if (!errores.password && (password.length < usuario.password.min || password.length > usuario.password.max))
    errores.password = `La contraseña debe tener entre ${usuario.password.min} y ${usuario.password.max} caracteres`;
  return errores;
}

export function validarInicioSesion({ correo, password }) {
  const errores = {};
  if (vacio(correo)) errores.correo = 'El correo es obligatorio';
  else if (!CORREO.test(correo.trim())) errores.correo = 'Ingresa un correo válido';
  if (vacio(password)) errores.password = 'La contraseña es obligatoria';
  return errores;
}

export function validarPerfil({ pesoKg, alturaCm, edad, sexo, actividadFisica }) {
  const errores = {};
  const { perfil } = reglas;
  const rango = (campo, valor, nombre, unidad, entero = false) => {
    if (vacio(valor)) {
      errores[campo] = `${nombre} es obligatori${nombre.startsWith('La') ? 'a' : 'o'}`;
      return;
    }
    const numero = Number(valor);
    const { min, max } = perfil[campo];
    if (Number.isNaN(numero) || numero < min || numero > max || (entero && !Number.isInteger(numero))) {
      errores[campo] = `${nombre} debe ser ${entero ? 'un número entero ' : ''}entre ${min} y ${max} ${unidad}`;
    }
  };
  rango('pesoKg', pesoKg, 'El peso', 'kg');
  rango('alturaCm', alturaCm, 'La altura', 'cm');
  rango('edad', edad, 'La edad', 'años', true);
  if (vacio(sexo)) errores.sexo = 'El sexo es obligatorio para el cálculo nutricional';
  else if (!opcionesSexo.some((opcion) => opcion.valor === sexo)) errores.sexo = 'Selecciona una opción de sexo válida';
  if (vacio(actividadFisica)) errores.actividadFisica = 'El nivel de actividad física es obligatorio';
  else if (!opcionesActividad.some((opcion) => opcion.valor === actividadFisica))
    errores.actividadFisica = 'Selecciona un nivel de actividad física válido';
  return errores;
}
