import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alerta from '../../components/Alerta.jsx';
import { Estrellas } from '../../components/Calificacion.jsx';
import Icono from '../../components/Icono.jsx';
import { Barras, Cifra, ColumnasApiladas } from '../../components/graficos/Graficos.jsx';
import { solicitar } from '../../services/api.js';
import { formatearNumero } from '../../services/formato.js';
import './Reportes.css';

const PERIODOS = [4, 8, 12];
// Colores de los estados en el gráfico (validados con el verificador de paletas: lightness, croma y daltonismo).
// El naranjo no llega a 3:1 con el fondo: por eso hay leyenda, valores al pasar el mouse y una tabla para lectores.
const SERIES = [
  { clave: 'confirmada', nombre: 'Confirmadas', color: 'var(--serie-confirmada)' },
  { clave: 'pendiente', nombre: 'Por confirmar', color: 'var(--serie-pendiente)' },
  { clave: 'cancelada', nombre: 'Canceladas', color: 'var(--serie-cancelada)' },
];
const FRANJAS = { manana: 'Mañana', tarde: 'Tarde', noche: 'Noche' };
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const corta = (fecha) => `${Number(fecha.slice(8))} ${MESES[Number(fecha.slice(5, 7)) - 1]}`;

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
          <dl className="reportes__cifras cifras">
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
            {datos.totales.reservas ? <ColumnasApiladas
              grupos={datos.porSemana.map((semana) => ({ ...semana, clave: semana.desde }))} series={SERIES} unidad={['reserva', 'reservas']}
              etiqueta={(semana) => corta(semana.desde)} titulo={(semana) => `Semana del ${corta(semana.desde)}`}
              tituloTabla="Reservas por semana y estado" filaTabla={{ encabezado: 'Semana', texto: (semana) => `Del ${corta(semana.desde)} al ${corta(semana.hasta)}` }}
            /> : (
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
