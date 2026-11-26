// Logros y medallas (25-11-2026). Las medallas premian hábitos que hacen bien: constancia, hidratación, equilibrio
// (días cerca de la meta, nunca bajo ella), variedad, cuidado con profesionales y conocer FitSearch. No hay medallas por
// comer menos ni por bajar de peso, y un día de descanso a la semana no corta la racha.
// Todo se calcula con lo que la persona ya registra; las medallas ganadas se guardan para conservarlas y avisar las nuevas.
const { agua: reglasAgua, comidas: reglasComidas, logros: reglas } = require('../../../shared/reglas.json');
const modelo = require('../models/logro.model');
const perfilServicio = require('./perfil.service');
const { objetivoDiario } = require('./comida.service');
const { fechaEnChile, horaEnChile, sumarDias, lunesDeLaSemana } = require('../utils/fechaChile');

const NIVELES = ['bronce', 'plata', 'oro', 'platino'];
const MOMENTOS = reglasComidas.momentos.map(({ valor }) => valor);
const dia = (fecha) => fecha.toISOString().slice(0, 10);
// Copia de un objeto sin las claves indicadas (para no enviar al navegador datos internos de las reglas).
const sin = (objeto, claves) => Object.fromEntries(Object.entries(objeto).filter(([clave]) => !claves.includes(clave)));
const titulo = (texto) => texto[0].toUpperCase() + texto.slice(1);

// Racha con descanso: días seguidos con comidas registradas; se tolera un día sin registros por semana (de lunes a
// domingo) sin cortar la racha, siempre que no sean dos días seguidos. Hoy no corta la racha mientras no termine.
function rachaConDescanso(fechas, hoy) {
  if (!fechas.size) return { actual: 0, mejor: 0, descansoUsado: false };
  let fecha = [...fechas].sort()[0];
  let actual = 0;
  let mejor = 0;
  let semanaDescanso = null;
  let ayerRegistrado = false;
  while (fecha <= hoy) {
    if (fechas.has(fecha)) {
      actual += 1;
      ayerRegistrado = true;
    } else if (fecha === hoy) {
      break;
    } else if (ayerRegistrado && semanaDescanso !== lunesDeLaSemana(fecha)) {
      semanaDescanso = lunesDeLaSemana(fecha);
      ayerRegistrado = false;
    } else {
      actual = 0;
      semanaDescanso = null;
      ayerRegistrado = false;
    }
    mejor = Math.max(mejor, actual);
    fecha = sumarDias(fecha, 1);
  }
  return { actual, mejor, descansoUsado: semanaDescanso === lunesDeLaSemana(hoy) };
}

const cercaDeLaMeta = (calorias, meta) => Math.abs(calorias / meta - 1) <= reglasComidas.estadisticas.margenMeta;

// Ventana de un reto de temporada para la fecha: la edición en curso o, si no hay, la próxima. Una ventana que cruza el
// año (de diciembre a febrero) pertenece al año en que termina.
function ventanaDe({ desde, hasta }, hoy) {
  const anio = Number(hoy.slice(0, 4));
  const cruza = desde > hasta;
  for (const fin of [anio, anio + 1]) {
    const inicio = `${cruza ? fin - 1 : fin}-${desde}`;
    const termino = `${fin}-${hasta}`;
    if (hoy <= termino) return { inicio, termino, periodo: String(fin), activa: hoy >= inicio };
  }
  return null;
}

