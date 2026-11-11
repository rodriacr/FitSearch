import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alerta from '../../components/Alerta.jsx';
import { Estrellas } from '../../components/Calificacion.jsx';
import Icono from '../../components/Icono.jsx';
import { solicitar } from '../../services/api.js';
import { formatearNumero } from '../../services/formato.js';
import './Reportes.css';

const PERIODOS = [4, 8, 12];
// Colores de los estados en el gráfico (validados con el verificador de paletas: lightness, croma y daltonismo).
// El naranjo no llega a 3:1 con el fondo: por eso hay leyenda, valores al pasar el mouse y una tabla para lectores.
const SERIES = [
  { clave: 'confirmada', nombre: 'Confirmadas' },
  { clave: 'pendiente', nombre: 'Por confirmar' },
  { clave: 'cancelada', nombre: 'Canceladas' },
];
const FRANJAS = { manana: 'Mañana', tarde: 'Tarde', noche: 'Noche' };
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const corta = (fecha) => `${Number(fecha.slice(8))} ${MESES[Number(fecha.slice(5, 7)) - 1]}`;

// Tope "redondo" del eje: 4, 5, 10, 20, 25, 50… para que las marcas sean números limpios.
function topeLimpio(maximo) {
  if (maximo <= 4) return 4;
  const potencia = 10 ** Math.floor(Math.log10(maximo));
  const paso = [1, 2, 2.5, 5, 10].find((p) => p * potencia >= maximo / 4) * potencia;
  return Math.ceil(maximo / paso) * paso;
}

// Cifra con su comparación contra el período anterior (del mismo largo).
function Cifra({ etiqueta, valor, detalle, delta, subirEsBueno = true }) {
  const signo = delta > 0 ? '+' : '';
  const tono = !delta ? '' : (delta > 0) === subirEsBueno ? ' cifra-reporte__delta--buena' : ' cifra-reporte__delta--mala';
  return (
    <div className="cifra-reporte">
      <dt>{etiqueta}</dt>
      <dd>
        <strong className="cifra">{valor}</strong>
        {delta !== undefined && (
          <span className={`cifra-reporte__delta${tono}`}>
            {delta !== 0 && <Icono nombre="flecha" tamano={14} className={delta > 0 ? 'cifra-reporte__sube' : 'cifra-reporte__baja'} />}
            {delta === 0 ? 'Igual que el período anterior' : `${signo}${formatearNumero(delta)} vs. período anterior`}
          </span>
        )}
        {detalle && <span className="cifra-reporte__detalle">{detalle}</span>}
      </dd>
    </div>
  );
}

