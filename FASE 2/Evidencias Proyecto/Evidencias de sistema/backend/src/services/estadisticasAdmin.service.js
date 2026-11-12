// Dashboard y reportes del administrador (11-11-2026). Cada pantalla tiene su propósito, sin repetir datos:
// - Dashboard (operativo): lo que necesita atención hoy (cola de verificaciones), cuatro cifras de los últimos 7 días
//   comparadas con los 7 anteriores, la actividad diaria de 14 días, las últimas cuentas y el estado de la plataforma.
// - Reportes (análisis de un período de 30, 90 o 365 días frente al anterior): crecimiento por tipo de cuenta, oferta de
//   profesionales (embudo de verificación, especialidades, comunas, días para verificar), demanda (reservas por estado,
//   cancelación, especialidades más pedidas, profesionales con reservas), calidad (reseñas) y uso de las funciones.
// Los días son de Chile; las fechas de la base están en UTC.
const modelo = require('../models/estadisticasAdmin.model');
const { fechaEnChile, sumarDias, lunesDeLaSemana } = require('../utils/fechaChile');

const DIA_MS = 86400000;
const ESTADOS_RESERVA = ['confirmada', 'pendiente', 'cancelada'];
const TOP = 8;

// Medianoche de Chile en UTC: las 03:00 (horario de verano, UTC−3) o las 04:00 (horario de invierno, UTC−4).
function inicioDelDia(fecha) {
  const verano = new Date(`${fecha}T03:00:00Z`);
  return fechaEnChile(verano) === fecha ? verano : new Date(`${fecha}T04:00:00Z`);
}
const limites = (desde, hasta) => [inicioDelDia(desde), inicioDelDia(sumarDias(hasta, 1))];
function diasEntre(desde, hasta) {
  const lista = [];
  for (let dia = desde; dia <= hasta; dia = sumarDias(dia, 1)) lista.push(dia);
  return lista;
}
const enRango = (dia, desde, hasta) => dia >= desde && dia <= hasta;
const porcentaje = (parte, total) => (total ? Math.round((parte / total) * 100) : null);
const unDecimal = (valor) => Math.round(valor * 10) / 10;
const contarEn = (filas, diaDe, desde, hasta) => filas.filter((fila) => enRango(diaDe(fila), desde, hasta)).length;

// Fecha (ISO) de la última solicitud de verificación según el historial de la ficha.
function ultimaSolicitud(historial) {
  const eventos = Array.isArray(historial) ? historial : [];
  return eventos.filter((evento) => evento.accion === 'solicitud' && evento.fecha).map((evento) => evento.fecha).sort().at(-1) ?? null;
}

// Fichas pendientes, de la que más espera a la que menos (las que no tienen fecha de solicitud van al final).
function colaDeVerificacion(fichas, ahora) {
  return fichas
    .filter((ficha) => ficha.estadoVerificacion === 'pendiente')
    .map((ficha) => {
      const solicitadoEl = ultimaSolicitud(ficha.historialVerificacion);
      return {
        id: ficha.id, nombre: ficha.usuario.nombre, especialidad: ficha.especialidad, comuna: ficha.comuna, documentos: ficha._count.documentos,
        solicitadoEl, diasEsperando: solicitadoEl ? Math.max(0, Math.floor((ahora - new Date(solicitadoEl)) / DIA_MS)) : null,
      };
    })
    .sort((a, b) => (a.solicitadoEl ?? '9999').localeCompare(b.solicitadoEl ?? '9999'));
}

// Lista de { etiqueta, valor } de mayor a menor; lo que pasa del tope se junta en «Otras».
function ranking(valores, otras = 'Otras') {
  const filas = [...valores.entries()].map(([etiqueta, valor]) => ({ etiqueta, valor })).sort((a, b) => b.valor - a.valor || a.etiqueta.localeCompare(b.etiqueta, 'es'));
  if (filas.length <= TOP) return filas;
  const resto = filas.slice(TOP - 1).reduce((suma, fila) => suma + fila.valor, 0);
  return [...filas.slice(0, TOP - 1), { etiqueta: otras, valor: resto }];
}
function contarPor(filas, claveDe) {
  const conteo = new Map();
  for (const fila of filas) {
    const clave = claveDe(fila);
    if (clave) conteo.set(clave, (conteo.get(clave) ?? 0) + 1);
  }
  return conteo;
}

