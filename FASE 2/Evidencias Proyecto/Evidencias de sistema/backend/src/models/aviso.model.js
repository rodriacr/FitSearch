// Datos que necesitan los avisos por correo de la agenda: nombre y correo de cada participante y las preferencias del
// profesional (FS-HU-29). Se leen aparte de la agenda para no exponer correos en sus respuestas.
const prisma = require('./prisma');

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
          profesional: { select: { id: true, avisosCorreo: true, recordatorios: true, usuario: persona } },
        },
      },
    },
  });
}

// Personas en la lista de espera de un profesional, con su nombre y correo, y el nombre del profesional.
async function listaEspera(profesionalId) {
  const [filas, profesional] = await Promise.all([
    prisma.listaEspera.findMany({ where: { profesionalId }, select: { id: true, usuario: persona }, orderBy: { id: 'asc' } }),
    prisma.profesional.findUnique({ where: { id: profesionalId }, select: { especialidad: true, usuario: { select: { nombre: true } } } }),
  ]);
  return { filas, profesional };
}

// Se borran solo las filas avisadas: si alguien se anota mientras se envían los correos, sigue en la lista.
function sacarDeLaLista(ids) {
  return prisma.listaEspera.deleteMany({ where: { id: { in: ids } } });
}

module.exports = { datosReserva, listaEspera, sacarDeLaLista };
