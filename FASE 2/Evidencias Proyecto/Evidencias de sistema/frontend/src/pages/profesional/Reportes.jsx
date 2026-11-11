import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import EstadoVacio from '../../components/EstadoVacio.jsx';
import Icono from '../../components/Icono.jsx';
import ErrorCarga from '../../components/profesional/ErrorCarga.jsx';
import useConsulta from '../../components/profesional/useConsulta.js';
import { SECCIONES_PROFESIONAL as SECCIONES } from '../../components/diseno/secciones.js';
import { diaYMes, obtenerReportes } from '../../services/actividadProfesional.service.js';
import './Reportes.css';

const PERIODOS = [4, 8, 12];
// Orden de las barras apiladas, de abajo hacia arriba. Cada estado tiene su color en Reportes.css.
const ESTADOS = [
  { clave: 'realizadas', nombre: 'Realizadas' },
  { clave: 'confirmadas', nombre: 'Confirmadas' },
  { clave: 'pendientes', nombre: 'Pendientes' },
  { clave: 'sinConfirmar', nombre: 'Sin confirmar' },
  { clave: 'canceladas', nombre: 'Canceladas' },
];

const sumar = (semanas, clave) => semanas.reduce((total, semana) => total + semana[clave], 0);
const rangoSemana = ({ inicio, fin }) => `${diaYMes(inicio)} – ${diaYMes(fin)}`;

