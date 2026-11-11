// Comprobación con MySQL real de las mejoras del 09-11-2026 (agenda semanal, horarios en serie, fechas bloqueadas,
// modalidad y primera visita, confirmación automática, lista de espera, reseñas verificadas, recordatorios, clientes,
// reportes y chat entre usuario y profesional). Crea cuentas temporales y las borra al final. Uso: npm run test:mysql:mejoras
// Los correos nunca salen: el SMTP se desactiva y los avisos solo se escriben en la consola (se silencian aquí).
const path = require('node:path');
const assert = require('node:assert/strict');
const base = path.resolve(__dirname, '..');
require(path.join(base, 'node_modules/dotenv')).config({ path: path.join(base, '.env'), quiet: true });
process.env.SMTP_USUARIO = '';
process.env.SMTP_CONTRASENA = '';
const infoOriginal = console.info;
console.info = (texto, ...resto) => (String(texto).startsWith('[correo sin SMTP') ? undefined : infoOriginal(texto, ...resto));
const prisma = require(path.join(base, 'src/models/prisma'));
const request = require(path.join(base, 'node_modules/supertest'));
const jwt = require(path.join(base, 'node_modules/jsonwebtoken'));
const app = require(path.join(base, 'src/app'));
const recordatorios = require(path.join(base, 'src/services/recordatorio.service'));
const { fechaEnChile, sumarDias } = require(path.join(base, 'src/utils/fechaChile'));

const creados = [];
const comprobaciones = [];
const token = (u) => jwt.sign({ rol: u.rol.nombre, versionSesion: 0 }, process.env.JWT_SECRET, { subject: String(u.id), expiresIn: '10m' });
const api = (u, metodo, ruta, cuerpo) => request(app)[metodo](`/api${ruta}`).set('Authorization', `Bearer ${token(u)}`).send(cuerpo);
async function check(nombre, peticion, estado) {
  const r = await peticion;
  assert.equal(r.status, estado, `${nombre}: ${JSON.stringify(r.body)}`);
  comprobaciones.push(nombre);
  return r.body;
}
const ok = (nombre, condicion, detalle = '') => { assert.ok(condicion, `${nombre} ${detalle}`); comprobaciones.push(nombre); };
const esperar = (ms) => new Promise((listo) => { setTimeout(listo, ms); });

