// Avisos por correo de la agenda (mejoras del 09-11-2026). Ningún aviso detiene la operación que
// lo provoca: se envían después de guardar y, si el correo falla, solo queda registrado en la consola del backend.
// Desde el 11-11-2026 cada aviso sigue la estructura pedida por el PO: saludo, panel con el detalle de la cita,
// «¿Qué debes hacer?», botón y nota (la plantilla está en correo.service).
const modelo = require('../models/aviso.model');
const correo = require('./correo.service');
const { marcaDe } = require('../utils/intentoDeEnvio');

const FORMATO_DIA = new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const hora = (valor) => valor.toISOString().slice(11, 16);
const dia = (fecha) => FORMATO_DIA.format(fecha).replace(',', '');
// "martes 10 de noviembre, 09:00 a 10:00 (hora de Chile)"
const cuando = ({ fecha, horaInicio, horaFin }) => `${dia(fecha)}, ${hora(horaInicio)} a ${hora(horaFin)} (hora de Chile)`;
const primerNombre = (nombre) => nombre.trim().split(/\s+/)[0];
const mayuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);
const MODALIDAD = {
  presencial: { valor: 'Presencial', icono: 'ubicacion' },
  online: { valor: 'Online', icono: 'video' },
};

// Filas del panel: fecha, horario y modalidad de la cita, más lo que corresponda a cada aviso.
function detalleCita(r, { persona, tipo, estado } = {}) {
  const { fecha, horaInicio, horaFin } = r.disponibilidad;
  const modalidad = MODALIDAD[r.modalidad];
  return [
    persona && { icono: 'persona', ...persona },
    { icono: 'calendario', etiqueta: 'Fecha', valor: mayuscula(dia(fecha)) },
    { icono: 'reloj', etiqueta: 'Horario', valor: `${hora(horaInicio)} a ${hora(horaFin)} (hora de Chile)` },
    modalidad && { icono: modalidad.icono, etiqueta: 'Modalidad', valor: modalidad.valor },
    tipo && r.primeraVisita !== null && r.primeraVisita !== undefined
      && { icono: 'tipo', etiqueta: 'Tipo de atención', valor: r.primeraVisita ? 'Primera visita' : 'Ya se atendió contigo' },
    estado && { icono: 'estado', etiqueta: 'Estado', valor: estado.texto, estado: estado.clave },
  ].filter(Boolean);
}

const profesionalDe = (r) => {
  const { usuario, especialidad } = r.disponibilidad.profesional;
  return { etiqueta: 'Profesional', valor: especialidad ? `${usuario.nombre} · ${especialidad}` : usuario.nombre };
};

function registrarFallo(evento) {
  return (error) => console.error(`[aviso] No se pudo enviar el aviso de ${evento}: ${error.message}`);
}

// Nueva solicitud (o reserva ya confirmada, si el profesional confirma automáticamente): se avisa al profesional.
async function reservaCreada(reservaId) {
  const r = await modelo.datosReserva(reservaId);
  const { profesional } = r?.disponibilidad || {};
  if (!r || !profesional.avisosCorreo || !profesional.usuario.activo) return;
  const cliente = r.usuario.nombre;
  const base = { para: profesional.usuario.correo, nombre: primerNombre(profesional.usuario.nombre) };
  if (r.estado === 'confirmada') {
    await correo.enviarAviso({
      ...base,
      asunto: 'FitSearch | Nueva reserva confirmada',
      icono: 'confirmada',
      titulo: 'Nueva reserva confirmada',
      intro: 'Tienes una nueva reserva en FitSearch.',
      seccion: {
        titulo: 'Nueva reserva',
        texto: `**${cliente}** reservó una hora contigo y quedó confirmada automáticamente, como indicaste en tu configuración. Estos son los detalles:`,
      },
      detalles: detalleCita(r, { tipo: true, estado: { clave: 'confirmada', texto: 'Confirmada' } }),
      pasos: { titulo: '¿Qué debes hacer?', texto: 'Nada más: la hora ya está en tu agenda. Si no puedes atender, cancélala desde ahí para que le llegue el aviso.' },
      accion: { texto: 'Ver mi agenda', ruta: '/profesional/agenda', icono: 'calendario' },
    });
    return;
  }
  await correo.enviarAviso({
    ...base,
    asunto: 'FitSearch | Nueva solicitud de reserva',
    icono: 'solicitud',
    titulo: 'Nueva solicitud de reserva',
    intro: 'Tienes una nueva solicitud de reserva en FitSearch.',
    seccion: { titulo: 'Nueva solicitud de atención', texto: `**${cliente}** ha solicitado reservar una hora contigo. Estos son los detalles:` },
    detalles: detalleCita(r, { tipo: true, estado: { clave: 'pendiente', texto: 'Pendiente de confirmación' } }),
    pasos: { titulo: '¿Qué debes hacer?', texto: 'Ingresa a tu agenda para revisar la solicitud y **confirmarla o cancelarla**.' },
    accion: { texto: 'Revisar solicitud en mi agenda', ruta: '/profesional/agenda', icono: 'calendario' },
    nota: `Recuerda que la reserva todavía no está confirmada. ${primerNombre(cliente)} recibirá un aviso cuando respondas a su solicitud.`,
  });
}

