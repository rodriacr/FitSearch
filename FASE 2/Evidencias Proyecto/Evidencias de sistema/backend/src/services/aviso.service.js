// Avisos por correo de la agenda (mejoras del 09-11-2026). Ningún aviso detiene la operación que
// lo provoca: se envían después de guardar y, si el correo falla, solo queda registrado en la consola del backend.
const modelo = require('../models/aviso.model');
const correo = require('./correo.service');

const FORMATO_DIA = new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const hora = (valor) => valor.toISOString().slice(11, 16);
// "martes 10 de noviembre, 09:00 a 10:00 (hora de Chile)"
const cuando = ({ fecha, horaInicio, horaFin }) => `${FORMATO_DIA.format(fecha).replace(',', '')}, ${hora(horaInicio)} a ${hora(horaFin)} (hora de Chile)`;
const primerNombre = (nombre) => nombre.trim().split(/\s+/)[0];
const modalidadTexto = (modalidad) => ({ presencial: 'Presencial', online: 'Online' }[modalidad]);

function registrarFallo(evento) {
  return (error) => console.error(`[aviso] No se pudo enviar el aviso de ${evento}: ${error.message}`);
}

// Nueva solicitud (o reserva ya confirmada, si el profesional confirma automáticamente): se avisa al profesional.
async function reservaCreada(reservaId) {
  const r = await modelo.datosReserva(reservaId);
  const { profesional } = r?.disponibilidad || {};
  if (!r || !profesional.avisosCorreo || !profesional.usuario.activo) return;
  const confirmada = r.estado === 'confirmada';
  const detalles = [
    `${r.usuario.nombre} ${confirmada ? 'reservó' : 'pidió'} una hora contigo para el ${cuando(r.disponibilidad)}.`,
    [modalidadTexto(r.modalidad), r.primeraVisita === true && 'Primera visita'].filter(Boolean).join(' · '),
    confirmada ? 'La reserva quedó confirmada, como indicaste en tu configuración.' : 'Confírmala o cancélala desde tu agenda.',
  ].filter(Boolean);
  await correo.enviarAviso({
    para: profesional.usuario.correo, nombre: primerNombre(profesional.usuario.nombre),
    asunto: confirmada ? 'Tienes una reserva nueva' : 'Tienes una solicitud de reserva', parrafos: detalles,
    accion: { texto: 'Abrir mi agenda', ruta: '/profesional/agenda' },
  });
}

// Confirmación o cancelación: se avisa a la otra persona (al profesional, solo si mantiene los avisos activados).
async function reservaCambiada(reservaId) {
  const r = await modelo.datosReserva(reservaId);
  if (!r) return;
  const { profesional } = r.disponibilidad;
  const cita = cuando(r.disponibilidad);
  if (r.estado === 'confirmada' || (r.estado === 'cancelada' && r.canceladaPor === 'profesional')) {
    if (!r.usuario.activo) return;
    const confirmada = r.estado === 'confirmada';
    await correo.enviarAviso({
      para: r.usuario.correo, nombre: primerNombre(r.usuario.nombre),
      asunto: confirmada ? 'Tu cita fue confirmada' : 'Tu cita fue cancelada',
      parrafos: confirmada
        ? [`${profesional.usuario.nombre} confirmó tu cita del ${cita}.`]
        : [`${profesional.usuario.nombre} canceló tu cita del ${cita}.`, 'Puedes elegir otra hora en su ficha.'],
      accion: { texto: 'Ver mis citas', ruta: '/citas' },
    });
    return;
  }
  if (r.estado === 'cancelada' && r.canceladaPor === 'usuario' && profesional.avisosCorreo && profesional.usuario.activo) {
    await correo.enviarAviso({
      para: profesional.usuario.correo, nombre: primerNombre(profesional.usuario.nombre), asunto: 'Una reserva fue cancelada',
      parrafos: [`${r.usuario.nombre} canceló su reserva del ${cita}. El horario vuelve a estar disponible.`],
      accion: { texto: 'Abrir mi agenda', ruta: '/profesional/agenda' },
    });
  }
}

// «Avísame si se libera una hora»: cada persona de la lista recibe un correo y sale de la lista.
async function horaLiberada(profesionalId) {
  const { filas, profesional } = await modelo.listaEspera(profesionalId);
  if (!filas.length || !profesional) return 0;
  const avisadas = [];
  for (const { id, usuario } of filas) {
    if (!usuario.activo) { avisadas.push(id); continue; }
    try {
      await correo.enviarAviso({
        para: usuario.correo, nombre: primerNombre(usuario.nombre), asunto: `${profesional.usuario.nombre} tiene horas disponibles`,
        parrafos: [`Te avisamos porque pediste que te contáramos cuando ${profesional.usuario.nombre} (${profesional.especialidad}) tuviera una hora libre.`,
          'Las horas se toman por orden de reserva: revísalas pronto.'],
        accion: { texto: 'Ver horas disponibles', ruta: `/profesionales/${profesionalId}` },
      });
      avisadas.push(id);
    } catch (error) {
      registrarFallo('hora liberada')(error);
    }
  }
  if (avisadas.length) await modelo.sacarDeLaLista(avisadas);
  return avisadas.length;
}

async function recordatorio(r) {
  await correo.enviarAviso({
    para: r.usuario.correo, nombre: primerNombre(r.usuario.nombre), asunto: 'Recordatorio de tu cita',
    parrafos: [`Te recordamos tu cita con ${r.disponibilidad.profesional.usuario.nombre} el ${cuando(r.disponibilidad)}.`,
      'Si no puedes asistir, cancélala en Mis citas para que otra persona pueda tomar la hora.'],
    accion: { texto: 'Ver mis citas', ruta: '/citas' },
  });
}

// Disparadores sin espera: la respuesta de la API no depende del correo.
const enSegundoPlano = (evento, tarea) => { Promise.resolve().then(tarea).catch(registrarFallo(evento)); };

module.exports = {
  cuando,
  reservaCreada, reservaCambiada, horaLiberada, recordatorio,
  avisarReservaCreada: (id) => enSegundoPlano('reserva nueva', () => reservaCreada(id)),
  avisarReservaCambiada: (id) => enSegundoPlano('cambio de reserva', () => reservaCambiada(id)),
  avisarHoraLiberada: (profesionalId) => enSegundoPlano('hora liberada', () => horaLiberada(profesionalId)),
};
