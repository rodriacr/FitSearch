// Pruebas de carga contra la API en ejecución (Plan de Pruebas: QS1 y QS5 del DAS).
//   QS1: el 95 % de las búsquedas de profesionales responde en menos de 2 segundos con al menos 500 profesionales.
//   QS5: ningún horario queda con más de una reserva activa cuando muchas personas reservan a la vez.
// También mide la ficha de un profesional y el inicio de sesión (meta del DAS: menos de 2 segundos).
//
// Uso: con la API levantada (npm start o docker compose) y MySQL con las migraciones aplicadas:
//   npm run test:carga                      -> muestra el resultado
//   npm run test:carga -- --guardar-evidencia -> además lo guarda en Plan de Pruebas
// Variables opcionales: API_URL (por defecto http://localhost:3000/api), CARGA_CONEXIONES (20), CARGA_SEGUNDOS (20).
// Crea sus propios datos temporales (correos carga-*@example.test) y los elimina al terminar, aunque falle.
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const base = path.resolve(__dirname, '..');
require(path.join(base, 'node_modules/dotenv')).config({ path: path.join(base, '.env'), quiet: true });
const prisma = require(path.join(base, 'src/models/prisma'));
const jwt = require(path.join(base, 'node_modules/jsonwebtoken'));
const bcrypt = require(path.join(base, 'node_modules/bcryptjs'));

const API = (process.env.API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
const CONEXIONES = Number(process.env.CARGA_CONEXIONES) || 20;
const SEGUNDOS = Number(process.env.CARGA_SEGUNDOS) || 20;
const PROFESIONALES = 500;
const META_MS = 2000;
const guardarEvidencia = process.argv.includes('--guardar-evidencia');
const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
const EVIDENCIA = path.resolve(__dirname, `../../../Evidencias de documentación/Plan de Pruebas/Carga_QS1_QS5_${hoy}_${CONEXIONES}conexiones.json`);

const marca = `carga-${Date.now()}`;
const correo = (tipo, n) => `${marca}-${tipo}-${n}@example.test`;
const ESPECIALIDADES = ['Nutrición', 'Kinesiología', 'Entrenamiento personal', 'Psicología deportiva', 'Medicina deportiva'];
const COMUNAS = ['Santiago', 'Providencia', 'Las Condes', 'Ñuñoa', 'Maipú', 'La Florida', 'Puente Alto', 'Melipilla', 'Talagante', 'San Bernardo'];
const MODALIDADES = ['presencial', 'online', 'ambas'];
// Generador con semilla: los mismos datos en cada ejecución, para comparar resultados.
let semilla = 20261111;
const azar = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };

const evidencia = {
  prueba: 'Carga de la API (QS1 y QS5 del DAS)',
  fecha: hoy,
  api: API,
  entorno: { node: process.version, cpus: require('node:os').cpus().length, conexiones: CONEXIONES, segundosPorEscenario: SEGUNDOS },
  datos: {},
  escenarios: [],
  concurrenciaReservas: null,
};

const token = (u, rol) => jwt.sign({ rol, versionSesion: 0 }, process.env.JWT_SECRET, { subject: String(u.id), expiresIn: '30m' });

function percentil(ordenados, p) {
  if (!ordenados.length) return null;
  return ordenados[Math.min(ordenados.length - 1, Math.ceil((p / 100) * ordenados.length) - 1)];
}

// Ejecuta peticiones con N conexiones en paralelo durante el tiempo indicado y resume las latencias.
async function escenario(nombre, meta, crearPeticion) {
  const latencias = [];
  const estados = {};
  const fin = Date.now() + SEGUNDOS * 1000;
  const trabajador = async () => {
    while (Date.now() < fin) {
      const { ruta, opciones } = crearPeticion();
      const inicio = performance.now();
      let estado = 'error de red';
      try {
        const respuesta = await fetch(API + ruta, opciones);
        await respuesta.arrayBuffer();
        estado = respuesta.status;
      } catch { /* se cuenta como error */ }
      latencias.push(performance.now() - inicio);
      estados[estado] = (estados[estado] || 0) + 1;
    }
  };
  await Promise.all(Array.from({ length: CONEXIONES }, trabajador));
  const ordenados = latencias.sort((a, b) => a - b);
  const correctas = Object.entries(estados).filter(([e]) => Number(e) >= 200 && Number(e) < 300).reduce((t, [, n]) => t + n, 0);
  const redondear = (ms) => (ms === null ? null : Math.round(ms));
  const resultado = {
    escenario: nombre,
    meta,
    peticiones: ordenados.length,
    porSegundo: Math.round(ordenados.length / SEGUNDOS),
    estados,
    errores: ordenados.length - correctas,
    ms: { p50: redondear(percentil(ordenados, 50)), p95: redondear(percentil(ordenados, 95)), p99: redondear(percentil(ordenados, 99)), max: redondear(ordenados.at(-1)) },
  };
  resultado.cumple = resultado.errores === 0 && resultado.ms.p95 < META_MS;
  evidencia.escenarios.push(resultado);
  console.log(`${resultado.cumple ? 'OK ' : 'NO '} ${nombre}: ${resultado.peticiones} peticiones, p95 ${resultado.ms.p95} ms, errores ${resultado.errores}`);
  return resultado;
}

