import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import reglas from '@shared/reglas.json';
import Alerta from '../../components/Alerta.jsx';
import Icono from '../../components/Icono.jsx';
import CalendarioSemana from '../../components/agenda/CalendarioSemana.jsx';
import { BloquearFechas, DetalleHorario, PublicarHorarios, ResumenAgenda } from '../../components/agenda/PanelesAgenda.jsx';
import { ESTADOS, LEYENDA, lunesDe, rangoVisible, sumarDias, tituloSemana } from '../../components/agenda/semana.js';
import useAncho from '../../components/agenda/useAncho.js';
import { MisCitas } from '../Agenda.jsx';
import { solicitar } from '../../services/api.js';
import { ahoraChile } from '../../services/agenda.js';
import './AgendaSemanal.css';

// Bajo este ancho (del área de la agenda) se muestra un día a la vez: siete columnas no caben en un celular.
const ANCHO_SEMANA = 640;
const esFecha = (texto) => /^\d{4}-\d{2}-\d{2}$/.test(texto || '') && !Number.isNaN(Date.parse(`${texto}T12:00:00Z`));

// Las dos partes de la agenda (pedido del PO del 15-11-2026): el calendario y la lista de reservas recibidas, que antes
// quedaba al final de la página. La elegida va en la dirección (?vista=reservas) para poder volver a ella.
const VISTAS = [
  { valor: 'calendario', texto: 'Calendario', icono: 'calendario' },
  { valor: 'reservas', texto: 'Reservas', icono: 'documento' },
];

