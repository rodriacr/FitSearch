// Derechos de la persona sobre sus datos (SC-42; DAS, QS9 y D43): descargar una copia de todo lo que su cuenta guardó en
// FitSearch y eliminar la cuenta.
//
// Eliminar no borra la fila de usuarios: la ANONIMIZA. Se borran el perfil, la salud, los datos de contacto, las comidas,
// el agua, los planes, las metas, el asistente, los favoritos, la lista de espera y los chats; la cuenta queda como
// «Usuario eliminado» (o «Profesional eliminado»), sin correo real, contraseña ni Google, desactivada y con sus sesiones
// cerradas. Así las citas y reseñas pasadas siguen existiendo para la otra parte, pero ya no identifican a nadie
// (decisión del PO del 24-11-2026). Las citas futuras se cancelan y se avisa por correo a la otra parte.
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { Prisma } = require('@prisma/client');
const prisma = require('../models/prisma');
const google = require('./google.service');
const avisos = require('./aviso.service');
const documentos = require('./documento.service');
const { ahoraChile, esFuturo } = require('./agenda.service');
const ErrorHttp = require('../utils/ErrorHttp');

const NOMBRE_ELIMINADO = { usuario: 'Usuario eliminado', profesional: 'Profesional eliminado' };
const ACTIVAS = ['pendiente', 'confirmada'];
const PERSONA = { select: { nombre: true } };
const PROFESIONAL = { select: { especialidad: true, usuario: PERSONA } };

// ---------------------------------------------------------------- Descargar mis datos

// Convierte lo que devuelve Prisma en un JSON legible: sin claves internas ni credenciales, con fechas en texto y
// decimales como números. Las fechas sin hora (columnas DATE) quedan como AAAA-MM-DD y las horas (TIME) como HH:MM.
const OMITIR = new Set(['id', 'passwordHash', 'googleId', 'versionSesion', 'tokenHash', 'clave', 'revisionVerificacion']);
function limpiar(valor, clave = '') {
  if (valor === null || valor === undefined) return null;
  if (valor instanceof Date) {
    const iso = valor.toISOString();
    if (/^hora/.test(clave)) return iso.slice(11, 16);
    return iso.endsWith('T00:00:00.000Z') ? iso.slice(0, 10) : iso;
  }
  if (Prisma.Decimal.isDecimal(valor)) return valor.toNumber();
  if (Array.isArray(valor)) return valor.map((v) => limpiar(v));
  if (typeof valor === 'object') {
    return Object.fromEntries(Object.entries(valor)
      .filter(([k]) => !OMITIR.has(k) && !/Id$/.test(k))
      .map(([k, v]) => [k, limpiar(v, k)]));
  }
  return valor;
}

const conProfesional = (fila) => {
  const { profesional, ...resto } = fila;
  return { ...resto, profesional: profesional ? { nombre: profesional.usuario.nombre, especialidad: profesional.especialidad } : null };
};
// En los chats, cada mensaje dice si lo escribió la persona o la otra parte, sin exponer identificadores.
const mensajesDeChat = (mensajes, usuarioId, otro) =>
  mensajes.map((m) => ({
    autor: m.autorId === usuarioId ? 'Tú' : otro, texto: m.texto, leido: m.leido, fecha: m.fechaCreacion,
    // Un plan enviado por el chat (SC-46): el plan tal como llegó y cuándo se guardó.
    ...(m.adjunto ? { planEnviado: { tipo: m.adjunto.tipo, plan: m.adjunto.plan, guardadoEn: m.guardadoEn } } : {}),
  }));