(async () => {
  try {
    async function crear(rol, modalidad = 'ambas') {
      const u = await prisma.usuario.create({
        data: {
          nombre: `Prueba mejoras ${rol} ${creados.length}`,
          correo: `qa-mejoras-${Date.now()}-${creados.length}@example.test`,
          rolConfirmado: true,
          rol: { connect: { nombre: rol } },
          ...(rol === 'profesional' && {
            profesional: { create: { especialidad: 'Nutrición', comuna: 'Ñuñoa', modalidad, ubicacionLat: -33.45, ubicacionLng: -70.6 } },
          }),
        },
        include: { rol: true, profesional: true },
      });
      creados.push(u.id);
      return u;
    }
    const p = await crear('profesional');
    const a = await crear('usuario');
    const b = await crear('usuario');
    const c = await crear('usuario');
    const hoy = fechaEnChile();
    const dia = sumarDias(hoy, 3);
    const otroDia = sumarDias(hoy, 4);

    // Horarios en serie y fechas bloqueadas.
    const serie = await check('Serie de 3 bloques de 45 min', api(p, 'post', '/disponibilidades/serie', { fecha: dia, horaInicio: '09:00', horaFin: '11:30', duracion: 45 }), 201);
    ok('La serie crea 09:00, 09:45 y 10:30', serie.horarios.map((h) => h.horaInicio).join() === '09:00,09:45,10:30');
    const repetida = await check('Repetir la serie omite los que chocan', api(p, 'post', '/disponibilidades/serie', { fecha: dia, horaInicio: '09:00', horaFin: '12:00', duracion: 45 }), 201);
    ok('Solo se agrega 11:15 y se omiten los 3 que chocan', repetida.horarios.map((h) => h.horaInicio).join() === '11:15' && repetida.omitidos.length === 3, JSON.stringify(repetida));
    await check('Bloquea el día siguiente', api(p, 'post', '/agenda/bloqueos', { fechaInicio: otroDia, fechaFin: otroDia, motivo: 'Congreso' }), 201);
    await check('No publica en un día bloqueado', api(p, 'post', '/disponibilidades', { fecha: otroDia, horaInicio: '09:00', horaFin: '10:00' }), 409);
    await check('Bloqueo superpuesto rechazado', api(p, 'post', '/agenda/bloqueos', { fechaInicio: otroDia, fechaFin: otroDia }), 409);
    const semana = await check('Semana del profesional', api(p, 'get', `/agenda/semana?desde=${dia}`), 200);
    ok('La semana trae los horarios y el bloqueo', semana.horarios.length >= 3 && semana.bloqueos.length === 1);

    // Reserva con modalidad y primera visita; límite y bloqueo con reservas activas.
    const [h1, h2] = serie.horarios;
    await check('Sin modalidad (atiende de ambas formas) → 400', api(a, 'post', '/reservas', { disponibilidadId: h1.id, mensaje: 'Necesito una evaluación nutricional' }), 400);
    const r1 = (await check('Reserva online de primera visita', api(a, 'post', '/reservas', { disponibilidadId: h1.id, mensaje: 'Necesito una evaluación nutricional', modalidad: 'online', primeraVisita: true }), 201)).reserva;
    ok('Guarda modalidad y primera visita', r1.modalidad === 'online' && r1.primeraVisita === true && r1.estado === 'pendiente');
    await check('No bloquea un día con reservas activas', api(p, 'post', '/agenda/bloqueos', { fechaInicio: dia, fechaFin: dia }), 409);
    await check('Confirmación automática activada', api(p, 'put', '/profesionales/mi-ficha/configuracion', { autoconfirmar: true }), 200);
    const r2 = (await check('Reserva con confirmación automática', api(b, 'post', '/reservas', { disponibilidadId: h2.id, mensaje: 'Control de alimentación deportiva', modalidad: 'presencial', primeraVisita: false }), 201)).reserva;
    ok('Nace confirmada', r2.estado === 'confirmada');

    // Chat entre el usuario y el profesional: uno por pareja, solo para los dos.
    const chat = (await check('El usuario abre el chat desde su reserva', api(a, 'post', '/chats', { reservaId: r1.id }), 200)).id;
    await check('El usuario escribe', api(a, 'post', `/chats/${chat}/mensajes`, { texto: 'Hola, ¿llevo exámenes?' }), 201);
    await check('Otra cuenta recibe «no existe»', api(b, 'get', `/chats/${chat}`), 404);
    await check('Otra cuenta no abre el chat desde una reserva ajena', api(b, 'post', '/chats', { reservaId: r1.id }), 404);
    ok('El profesional tiene 1 mensaje sin leer', (await check('Aviso de mensaje nuevo', api(p, 'get', '/chats/no-leidos'), 200)).total === 1);
    ok('El profesional llega al mismo chat', (await check('El profesional abre el chat desde la reserva', api(p, 'post', '/chats', { reservaId: r1.id }), 200)).id === chat);
    const leida = await check('El profesional abre el chat', api(p, 'get', `/chats/${chat}`), 200);
    ok('Ve el mensaje del usuario y el aviso de la reserva', leida.mensajes.length === 1 && leida.mensajes[0].propio === false && leida.chat.reservas.some((x) => x.id === r1.id));
    ok('Queda leído', (await check('Sin leer después de abrir', api(p, 'get', '/chats/no-leidos'), 200)).total === 0);
    ok('La base no admite un segundo chat de la misma pareja', await prisma.chatCita.create({ data: { usuarioId: a.id, profesionalId: p.profesional.id } }).then(() => false, (e) => e.code === 'P2002'));

    // Lista de espera: al cancelar una reserva futura se avisa y se sale de la lista.
    await check('Se anota en la lista de espera', api(c, 'post', `/profesionales/${p.profesional.id}/lista-espera`), 201);
    ok('La semana cuenta 1 persona esperando', (await check('Semana con lista de espera', api(p, 'get', `/agenda/semana?desde=${dia}`), 200)).listaEspera === 1);
    await check('El usuario cancela su reserva', api(a, 'patch', `/reservas/${r1.id}`, { estado: 'cancelada' }), 200);
    await esperar(800);
    ok('Quien esperaba sale de la lista tras el aviso', !(await check('Estado de la lista', api(c, 'get', `/profesionales/${p.profesional.id}/lista-espera`), 200)).enLista);
    ok('La cancelación registra quién canceló', (await prisma.reserva.findUnique({ where: { id: r1.id } })).canceladaPor === 'usuario');
    // El chat sigue tras cancelar; cada uno lo elimina para sí y, si los dos lo eliminan, se borra lo que ninguno ve.
    await check('El chat sigue tras cancelar y admite mensajes', api(a, 'post', `/chats/${chat}/mensajes`, { texto: 'Cancelé, ¿hay otra hora?' }), 201);
    ok('Un solo chat con ese profesional', (await check('Lista de chats del usuario', api(a, 'get', '/chats'), 200)).chats.filter((x) => x.con.profesionalId === p.profesional.id).length === 1);
    await check('El usuario elimina el chat para sí', api(a, 'delete', `/chats/${chat}`), 200);
    ok('El usuario ya no lo ve en su lista', !(await check('Lista tras eliminar', api(a, 'get', '/chats'), 200)).chats.some((x) => x.id === chat));
    ok('El profesional conserva el historial', (await check('El profesional vuelve a abrir el chat', api(p, 'get', `/chats/${chat}`), 200)).mensajes.length === 2);
    await check('El profesional responde', api(p, 'post', `/chats/${chat}/mensajes`, { texto: 'Sí, el jueves a las 10' }), 201);
    ok('Reaparece en la lista del usuario', (await check('Lista con el mensaje nuevo', api(a, 'get', '/chats'), 200)).chats.some((x) => x.id === chat && x.noLeidos === 1));
    const vuelta = await check('El usuario abre el chat de nuevo', api(a, 'get', `/chats/${chat}`), 200);
    ok('Solo ve lo nuevo', vuelta.mensajes.length === 1 && vuelta.mensajes[0].texto === 'Sí, el jueves a las 10');
    await check('El profesional también lo elimina', api(p, 'delete', `/chats/${chat}`), 200);
    ok('Lo que ninguno ve se borra de la base', (await prisma.mensajeCita.count({ where: { chatId: chat } })) === 1);

    // Reseñas verificadas: sin cita no se puede; con una cita confirmada pasada, queda verificada.
    await check('Sin cita no puede reseñar', api(c, 'put', `/profesionales/${p.profesional.id}/resenas`, { puntaje: 5 }), 403);
    const pasada = await prisma.disponibilidad.create({ data: {
      profesionalId: p.profesional.id, fecha: new Date(`${sumarDias(hoy, -2)}T00:00:00Z`),
      horaInicio: new Date('1970-01-01T10:00:00Z'), horaFin: new Date('1970-01-01T11:00:00Z'),
    } });
    await prisma.reserva.create({ data: { usuarioId: c.id, disponibilidadId: pasada.id, mensaje: 'Cita pasada de prueba', estado: 'confirmada' } });
    const resena = await check('Con cita pasada confirmada reseña', api(c, 'put', `/profesionales/${p.profesional.id}/resenas`, { puntaje: 5, comentario: 'Excelente atención y muy clara' }), 201);
    ok('La reseña queda verificada', resena.resena.verificada === true);
    const ficha = await check('Ficha para quien no tuvo cita', api(a, 'get', `/profesionales/${p.profesional.id}`), 200);
    ok('Avisa que falta la cita', ficha.puedeResenar === false && ficha.motivoSinResena === 'sin_cita');
    ok('Filtro de positivas', (await check('Reseñas positivas', api(a, 'get', `/profesionales/${p.profesional.id}/resenas?tipo=positivas`), 200)).total === 1);

    // Buscador con la próxima hora libre y el filtro de disponibilidad.
    const lista = await check('Buscador con horas libres en 7 días', api(a, 'get', '/profesionales?disponible=semana&especialidad=Nutrici%C3%B3n&limite=12'), 200);
    const enLista = lista.profesionales.find((x) => x.id === p.profesional.id);
    ok('Trae su próxima hora y hasta 3 horas', enLista && enLista.proximaHora && enLista.proximasHoras.length >= 1 && enLista.proximasHoras.length <= 3);

    // Experiencia en la ficha pública.
    await check('Guarda la experiencia', api(p, 'put', '/profesionales/mi-ficha/experiencia', {
      aniosExperiencia: 6, registroSis: '12.345', precioDesde: 25000, atiendeA: ['adultos'], formacion: [{ titulo: 'Nutricionista', institucion: 'Universidad de Chile', anio: 2018 }],
    }), 200);
    const publica = (await check('La ficha pública muestra la experiencia', api(a, 'get', `/profesionales/${p.profesional.id}`), 200)).profesional;
    ok('Experiencia en la ficha', publica.aniosExperiencia === 6 && publica.registroSis === '12345' && publica.formacion.length === 1);
    await check('Experiencia inválida → 400', api(p, 'put', '/profesionales/mi-ficha/experiencia', { aniosExperiencia: 99 }), 400);

    // Clientes y reportes.
    const clientes = await check('Clientes del profesional', api(p, 'get', '/profesional/clientes'), 200);
    ok('Lista a las tres personas que reservaron', clientes.total === 3);
    ok('Sin correo ni salud', !JSON.stringify(clientes).match(/@|alergia|medicamento/));
    await check('Historial de un cliente', api(p, 'get', `/profesional/clientes/${c.id}`), 200);
    await check('Un usuario no ve los clientes', api(a, 'get', '/profesional/clientes'), 403);
    const reporte = await check('Reportes del profesional', api(p, 'get', '/profesional/reportes?semanas=4'), 200);
    ok('Reporte con 4 semanas y calificación', reporte.porSemana.length === 4 && reporte.calificacion.total === 1 && reporte.calificacion.verificadas === 1);

    // Recordatorio: una cita confirmada dentro de las próximas 24 horas recibe un solo aviso.
    const ahora = new Date();
    // A las 22:00 del día siguiente en Chile si ahora es de noche; si no, en dos horas (siempre dentro de las 24 horas).
    const enDosHoras = new Date(ahora.getTime() + 2 * 3600000);
    const formato = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    const horaChile = formato.format(enDosHoras) > '22:30' ? '22:30' : formato.format(enDosHoras);
    const horaFin = `${String(Number(horaChile.slice(0, 2)) + 1).padStart(2, '0')}:${horaChile.slice(3, 5)}`;
    const pronto = await prisma.disponibilidad.create({ data: {
      profesionalId: p.profesional.id, fecha: new Date(`${fechaEnChile(enDosHoras)}T00:00:00Z`),
      horaInicio: new Date(`1970-01-01T${horaChile}:00Z`), horaFin: new Date(`1970-01-01T${horaFin}:00Z`),
    } });
    {
      const cita = await prisma.reserva.create({ data: { usuarioId: b.id, disponibilidadId: pronto.id, mensaje: 'Cita para el recordatorio', estado: 'confirmada' } });
      await recordatorios.enviarPendientes(ahora);
      ok('Marca el recordatorio enviado', Boolean((await prisma.reserva.findUnique({ where: { id: cita.id } })).recordatorioEn));
      const segunda = await recordatorios.pendientes(ahora);
      ok('No lo repite', !segunda.some((r) => r.id === cita.id));
    }

    console.log(JSON.stringify({ fecha: hoy, mysqlReal: true, total: comprobaciones.length, comprobaciones, limpieza: 'Solo cuentas, horarios, reservas, chats, reseñas y bloqueos temporales' }));
  } finally {
    const profesionales = (await prisma.profesional.findMany({ where: { usuarioId: { in: creados } }, select: { id: true } })).map((x) => x.id);
    await prisma.chatCita.deleteMany({ where: { profesionalId: { in: profesionales } } });
    await prisma.resena.deleteMany({ where: { profesionalId: { in: profesionales } } });
    await prisma.reserva.deleteMany({ where: { disponibilidad: { profesionalId: { in: profesionales } } } });
    await prisma.disponibilidad.deleteMany({ where: { profesionalId: { in: profesionales } } });
    await prisma.usuario.deleteMany({ where: { id: { in: creados } } });
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