// Mi agenda del profesional (mejoras del 09-11-2026): semana con sus horarios y reservas,
// publicación de varios horarios de una vez, fechas bloqueadas, solicitudes por confirmar y lista de espera.
export default function AgendaSemanal() {
  const [parametros, setParametros] = useSearchParams();
  const [ahora, setAhora] = useState(ahoraChile());
  const hoy = ahora.slice(0, 10);
  const pedida = parametros.get('semana');
  const semana = lunesDe(esFecha(pedida) ? pedida : hoy);
  const vista = parametros.get('vista') === 'reservas' ? 'reservas' : 'calendario';
  const [revision, setRevision] = useState(0);
  const [respuesta, setRespuesta] = useState(null);
  const [reservasPendientes, setReservasPendientes] = useState(null);
  const [seleccionId, setSeleccionId] = useState(null);
  const [panel, setPanel] = useState(null);
  const [aviso, setAviso] = useState('');
  const [diaElegido, setDiaElegido] = useState(null);
  const [previa, setPrevia] = useState(null);
  const contenedor = useRef(null);
  const costado = useRef(null);
  const pestanas = useRef([]);
  const modo = useAncho(contenedor) >= ANCHO_SEMANA ? 'semana' : 'dia';
  const clave = `${semana}-${revision}`;

  // La línea de la hora actual y los estados de las citas avanzan cada minuto.
  useEffect(() => {
    const temporizador = setInterval(() => setAhora(ahoraChile()), 60000);
    return () => clearInterval(temporizador);
  }, []);

  useEffect(() => {
    let activo = true;
    solicitar(`/agenda/semana?desde=${semana}`)
      .then((datos) => activo && setRespuesta({ clave, datos }))
      .catch((error) => activo && setRespuesta({ clave, error: error.message }));
    solicitar('/reservas')
      .then(({ reservas }) => activo && setReservasPendientes(reservas.filter((r) => r.estado === 'pendiente')))
      .catch(() => activo && setReservasPendientes([]));
    return () => { activo = false; };
  }, [clave, semana]);

  // «pasado» corresponde al instante en que se consultó la API. Se recalcula con el reloj de la página para que el
  // calendario, el resumen y el detalle abierto cambien al comenzar la cita, sin tener que recargar la semana.
  const semanaCargada = respuesta?.datos?.desde === semana ? respuesta.datos : null;
  const datos = semanaCargada && {
    ...semanaCargada, hoy, ahora: ahora.slice(11),
    horarios: semanaCargada.horarios.map((h) => ({ ...h, pasado: `${h.fecha}T${h.horaInicio}` <= ahora })),
  };
  const pendientes = reservasPendientes?.filter((r) => `${r.horario.fecha}T${r.horario.horaInicio}` > ahora) ?? null;
  const cargando = respuesta?.clave !== clave;
  const seleccionado = datos?.horarios.find((h) => h.id === seleccionId) || null;
  const dia = diaElegido && diaElegido >= semana && diaElegido <= sumarDias(semana, 6) ? diaElegido : hoy >= semana && hoy <= sumarDias(semana, 6) ? hoy : semana;

  const irASemana = useCallback((fecha) => {
    const siguiente = new URLSearchParams(parametros);
    const lunes = lunesDe(fecha);
    if (lunes === lunesDe(hoy)) siguiente.delete('semana'); else siguiente.set('semana', lunes);
    setParametros(siguiente, { replace: true });
  }, [parametros, setParametros, hoy]);

  const cambiarVista = (valor) => {
    const siguiente = new URLSearchParams(parametros);
    if (valor === 'reservas') siguiente.set('vista', 'reservas'); else siguiente.delete('vista');
    setParametros(siguiente, { replace: true });
  };
  // Pestañas con las flechas, Inicio y Fin (patrón de WAI-ARIA): el foco sigue a la pestaña elegida.
  const teclaPestana = (evento, indice) => {
    const destino = { ArrowRight: indice + 1, ArrowLeft: indice - 1, Home: 0, End: VISTAS.length - 1 }[evento.key];
    if (destino === undefined) return;
    evento.preventDefault();
    const siguiente = (destino + VISTAS.length) % VISTAS.length;
    cambiarVista(VISTAS[siguiente].valor);
    pestanas.current[siguiente]?.focus();
  };

  // En celular el panel aparece arriba de la lista del día: se lleva a la vista al abrirlo.
  const abrir = (siguiente) => {
    setPanel(siguiente);
    if (modo === 'dia') requestAnimationFrame(() => costado.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' }));
  };
  const elegirHorario = (h) => {
    setAviso('');
    setSeleccionId(h.id === seleccionId ? null : h.id);
    abrir(h.id === seleccionId ? null : { tipo: 'detalle' });
  };
  // Elegir un día de otra semana (con las flechas o el selector del costado) también lleva el calendario a esa semana.
  const elegirDia = (fecha) => {
    setDiaElegido(fecha);
    if (lunesDe(fecha) !== semana) { setSeleccionId(null); irASemana(fecha); }
  };
  const refrescar = (texto) => { setAviso(texto); setRevision((r) => r + 1); };
  const cerrarPanel = () => { setPanel(null); setSeleccionId(null); };
  // Tocar un día en el calendario siempre muestra sus reservas: cierra el detalle o el formulario que estuviera abierto
  // (pedido del PO del 15-11-2026; antes había que cerrarlo primero).
  const verDia = (fecha) => { setAviso(''); cerrarPanel(); elegirDia(fecha); };
  const enPublicar = panel?.tipo === 'publicar' ? previa : null;

  let contenidoCostado;
  if (panel?.tipo === 'publicar') {
    contenidoCostado = (
      <PublicarHorarios key={JSON.stringify(panel.inicial || {})} inicial={panel.inicial} hoy={hoy} onCerrar={cerrarPanel} onPrevia={setPrevia}
        onPublicado={(texto, fecha) => { cerrarPanel(); irASemana(fecha); setDiaElegido(fecha); refrescar(texto); }} />
    );
  } else if (panel?.tipo === 'bloquear') {
    contenidoCostado = <BloquearFechas hoy={hoy} onCerrar={cerrarPanel} onCambio={refrescar} />;
  } else if (panel?.tipo === 'detalle' && seleccionado) {
    contenidoCostado = <DetalleHorario key={seleccionado.id} horario={seleccionado} onCerrar={cerrarPanel} onCambio={refrescar} />;
  } else if (datos) {
    contenidoCostado = (
      <ResumenAgenda datos={datos} dia={dia} onDia={elegirDia} onElegirHorario={elegirHorario} conLista={modo === 'semana'}
        pendientes={pendientes} onElegirPendiente={(r) => {
          irASemana(r.horario.fecha);
          setDiaElegido(r.horario.fecha);
          setSeleccionId(r.horario.id);
          abrir({ tipo: 'detalle' });
        }} />
    );
  }

  return (
    <div className="agenda-semanal" ref={contenedor}>
      <header className="agenda-semanal__cabecera">
        <h1>Mi agenda</h1>
        <div className="agenda-semanal__pestanas" role="tablist" aria-label="Partes de la agenda">
          {VISTAS.map(({ valor, texto, icono }, indice) => (
            <button key={valor} ref={(el) => { pestanas.current[indice] = el; }} type="button" role="tab" id={`pestana-${valor}`}
              aria-selected={vista === valor} aria-controls={`vista-${valor}`} tabIndex={vista === valor ? 0 : -1}
              className="agenda-semanal__pestana" onClick={() => cambiarVista(valor)} onKeyDown={(e) => teclaPestana(e, indice)}>
              <Icono nombre={icono} tamano={18} activo={vista === valor} /> {texto}
              {valor === 'reservas' && pendientes?.length > 0 && (
                <span className="agenda-semanal__contador" aria-label={`, ${pendientes.length} por confirmar`}>{pendientes.length}</span>
              )}
            </button>
          ))}
        </div>
        {vista === 'calendario' && (
          <div className="agenda-semanal__botones">
            <button type="button" className="boton boton--secundario" aria-pressed={panel?.tipo === 'bloquear'}
              onClick={() => { setAviso(''); setSeleccionId(null); abrir(panel?.tipo === 'bloquear' ? null : { tipo: 'bloquear' }); }}>
              <Icono nombre="candadoCerrado" tamano={18} /> Bloquear fechas
            </button>
            <button type="button" className="boton boton--principal" aria-pressed={panel?.tipo === 'publicar'}
              onClick={() => { setAviso(''); setSeleccionId(null); abrir(panel?.tipo === 'publicar' ? null : { tipo: 'publicar', inicial: dia > hoy ? { fecha: dia } : null }); }}>
              <Icono nombre="mas" tamano={18} /> Publicar horarios
            </button>
          </div>
        )}
      </header>

      {vista === 'calendario' ? (
        <div role="tabpanel" id="vista-calendario" aria-labelledby="pestana-calendario" className="agenda-semanal__vista-calendario">
          <Alerta tipo="exito">{aviso}</Alerta>
          <div className="agenda-semanal__cuerpo">
            <section className="agenda-semanal__calendario" aria-labelledby="titulo-semana">
              <div className="agenda-semanal__barra">
                <div className="agenda-semanal__navegacion">
                  <button type="button" className="boton-icono" aria-label="Semana anterior" onClick={() => { setSeleccionId(null); irASemana(sumarDias(semana, -7)); }}>
                    <Icono nombre="flechaIzquierda" tamano={18} />
                  </button>
                  <button type="button" className="boton boton--secundario agenda-semanal__hoy" disabled={semana === lunesDe(hoy)}
                    onClick={() => { setSeleccionId(null); setDiaElegido(hoy); irASemana(hoy); }}>Hoy</button>
                  <button type="button" className="boton-icono" aria-label="Semana siguiente" onClick={() => { setSeleccionId(null); irASemana(sumarDias(semana, 7)); }}>
                    <Icono nombre="flecha" tamano={18} />
                  </button>
                </div>
                <div className="agenda-semanal__titulo-semana">
                  <h2 id="titulo-semana" className="agenda-semanal__rango" aria-live="polite">{tituloSemana(semana)}</h2>
                  <span className="agenda-semanal__zona">Hora de Chile (Santiago)</span>
                </div>
                <ul className="agenda-semanal__leyenda" aria-label="Colores del calendario">
                  {LEYENDA.map((valor) => <li key={valor}><i className={`leyenda__muestra leyenda__muestra--${valor}`} aria-hidden="true" />{ESTADOS[valor]}</li>)}
                </ul>
              </div>
              <div className={`agenda-semanal__vista${cargando && datos ? ' agenda-semanal__vista--actualizando' : ''}`} aria-busy={cargando}>
                {respuesta?.error && respuesta.clave === clave ? (
                  <div className="agenda-semanal__estado">
                    <Alerta>{respuesta.error}</Alerta>
                    <button type="button" className="boton boton--secundario boton--compacto" onClick={() => setRevision((r) => r + 1)}>Reintentar</button>
                  </div>
                ) : !datos ? (
                  <div className="agenda-semanal__esqueleto" role="status"><span className="solo-lector">Cargando la semana…</span></div>
                ) : (
                  <CalendarioSemana modo={modo} datos={datos} ahora={ahora} dia={dia} onDia={verDia} previa={enPublicar}
                    rango={rangoVisible(enPublicar ? [...datos.horarios, enPublicar] : datos.horarios, reglas.agenda.vistaSemana)}
                    seleccionId={seleccionId} onElegirHorario={elegirHorario}
                    onElegirHueco={(inicial) => { setAviso(''); setSeleccionId(null); abrir({ tipo: 'publicar', inicial }); }} />
                )}
              </div>
              {datos && !datos.horarios.length && (
                <p className="agenda-semanal__vacia">
                  No tienes horarios esta semana. Usa <strong>Publicar horarios</strong>{modo === 'semana' ? ' o haz clic en un espacio libre del calendario' : ''} para que puedan reservar contigo.
                </p>
              )}
            </section>
            <aside ref={costado} className="agenda-semanal__costado" aria-label="Detalle y resumen de la agenda">
              {contenidoCostado}
            </aside>
          </div>
        </div>
      ) : (
        <div role="tabpanel" id="vista-reservas" aria-labelledby="pestana-reservas" className="agenda-semanal__vista-reservas">
          <MisCitas onCambio={() => setRevision((r) => r + 1)} />
        </div>
      )}
    </div>
  );
}