// Reservas de cada semana (por la fecha de la cita) apiladas por estado. Los valores también van en una tabla para
// lectores de pantalla, porque las barras son solo visuales.
function ReservasPorSemana({ semanas }) {
  const maximo = Math.max(...semanas.map((s) => s.total), 1);
  return (
    <>
      <div className="reportes-barras" aria-hidden="true">
        <ol className="reportes-barras__area" style={{ '--semanas': semanas.length }}>
          {semanas.map((semana) => (
            <li key={semana.inicio} className="reportes-barras__semana">
              <span className="reportes-barras__total">{semana.total || ''}</span>
              <span className="reportes-barras__pila" style={{ height: `${Math.round((semana.total / maximo) * 100)}%` }}>
                {ESTADOS.map(({ clave }) => semana[clave] > 0 && (
                  <span key={clave} className={`reportes-barras__tramo reportes-barras__tramo--${clave}`} style={{ flexGrow: semana[clave] }} />
                ))}
              </span>
            </li>
          ))}
        </ol>
        <ol className="reportes-barras__rotulos" style={{ '--semanas': semanas.length }}>
          {semanas.map(({ inicio }) => <li key={inicio}>{diaYMes(inicio)}</li>)}
        </ol>
      </div>
      <ul className="reportes-leyenda" aria-hidden="true">
        {ESTADOS.map(({ clave, nombre }) => (
          <li key={clave}><span className={`reportes-leyenda__color reportes-barras__tramo--${clave}`} />{nombre}</li>
        ))}
      </ul>
      <div className="solo-lector">
        <table>
          <caption>Reservas por semana y por estado</caption>
          <thead>
            <tr><th scope="col">Semana</th><th scope="col">Total</th>{ESTADOS.map(({ clave, nombre }) => <th key={clave} scope="col">{nombre}</th>)}</tr>
          </thead>
          <tbody>
            {semanas.map((semana) => (
              <tr key={semana.inicio}>
                <th scope="row">{rangoSemana(semana)}</th>
                <td>{semana.total}</td>
                {ESTADOS.map(({ clave }) => <td key={clave}>{semana[clave]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Indicador({ icono, nombre, valor, detalle }) {
  return (
    <li className="reportes-indicador">
      <span className="reportes-indicador__icono"><Icono nombre={icono} tamano={20} /></span>
      <span className="reportes-indicador__nombre">{nombre}</span>
      <strong className="reportes-indicador__valor">{valor}</strong>
      {detalle && <span className="reportes-indicador__detalle">{detalle}</span>}
    </li>
  );
}

// Reportes del profesional (FS-HU-28): reservas por semana y por estado, y su calificación promedio.
export default function Reportes() {
  const [semanas, setSemanas] = useState(8);
  const consultar = useCallback(() => obtenerReportes(semanas), [semanas]);
  const { datos, error, cargando, reintentar } = useConsulta(consultar, semanas);

  let contenido;
  if (cargando && !datos) {
    contenido = <p role="status">Cargando tus reportes…</p>;
  } else if (error) {
    contenido = <ErrorCarga error={error} reintentar={reintentar} />;
  } else {
    const { semanas: porSemana, calificacion, totales } = datos;
    const enPeriodo = sumar(porSemana, 'total');
    contenido = (
      <div className="reportes__contenido" aria-busy={cargando}>
        <ul className="reportes-indicadores" aria-label={`Resumen de las últimas ${porSemana.length} semanas`}>
          <Indicador icono="calendario" nombre="Reservas" valor={enPeriodo} detalle={`${totales.total} desde que empezaste`} />
          <Indicador icono="check" nombre="Citas realizadas" valor={sumar(porSemana, 'realizadas')} />
          <Indicador icono="cerrar" nombre="Canceladas" valor={sumar(porSemana, 'canceladas')}
            detalle={enPeriodo ? `${Math.round((sumar(porSemana, 'canceladas') / enPeriodo) * 100)} % de las reservas` : null} />
          <Indicador icono="estrella" nombre="Calificación promedio"
            valor={calificacion.promedio === null ? '—' : calificacion.promedio.toLocaleString('es-CL', { minimumFractionDigits: 1 })}
            detalle={calificacion.cantidad ? `${calificacion.cantidad} ${calificacion.cantidad === 1 ? 'reseña' : 'reseñas'}` : 'Aún sin reseñas'} />
        </ul>

        <section className="panel-tarjeta" aria-labelledby="titulo-reservas-semana">
          <h2 id="titulo-reservas-semana" className="panel-tarjeta__titulo">
            <span className="panel-tarjeta__icono"><Icono nombre="grafico" tamano={20} /></span> Reservas por semana
          </h2>
          {enPeriodo ? <ReservasPorSemana semanas={porSemana} /> : (
            <EstadoVacio icono="calendario" titulo={`Sin reservas en las últimas ${porSemana.length} semanas`} compacto
              accion={<Link to={SECCIONES.agenda.ruta} className="boton boton--principal boton--compacto">Publicar horario</Link>}>
              Publica horarios en tu agenda para que las personas puedan reservar contigo.
            </EstadoVacio>
          )}
        </section>

        <section className="panel-tarjeta" aria-labelledby="titulo-por-estado">
          <h2 id="titulo-por-estado" className="panel-tarjeta__titulo">
            <span className="panel-tarjeta__icono"><Icono nombre="check" tamano={20} /></span> Reservas por estado
          </h2>
          <ul className="reportes-estados">
            {ESTADOS.map(({ clave, nombre }) => {
              const cantidad = sumar(porSemana, clave);
              return (
                <li key={clave}>
                  <span className={`reportes-leyenda__color reportes-barras__tramo--${clave}`} aria-hidden="true" />
                  <span>{nombre}</span>
                  <strong>{cantidad}</strong>
                  <span className="reportes-estados__barra" aria-hidden="true">
                    <span className={`reportes-barras__tramo--${clave}`} style={{ width: enPeriodo ? `${(cantidad / enPeriodo) * 100}%` : 0 }} />
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="texto-secundario reportes__nota">
            Una cita confirmada que ya comenzó se cuenta como realizada; una pendiente que no se confirmó a tiempo, como sin confirmar.
          </p>
        </section>
      </div>
    );
  }

  return (
    <section className="reportes" aria-labelledby="titulo-reportes">
      <header className="reportes__cabecera">
        <div>
          <h1 id="titulo-reportes">Reportes</h1>
          <p className="texto-secundario">Cómo evoluciona tu atención: reservas por semana de la cita (hora de Chile) y tu calificación.</p>
        </div>
        <div className="reportes__periodos" role="group" aria-label="Período del reporte">
          {PERIODOS.map((n) => (
            <button key={n} type="button" className="boton boton--secundario boton--compacto" aria-pressed={semanas === n} onClick={() => setSemanas(n)}>
              {n} semanas
            </button>
          ))}
        </div>
      </header>
      {contenido}
    </section>
  );
}
