// Datos que necesitan los avisos por correo de la agenda: nombre y correo de cada participante y las preferencias del
// profesional (FS-HU-29). Se leen aparte de la agenda para no exponer correos en sus respuestas.
const prisma = require('./prisma');
const { libre } = require('../utils/intentoDeEnvio');

const persona = { select: { nombre: true, correo: true, activo: true } };

function datosReserva(id) {
  return prisma.reserva.findUnique({
    where: { id },
    select: {
      id: true, estado: true, modalidad: true, primeraVisita: true, canceladaPor: true,
      usuario: persona,
      disponibilidad: {
        select: {
          fecha: true, horaInicio: true, horaFin: true,
          profesional: { select: { id: true, especialidad: true, avisosCorreo: true, recordatorios: true, usuario: persona } },
        },
      },
    },
  });
}

// Personas en la lista de espera de un profesional que nadie está avisando en este momento, con su nombre y correo, y el
// nombre del profesional.
async function listaEspera(profesionalId, ahora = new Date()) {
  const [filas, profesional] = await Promise.all([
    prisma.listaEspera.findMany({ where: { profesionalId, ...libre('avisoIntento', ahora) }, select: { id: true, usuario: persona }, orderBy: { id: 'asc' } }),
    prisma.profesional.findUnique({ where: { id: profesionalId }, select: { especialidad: true, usuario: { select: { nombre: true } } } }),
  ]);
  return { filas, profesional };
}

// Toma a una persona de la lista antes de escribirle: true solo para el proceso que gana la fila.
async function tomarDeLaLista(id, marca, ahora) {
  const { count } = await prisma.listaEspera.updateMany({ where: { id, ...libre('avisoIntento', ahora) }, data: { avisoIntento: marca } });
  return count === 1;
}

// Saca de la lista a quien ya se avisó (solo la fila que tomó este proceso). Quien se anote mientras se envían los
// correos sigue en la lista.
function sacarDeLaLista(id, marca) {
  return prisma.listaEspera.deleteMany({ where: { id, avisoIntento: marca } });
}

// El correo falló: la persona sigue en la lista para el próximo aviso.
function soltarDeLaLista(id, marca) {
  return prisma.listaEspera.updateMany({ where: { id, avisoIntento: marca }, data: { avisoIntento: null } });
}

module.exports = { datosReserva, listaEspera, tomarDeLaLista, sacarDeLaLista, soltarDeLaLista };