// Reúne los datos de la persona que usan las reglas.
async function datosDe(usuarioId, hoy) {
  const [calorias, agua, alimentos, momentos, desayunos, citas, conteos, perfil, objetivo] = await Promise.all([
    modelo.caloriasPorDia(usuarioId, hoy), modelo.aguaPorDia(usuarioId, hoy), modelo.alimentosDistintos(usuarioId),
    modelo.momentosPorDia(usuarioId), modelo.desayunos(usuarioId), modelo.citasConfirmadas(usuarioId), modelo.conteos(usuarioId),
    perfilServicio.obtener(usuarioId), objetivoDiario(usuarioId, hoy),
  ]);
  const meta = objetivo.calorias || null;
  const diasComida = new Set(calorias.map(({ fecha }) => dia(fecha)));
  const diasAgua = agua.filter(({ _sum }) => (_sum.ml ?? 0) >= reglasAgua.metaDiariaMl).map(({ fecha }) => dia(fecha));
  // Hoy todavía no termina: no cuenta como día cerca de la meta, igual que en las estadísticas.
  const diasEquilibrio = meta ? calorias.filter(({ fecha, _sum }) => dia(fecha) < hoy && cercaDeLaMeta(_sum.calorias ?? 0, meta)).map(({ fecha }) => dia(fecha)) : [];
  const porDia = new Map();
  momentos.forEach(({ fecha, momento }) => porDia.set(dia(fecha), (porDia.get(dia(fecha)) ?? new Set()).add(momento)));
  const findes = new Set([...diasComida].filter((f) => new Date(`${f}T00:00:00Z`).getUTCDay() === 6 && diasComida.has(sumarDias(f, 1))));
  return {
    hoy, meta, diasComida, diasAgua, diasEquilibrio, racha: rachaConDescanso(diasComida, hoy), alimentos,
    diasArcoiris: [...porDia.values()].filter((set) => MOMENTOS.every((m) => set.has(m))).length,
    desayunosTempranos: desayunos.filter(({ fechaCreacion }) => horaEnChile(fechaCreacion) < '08:00').length,
    findes: findes.size,
    citas: citas.length, controles: citas.filter(({ disponibilidad }) => dia(disponibilidad.fecha) < hoy).length,
    ...conteos,
    perfilCompleto: Object.entries(perfil.pasos).every(([, hecho]) => hecho),
  };
}

// Valor de cada colección con sus cuatro metas (Bronce, Plata, Oro y Platino). Cuidado profesional y Explorador tienen un
// hito distinto en cada nivel.
function colecciones(d) {
  return reglas.colecciones.map((coleccion) => {
    const valores = {
      constancia: () => d.racha.mejor, hidratacion: () => d.diasAgua.length, equilibrio: () => d.diasEquilibrio.length,
      variedad: () => d.alimentos,
      cuidado: (k) => [d.citas, d.resenas, d.controles, d.controles][k],
      explorador: (k) => [Number(d.perfilCompleto), Number(d.conversaciones > 0), Number(d.favoritos > 0), Number(d.planesPropios > 0)][k],
    };
    const valor = valores[coleccion.clave];
    return {
      ...coleccion,
      niveles: coleccion.metas.map((meta, k) => ({ nivel: NIVELES[k], meta, etiqueta: coleccion.etiquetas[k], valor: Math.min(valor(k), meta) })),
    };
  });
}

function secretas(d) {
  const valores = { madrugador: d.desayunosTempranos, arcoiris: d.diasArcoiris, finde: d.findes };
  return reglas.secretas.map((s) => ({ ...s, valor: Math.min(valores[s.clave], s.meta) }));
}

function temporada(d) {
  return reglas.temporada.map((reto) => {
    const ventana = ventanaDe(reto, d.hoy);
    if (!ventana) return null;
    const dias = { agua: d.diasAgua, equilibrio: d.diasEquilibrio, registro: [...d.diasComida] }[reto.tipo];
    const valor = dias.filter((f) => f >= ventana.inicio && f <= ventana.termino).length;
    return { ...reto, ...ventana, valor: Math.min(valor, reto.meta) };
  }).filter(Boolean);
}

const puntosDe = ({ nivel }) => reglas.puntos[nivel] ?? 0;

function nivelDe(puntos) {
  const indice = reglas.niveles.findLastIndex(({ desde }) => puntos >= desde);
  const actual = reglas.niveles[indice];
  const siguiente = reglas.niveles[indice + 1] ?? null;
  return {
    numero: indice + 1, nombre: actual.nombre, puntos, desde: actual.desde,
    siguiente: siguiente ? { numero: indice + 2, nombre: siguiente.nombre, desde: siguiente.desde } : null,
    progreso: siguiente ? (puntos - actual.desde) / (siguiente.desde - actual.desde) : 1,
  };
}

