import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Icono from '../components/Icono.jsx';
import useAgenda from '../components/reservas/useAgenda.js';
import useVolverFoco from '../components/reservas/useVolverFoco.js';
import { Avisos, Confirmacion, DetallesCita } from '../components/reservas/piezasAgenda.jsx';
import { ESTADOS, estadoVisible, lunesDe } from '../components/agenda/semana.js';
import { ahoraChile, fechaHorario } from '../services/agenda.js';
import { solicitar } from '../services/api.js';
import { buscarReservas, esProxima, ESTADOS_RESERVAS, fechaValida, GRUPOS_RESERVAS, grupoDeReserva, momentoReserva, PERIODOS_RESERVAS } from '../services/reservas.js';
import './ListadoReservas.css';

const POR_PAGINA = 10;
const PARAMETROS_FILTRO = ['buscar', 'estado', 'periodo', 'desde', 'hasta'];
const GRUPOS_CITAS = [
  { clave: 'proximas', nombre: 'Próximas', ayuda: 'Citas confirmadas o pendientes que todavía puedes gestionar.' },
  { clave: 'historial', nombre: 'Historial', ayuda: 'Citas que ya pasaron y las que se cancelaron.' },
  { clave: 'todas', nombre: 'Todas', ayuda: 'Consulta todas tus citas en un solo lugar.' },
];