async function dashboard(ahora = new Date()) {
  const hoy = fechaEnChile(ahora);
  const desde = sumarDias(hoy, -13);
  const semana = [sumarDias(hoy, -6), hoy];
  const anterior = [desde, sumarDias(hoy, -7)];
  const [inicio, fin] = limites(desde, hoy);
  const [cuentas, reservas, resenas, preguntas, fichas, ultimas, plataforma] = await Promise.all([
    modelo.cuentas(inicio, fin), modelo.reservas(inicio, fin), modelo.resenas(inicio, fin), modelo.preguntasAsistente(inicio, fin),
    modelo.profesionales(), modelo.ultimasCuentas(5), modelo.plataforma(),
  ]);
  const fuentes = {
    cuentas: [cuentas, (fila) => fechaEnChile(fila.fechaRegistro)],
    reservas: [reservas, (fila) => fechaEnChile(fila.fechaCreacion)],
    resenas: [resenas, (fila) => fechaEnChile(fila.fechaCreacion)],
    preguntas: [preguntas, (fila) => fechaEnChile(fila.fecha)],
  };
  const cifras = Object.fromEntries(Object.entries(fuentes).map(([clave, [filas, diaDe]]) => [clave, {
    actual: contarEn(filas, diaDe, ...semana), anterior: contarEn(filas, diaDe, ...anterior),
  }]));
  const actividad = diasEntre(desde, hoy).map((fecha) => ({
    fecha, cuentas: 0, reservas: 0, resenas: 0,
  }));
  const porDia = new Map(actividad.map((dia) => [dia.fecha, dia]));
  for (const clave of ['cuentas', 'reservas', 'resenas']) {
    const [filas, diaDe] = fuentes[clave];
    for (const fila of filas) {
      const dia = porDia.get(diaDe(fila));
      if (dia) dia[clave] += 1;
    }
  }
  const cola = colaDeVerificacion(fichas, ahora);
  return {
    hoy,
    cola: { total: cola.length, masAntiguaDias: cola[0]?.diasEsperando ?? null, primeras: cola.slice(0, 5) },
    cifras,
    actividad,
    ultimasCuentas: ultimas.map((fila) => ({ id: fila.id, nombre: fila.nombre, rol: fila.rol.nombre, activo: fila.activo, fechaRegistro: fila.fechaRegistro.toISOString() })),
    plataforma: { ...plataforma, profesionales: fichas.length, verificados: fichas.filter((ficha) => ficha.verificado).length },
  };
}

// Días entre cada solicitud y su aprobación, para las aprobaciones del período.
function diasParaVerificar(fichas, desde, hasta) {
  const casos = [];
  for (const ficha of fichas) {
    const eventos = (Array.isArray(ficha.historialVerificacion) ? ficha.historialVerificacion : []).filter((e) => e.fecha).sort((a, b) => a.fecha.localeCompare(b.fecha));
    let solicitud = null;
    for (const evento of eventos) {
      if (evento.accion === 'solicitud') solicitud = evento.fecha;
      if (evento.accion === 'aprobar' && solicitud && enRango(fechaEnChile(new Date(evento.fecha)), desde, hasta)) {
        casos.push((new Date(evento.fecha) - new Date(solicitud)) / DIA_MS);
        solicitud = null;
      }
    }
  }
  if (!casos.length) return { aprobadas: 0, promedio: null, mediana: null };
  const orden = [...casos].sort((a, b) => a - b);
  const mitad = Math.floor(orden.length / 2);
  const mediana = orden.length % 2 ? orden[mitad] : (orden[mitad - 1] + orden[mitad]) / 2;
  return { aprobadas: casos.length, promedio: unDecimal(casos.reduce((s, d) => s + d, 0) / casos.length), mediana: unDecimal(mediana) };
}

// Grupos del período: semanas (de lunes a domingo) para 30 y 90 días, meses para 365.
function grupos(desde, hasta, agrupacion) {
  const lista = [];
  if (agrupacion === 'mes') {
    for (let mes = desde.slice(0, 7); mes <= hasta.slice(0, 7);) {
      const primero = `${mes}-01`;
      const siguiente = sumarDias(primero, 32).slice(0, 7);
      lista.push({ clave: mes, desde: primero < desde ? desde : primero, hasta: sumarDias(`${siguiente}-01`, -1) > hasta ? hasta : sumarDias(`${siguiente}-01`, -1) });
      mes = siguiente;
    }
  } else {
    for (let lunes = lunesDeLaSemana(desde); lunes <= hasta; lunes = sumarDias(lunes, 7)) {
      const domingo = sumarDias(lunes, 6);
      lista.push({ clave: lunes, desde: lunes < desde ? desde : lunes, hasta: domingo > hasta ? hasta : domingo });
    }
  }
  return lista;
}

