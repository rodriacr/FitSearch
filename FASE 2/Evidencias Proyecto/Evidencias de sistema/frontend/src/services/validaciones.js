// Validaciones del lado del cliente con las mismas reglas que usa el backend (shared/reglas.json).
import reglas from '@shared/reglas.json';

const vacio = (valor) => valor === undefined || valor === null || String(valor).trim() === '';
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const opcionesActividad = reglas.perfil.actividadFisica;
export const opcionesSexo = reglas.perfil.sexo;
export const opcionesObjetivo = reglas.perfil.objetivoPrincipal;
export const opcionesComidas = reglas.perfil.comidasDia;
export const opcionesSueno = reglas.perfil.horasSueno;
export const catalogoSalud = reglas.salud;

// Etiqueta legible de un valor de catálogo (para el resumen del perfil).
export const etiquetaDe = (opciones, valor) => opciones.find((opcion) => opcion.valor === valor)?.etiqueta ?? '—';

// Tipo de cuenta del paso 1 del asistente de perfil (FS-HU-02); ya no se elige en el registro.
export const OPCIONES_TIPO_CUENTA = [
  {
    valor: 'usuario',
    etiqueta: 'Usuario',
    icono: 'usuario',
    descripcion: 'Quiero cuidar mi salud, mi alimentación y mi rendimiento.',
  },
  {
    valor: 'profesional',
    etiqueta: 'Profesional',
    icono: 'maletin',
    descripcion: 'Ofrezco servicios de salud, deporte o nutrición.',
  },
];

function validarPasswordNueva(password, confirmacion) {
  const errores = {};
  const { min, max } = reglas.usuario.password;
  if (vacio(password)) errores.password = 'La contraseña es obligatoria';
  else if (password.length < min || password.length > max) errores.password = `La contraseña debe tener entre ${min} y ${max} caracteres`;
  if (vacio(confirmacion)) errores.confirmacion = 'Confirma tu contraseña';
  else if (!errores.password && confirmacion !== password) errores.confirmacion = 'Las contraseñas no coinciden';
  return errores;
}

export function validarRegistro({ nombre, correo, password, confirmacion }) {
  const errores = {};
  const { usuario } = reglas;
  if (vacio(nombre)) errores.nombre = 'El nombre es obligatorio';
  else if (nombre.trim().length < usuario.nombre.min || nombre.trim().length > usuario.nombre.max)
    errores.nombre = `El nombre debe tener entre ${usuario.nombre.min} y ${usuario.nombre.max} caracteres`;
  Object.assign(errores, validarCorreo(correo), validarPasswordNueva(password, confirmacion));
  return errores;
}

export function validarCorreo(correo) {
  if (vacio(correo)) return { correo: 'El correo es obligatorio' };
  if (!CORREO.test(correo.trim())) return { correo: 'Ingresa un correo válido' };
  return {};
}

export function validarRestablecer({ password, confirmacion }) {
  return validarPasswordNueva(password, confirmacion);
}

export function validarInicioSesion({ correo, password }) {
  const errores = validarCorreo(correo);
  if (vacio(password)) errores.password = 'La contraseña es obligatoria';
  return errores;
}

export function validarObjetivos({ objetivoPrincipal, comidasDia, horasSueno }) {
  const errores = {};
  if (!opcionesObjetivo.some((opcion) => opcion.valor === objetivoPrincipal)) errores.objetivoPrincipal = 'Elige tu objetivo principal';
  if (!opcionesComidas.some((opcion) => opcion.valor === Number(comidasDia))) errores.comidasDia = 'Indica cuántas comidas realizas al día';
  if (!opcionesSueno.some((opcion) => opcion.valor === horasSueno)) errores.horasSueno = 'Indica tus horas de sueño promedio';
  return errores;
}

export function validarSalud({ condicionesMedicas, tomaMedicamentos, medicamentos, alergias }) {
  const errores = {};
  if (condicionesMedicas.length === 0) errores.condicionesMedicas = 'Indica si tienes alguna condición médica (o marca "Ninguna")';
  if (typeof tomaMedicamentos !== 'boolean') errores.tomaMedicamentos = 'Indica si tomas algún medicamento regularmente';
  else if (tomaMedicamentos && medicamentos.length === 0) errores.medicamentos = 'Indica qué tipo de medicamento tomas';
  if (alergias.length === 0) errores.alergias = 'Indica si tienes alergias (o marca "Ninguna")';
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