// Confirmación o cancelación: se avisa a la otra persona (al profesional, solo si mantiene los avisos activados).
async function reservaCambiada(reservaId) {
  const r = await modelo.datosReserva(reservaId);
  if (!r) return;
  const { profesional } = r.disponibilidad;
  const nombreProfesional = profesional.usuario.nombre;
  if (r.estado === 'confirmada' || (r.estado === 'cancelada' && r.canceladaPor === 'profesional')) {
    if (!r.usuario.activo) return;
    const base = { para: r.usuario.correo, nombre: primerNombre(r.usuario.nombre) };
    if (r.estado === 'confirmada') {
      await correo.enviarAviso({
        ...base,
        asunto: 'FitSearch | Tu cita fue confirmada',
        icono: 'confirmada',
        titulo: 'Tu cita está confirmada',
        intro: `**${nombreProfesional}** confirmó tu cita.`,
        seccion: { titulo: 'Detalle de tu cita' },
        detalles: detalleCita(r, { persona: profesionalDe(r), estado: { clave: 'confirmada', texto: 'Confirmada' } }),
        pasos: { titulo: '¿No puedes asistir?', texto: 'Cancela la cita en Mis citas para que otra persona pueda tomar la hora.' },
        accion: { texto: 'Ver mis citas', ruta: '/citas', icono: 'calendario' },
      });
      return;
    }
    await correo.enviarAviso({
      ...base,
      asunto: 'FitSearch | Tu cita fue cancelada',
      icono: 'cancelada',
      titulo: 'Tu cita fue cancelada',
      intro: `**${nombreProfesional}** canceló tu cita.`,
      seccion: { titulo: 'Cita cancelada' },
      detalles: detalleCita(r, { persona: profesionalDe(r), estado: { clave: 'cancelada', texto: 'Cancelada por el profesional' } }),
      pasos: { titulo: '¿Qué puedes hacer?', texto: `Elige otra hora disponible en la ficha de ${nombreProfesional}.` },
      accion: { texto: 'Buscar otra hora', ruta: `/profesionales/${profesional.id}`, icono: 'reloj' },
    });
    return;
  }
  if (r.estado === 'cancelada' && r.canceladaPor === 'usuario' && profesional.avisosCorreo && profesional.usuario.activo) {
    await correo.enviarAviso({
      para: profesional.usuario.correo,
      nombre: primerNombre(nombreProfesional),
      asunto: 'FitSearch | Una reserva fue cancelada',
      icono: 'cancelada',
      titulo: 'Una reserva fue cancelada',
      intro: `**${r.usuario.nombre}** canceló su reserva.`,
      seccion: { titulo: 'Reserva cancelada' },
      detalles: detalleCita(r, { tipo: true, estado: { clave: 'cancelada', texto: 'Cancelada por la persona' } }),
      pasos: { titulo: '¿Qué debes hacer?', texto: 'Nada: el horario vuelve a estar disponible para que otra persona lo reserve.' },
      accion: { texto: 'Ver mi agenda', ruta: '/profesional/agenda', icono: 'calendario' },
    });
  }
}

// «Avísame si se libera una hora»: cada persona de la lista recibe un solo correo y sale de la lista. La fila se toma
// antes de escribirle, así dos publicaciones simultáneas no le envían dos avisos; si el correo falla, se suelta y la
// persona sigue en la lista para el próximo aviso. Devuelve cuántos correos se enviaron.
async function horaLiberada(profesionalId, ahora = new Date()) {
  const { filas, profesional } = await modelo.listaEspera(profesionalId, ahora);
  if (!filas.length || !profesional) return 0;
  const marca = marcaDe(ahora);
  let avisadas = 0;
  for (const { id, usuario } of filas) {
    if (!(await modelo.tomarDeLaLista(id, marca, ahora))) continue;
    // Una cuenta desactivada sale de la lista sin correo.
    if (!usuario.activo) {
      await modelo.sacarDeLaLista(id, marca);
      continue;
    }
    try {
      await correo.enviarAviso({
        para: usuario.correo,
        nombre: primerNombre(usuario.nombre),
        asunto: `FitSearch | ${profesional.usuario.nombre} tiene horas disponibles`,
        icono: 'campana',
        titulo: 'Hay horas disponibles',
        intro: `Te avisamos porque pediste que te contáramos cuando **${profesional.usuario.nombre}** tuviera una hora libre.`,
        seccion: { titulo: 'Profesional' },
        detalles: [
          { icono: 'persona', etiqueta: 'Nombre', valor: profesional.usuario.nombre },
          profesional.especialidad && { icono: 'especialidad', etiqueta: 'Especialidad', valor: profesional.especialidad },
        ].filter(Boolean),
        pasos: { titulo: '¿Qué debes hacer?', texto: 'Las horas se toman por orden de reserva: **revísalas pronto**.' },
        accion: { texto: 'Ver horas disponibles', ruta: `/profesionales/${profesionalId}`, icono: 'reloj' },
        nota: 'Este aviso se envía una sola vez. Si quieres otro, vuelve a pedirlo en la ficha del profesional.',
      });
    } catch (error) {
      await modelo.soltarDeLaLista(id, marca);
      registrarFallo('hora liberada')(error);
      continue;
    }
    await modelo.sacarDeLaLista(id, marca);
    avisadas += 1;
  }
  return avisadas;
}

async function recordatorio(r) {
  const nombreProfesional = r.disponibilidad.profesional.usuario.nombre;
  await correo.enviarAviso({
    para: r.usuario.correo,
    nombre: primerNombre(r.usuario.nombre),
    asunto: 'FitSearch | Recordatorio de tu cita',
    icono: 'recordatorio',
    titulo: 'Recordatorio de tu cita',
    intro: `Te recordamos tu cita con **${nombreProfesional}**.`,
    seccion: { titulo: 'Detalle de tu cita' },
    detalles: detalleCita(r, { persona: profesionalDe(r), estado: { clave: 'confirmada', texto: 'Confirmada' } }),
    pasos: { titulo: '¿No puedes asistir?', texto: 'Cancélala en Mis citas para que otra persona pueda tomar la hora.' },
    accion: { texto: 'Ver mis citas', ruta: '/citas', icono: 'calendario' },
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