// Logros de la persona. Guarda las medallas que acaba de ganar y devuelve como «nuevas» las que aún no vio.
async function resumen(usuarioId, ahora = new Date()) {
  const hoy = fechaEnChile(ahora);
  const d = await datosDe(usuarioId, hoy);
  const listaColecciones = colecciones(d);
  const listaSecretas = secretas(d);
  const listaTemporada = temporada(d);
  const logradas = [
    ...listaColecciones.flatMap((c) => c.niveles.filter((n) => n.valor >= n.meta).map((n) => ({ clave: c.clave, nivel: n.nivel, periodo: '' }))),
    ...listaSecretas.filter((s) => s.valor >= s.meta).map((s) => ({ clave: s.clave, nivel: 'secreta', periodo: '' })),
    ...listaTemporada.filter((t) => t.activa && t.valor >= t.meta).map((t) => ({ clave: t.clave, nivel: 'temporada', periodo: t.periodo })),
  ];
  if (logradas.length) await modelo.guardar(usuarioId, logradas);
  const guardadas = await modelo.ganadas(usuarioId);
  const tiene = (clave, nivel, periodo = '') => guardadas.find((g) => g.clave === clave && g.nivel === nivel && g.periodo === periodo);

  // Una medalla guardada se conserva aunque después cambien los datos (por ejemplo, si se borra un registro).
  const conFecha = (g) => ({ obtenida: Boolean(g), fecha: g ? g.fechaObtenida.toISOString() : null });
  const respuestaColecciones = listaColecciones.map((coleccion) => {
    const c = sin(coleccion, ['metas', 'etiquetas']);
    const niveles = c.niveles.map((n) => ({ ...n, ...conFecha(tiene(c.clave, n.nivel)) }));
    return { ...c, niveles, obtenidas: niveles.filter((n) => n.obtenida).length };
  });
  const respuestaSecretas = listaSecretas.map((s) => {
    const g = tiene(s.clave, 'secreta');
    return { clave: s.clave, icono: s.icono, pista: s.pista, meta: s.meta, valor: s.valor, ...conFecha(g), nombre: g ? s.nombre : null, descripcion: g ? s.descripcion : null };
  });
  const respuestaTemporada = listaTemporada.map((t) => ({ ...sin(t, ['desde', 'hasta', 'tipo']), ...conFecha(tiene(t.clave, 'temporada', t.periodo)) }));

  const catalogo = new Map([
    ...reglas.colecciones.map((c) => [c.clave, c]), ...reglas.secretas.map((s) => [s.clave, s]), ...reglas.temporada.map((t) => [t.clave, t]),
  ]);
  const medalla = (g) => {
    const info = catalogo.get(g.clave);
    if (!info) return null;
    const esNivel = NIVELES.includes(g.nivel);
    return {
      clave: g.clave, nivel: g.nivel, periodo: g.periodo, icono: info.icono, color: info.color ?? null,
      nombre: esNivel ? `${info.nombre} · ${titulo(g.nivel)}` : info.nombre,
      descripcion: esNivel ? `${info.descripcion}: ${info.etiquetas[NIVELES.indexOf(g.nivel)]}` : info.descripcion,
      puntos: puntosDe(g), fecha: g.fechaObtenida.toISOString(),
    };
  };
  const historial = guardadas.map(medalla).filter(Boolean);
  const puntos = historial.reduce((suma, m) => suma + m.puntos, 0);

  // «Estás cerca de…»: el siguiente nivel de cada colección, de la más avanzada a la menos.
  const cerca = respuestaColecciones
    .map((c) => ({ c, n: c.niveles.find((n) => !n.obtenida) }))
    .filter(({ n }) => n && n.valor > 0)
    .map(({ c, n }) => ({ clave: c.clave, nombre: `${c.nombre} · ${titulo(n.nivel)}`, nivel: n.nivel, icono: c.icono, color: c.color, etiqueta: n.etiqueta, valor: n.valor, meta: n.meta, faltan: n.meta - n.valor }))
    .sort((a, b) => b.valor / b.meta - a.valor / a.meta)
    .slice(0, 3);

  return {
    hoy,
    nivel: nivelDe(puntos),
    totales: { obtenidas: historial.filter((m) => m.nivel !== 'temporada').length, total: reglas.colecciones.length * NIVELES.length + reglas.secretas.length },
    racha: { actual: d.racha.actual, descansoDisponible: !d.racha.descansoUsado },
    sinMeta: !d.meta,
    colecciones: respuestaColecciones,
    temporada: respuestaTemporada,
    secretas: respuestaSecretas,
    cerca,
    destacadas: historial.slice(0, 4),
    historial: historial.slice(0, 12),
    nuevas: guardadas.filter((g) => !g.vista).map(medalla).filter(Boolean),
  };
}

async function marcarVistas(usuarioId) {
  await modelo.marcarVistas(usuarioId);
}

module.exports = { resumen, marcarVistas, rachaConDescanso, ventanaDe, nivelDe };