async function exportar(usuarioId) {
  const u = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    include: {
      rol: true, datosCuenta: true, perfil: true, informacionSalud: true, usoAsistente: true,
      favoritos: { include: { profesional: PROFESIONAL } },
      resenas: { include: { profesional: PROFESIONAL }, orderBy: { id: 'asc' } },
      reservas: { include: { disponibilidad: { include: { profesional: PROFESIONAL } } }, orderBy: { id: 'asc' } },
      listaEspera: { include: { profesional: PROFESIONAL } },
      chats: { include: { profesional: PROFESIONAL, mensajes: { orderBy: { id: 'asc' } } } },
      conversaciones: { include: { mensajes: { orderBy: { id: 'asc' } } }, orderBy: { id: 'asc' } },
      registrosComida: { include: { alimento: { select: { nombre: true } } }, orderBy: [{ fecha: 'asc' }, { id: 'asc' }] },
      registrosAgua: { orderBy: [{ fecha: 'asc' }, { id: 'asc' }] },
      planesAlimentacion: { orderBy: { desde: 'asc' } },
      planesPersonalizados: { orderBy: { id: 'asc' } },
      metasPeso: { orderBy: { desde: 'asc' } },
      registrosPeso: { orderBy: { fecha: 'asc' } },
      planesComida: { include: { items: { orderBy: [{ dia: 'asc' }, { orden: 'asc' }] } }, orderBy: { id: 'asc' } },
      permisosCompartir: { include: { profesional: PROFESIONAL } },
      accesosCompartidos: { include: { profesional: PROFESIONAL }, orderBy: { fecha: 'asc' } },
      profesional: {
        include: {
          documentos: { select: { tipo: true, nombre: true, mime: true, tamano: true, fechaCreacion: true } },
          disponibilidades: { include: { reservas: { include: { usuario: PERSONA } } }, orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }] },
          bloqueos: true,
          resenas: { include: { usuario: PERSONA }, orderBy: { id: 'asc' } },
          chats: { include: { usuario: PERSONA, mensajes: { orderBy: { id: 'asc' } } } },
        },
      },
    },
  });
  if (!u || u.eliminadoEn) throw new ErrorHttp(401, 'La cuenta ya no está disponible');

  const p = u.profesional;
  return limpiar({
    descripcion: 'Copia de los datos personales que tu cuenta guardó en FitSearch. No incluye contraseñas ni datos de otras personas, salvo su nombre cuando es parte de una cita, reseña o conversación contigo.',
    generado: new Date(),
    cuenta: {
      nombre: u.nombre, correo: u.correo, tipoDeCuenta: u.rol.nombre, fechaRegistro: u.fechaRegistro,
      tieneContrasena: Boolean(u.passwordHash), vinculadaConGoogle: Boolean(u.googleId),
      contactoYPresentacion: u.datosCuenta,
      ...(u.rol.nombre === 'usuario' && { preferencias: { recordatoriosCitas: u.recordatoriosCitas, avisosMensajesCorreo: u.avisosMensajesCorreo } }),
    },
    perfil: u.perfil,
    informacionDeSalud: u.informacionSalud,
    comidas: u.registrosComida.map(({ alimento, ...r }) => ({ ...r, alimento: alimento?.nombre ?? null })),
    agua: u.registrosAgua,
    planDeMacronutrientes: u.planesAlimentacion,
    planesPersonalizados: u.planesPersonalizados,
    metasDePeso: u.metasPeso,
    pesajes: u.registrosPeso,
    planesDeComidas: u.planesComida,
    progresoCompartido: u.permisosCompartir.map(conProfesional),
    registroDeAccesos: u.accesosCompartidos.map(conProfesional),
    asistente: {
      usoDeHoy: u.usoAsistente,
      conversaciones: u.conversaciones.map((c) => ({
        titulo: c.titulo, fijada: c.fijada, inicio: c.fechaInicio,
        mensajes: c.mensajes.map((m) => ({ de: m.remitente, contenido: m.contenido, especialidad: m.especialidad, comidasAgregadas: m.comidasAgregadas, fecha: m.fecha })),
      })),
    },
    favoritos: u.favoritos.map(conProfesional),
    resenasEscritas: u.resenas.map(conProfesional),
    citas: u.reservas.map(({ disponibilidad: d, ...r }) => ({
      ...r, fecha: d.fecha, horaInicio: d.horaInicio, horaFin: d.horaFin,
      profesional: { nombre: d.profesional.usuario.nombre, especialidad: d.profesional.especialidad },
    })),
    listaDeEspera: u.listaEspera.map(conProfesional),
    chats: u.chats.map((c) => ({
      con: c.profesional.usuario.nombre, especialidad: c.profesional.especialidad,
      mensajes: mensajesDeChat(c.mensajes, u.id, c.profesional.usuario.nombre),
    })),
    ...(p && {
      fichaProfesional: Object.fromEntries(Object.entries(p)
        .filter(([k]) => !['documentos', 'disponibilidades', 'bloqueos', 'resenas', 'chats'].includes(k))),
      documentosDeVerificacion: p.documentos,
      agenda: p.disponibilidades.map((d) => ({
        fecha: d.fecha, horaInicio: d.horaInicio, horaFin: d.horaFin, retirado: d.retirado,
        reservas: d.reservas.map(({ usuario, ...r }) => ({ ...r, persona: usuario.nombre })),
      })),
      bloqueosDeAgenda: p.bloqueos,
      resenasRecibidas: p.resenas.map(({ usuario, ...r }) => ({ ...r, autor: usuario.nombre })),
      chatsConClientes: p.chats.map((c) => ({ con: c.usuario.nombre, mensajes: mensajesDeChat(c.mensajes, u.id, c.usuario.nombre) })),
    }),
  });
}

