import { ahoraChile, moverMes } from './agenda.js';
import { estadoVisible, lunesDe, sumarDias } from '../components/agenda/semana.js';

export const GRUPOS_RESERVAS = [
  { clave: 'todas', nombre: 'Todas', ayuda: 'Todas tus reservas, incluidas las próximas, pasadas y canceladas.' },
  { clave: 'pendientes', nombre: 'Por confirmar', ayuda: 'Solicitudes futuras que necesitan tu confirmación.' },
  { clave: 'proximas', nombre: 'Próximas', ayuda: 'Atenciones que todavía no comienzan y no están canceladas.' },
  { clave: 'historial', nombre: 'Historial', ayuda: 'Atenciones pasadas y reservas canceladas. Las próximas vigentes no aparecen aquí.' },
];
export const ESTADOS_RESERVAS = {
  todas: ['pendiente', 'confirmada', 'realizada', 'noRealizada', 'cancelada'],
  pendientes: ['pendiente'], proximas: ['pendiente', 'confirmada'], historial: ['realizada', 'noRealizada', 'cancelada'],
};
export const PERIODOS_RESERVAS = [['todas', 'Cualquiera'], ['hoy', 'Hoy'], ['semana', 'Esta semana'], ['mes', 'Este mes'], ['mesPasado', 'Mes pasado'], ['rango', 'Elegir fechas']];
export const momentoReserva = (r) => `${r.horario.fecha}T${r.horario.horaInicio}`;
export const esProxima = (r, ahora) => r.estado !== 'cancelada' && momentoReserva(r) > ahora;
const normalizar = (texto) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
export const fechaValida = (texto) => /^\d{4}-\d{2}-\d{2}$/.test(texto ?? '') && !Number.isNaN(Date.parse(`${texto}T12:00:00Z`)) && new Date(`${texto}T12:00:00Z`).toISOString().slice(0, 10) === texto;
export function grupoDeReserva(r, grupo, ahora) {
  if (grupo === 'todas') return true;
  if (grupo === 'historial') return !esProxima(r, ahora);
  return esProxima(r, ahora) && (grupo !== 'pendientes' || r.estado === 'pendiente');
}
export function rangoReservas({ periodo, desde, hasta }, hoy) {
  const mes = hoy.slice(0, 7);
  const fin = (m) => sumarDias(`${moverMes(m, 1)}-01`, -1);
  if (periodo === 'hoy') return [hoy, hoy];
  if (periodo === 'semana') return [lunesDe(hoy), sumarDias(lunesDe(hoy), 6)];
  if (periodo === 'mes') return [`${mes}-01`, fin(mes)];
  if (periodo === 'mesPasado') return [`${moverMes(mes, -1)}-01`, fin(moverMes(mes, -1))];
  if (periodo === 'rango' && (desde || hasta)) return [desde || '0000-01-01', hasta || '9999-12-31'];
  return null;
}
export function buscarReservas(reservas, { grupo, texto, estado, periodo, desde, hasta, orden }, ahora = ahoraChile(), profesional = true) {
  const rango = rangoReservas({ periodo, desde, hasta }, ahora.slice(0, 10));
  const buscar = normalizar(texto);
  const resultado = reservas.filter((r) => grupoDeReserva(r, grupo, ahora)
    && (!buscar || normalizar(profesional ? r.usuario.nombre : r.profesional.nombre).includes(buscar))
    && (estado === 'todos' || estadoVisible({ estado: r.estado, pasado: momentoReserva(r) <= ahora }) === estado)
    && (!rango || r.horario.fecha >= rango[0] && r.horario.fecha <= rango[1]));
  return resultado.sort((a, b) => {
    if (orden === 'pendientes') {
      const prioridad = (r) => esProxima(r, ahora) && r.estado === 'pendiente' ? 0 : esProxima(r, ahora) ? 1 : 2;
      if (prioridad(a) !== prioridad(b)) return prioridad(a) - prioridad(b);
    }
    return (momentoReserva(a).localeCompare(momentoReserva(b)) || a.id - b.id) * (orden === 'fechaDesc' ? -1 : 1);
  });
}