// Columnas apiladas por semana: confirmadas abajo, por confirmar y canceladas encima, con 2 px de aire entre partes.
function ReservasPorSemana({ semanas }) {
  const totales = semanas.map((s) => s.confirmada + s.pendiente + s.cancelada);
  const tope = topeLimpio(Math.max(...totales, 1));
  const marcas = [0, tope / 2, tope];
  return (
    <figure className={`columnas${semanas.length > 8 ? ' columnas--densas' : ''}`} style={{ '--columnas': semanas.length }}>
      <div className="columnas__plano">
        <div className="columnas__eje" aria-hidden="true">
          {marcas.map((m) => <span key={m} style={{ bottom: `${(m / tope) * 100}%` }}>{formatearNumero(m)}</span>)}
        </div>
        <div className="columnas__area">
          {marcas.map((m) => <i key={m} className="columnas__guia" style={{ bottom: `${(m / tope) * 100}%` }} aria-hidden="true" />)}
          {semanas.map((s, indice) => {
            const total = totales[indice];
            const resumen = SERIES.map(({ clave, nombre }) => `${s[clave]} ${nombre.toLowerCase()}`).join(', ');
            return (
              <div key={s.desde} className={`columna${s.actual ? ' columna--actual' : ''}`} tabIndex={0}
                aria-label={`Semana del ${corta(s.desde)}: ${total} ${total === 1 ? 'reserva' : 'reservas'} (${resumen})`}>
                <div className="columna__pila" style={{ height: `${(total / tope) * 100}%` }} aria-hidden="true">
                  {SERIES.filter(({ clave }) => s[clave] > 0).map(({ clave }) => (
                    <i key={clave} className={`columna__parte columna__parte--${clave}`} style={{ flexGrow: s[clave] }} />
                  ))}
                </div>
                <span className="columna__etiqueta" aria-hidden="true">{corta(s.desde)}</span>
                <span className="columna__ayuda" role="tooltip" aria-hidden="true">
                  <strong>Semana del {corta(s.desde)}{s.actual ? ' (actual)' : ''}</strong>
                  {SERIES.map(({ clave, nombre }) => (
                    <span key={clave}><i className={`muestra-serie muestra-serie--${clave}`} />{nombre}<b className="cifra">{s[clave]}</b></span>
                  ))}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <figcaption className="leyenda-series">
        {SERIES.map(({ clave, nombre }) => <span key={clave}><i className={`muestra-serie muestra-serie--${clave}`} aria-hidden="true" />{nombre}</span>)}
      </figcaption>
      <table className="solo-lector">
        <caption>Reservas por semana y estado</caption>
        <thead><tr><th scope="col">Semana</th>{SERIES.map((s) => <th key={s.clave} scope="col">{s.nombre}</th>)}</tr></thead>
        <tbody>
          {semanas.map((s) => (
            <tr key={s.desde}><th scope="row">Del {corta(s.desde)} al {corta(s.hasta)}</th>{SERIES.map(({ clave }) => <td key={clave}>{s[clave]}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

// Barras horizontales de una sola serie (sin leyenda: el título dice qué se mide), con el valor en la punta.
function Barras({ filas, etiquetaLector }) {
  const maximo = Math.max(...filas.map((f) => f.valor), 1);
  return (
    <ul className="barras" aria-label={etiquetaLector}>
      {filas.map((f) => (
        <li key={f.etiqueta} className="barras__fila">
          <span className="barras__etiqueta">{f.etiqueta}</span>
          <span className="barras__pista" aria-hidden="true">
            <i className="barras__barra" style={{ width: `${(f.valor / maximo) * 100}%` }} />
          </span>
          <span className="barras__valor cifra">{f.valor}</span>
        </li>
      ))}
    </ul>
  );
}

// Reportes del profesional (FS-HU-28): reservas por semana y por estado, calificación y reseñas, cuándo le piden hora
// y la comparación con el período anterior.
export default function Reportes() {
  const [semanas, setSemanas] = useState(8);
  const [intento, setIntento] = useState(0);
  const [estado, setEstado] = useState({});
  const clave = `${semanas}-${intento}`;

  useEffect(() => {
    let activo = true;
    solicitar(`/profesional/reportes?semanas=${semanas}`)
      .then((datos) => activo && setEstado({ clave, datos }))
      .catch((error) => activo && setEstado({ clave, error: error.message }));
    return () => { activo = false; };
  }, [clave, semanas]);

  const datos = estado.datos;
  const actualizando = estado.clave !== clave && Boolean(datos);

  return (
    <div className="reportes">
      <header className="reportes__cabecera">
        <div>
          <h1>Reportes</h1>
          <p className="texto-secundario">
            {datos ? `Del ${corta(datos.periodo.desde)} al ${corta(datos.periodo.hasta)}, según la fecha de cada cita.` : 'Tus reservas y calificaciones.'}
          </p>
        </div>
        <div className="segmentos reportes__periodo" role="group" aria-label="Período del reporte">
          {PERIODOS.map((p) => (
            <button key={p} type="button" className="segmentos__opcion" aria-pressed={semanas === p} onClick={() => setSemanas(p)}>{p} semanas</button>
          ))}
        </div>
      </header>

      {estado.error && estado.clave === clave ? (
        <div className="reportes__estado">
          <Alerta>{estado.error}</Alerta>
          <button type="button" className="boton boton--secundario boton--compacto" onClick={() => setIntento((i) => i + 1)}>Reintentar</button>
        </div>
      ) : !datos ? (
        <p className="texto-secundario" role="status">Cargando reportes…</p>
      ) : (
        <div className={`reportes__contenido${actualizando ? ' reportes__contenido--actualizando' : ''}`} aria-busy={actualizando}>
          <dl className="reportes__cifras">
            <Cifra etiqueta="Reservas" valor={datos.totales.reservas} delta={datos.totales.reservas - datos.anterior.reservas}
              detalle={`${datos.totales.confirmadas} confirmadas · ${datos.totales.pendientes} por confirmar`} />
            <Cifra etiqueta="Clientes" valor={datos.totales.clientes} detalle={`${datos.totales.clientesNuevos} ${datos.totales.clientesNuevos === 1 ? 'nuevo' : 'nuevos'} en el período`} />
            <Cifra etiqueta="Cancelaciones" valor={datos.totales.tasaCancelacion === null ? '—' : `${datos.totales.tasaCancelacion} %`}
              delta={datos.totales.canceladas - datos.anterior.canceladas} subirEsBueno={false}
              detalle={`${datos.totales.canceladas} de ${datos.totales.reservas} reservas`} />
            <Cifra etiqueta="Ocupación" valor={datos.totales.ocupacion === null ? '—' : `${datos.totales.ocupacion} %`}
              detalle={`de ${datos.totales.horariosPublicados} ${datos.totales.horariosPublicados === 1 ? 'horario publicado' : 'horarios publicados'}`} />
          </dl>

          <section className="panel-reporte" aria-labelledby="titulo-por-semana">
            <h2 id="titulo-por-semana">Reservas por semana</h2>
            {datos.totales.reservas ? <ReservasPorSemana semanas={datos.porSemana} /> : (
              <p className="panel-reporte__vacio">Aún no tienes reservas en estas semanas. <Link to="/profesional/agenda">Publica horarios</Link> para que puedan reservar contigo.</p>
            )}
          </section>

          <div className="reportes__grilla">
            <section className="panel-reporte" aria-labelledby="titulo-calificacion">
              <h2 id="titulo-calificacion">Calificación</h2>
              <div className="calificacion-reporte">
                <strong className="cifra">{datos.calificacion.total ? formatearNumero(datos.calificacion.promedio) : '—'}</strong>
                <span>
                  <Estrellas valor={datos.calificacion.promedio || 0} />
                  <small>{datos.calificacion.total} {datos.calificacion.total === 1 ? 'reseña' : 'reseñas'} · {datos.calificacion.verificadas} con cita verificada</small>
                </span>
              </div>
              <Barras etiquetaLector="Reseñas por cantidad de estrellas"
                filas={[5, 4, 3, 2, 1].map((p) => ({ etiqueta: `${p} ${p === 1 ? 'estrella' : 'estrellas'}`, valor: datos.calificacion.distribucion[p] }))} />
            </section>
            <section className="panel-reporte" aria-labelledby="titulo-demanda">
              <h2 id="titulo-demanda">Cuándo te reservan</h2>
              <Barras etiquetaLector="Reservas por día de la semana" filas={datos.demandaDia.map((d) => ({ etiqueta: d.dia, valor: d.reservas }))} />
              <h3 className="panel-reporte__subtitulo">Por franja horaria</h3>
              <p className="panel-reporte__nota">Mañana: antes de las 12:00 · Tarde: de 12:00 a 18:00 · Noche: desde las 18:00.</p>
              <Barras etiquetaLector="Reservas por franja horaria" filas={datos.demandaFranja.map((f) => ({ etiqueta: FRANJAS[f.franja], valor: f.reservas }))} />
            </section>
          </div>

          {datos.totales.fueraDeHorario > 0 && (
            <p className="reportes__nota">
              <Icono nombre="reloj" tamano={18} />
              <span>
                <strong>{datos.totales.fueraDeHorario} {datos.totales.fueraDeHorario === 1 ? 'reserva llegó' : 'reservas llegaron'} fuera del horario de oficina</strong>{' '}
                (antes de las 9:00, desde las 19:00 o en fin de semana). Con la agenda en línea no las pierdes.
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
