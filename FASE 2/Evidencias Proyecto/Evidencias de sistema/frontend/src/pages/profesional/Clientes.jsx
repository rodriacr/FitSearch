import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Alerta from '../../components/Alerta.jsx';
import EstadoVacio from '../../components/EstadoVacio.jsx';
import Icono from '../../components/Icono.jsx';
import { diaCorto, diaLargo } from '../../components/agenda/semana.js';
import { solicitar } from '../../services/api.js';
import { iniciales } from '../../services/formato.js';
import './Clientes.css';

const ESTADO = { pendiente: 'Por confirmar', confirmada: 'Confirmada', cancelada: 'Cancelada' };
const MODALIDAD = { presencial: 'Presencial', online: 'Online' };
// Para buscar sin importar mayúsculas ni tildes.
const normalizar = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function useDatos(ruta) {
  const [estado, setEstado] = useState({ ruta: null });
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    if (!ruta) return undefined;
    let activo = true;
    solicitar(ruta).then((datos) => activo && setEstado({ ruta, datos })).catch((error) => activo && setEstado({ ruta, error }));
    return () => { activo = false; };
  }, [ruta, intento]);
  return { ...(estado.ruta === ruta ? estado : {}), reintentar: () => setIntento((i) => i + 1) };
}

function Historial({ clienteId }) {
  const { datos, error, reintentar } = useDatos(`/profesional/clientes/${clienteId}`);
  if (error) {
    return (
      <div className="clientes__vacio">
        <Alerta>{error.estado === 404 ? 'No encontramos a este cliente entre tus reservas.' : error.message}</Alerta>
        {error.estado !== 404 && <button type="button" className="boton boton--secundario boton--compacto" onClick={reintentar}>Reintentar</button>}
      </div>
    );
  }
  if (!datos) return <p className="texto-secundario clientes__cargando" role="status">Cargando historial…</p>;
  const { cliente, citas } = datos;
  const conversacion = citas.find((c) => c.estado !== 'cancelada') || citas[0];
  return (
    <>
      <header className="cliente__cabecera">
        <Link to="/profesional/clientes" className="boton-icono clientes__volver" aria-label="Volver a mis clientes"><Icono nombre="flechaIzquierda" tamano={20} /></Link>
        <span className="avatar avatar--grande" aria-hidden="true">{iniciales(cliente.nombre)}</span>
        <div className="cliente__quien">
          <h2>{cliente.nombre}</h2>
          <p>{citas.length} {citas.length === 1 ? 'cita' : 'citas'} contigo · desde el {diaLargo(citas.at(-1).fecha)}</p>
        </div>
        <Link to={`/profesional/mensajes?reserva=${conversacion.reservaId}`} className="boton boton--secundario boton--compacto cliente__mensajes">
          <Icono nombre="chat" tamano={18} /> Mensajes
        </Link>
      </header>
      <h3 className="cliente__subtitulo">Historial de citas</h3>
      <ol className="historial">
        {citas.map((c) => (
          <li key={c.reservaId} className="historial__cita">
            <div className="historial__cuando">
              <strong>{diaCorto(c.fecha)}</strong>
              <span className="cifra">{c.horaInicio} – {c.horaFin}</span>
            </div>
            <div className="historial__detalle">
              <span className={`estado-agenda estado-agenda--${c.estado === 'cancelada' ? 'cancelada' : c.estado}`}>{ESTADO[c.estado]}</span>
              {[MODALIDAD[c.modalidad], c.primeraVisita && 'Primera visita', c.canceladaPor && `Cancelada por ${c.canceladaPor === 'profesional' ? 'ti' : 'la persona'}`]
                .filter(Boolean).map((dato) => <span key={dato} className="historial__dato">{dato}</span>)}
              <p className="historial__mensaje">{c.mensaje}</p>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}

// Clientes del profesional (FS-HU-27): cada persona que reservó contigo, con su última y su próxima cita, y su
// historial. Nunca muestra su información de salud ni su correo.
export default function Clientes() {
  const { id } = useParams();
  const clienteId = /^\d+$/.test(id || '') ? Number(id) : null;
  const { datos, error, reintentar } = useDatos('/profesional/clientes');
  const [busqueda, setBusqueda] = useState('');
  const filtro = normalizar(busqueda.trim());
  const visibles = datos?.clientes.filter((c) => !filtro || normalizar(c.nombre).includes(filtro)) || [];

  return (
    <div className="clientes-pagina">
      <div className={`clientes${clienteId ? ' clientes--con-detalle' : ''}`}>
        <section className="clientes__panel clientes__lista-panel" aria-labelledby="titulo-clientes">
          <div className="clientes__encabezado">
            <h1 id="titulo-clientes">Clientes</h1>
            {datos && <p className="texto-secundario">{datos.total} {datos.total === 1 ? 'persona ha reservado' : 'personas han reservado'} contigo</p>}
            {datos?.total > 0 && (
              <label className="clientes__buscar">
                <Icono nombre="buscar" tamano={18} />
                <span className="solo-lector">Buscar un cliente por nombre</span>
                <input type="search" placeholder="Buscar por nombre" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
              </label>
            )}
          </div>
          {error ? (
            <div className="clientes__vacio">
              <Alerta>{error.message}</Alerta>
              <button type="button" className="boton boton--secundario boton--compacto" onClick={reintentar}>Reintentar</button>
            </div>
          ) : !datos ? <p className="texto-secundario clientes__cargando" role="status">Cargando clientes…</p> : !datos.total ? (
            <EstadoVacio compacto icono="grupo" titulo="Aún no tienes clientes"
              accion={<Link to="/profesional/agenda" className="boton boton--secundario boton--compacto">Publicar horarios</Link>}>
              Cuando alguien reserve una hora contigo, aparecerá aquí con su historial.
            </EstadoVacio>
          ) : !visibles.length ? (
            <p className="clientes__sin-resultados">Nadie coincide con «{busqueda.trim()}».</p>
          ) : (
            <ul className="clientes__lista">
              {visibles.map((c) => (
                <li key={c.id}>
                  <Link to={`/profesional/clientes/${c.id}`} className={`cliente-fila${c.id === clienteId ? ' cliente-fila--activa' : ''}`}
                    aria-current={c.id === clienteId ? 'page' : undefined}>
                    <span className="avatar" aria-hidden="true">{iniciales(c.nombre)}</span>
                    <span className="cliente-fila__texto">
                      <strong>{c.nombre}</strong>
                      <span>
                        {c.proximaCita ? `Próxima: ${diaCorto(c.proximaCita.fecha)}, ${c.proximaCita.horaInicio}`
                          : c.ultimaCita ? `Última: ${diaCorto(c.ultimaCita.fecha)}` : 'Sin citas realizadas'}
                      </span>
                    </span>
                    <span className="cliente-fila__total" aria-label={`${c.totalCitas} ${c.totalCitas === 1 ? 'cita' : 'citas'}`}>
                      <strong className="cifra">{c.totalCitas}</strong><small>{c.totalCitas === 1 ? 'cita' : 'citas'}</small>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="clientes__panel clientes__detalle" aria-label="Historial del cliente">
          {clienteId ? <Historial key={clienteId} clienteId={clienteId} /> : (
            <div className="clientes__elige">
              <Icono nombre="grupo" tamano={40} />
              <p>Elige a un cliente para ver su historial de citas contigo.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
