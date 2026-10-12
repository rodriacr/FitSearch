const path = require('node:path');
const assert = require('node:assert/strict');
const base = path.resolve(__dirname, '..');
require(path.join(base, 'node_modules/dotenv')).config({
  path: path.join(base, '.env'),
  quiet: true,
});
const prisma = require(path.join(base, 'src/models/prisma'));
const request = require(path.join(base, 'node_modules/supertest'));
const jwt = require(path.join(base, 'node_modules/jsonwebtoken'));
const app = require(path.join(base, 'src/app'));
const creados = [],
  comprobaciones = [];
const token = (u) =>
  jwt.sign({ rol: u.rol.nombre, versionSesion: 0 }, process.env.JWT_SECRET, {
    subject: String(u.id),
    expiresIn: '10m',
  });
const api = (u, m, r, b) => {
  const peticion = request(app)[m]('/api' + r);
  return peticion
    .set('Authorization', 'Bearer ' + token(u))
    .send(b);
};
async function check(n, r, s) {
  const q = await r;
  assert.equal(q.status, s, n + ': ' + JSON.stringify(q.body));
  comprobaciones.push(n);
  return q.body;
}
(async () => {
  try {
    async function crear(rol) {
      const u = await prisma.usuario.create({
        data: {
          nombre: 'Prueba temporal agenda',
          correo: `qa-agenda-${Date.now()}-${creados.length}@example.test`,
          rolConfirmado: true,
          rol: { connect: { nombre: rol } },
          ...(rol === 'profesional' && {
            profesional: {
              create: {
                especialidad: 'Nutrición',
                comuna: 'Santiago',
                modalidad: 'presencial',
                ubicacionLat: -33.4,
                ubicacionLng: -70.6,
              },
            },
          }),
        },
        include: { rol: true, profesional: true },
      });
      creados.push(u.id);
      return u;
    }
    const p = await crear('profesional'),
      otro = await crear('profesional'),
      a = await crear('usuario'),
      b = await crear('usuario');
    const fecha = new Date(Date.now() + 2 * 86400000)
      .toISOString()
      .slice(0, 10);
    const h = { fecha, horaInicio: '09:00', horaFin: '11:00' };
    await check('Sin sesión', request(app).get('/api/disponibilidades'), 401);
    await check(
      'Usuario no publica',
      api(a, 'post', '/disponibilidades', h),
      403,
    );
    await check(
      'Horario invertido',
      api(p, 'post', '/disponibilidades', { ...h, horaFin: '08:00' }),
      400,
    );
    const slot = (
      await check(
        'Publica disponibilidad',
        api(p, 'post', '/disponibilidades', h),
        201,
      )
    ).horario;
    await check(
      'Duplicado exacto 09:00–11:00',
      api(p, 'post', '/disponibilidades', h),
      409,
    );
    await check(
      'Bloque libre 15:00–15:30',
      api(p, 'post', '/disponibilidades', {
        ...h,
        horaInicio: '15:00',
        horaFin: '15:30',
      }),
      201,
    );
    await check(
      'Bloque libre 14:00–14:30',
      api(p, 'post', '/disponibilidades', {
        ...h,
        horaInicio: '14:00',
        horaFin: '14:30',
      }),
      201,
    );
    await check(
      'Superposición al editar',
      api(p, 'put', `/disponibilidades/${slot.id}`, {
        ...h,
        horaInicio: '14:00',
        horaFin: '15:00',
      }),
      409,
    );
    await check(
      'Rechaza superposición',
      api(p, 'post', '/disponibilidades', {
        ...h,
        horaInicio: '10:00',
        horaFin: '12:00',
      }),
      409,
    );
    const vecino = (
      await check(
        'Permite bloque contiguo',
        api(p, 'post', '/disponibilidades', {
          ...h,
          horaInicio: '11:00',
          horaFin: '12:00',
        }),
        201,
      )
    ).horario;
    await check(
      'Otro profesional no edita',
      api(otro, 'put', `/disponibilidades/${slot.id}`, h),
      403,
    );
    await check(
      'Otro profesional no borra',
      api(otro, 'delete', `/disponibilidades/${slot.id}`),
      403,
    );
    await check(
      'Mensaje obligatorio',
      api(a, 'post', '/reservas', {
        disponibilidadId: slot.id,
        mensaje: 'corto',
      }),
      400,
    );
    const carreras = await Promise.all([
      api(a, 'post', '/reservas', {
        disponibilidadId: slot.id,
        mensaje: 'Necesito orientación nutricional',
      }),
      api(b, 'post', '/reservas', {
        disponibilidadId: slot.id,
        mensaje: 'Necesito una consulta deportiva',
      }),
    ]);
    assert.deepEqual(carreras.map((r) => r.status).sort(), [201, 409]);
    assert.equal(
      await prisma.reserva.count({
        where: {
          disponibilidadId: slot.id,
          estado: { in: ['pendiente', 'confirmada'] },
        },
      }),
      1,
    );
    comprobaciones.push(
      'Reserva simultánea: exactamente un 201 y un 409; una activa en MySQL',
    );
    const ganador = carreras[0].status === 201 ? a : b,
      perdedor = ganador === a ? b : a,
      r = carreras.find((r) => r.status === 201).body.reserva;
    const disponibles = await check(
      'Lista pública omite bloque ocupado',
      api(a, 'get', `/profesionales/${p.profesional.id}/disponibilidades`),
      200,
    );
    assert(!disponibles.horarios.some((h) => h.id === slot.id));
    assert(!JSON.stringify(disponibles).includes('mensaje'));
    await check(
      'Usuario no confirma',
      api(ganador, 'patch', `/reservas/${r.id}`, { estado: 'confirmada' }),
      403,
    );
    await check(
      'Otro usuario no cancela',
      api(perdedor, 'patch', `/reservas/${r.id}`, { estado: 'cancelada' }),
      403,
    );
    await check(
      'Otro profesional no confirma',
      api(otro, 'patch', `/reservas/${r.id}`, { estado: 'confirmada' }),
      403,
    );
    await check(
      'Protege horario reservado al editar',
      api(p, 'put', `/disponibilidades/${slot.id}`, h),
      409,
    );
    await check(
      'Protege horario reservado al borrar',
      api(p, 'delete', `/disponibilidades/${slot.id}`),
      409,
    );
    await check(
      'Profesional confirma',
      api(p, 'patch', `/reservas/${r.id}`, { estado: 'confirmada' }),
      200,
    );
    const ajenas = await check(
      'Historial privado del otro usuario',
      api(perdedor, 'get', '/reservas'),
      200,
    );
    assert.equal(ajenas.reservas.length, 0);
    await check(
      'Propietario cancela',
      api(ganador, 'patch', `/reservas/${r.id}`, { estado: 'cancelada' }),
      200,
    );
    await check(
      'Cancelada no se reactiva',
      api(p, 'patch', `/reservas/${r.id}`, { estado: 'confirmada' }),
      409,
    );
    const libres = await check(
      'Cancelación libera el bloque',
      api(
        perdedor,
        'get',
        `/profesionales/${p.profesional.id}/disponibilidades`,
      ),
      200,
    );
    assert(libres.horarios.some((h) => h.id === slot.id));
    assert(libres.horarios.every((h) => !Object.hasOwn(h, 'conHistorial')));
    comprobaciones.push('Listado público no revela historial cancelado');
    const nueva = (
      await check(
        'Nuevo usuario reserva bloque liberado',
        api(perdedor, 'post', '/reservas', {
          disponibilidadId: slot.id,
          mensaje: 'Nueva consulta tras cancelación',
        }),
        201,
      )
    ).reserva;
    await check(
      'Otro profesional no retira un bloque con historial',
      api(otro, 'delete', `/disponibilidades/${slot.id}`),
      403,
    );
    await check(
      'Reserva activa impide retiro',
      api(p, 'delete', `/disponibilidades/${slot.id}`),
      409,
    );
    await check(
      'Cancela antes de retirar',
      api(perdedor, 'patch', `/reservas/${nueva.id}`, { estado: 'cancelada' }),
      200,
    );
    const retirada = await check(
      'Retira horario con reservas canceladas',
      api(p, 'delete', `/disponibilidades/${slot.id}`),
      200,
    );
    assert.equal(retirada.retirado, true);
    assert.equal(
      (await prisma.disponibilidad.findUnique({ where: { id: slot.id } }))
        .retirado,
      true,
    );
    assert.equal(
      await prisma.reserva.count({ where: { disponibilidadId: slot.id } }),
      2,
    );
    const ocultos = await check(
      'Horario retirado no aparece en público',
      api(a, 'get', `/profesionales/${p.profesional.id}/disponibilidades`),
      200,
    );
    assert(!ocultos.horarios.some((h) => h.id === slot.id));
    const propios = await check(
      'Horario retirado no aparece en agenda propia',
      api(p, 'get', '/disponibilidades'),
      200,
    );
    assert(!propios.horarios.some((h) => h.id === slot.id));
    await check(
      'No reserva por ID retirado',
      api(a, 'post', '/reservas', {
        disponibilidadId: slot.id,
        mensaje: 'Consulta en un bloque retirado',
      }),
      409,
    );
    await check(
      'No edita un bloque retirado',
      api(p, 'put', `/disponibilidades/${slot.id}`, h),
      409,
    );
    const historial = await check(
      'Mantiene fecha y mensaje en historial tras retirar',
      api(ganador, 'get', '/reservas'),
      200,
    );
    assert.equal(historial.reservas[0].mensaje, r.mensaje);
    assert.equal(historial.reservas[0].horario.fecha, fecha);
    assert.equal(historial.reservas[0].horario.horaInicio, '09:00');
    assert.equal(historial.reservas[0].horario.horaFin, '11:00');
    assert.equal(historial.reservas[0].horario.retirado, true);
    await check(
      'Permite publicar otro bloque con las horas retiradas',
      api(p, 'post', '/disponibilidades', h),
      201,
    );

    await check(
      'Edita bloque sin reservas',
      api(p, 'put', `/disponibilidades/${vecino.id}`, {
        ...h,
        horaInicio: '12:00',
        horaFin: '13:00',
      }),
      200,
    );
    await check(
      'Elimina bloque sin reservas',
      api(p, 'delete', `/disponibilidades/${vecino.id}`),
      200,
    );
    await check(
      'Horario inexistente',
      api(a, 'post', '/reservas', {
        disponibilidadId: 2147483647,
        mensaje: 'Consulta de prueba inexistente',
      }),
      404,
    );
    const bloques = [];
    for (const hora of ['16:00', '17:00']) {
      bloques.push((await check('Publica bloque para límite por usuario '+hora,
        api(p,'post','/disponibilidades',{...h,horaInicio:hora,horaFin:hora.replace(':00',':30')}),201)).horario);
    }
    const simultaneas = await Promise.all(bloques.map((bloque) => api(a,'post','/reservas',{
      disponibilidadId:bloque.id,mensaje:'Consulta para comprobar límite por usuario',
    })));
    assert.deepEqual(simultaneas.map((q) => q.status).sort(),[201,409]);
    comprobaciones.push('Dos bloques simultáneos del mismo usuario y profesional: un 201 y un 409');
    const activa = simultaneas.find((q) => q.status === 201).body.reserva;
    const libre = bloques.find((q) => q.id !== activa.horario.id);
    await check('Confirma reserva para comprobar límite',api(p,'patch',`/reservas/${activa.id}`,{estado:'confirmada'}),200);
    await check('Confirmada bloquea otra reserva con el mismo profesional',api(a,'post','/reservas',{
      disponibilidadId:libre.id,mensaje:'Otra reserva que debe ser rechazada',
    }),409);
    const otroBloque=(await check('Publica bloque de otro profesional',api(otro,'post','/disponibilidades',h),201)).horario;
    await check('El límite permite reservar con otro profesional',api(a,'post','/reservas',{
      disponibilidadId:otroBloque.id,mensaje:'Consulta con un profesional diferente',
    }),201);
    await check('Cancela reserva para liberar límite',api(a,'patch',`/reservas/${activa.id}`,{estado:'cancelada'}),200);
    await check('Cancelada permite otra hora del mismo profesional',api(a,'post','/reservas',{
      disponibilidadId:libre.id,mensaje:'Nueva reserva después de cancelar',
    }),201);
    const pasado = await prisma.disponibilidad.create({data:{profesionalId:p.profesional.id,
      fecha:new Date('2020-01-01T00:00:00Z'),horaInicio:new Date('1970-01-01T09:00:00Z'),horaFin:new Date('1970-01-01T10:00:00Z')}});
    for (const [cuenta,ruta] of [[p,'/disponibilidades'],[b,`/profesionales/${p.profesional.id}/disponibilidades`]]) {
      const listado = await check('Omitir horarios pasados '+ruta,api(cuenta,'get',ruta),200);
      assert(!listado.horarios.some((q) => q.id === pasado.id));
    }
    const resultado = {
      fecha: new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Santiago',
      }).format(new Date()),
      mysqlReal: true,
      total: comprobaciones.length,
      comprobaciones,
      limpieza: 'Solo cuentas y horarios/reservas temporales',
    };
    console.log(JSON.stringify(resultado));
  } finally {
    const profesionales = await prisma.profesional.findMany({
      where: { usuarioId: { in: creados } },
      select: { id: true },
    });
    await prisma.reserva.deleteMany({
      where: {
        disponibilidad: {
          profesionalId: { in: profesionales.map((p) => p.id) },
        },
      },
    });
    await prisma.disponibilidad.deleteMany({
      where: { profesionalId: { in: profesionales.map((p) => p.id) } },
    });
    await prisma.usuario.deleteMany({ where: { id: { in: creados } } });
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