async function reportes(dias, ahora = new Date()) {
  const hoy = fechaEnChile(ahora);
  const desde = sumarDias(hoy, -(dias - 1));
  const hastaAnterior = sumarDias(desde, -1);
  const desdeAnterior = sumarDias(hastaAnterior, -(dias - 1));
  const agrupacion = dias > 120 ? 'mes' : 'semana';
  const [inicio, fin] = limites(desdeAnterior, hoy);
  const [inicioPeriodo, finPeriodo] = limites(desde, hoy);
  const [cuentas, reservas, resenas, fichas, personas, plataforma] = await Promise.all([
    modelo.cuentas(inicio, fin), modelo.reservas(inicio, fin), modelo.resenas(inicioPeriodo, finPeriodo), modelo.profesionales(),
    modelo.personasPorFuncion(inicioPeriodo, finPeriodo, desde, hoy), modelo.plataforma(),
  ]);
  const diaCuenta = (fila) => fechaEnChile(fila.fechaRegistro);
  const diaReserva = (fila) => fechaEnChile(fila.fechaCreacion);
  const cuentasPeriodo = cuentas.filter((fila) => enRango(diaCuenta(fila), desde, hoy));
  const reservasPeriodo = reservas.filter((fila) => enRango(diaReserva(fila), desde, hoy));
  const reservasAnteriores = reservas.filter((fila) => enRango(diaReserva(fila), desdeAnterior, hastaAnterior));
  const grupoDe = (dia) => (agrupacion === 'mes' ? dia.slice(0, 7) : lunesDeLaSemana(dia));
  const marcarActual = (grupo) => ({ ...grupo, actual: enRango(hoy, grupo.desde, grupo.hasta) });

  const crecimiento = grupos(desde, hoy, agrupacion).map((grupo) => ({ ...marcarActual(grupo), usuario: 0, profesional: 0 }));
  const indiceCrecimiento = new Map(crecimiento.map((grupo) => [grupo.clave, grupo]));
  for (const fila of cuentasPeriodo) {
    const grupo = indiceCrecimiento.get(grupoDe(diaCuenta(fila)));
    if (grupo && (fila.rol.nombre === 'usuario' || fila.rol.nombre === 'profesional')) grupo[fila.rol.nombre] += 1;
  }

  const demanda = grupos(desde, hoy, agrupacion).map((grupo) => ({ ...marcarActual(grupo), confirmada: 0, pendiente: 0, cancelada: 0 }));
  const indiceDemanda = new Map(demanda.map((grupo) => [grupo.clave, grupo]));
  for (const fila of reservasPeriodo) {
    const grupo = indiceDemanda.get(grupoDe(diaReserva(fila)));
    if (grupo && ESTADOS_RESERVA.includes(fila.estado)) grupo[fila.estado] += 1;
  }

  const vigentes = fichas.filter((ficha) => ficha.usuario.activo);
  const verificados = vigentes.filter((ficha) => ficha.verificado);
  const conReservas = new Set(reservasPeriodo.filter((fila) => fila.estado !== 'cancelada').map((fila) => fila.disponibilidad.profesionalId));
  const canceladas = reservasPeriodo.filter((fila) => fila.estado === 'cancelada').length;
  const distribucion = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const resena of resenas) distribucion[resena.puntaje] += 1;

  return {
    periodo: { dias, desde, hasta: hoy, agrupacion },
    anterior: { desde: desdeAnterior, hasta: hastaAnterior },
    crecimiento: {
      grupos: crecimiento,
      nuevas: cuentasPeriodo.length,
      nuevasAnterior: contarEn(cuentas, diaCuenta, desdeAnterior, hastaAnterior),
      profesionalesNuevos: cuentasPeriodo.filter((fila) => fila.rol.nombre === 'profesional').length,
      usuariosActivos: plataforma.usuariosActivos,
      inactivas: plataforma.usuariosInactivos,
    },
    oferta: {
      embudo: {
        sinSolicitud: vigentes.filter((f) => !f.verificado && f.estadoVerificacion === 'sin_solicitud').length,
        pendiente: vigentes.filter((f) => f.estadoVerificacion === 'pendiente').length,
        verificado: verificados.length,
        rechazado: vigentes.filter((f) => f.estadoVerificacion === 'rechazado').length,
      },
      porEspecialidad: ranking(contarPor(verificados, (f) => f.especialidad)),
      porComuna: ranking(contarPor(verificados, (f) => f.comuna?.trim()), 'Otras comunas'),
      verificacion: diasParaVerificar(fichas, desde, hoy),
    },
    demanda: {
      grupos: demanda,
      reservas: reservasPeriodo.length,
      reservasAnterior: reservasAnteriores.length,
      canceladas,
      tasaCancelacion: porcentaje(canceladas, reservasPeriodo.length),
      porEspecialidad: ranking(contarPor(reservasPeriodo, (fila) => fila.disponibilidad.profesional?.especialidad)),
      profesionalesConReservas: verificados.filter((ficha) => conReservas.has(ficha.id)).length,
      verificados: verificados.length,
    },
    calidad: {
      resenas: resenas.length,
      promedio: resenas.length ? unDecimal(resenas.reduce((suma, r) => suma + r.puntaje, 0) / resenas.length) : null,
      distribucion,
      conCita: resenas.filter((r) => r.reservaId !== null).length,
    },
    uso: { ...personas, usuariosActivos: plataforma.usuariosActivos },
  };
}

async function alertas() {
  return { verificacionesPendientes: await modelo.verificacionesPendientes() };
}

module.exports = { dashboard, reportes, alertas, inicioDelDia, grupos };
