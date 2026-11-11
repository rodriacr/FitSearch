import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EstadoVacio from '../../components/EstadoVacio.jsx';
import ErrorCarga from '../../components/profesional/ErrorCarga.jsx';
import useConsulta from '../../components/profesional/useConsulta.js';
import Icono from '../../components/Icono.jsx';
import { SECCIONES_PROFESIONAL as SECCIONES } from '../../components/diseno/secciones.js';
import { normalizar } from '../../services/buscadorGeneral.js';
import { estadoCita, fechaCorta, fechaEnChile, obtenerClientes, obtenerHistorialCliente } from '../../services/actividadProfesional.service.js';
import './Clientes.css';

const citasTexto = (n) => `${n} ${n === 1 ? 'cita' : 'citas'}`;

// Lista de clientes del profesional (FS-HU-27): quienes reservaron con él, con su próxima y última cita.
// Solo se muestra el nombre y las citas; la información de salud de la persona no se comparte (FS-HU-19).
export default function Clientes() {
  const { datos, error, cargando, reintentar } = useConsulta(obtenerClientes);
  const [busqueda, setBusqueda] = useState('');
  const visibles = useMemo(() => {
    const termino = normalizar(busqueda);
    return (datos?.clientes ?? []).filter(({ nombre }) => normalizar(nombre).includes(termino));
  }, [datos, busqueda]);

  return (
    <section className="clientes" aria-labelledby="titulo-clientes">
      <header className="clientes__cabecera">
        <div>
          <h1 id="titulo-clientes">Clientes</h1>
          <p className="texto-secundario">Personas que reservaron una hora contigo. Horarios en hora de Chile (Santiago).</p>
        </div>
        {datos?.clientes.length > 0 && (
          <label className="clientes__buscador">
            <span className="solo-lector">Buscar cliente por nombre</span>
            <Icono nombre="buscar" tamano={18} />
            <input type="search" placeholder="Buscar por nombre" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </label>
        )}
      </header>

      {cargando && !datos && <p role="status">Cargando tus clientes…</p>}
      {error && <ErrorCarga error={error} reintentar={reintentar} />}
      {datos && !datos.clientes.length && (
        <EstadoVacio icono="grupo" titulo="Aún no tienes clientes" nivel={2}
          accion={<Link to={SECCIONES.agenda.ruta} className="boton boton--principal boton--compacto">Publicar horario</Link>}>
          Cuando alguien reserve uno de tus horarios, aparecerá aquí con su historial de citas.
        </EstadoVacio>
      )}
      {datos?.clientes.length > 0 && (
        <>
          <p className="clientes__total" aria-live="polite">
            {busqueda.trim() ? `${visibles.length} de ${datos.clientes.length} clientes` : `${datos.clientes.length} ${datos.clientes.length === 1 ? 'cliente' : 'clientes'}`}
          </p>
          {!visibles.length && <p className="texto-secundario">Ningún cliente coincide con «{busqueda.trim()}».</p>}
          <ul className="clientes__lista">
            {visibles.map((cliente) => (
              <li key={cliente.id} className="cliente">
                <span className="cliente__inicial" aria-hidden="true">{cliente.nombre.charAt(0).toUpperCase()}</span>
                <div className="cliente__datos">
                  <h2>{cliente.nombre}</h2>
                  <p>{citasTexto(cliente.totalCitas)}{cliente.estados.realizadas ? ` · ${cliente.estados.realizadas} realizadas` : ''}</p>
                  <p className="cliente__fechas">
                    {cliente.proximaCita
                      ? <span><strong>Próxima:</strong> {fechaCorta(cliente.proximaCita.fecha)}, {cliente.proximaCita.horaInicio}</span>
                      : <span>Sin citas próximas</span>}
                    {cliente.ultimaCita && <span><strong>Última:</strong> {fechaCorta(cliente.ultimaCita.fecha)}</span>}
                  </p>
                </div>
                <Link to={`${SECCIONES.clientes.ruta}/${cliente.id}`} className="boton boton--secundario boton--compacto cliente__accion"
                  aria-label={`Ver historial de ${cliente.nombre}`}>
                  Ver historial <Icono nombre="flecha" tamano={16} />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

// Historial de citas de un cliente con este profesional, de la más reciente a la más antigua.
export function HistorialCliente() {
  const { id } = useParams();
  const consultar = useMemo(() => () => obtenerHistorialCliente(id), [id]);
  const { datos, error, cargando, reintentar } = useConsulta(consultar, id);
  const volver = (
    <Link to={SECCIONES.clientes.ruta} className="clientes__volver"><Icono nombre="flechaIzquierda" tamano={18} /> Volver a Clientes</Link>
  );

  if (cargando) return <section className="clientes">{volver}<p role="status">Cargando el historial…</p></section>;
  if (error) {
    return (
      <section className="clientes">
        {volver}
        {error.estado === 404
          ? <EstadoVacio icono="grupo" titulo="No encontramos a este cliente" nivel={1}>Solo puedes ver a las personas que reservaron contigo.</EstadoVacio>
          : <ErrorCarga error={error} reintentar={reintentar} />}
      </section>
    );
  }

  const { cliente, citas } = datos;
  return (
    <section className="clientes" aria-labelledby="titulo-historial">
      {volver}
      <header className="historial__cabecera">
        <span className="cliente__inicial cliente__inicial--grande" aria-hidden="true">{cliente.nombre.charAt(0).toUpperCase()}</span>
        <div>
          <h1 id="titulo-historial">{cliente.nombre}</h1>
          <p className="texto-secundario">Cliente desde el {fechaCorta(fechaEnChile(cliente.primeraReserva))} · {citasTexto(cliente.totalCitas)}</p>
        </div>
      </header>
      <ul className="historial__resumen" aria-label="Citas por estado">
        <li><strong>{cliente.estados.realizadas}</strong> Realizadas</li>
        <li><strong>{cliente.estados.confirmadas + cliente.estados.pendientes}</strong> Próximas</li>
        <li><strong>{cliente.estados.canceladas}</strong> Canceladas</li>
      </ul>
      <h2 className="historial__titulo">Historial de citas</h2>
      <ol className="historial__lista">
        {citas.map((cita) => {
          const { clave, nombre } = estadoCita(cita);
          return (
            <li key={cita.id} className="historial__cita">
              <span className={`historial__estado historial__estado--${clave}`}>{nombre}</span>
              <p className="historial__fecha"><strong>{fechaCorta(cita.horario.fecha)}</strong>, {cita.horario.horaInicio}–{cita.horario.horaFin}</p>
              <p className="historial__mensaje">«{cita.mensaje}»</p>
            </li>
          );
        })}
      </ol>
      <p className="texto-secundario historial__nota">Para confirmar o cancelar una cita próxima, entra a <Link to={SECCIONES.agenda.ruta}>Agenda</Link>.</p>
    </section>
  );
}