// ---------------------------------------------------------------- Eliminar mi cuenta

async function confirmarIdentidad(cuenta, { password, credencial }) {
  let confirmada = false;
  if (password && cuenta.passwordHash) confirmada = await bcrypt.compare(password, cuenta.passwordHash);
  if (!confirmada && credencial && cuenta.googleId) {
    try { confirmada = (await google.verificarCredencial(credencial)).googleId === cuenta.googleId; } catch { confirmada = false; }
  }
  if (!confirmada) {
    throw new ErrorHttp(400, 'Confirma tu identidad para eliminar la cuenta', {
      password: cuenta.passwordHash ? 'La contraseña no es correcta' : 'Confirma con tu cuenta de Google vinculada',
    });
  }
}

const esCitaFutura = (d, ahora) => esFuturo({ fecha: d.fecha.toISOString().slice(0, 10), horaInicio: d.horaInicio.toISOString().slice(11, 16) }, ahora);

async function eliminar(usuarioId, datos, reloj = new Date()) {
  const cuenta = await prisma.usuario.findUnique({ where: { id: usuarioId }, include: { rol: true, profesional: { select: { id: true } } } });
  if (!cuenta || cuenta.eliminadoEn) throw new ErrorHttp(401, 'La cuenta ya no está disponible');
  const rol = cuenta.rol.nombre;
  if (rol === 'administrador') throw new ErrorHttp(403, 'Las cuentas de administrador no se eliminan desde la aplicación');
  await confirmarIdentidad(cuenta, datos);

  const ahora = ahoraChile(reloj);
  const profesionalId = cuenta.profesional?.id ?? null;
  const resultado = await prisma.$transaction(async (tx) => {
    // Bloquea la cuenta: otra petición no puede cambiarla ni eliminarla al mismo tiempo.
    const [vigente] = await tx.$queryRaw`SELECT version_sesion AS versionSesion, eliminado_en AS eliminadoEn FROM usuarios WHERE id = ${usuarioId} FOR UPDATE`;
    if (!vigente || vigente.eliminadoEn) throw new ErrorHttp(401, 'La cuenta ya no está disponible');
    if (vigente.versionSesion !== cuenta.versionSesion) throw new ErrorHttp(409, 'Tu cuenta cambió. Vuelve a cargar la página antes de eliminarla');

    // Citas que aún no ocurren: se cancelan (como persona o como profesional) y se avisa después de guardar.
    const activas = await tx.reserva.findMany({
      where: { estado: { in: ACTIVAS }, OR: [{ usuarioId }, ...(profesionalId ? [{ disponibilidad: { profesionalId } }] : [])] },
      include: { disponibilidad: { select: { fecha: true, horaInicio: true, profesionalId: true } } },
    });
    const futuras = activas.filter((r) => esCitaFutura(r.disponibilidad, ahora));
    for (const r of futuras) {
      await tx.reserva.update({
        where: { id: r.id },
        data: { estado: 'cancelada', canceladaPor: r.usuarioId === usuarioId ? 'usuario' : 'profesional', fechaCambio: reloj },
      });
    }

    // Datos personales de la cuenta (el orden respeta las llaves foráneas).
    const donde = { where: { usuarioId } };
    await tx.planAlimentacion.deleteMany(donde);
    await tx.planPersonalizado.deleteMany(donde);
    await tx.metaPeso.deleteMany(donde);
    await tx.registroPeso.deleteMany(donde);
    await tx.planComida.deleteMany(donde);
    await tx.permisoCompartir.deleteMany(donde);
    await tx.accesoCompartido.deleteMany(donde);
    await tx.registroComida.deleteMany(donde);
    await tx.registroAgua.deleteMany(donde);
    await tx.conversacion.deleteMany(donde);
    await tx.usoAsistente.deleteMany(donde);
    await tx.favorito.deleteMany(donde);
    await tx.listaEspera.deleteMany(donde);
    await tx.chatCita.deleteMany(donde);
    await tx.tokenRecuperacion.deleteMany(donde);
    await tx.informacionSalud.deleteMany(donde);
    await tx.perfilUsuario.deleteMany(donde);
    await tx.datosCuenta.deleteMany(donde);

    // Cuenta profesional: la ficha deja de mostrarse (cuenta inactiva) y pierde sus datos de contacto, ubicación,
    // formación y documentos. Se conservan la especialidad y las citas pasadas para el historial de sus clientes.
    let claves = [];
    if (profesionalId) {
      const docs = await tx.documentoProfesional.findMany({ where: { profesionalId }, select: { clave: true } });
      claves = docs.map((d) => d.clave);
      const dondeP = { where: { profesionalId } };
      await tx.documentoProfesional.deleteMany(dondeP);
      await tx.bloqueoAgenda.deleteMany(dondeP);
      await tx.listaEspera.deleteMany(dondeP);
      await tx.favorito.deleteMany(dondeP);
      await tx.chatCita.deleteMany(dondeP);
      await tx.permisoCompartir.deleteMany(dondeP);
      await tx.disponibilidad.deleteMany({ where: { profesionalId, reservas: { none: {} } } });
      await tx.profesional.update({
        where: { id: profesionalId },
        data: {
          descripcion: null, rut: null, telefono: null, ubicacionLat: null, ubicacionLng: null, comuna: null, direccion: null,
          aniosExperiencia: null, formacion: Prisma.DbNull, atiendeA: Prisma.DbNull, registroSis: null, precioDesde: null,
          motivoRechazo: null, historialVerificacion: Prisma.DbNull, verificado: false, estadoVerificacion: 'sin_solicitud',
          establecimientoId: null,
        },
      });
    }

    await tx.usuario.update({
      where: { id: usuarioId },
      data: {
        nombre: NOMBRE_ELIMINADO[rol] || NOMBRE_ELIMINADO.usuario,
        correo: `eliminado-${usuarioId}-${crypto.randomBytes(6).toString('hex')}@fitsearch.invalid`,
        passwordHash: null, googleId: null, activo: false, eliminadoEn: reloj, versionSesion: { increment: 1 },
        recordatoriosCitas: false, avisosMensajesCorreo: false, ultimoAvisoMensajes: null,
      },
    });
    return { futuras, claves };
  });

  // Después de guardar: avisos de las citas canceladas, horas liberadas y archivos de verificación.
  for (const r of resultado.futuras) avisos.avisarCuentaEliminada(r.id, { nombre: cuenta.nombre, rol });
  if (rol === 'usuario') {
    for (const id of new Set(resultado.futuras.map((r) => r.disponibilidad.profesionalId))) avisos.avisarHoraLiberada(id);
  }
  await documentos.eliminarArchivos(resultado.claves);
  return { citasCanceladas: resultado.futuras.length };
}

module.exports = { exportar, eliminar, limpiar, NOMBRE_ELIMINADO };