async function crearDatos() {
  const roles = Object.fromEntries((await prisma.rol.findMany()).map((r) => [r.nombre, r.id]));
  const establecimientos = [];
  for (let i = 0; i < 100; i += 1) {
    establecimientos.push(await prisma.establecimiento.create({ data: {
      nombre: `Centro de carga ${i + 1}`, categoria: i % 3 === 0 ? 'gimnasio' : 'centro_salud', comuna: COMUNAS[i % COMUNAS.length],
      direccion: `Dirección ficticia ${i + 1}`, ubicacionLat: -33.45 + (azar() - 0.5) * 0.3, ubicacionLng: -70.65 + (azar() - 0.5) * 0.3,
    } }));
  }
  const profesionales = [];
  for (let i = 0; i < PROFESIONALES; i += 1) {
    const u = await prisma.usuario.create({ data: {
      nombre: `Profesional Carga ${i + 1}`, correo: correo('profesional', i + 1), rolId: roles.profesional, rolConfirmado: true,
      profesional: { create: {
        especialidad: ESPECIALIDADES[i % ESPECIALIDADES.length], comuna: COMUNAS[i % COMUNAS.length], modalidad: MODALIDADES[i % 3],
        descripcion: `Perfil ficticio para pruebas de carga número ${i + 1}.`, verificado: i % 4 === 0,
        ubicacionLat: -33.45 + (azar() - 0.5) * 0.4, ubicacionLng: -70.65 + (azar() - 0.5) * 0.4,
        ...(i % 5 === 0 && { establecimientoId: establecimientos[(i / 5) % establecimientos.length].id }),
      } },
    }, include: { profesional: true } });
    profesionales.push(u);
  }
  const resenadores = [];
  for (let i = 0; i < 20; i += 1) {
    resenadores.push(await prisma.usuario.create({ data: { nombre: `Usuario Carga ${i + 1}`, correo: correo('resenador', i + 1), rolId: roles.usuario, rolConfirmado: true } }));
  }
  const resenas = profesionales.filter((_, i) => i % 3 !== 2).flatMap((p, i) => resenadores.slice(0, 1 + (i % 4)).map((r) => ({
    usuarioId: r.id, profesionalId: p.profesional.id, puntaje: 1 + Math.floor(azar() * 5), comentario: null,
  })));
  await prisma.resena.createMany({ data: resenas });
  const clave = crypto.randomBytes(12).toString('hex');
  const conClave = await prisma.usuario.create({ data: {
    nombre: 'Usuario Carga Login', correo: correo('login', 1), rolId: roles.usuario, rolConfirmado: true,
    passwordHash: await bcrypt.hash(clave, Number(process.env.BCRYPT_COST) || 10),
  } });
  const total = await prisma.profesional.count({ where: { usuario: { activo: true, rol: { nombre: 'profesional' } } } });
  evidencia.datos = { profesionalesTemporales: PROFESIONALES, profesionalesEnLaBase: total, establecimientosTemporales: establecimientos.length, resenasTemporales: resenas.length };
  return { profesionales, resenadores, roles, login: { correo: conClave.correo, clave } };
}