export default function ListadoReservas({ profesional = false, onCambio }) {
  const [parametros, setParametros] = useSearchParams();
  const [busquedaPersonal, setBusquedaPersonal] = useState('');
  const grupos = profesional ? GRUPOS_RESERVAS : GRUPOS_CITAS;
  const grupoActual = grupos.find(({ clave }) => clave === parametros.get('grupo')) ?? grupos[0];
  const grupo = grupoActual.clave;
  const periodos = PERIODOS_RESERVAS.filter(([p]) => !['proximas', 'pendientes'].includes(grupo) || p !== 'mesPasado');
  const ordenes = profesional ? ['fechaAsc', 'fechaDesc', 'pendientes'] : ['fechaAsc', 'fechaDesc'];
  const ordenPredeterminado = ['todas', 'historial'].includes(grupo) ? 'fechaDesc' : 'fechaAsc';
  const filtros = {
    grupo, texto: profesional ? parametros.get('buscar') ?? '' : busquedaPersonal,
    estado: ESTADOS_RESERVAS[grupo].includes(parametros.get('estado')) ? parametros.get('estado') : 'todos',
    periodo: periodos.some(([p]) => p === parametros.get('periodo')) ? parametros.get('periodo') : 'todas',
    desde: fechaValida(parametros.get('desde')) ? parametros.get('desde') : '',
    hasta: fechaValida(parametros.get('hasta')) ? parametros.get('hasta') : '',
    orden: ordenes.includes(parametros.get('orden')) ? parametros.get('orden') : ordenPredeterminado,
  };
  const [revision, setRevision] = useState(0);
  const { datos, error: errorCarga, cargando } = useAgenda('/reservas', revision);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [confirmacion, setConfirmacion] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [ahora, setAhora] = useState(ahoraChile);
  const foco = useVolverFoco(confirmacion);
  const lista = useRef(null);
  const alPaginar = useRef(false);
  useEffect(() => {
    const reloj = setInterval(() => setAhora(ahoraChile()), 60000);
    return () => clearInterval(reloj);
  }, []);
  const reservas = datos?.reservas ?? [];
  const rangoInvalido = filtros.periodo === 'rango' && filtros.desde && filtros.hasta && filtros.desde > filtros.hasta;
  const visibles = rangoInvalido ? [] : buscarReservas(reservas, filtros, ahora, profesional);
  const paginas = Math.max(1, Math.ceil(visibles.length / POR_PAGINA));
  const pedida = /^\d+$/.test(parametros.get('pagina') ?? '') ? Number(parametros.get('pagina')) : 1;
  const pagina = Math.min(Math.max(pedida, 1), paginas);
  const inicio = (pagina - 1) * POR_PAGINA;
  const filas = visibles.slice(inicio, inicio + POR_PAGINA);
  const hayFiltros = Boolean(filtros.texto.trim() || filtros.estado !== 'todos' || filtros.periodo !== 'todas');
  const titulo = profesional ? 'Reservas recibidas' : 'Mis citas';
  const unidad = profesional ? ['reserva', 'reservas'] : ['cita', 'citas'];
  useEffect(() => {
    if (alPaginar.current) { lista.current?.focus({ preventScroll: true }); lista.current?.scrollIntoView?.({ block: 'nearest' }); alPaginar.current = false; }
  }, [pagina]);
  const cambiar = (cambios, replace = false) => {
    const siguiente = new URLSearchParams(parametros);
    for (const [clave, valor] of Object.entries(cambios)) {
      if (clave === 'buscar' && !profesional) {
        setBusquedaPersonal(valor);
        siguiente.delete(clave);
      } else if (!valor || (clave === 'estado' && valor === 'todos') || (clave === 'periodo' && valor === 'todas')) {
        siguiente.delete(clave);
      } else {
        siguiente.set(clave, valor);
      }
    }
    if (!('pagina' in cambios)) siguiente.delete('pagina');
    foco.olvidar(); setConfirmacion(null);
    if (siguiente.toString() !== parametros.toString()) setParametros(siguiente, { replace });
  };
  const cambiarGrupo = (valor) => cambiar({ grupo: valor, estado: ESTADOS_RESERVAS[valor].includes(filtros.estado) ? filtros.estado : '', periodo: ['proximas', 'pendientes'].includes(valor) && filtros.periodo === 'mesPasado' ? '' : filtros.periodo, orden: '' });
  const limpiar = () => cambiar(Object.fromEntries(PARAMETROS_FILTRO.map((p) => [p, ''])));
  const recargar = () => { setError(''); setRevision((r) => r + 1); };
  const preguntar = (e, r, estado) => { foco.recordar(e.currentTarget); setConfirmacion({ id: r.id, estado }); };
  async function decidir() {
    const reserva = reservas.find((r) => r.id === confirmacion?.id);
    if (!reserva || !esProxima(reserva, ahoraChile())) { foco.olvidar(); setConfirmacion(null); setError('La reserva ya no admite este cambio. Actualiza la lista.'); return; }
    setOcupado(true); setError(''); setAviso('');
    try {
      await solicitar(`/reservas/${reserva.id}`, { metodo: 'PATCH', cuerpo: { estado: confirmacion.estado } });
      if (confirmacion.estado === 'cancelada') {
        setAviso(profesional ? 'Reserva cancelada. El horario vuelve a estar disponible.' : 'Cita cancelada. Puedes verla en el historial.');
      } else {
        setAviso('Reserva confirmada.');
      }
      foco.olvidar(); setConfirmacion(null); recargar(); onCambio?.();
    } catch (e) { setError(e.message); }
    finally { setOcupado(false); }
  }
  const vacios = {
    todas: `Aún no tienes ${unidad[1]}`,
    pendientes: 'No tienes reservas por confirmar',
    proximas: `No tienes próximas ${unidad[1]}`,
    historial: `No tienes ${unidad[1]} en el historial`,
  };
  const Encabezado = profesional ? 'h2' : 'h1';
  return <section className={`agenda listado-reservas${profesional ? '' : ' listado-reservas--citas'}`} aria-labelledby="titulo-listado-reservas">
    <header className="agenda__cabecera">
      <Encabezado id="titulo-listado-reservas">{titulo}</Encabezado>
      <button type="button" className="boton boton--secundario boton--compacto" disabled={cargando || ocupado} onClick={recargar}>
        <Icono nombre="actualizar" tamano={17} /> Actualizar {unidad[1]}
      </button>
    </header>
    <div className="listado-reservas__grupos" role="group" aria-label={`Vistas de ${unidad[1]}`}>
      {grupos.map(({ clave, nombre }) => (
        <button key={clave} type="button" aria-label={nombre} aria-pressed={grupo === clave} aria-describedby={`conteo-${clave}`} onClick={() => cambiarGrupo(clave)}>
          <span>{nombre}</span>
          <strong id={`conteo-${clave}`} aria-hidden="true">{datos ? reservas.filter((r) => grupoDeReserva(r, clave, ahora)).length : '—'}</strong>
        </button>
      ))}
    </div>
    <p className="listado-reservas__ayuda">{grupoActual.ayuda} <span>Horarios en hora de Chile (Santiago).</span></p>
    {datos?.reservas.length > 0 && <div className="agenda__buscador" role="search" aria-label={`Buscar ${unidad[1]}`}>
      <label className="agenda__campo agenda__campo--texto"><span>Buscar</span><input type="search" className="campo__control" name="buscar" autoComplete="off" value={filtros.texto} placeholder={profesional ? 'Nombre de la persona…' : 'Nombre del profesional…'} onChange={(e) => cambiar({ buscar: e.target.value }, true)} /></label>
      <label className="agenda__campo"><span>Estado</span><select className="campo__control" name="estado" value={filtros.estado} onChange={(e) => cambiar({ estado: e.target.value })}><option value="todos">Todos</option>{ESTADOS_RESERVAS[grupo].map((v) => <option key={v} value={v}>{ESTADOS[v]}</option>)}</select></label>
      <label className="agenda__campo"><span>Fecha de la cita</span><select className="campo__control" name="periodo" value={filtros.periodo} onChange={(e) => cambiar({ periodo: e.target.value })}>{periodos.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></label>
      <label className="agenda__campo"><span>Orden</span><select className="campo__control" name="orden" value={filtros.orden} onChange={(e) => cambiar({ orden: e.target.value })}><option value="fechaAsc">Fecha ascendente</option><option value="fechaDesc">Más recientes</option>{profesional && <option value="pendientes">Pendientes primero</option>}</select></label>
      {filtros.periodo === 'rango' && <><label className="agenda__campo"><span>Desde</span><input type="date" className="campo__control" name="desde" value={filtros.desde} max={filtros.hasta || undefined} onChange={(e) => cambiar({ desde: e.target.value })} /></label><label className="agenda__campo"><span>Hasta</span><input type="date" className="campo__control" name="hasta" value={filtros.hasta} min={filtros.desde || undefined} onChange={(e) => cambiar({ hasta: e.target.value })} /></label></>}
    </div>}
    {rangoInvalido && <p role="alert">La fecha “Desde” debe ser anterior o igual a “Hasta”.</p>}
    {datos && <p className="agenda__conteo" aria-live="polite"><span>{visibles.length} {visibles.length === 1 ? unidad[0] : unidad[1]}{filtros.orden === 'fechaDesc' ? ', de la más reciente a la más antigua' : ''}</span>{hayFiltros && <button type="button" className="boton-texto" onClick={limpiar}>Limpiar filtros</button>}</p>}
    <Avisos error={error || errorCarga} aviso={aviso} onReintentar={recargar} />
    {cargando && <p role="status">{datos ? 'Actualizando' : 'Cargando'} {unidad[1]}…</p>}
    {datos && !cargando && !errorCarga && !filas.length && !rangoInvalido && (
      <div className="agenda__vacio">
        <h3>{hayFiltros ? `No hay ${unidad[1]} con esos filtros` : vacios[grupo]}</h3>
        {hayFiltros && <p>Prueba con otro nombre, estado o fecha.</p>}
        {!hayFiltros && !profesional && grupo !== 'historial' && (
          <Link to="/profesionales" className="boton boton--secundario boton--compacto">Buscar profesionales</Link>
        )}
      </div>
    )}
    <div ref={lista} className="agenda__lista" role="region" aria-label={`Lista de ${unidad[1]}`} aria-busy={cargando} tabIndex={-1}>
      {filas.map((r) => {
        const futura = esProxima(r, ahora);
        const estado = estadoVisible({ estado: r.estado, pasado: momentoReserva(r) <= ahora });
        return <article key={r.id} className="agenda__tarjeta">
          <div>
            <span className={`agenda__estado agenda__estado--${estado}`}>{ESTADOS[estado]}</span>
            <h3>{profesional ? r.usuario.nombre : r.profesional.nombre}</h3>
            <p><strong>{fechaHorario(r.horario)}</strong></p>
            {r.mensaje && <p className="agenda__mensaje">{r.mensaje}</p>}
            <DetallesCita r={r} profesional={profesional} />
            {profesional && <Link className="agenda__enlace" to={`/profesional/agenda?semana=${lunesDe(r.horario.fecha)}&dia=${r.horario.fecha}&horario=${r.horario.id}`}><Icono nombre="calendario" tamano={16} /> Ver en calendario</Link>}
          </div>
          {futura && (
            <div className="agenda__acciones" hidden={confirmacion?.id === r.id}>
              {profesional && r.estado === 'pendiente' && <button type="button" className="boton boton--principal boton--compacto" disabled={ocupado || cargando} onClick={(e) => preguntar(e, r, 'confirmada')}>Confirmar reserva</button>}
              <button type="button" className="boton boton--secundario boton--compacto" disabled={ocupado || cargando} onClick={(e) => preguntar(e, r, 'cancelada')}>Cancelar {unidad[0]}</button>
            </div>
          )}
          {confirmacion?.id === r.id && futura && (
            <Confirmacion id={`confirmar-reserva-${r.id}`}
              titulo={`¿${confirmacion.estado === 'cancelada' ? 'Cancelar' : 'Confirmar'} esta ${unidad[0]}?`}
              texto={textoConfirmacion(confirmacion.estado, profesional)}
              accion={profesional ? 'Confirmar cambio' : 'Sí, cancelar la cita'} ocupado={ocupado}
              onConfirmar={decidir} onVolver={() => setConfirmacion(null)} />
          )}
        </article>;
      })}
    </div>
    {paginas > 1 && <nav className="listado-reservas__paginacion" aria-label={`Páginas de ${unidad[1]}`}><span>Mostrando {inicio + 1}–{Math.min(inicio + POR_PAGINA, visibles.length)} de {visibles.length}</span><div><button type="button" className="boton boton--secundario boton--compacto" disabled={pagina === 1} aria-label="Página anterior" onClick={() => { alPaginar.current = true; cambiar({ pagina: String(pagina - 1) }); }}>Anterior</button><span aria-current="page">Página {pagina} de {paginas}</span><button type="button" className="boton boton--secundario boton--compacto" disabled={pagina === paginas} aria-label="Página siguiente" onClick={() => { alPaginar.current = true; cambiar({ pagina: String(pagina + 1) }); }}>Siguiente</button></div></nav>}
  </section>;
}

function textoConfirmacion(estado, profesional) {
  if (estado === 'confirmada') return 'La solicitud quedará confirmada en ambas agendas.';
  if (profesional) return 'Se avisará a la persona y el horario volverá a estar disponible para una nueva reserva.';
  return 'Se avisará al profesional y podrás consultar la cita cancelada en tu historial.';
}