// QS5: muchas personas intentan reservar el mismo horario al mismo tiempo.
async function concurrenciaReservas(profesional, roles) {
  const fecha = new Date(`${new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date(Date.now() + 3 * 86400000))}T00:00:00Z`);
  const bloque = await prisma.disponibilidad.create({ data: {
    profesionalId: profesional.profesional.id, fecha, horaInicio: new Date('1970-01-01T10:00:00Z'), horaFin: new Date('1970-01-01T11:00:00Z'),
  } });
  const personas = [];
  for (let i = 0; i < 50; i += 1) {
    personas.push(await prisma.usuario.create({ data: { nombre: `Reserva Carga ${i + 1}`, correo: correo('reserva', i + 1), rolId: roles.usuario, rolConfirmado: true } }));
  }
  const respuestas = await Promise.all(personas.map((p) => fetch(`${API}/reservas`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(p, 'usuario')}` },
    body: JSON.stringify({ disponibilidadId: bloque.id, mensaje: 'Prueba de concurrencia de reservas.' }),
  }).then((r) => r.status).catch(() => 'error de red')));
  const estados = respuestas.reduce((t, e) => ({ ...t, [e]: (t[e] || 0) + 1 }), {});
  const activas = await prisma.reserva.count({ where: { disponibilidadId: bloque.id, estado: { in: ['pendiente', 'confirmada'] } } });
  evidencia.concurrenciaReservas = { solicitudesSimultaneas: personas.length, estados, reservasActivasDelHorario: activas, cumple: activas === 1 && estados[201] === 1 };
  console.log(`${evidencia.concurrenciaReservas.cumple ? 'OK ' : 'NO '} Reservas simultáneas: ${JSON.stringify(estados)}, activas en el horario: ${activas}`);
}

async function limpiar() {
  const de = { correo: { startsWith: `${marca}-` } };
  // Primero las cuentas de usuario (sus reservas y reseñas se borran con ellas); luego los profesionales y sus horarios.
  const usuarios = await prisma.usuario.deleteMany({ where: { ...de, rol: { nombre: 'usuario' } } });
  const profesionales = await prisma.usuario.deleteMany({ where: de });
  const centros = await prisma.establecimiento.deleteMany({ where: { nombre: { startsWith: 'Centro de carga ' }, direccion: { startsWith: 'Dirección ficticia ' } } });
  evidencia.limpieza = {
    cuentasEliminadas: usuarios.count + profesionales.count,
    establecimientosEliminados: centros.count,
    cuentasRestantes: await prisma.usuario.count({ where: de }),
  };
}

(async () => {
  try {
    const salud = await fetch(`${API}/salud`).then((r) => r.ok).catch(() => false);
    if (!salud) throw new Error(`La API no responde en ${API}/salud. Levántala antes de correr la prueba.`);
    const { profesionales, resenadores, roles, login } = await crearDatos();
    const usuario = token(resenadores[0], 'usuario');
    const conSesion = { headers: { Authorization: `Bearer ${usuario}` } };
    const ids = profesionales.map((p) => p.profesional.id);
    let n = 0;
    const siguiente = (lista) => lista[(n += 1) % lista.length];

    await escenario('Búsqueda sin filtros (QS1)', 'p95 < 2000 ms', () => ({ ruta: `/profesionales?pagina=${1 + (n % 5)}`, opciones: conSesion }));
    await escenario('Búsqueda por texto (QS1)', 'p95 < 2000 ms', () => ({ ruta: `/profesionales?q=${encodeURIComponent(siguiente(['kine', 'nutri', 'carga 12', 'rodilla', 'fuerza']))}`, opciones: conSesion }));
    await escenario('Búsqueda por especialidad y comuna (QS1)', 'p95 < 2000 ms', () => ({
      ruta: `/profesionales?especialidad=${encodeURIComponent(siguiente(ESPECIALIDADES))}&comuna=${encodeURIComponent(siguiente(COMUNAS))}&orden=calificacion`, opciones: conSesion,
    }));
    await escenario('Búsqueda por cercanía a 10 km (QS1)', 'p95 < 2000 ms', () => ({
      ruta: `/profesionales?lat=${(-33.45 + ((n % 7) - 3) * 0.02).toFixed(4)}&lng=-70.6500&distanciaKm=10&orden=cercania`, opciones: conSesion,
    }));
    await escenario('Ficha de un profesional', 'p95 < 2000 ms', () => ({ ruta: `/profesionales/${siguiente(ids)}`, opciones: conSesion }));
    await escenario('Inicio de sesión', 'p95 < 2000 ms', () => ({
      ruta: '/auth/login',
      opciones: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ correo: login.correo, password: login.clave }) },
    }));
    await concurrenciaReservas(profesionales[0], roles);

    evidencia.resultado = evidencia.escenarios.every((e) => e.cumple) && evidencia.concurrenciaReservas.cumple ? 'CUMPLE' : 'NO CUMPLE';
  } catch (error) {
    evidencia.resultado = 'ERROR';
    evidencia.error = error.message;
    process.exitCode = 1;
  } finally {
    try { await limpiar(); } catch (error) { evidencia.limpieza = { error: error.message }; process.exitCode = 1; }
    await prisma.$disconnect();
    if (guardarEvidencia) fs.writeFileSync(EVIDENCIA, JSON.stringify(evidencia, null, 2));
    console.log(JSON.stringify(evidencia, null, 2));
    console.log(guardarEvidencia ? `Evidencia guardada en ${EVIDENCIA}` : 'Evidencia no guardada (usa --guardar-evidencia para guardarla).');
  }
})();
