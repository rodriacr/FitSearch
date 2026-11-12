import { useEffect, useState } from 'react';
import { Link, Outlet, useParams } from 'react-router-dom';
import Icono from '../../components/Icono.jsx';
import { solicitar } from '../../services/api.js';
import { iniciales } from '../../services/formato.js';
import { Documentos } from '../../components/profesional/Certificaciones.jsx';
import './PanelAdministrador.css';

// Lienzo de las pantallas del administrador (11-11-2026): el encabezado, el menú lateral y la barra inferior son los
// mismos de la app (DisenoAplicacion con el espacio «administrador»); aquí solo se aplican los estilos de sus páginas.
export function LienzoAdministrador() {
  return (
    <div className="admin">
      <Outlet />
    </div>
  );
}

function useDatos(ruta, revision = 0) {
  const [resultado, setResultado] = useState({
    ruta: null,
    datos: null,
    error: '',
  });
  useEffect(() => {
    let vigente = true;
    solicitar(ruta)
      .then((datos) => {
        if (vigente) setResultado({ ruta, datos, error: '' });
      })
      .catch((e) => {
        if (vigente) setResultado({ ruta, datos: null, error: e.message });
      });
    return () => {
      vigente = false;
    };
  }, [ruta, revision]);
  return resultado.ruta === ruta ? resultado : { datos: null, error: '' };
}
function EstadoCarga({ datos, error }) {
  if (error)
    return (
      <p role="alert" className="admin__error">
        {error}
      </p>
    );
  if (!datos) return <p role="status">Cargando información…</p>;
  return null;
}
const numero = (n) => Number(n).toLocaleString('es-CL');

export function ListadoAdministrador({ tipo }) {
  const usuarios = tipo === 'usuarios';
  const verificaciones = tipo === 'verificaciones';
  const [filtro, setFiltro] = useState(verificaciones ? 'pendientes' : '');
  const [busqueda, setBusqueda] = useState('');
  const [q, setQ] = useState('');
  const [pagina, setPagina] = useState(1);
  const [estadoCuenta, setEstadoCuenta] = useState('');
  const [revision, setRevision] = useState(0);
  const [confirmacion, setConfirmacion] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  // Verificaciones es la cola de trabajo (de la solicitud más antigua a la más reciente); Profesionales, el directorio.
  const parametros = new URLSearchParams({
    q,
    pagina: String(pagina),
    ...(usuarios ? { estadoCuenta, rol: filtro } : { estado: filtro, vista: verificaciones ? 'cola' : 'directorio' }),
  });
  const resultado = useDatos(
    `/administrador/${usuarios ? 'usuarios' : 'profesionales'}?${parametros}`,
    revision,
  );
  const { datos } = resultado;
  const opciones = usuarios
    ? [
        ['', 'Todos'],
        ['usuario', 'Usuarios'],
        ['profesional', 'Profesionales'],
        ['administrador', 'Administradores'],
      ]
    : verificaciones
      ? [
          ['pendientes', 'Pendientes'],
          ['rechazados', 'Rechazadas'],
          ['verificados', 'Aprobadas'],
        ]
      : [
          ['', 'Todos'],
          ['verificados', 'Verificados'],
          ['pendientes', 'Pendientes'],
          ['rechazados', 'Rechazados'],
        ];
  async function cambiarEstado() {
    setGuardando(true);
    setError('');
    try {
      await solicitar(`/administrador/usuarios/${confirmacion.id}/estado`, {
        metodo: 'PATCH',
        cuerpo: { activo: !confirmacion.activo },
      });
      setConfirmacion(null);
      setRevision((r) => r + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }
  return (
    <section>
      <h1>
        {usuarios
          ? 'Usuarios'
          : verificaciones
            ? 'Verificaciones'
            : 'Profesionales'}
      </h1>
      <p className="admin__bajada">
        {usuarios
          ? 'Consulta las cuentas registradas en FitSearch y activa o desactiva su acceso.'
          : verificaciones
            ? 'Solicitudes de verificación, de la que más espera a la más reciente. Revisa los documentos y decide.'
            : 'Directorio de profesionales con su calificación, sus reservas y su estado de verificación.'}
      </p>
      <div className="admin__filtros" aria-label="Filtrar resultados">
        {opciones.map(([valor, nombre]) => (
          <button
            type="button"
            key={valor}
            aria-pressed={filtro === valor}
            onClick={() => {
              setFiltro(valor);
              setPagina(1);
            }}
          >
            {nombre}
          </button>
        ))}
      </div>
      {usuarios && (
        <label className="admin__estado-cuenta">
          Estado de cuenta
          <select
            value={estadoCuenta}
            onChange={(e) => {
              setEstadoCuenta(e.target.value);
              setPagina(1);
            }}
          >
            <option value="">Todos</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
          </select>
        </label>
      )}
      {error && <p role="alert">{error}</p>}
      {confirmacion && (
        <div className="admin__tarjeta">
          <p>
            ¿Deseas {confirmacion.activo ? 'desactivar' : 'reactivar'} la cuenta
            de {confirmacion.nombre}?{' '}
            {confirmacion.activo &&
              'Sus sesiones abiertas dejarán de funcionar.'}
          </p>
          <button disabled={guardando} onClick={cambiarEstado}>
            Confirmar cambio
          </button>
          <button disabled={guardando} onClick={() => setConfirmacion(null)}>
            Cancelar
          </button>
        </div>
      )}
      <form
        className="admin__busqueda"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(busqueda.trim());
          setPagina(1);
        }}
      >
        <label htmlFor="busqueda-admin">
          {usuarios
            ? 'Buscar por nombre o correo'
            : 'Buscar por nombre, especialidad o comuna'}
        </label>
        <div>
          <input
            id="busqueda-admin"
            value={busqueda}
            maxLength={100}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <button type="submit">
            <Icono nombre="buscar" />
            Buscar
          </button>
        </div>
      </form>
      <EstadoCarga {...resultado} />
      {datos && (
        <>
          <p role="status">{numero(datos.total)} resultados</p>
          {!datos.resultados.length && (
            <p className="admin__tarjeta">
              No hay resultados para estos filtros.
            </p>
          )}
          <ul className="admin__lista">
            {datos.resultados.map((fila) => (
              <li key={fila.id} className="admin__tarjeta admin__fila">
                <span className="avatar" aria-hidden="true">
                  {iniciales(fila.nombre)}
                </span>
                <div>
                  <h2>{fila.nombre}</h2>
                  <p>{usuarios ? fila.correo : fila.especialidad}</p>
                  <small>
                    {usuarios ? fila.rol : fila.comuna || 'Sin comuna'}
                  </small>
                  {!usuarios && !verificaciones && (
                    <small className="admin__indicadores">
                      {fila.calificacion ? `★ ${fila.calificacion.promedio.toLocaleString('es-CL')} · ${fila.calificacion.total} ${fila.calificacion.total === 1 ? 'reseña' : 'reseñas'}` : 'Sin reseñas'}
                      {' · '}{fila.reservas} {fila.reservas === 1 ? 'reserva' : 'reservas'}
                    </small>
                  )}
                  {verificaciones && (
                    <small className="admin__indicadores">
                      {fila.documentos ?? 0} {fila.documentos === 1 ? 'documento' : 'documentos'}
                    </small>
                  )}
                </div>
                {usuarios ? (
                  <>
                    <span className="admin__estado">
                      {fila.activo === false ? 'Inactivo' : 'Activo'}
                    </span>
                    {fila.rol !== 'administrador' && (
                      <button
                        onClick={() => {
                          setError('');
                          setConfirmacion(fila);
                        }}
                      >
                        {fila.activo === false ? 'Reactivar' : 'Desactivar'}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {verificaciones && fila.estado === 'pendiente' && (
                      <span className={`admin-espera${fila.diasEsperando >= 3 ? ' admin-espera--atrasada' : ''}`}>
                        {fila.diasEsperando === null || fila.diasEsperando === undefined
                          ? 'Sin fecha de solicitud'
                          : fila.diasEsperando === 0 ? 'Llegó hoy' : `Espera hace ${fila.diasEsperando} ${fila.diasEsperando === 1 ? 'día' : 'días'}`}
                      </span>
                    )}
                    <span
                      className={`admin__estado${fila.verificado ? ' admin__estado--verificado' : ''}`}
                    >
                      <Icono nombre="escudo" />
                      {fila.verificado
                        ? 'Verificado'
                        : fila.estado === 'rechazado'
                          ? 'Rechazado'
                          : fila.estado === 'sin_solicitud'
                            ? 'Sin solicitud'
                            : 'Pendiente'}
                    </span>
                    <Link
                      className="admin__boton"
                      aria-label={`Revisar a ${fila.nombre}`}
                      to={`/admin/verificaciones/${fila.id}`}
                    >
                      {verificaciones ? 'Revisar' : 'Ver ficha'}
                    </Link>
                  </>
                )}
              </li>
            ))}
          </ul>
          {datos.totalPaginas > 1 && (
            <nav
              className="admin__paginacion"
              aria-label="Páginas de resultados"
            >
              <button
                type="button"
                disabled={pagina === 1}
                onClick={() => setPagina(pagina - 1)}
              >
                Anterior
              </button>
              <span>
                Página {pagina} de {datos.totalPaginas}
              </span>
              <button
                type="button"
                disabled={pagina >= datos.totalPaginas}
                onClick={() => setPagina(pagina + 1)}
              >
                Siguiente
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}

export function DetalleVerificacion() {
  const { id } = useParams();
  const [revision, setRevision] = useState(0);
  const [confirmar, setConfirmar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');
  const [pestana, setPestana] = useState('informacion');
  const [accion, setAccion] = useState('aprobar');
  const [motivo, setMotivo] = useState('');
  const resultado = useDatos(`/administrador/profesionales/${id}`, revision);
  const ficha = resultado.datos?.profesional;
  async function aprobar() {
    setGuardando(true);
    setError('');
    try {
      await solicitar(`/administrador/profesionales/${id}/decision`, {
        metodo: 'POST',
        cuerpo: { accion, motivo, revision: ficha.revision },
      });
      setAviso(
        accion === 'aprobar'
          ? 'El perfil fue verificado correctamente.'
          : 'La decisión fue registrada.',
      );
      setConfirmar(false);
      setRevision((r) => r + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }
  return (
    <section>
      <Link to="/admin/verificaciones" className="admin__volver">
        <Icono nombre="flechaIzquierda" />
        Volver a verificaciones
      </Link>
      <h1>Detalle de verificación</h1>
      <EstadoCarga {...resultado} />
      {aviso && (
        <p role="status" className="admin__exito">
          {aviso}
        </p>
      )}
      {error && (
        <p role="alert" className="admin__error">
          {error}
        </p>
      )}
      {ficha && (
        <article className="admin__tarjeta">
          <h2>{ficha.nombre}</h2>
          <p
            className={`admin__estado${ficha.verificado ? ' admin__estado--verificado' : ''}`}
          >
            <Icono nombre="escudo" />
            {ficha.verificado
              ? 'Verificado'
              : ficha.estado === 'rechazado'
                ? 'Rechazado'
                : ficha.estado === 'pendiente'
                  ? 'Pendiente de revisión'
                  : 'Sin solicitud enviada'}
          </p>
          {ficha.motivoRechazo && <p>Motivo: {ficha.motivoRechazo}</p>}
          <div className="admin__filtros">
            {[
              ['informacion', 'Información'],
              ['documentos', 'Documentos'],
              ['historial', 'Historial'],
            ].map(([clave, nombre]) => (
              <button
                key={clave}
                aria-pressed={pestana === clave}
                onClick={() => setPestana(clave)}
              >
                {nombre}
              </button>
            ))}
          </div>
          {pestana === 'informacion' && (
            <>
              <h3>Información del profesional</h3>
              <dl className="admin__datos">
                {[
                  ['Correo', ficha.correo],
                  ['RUT', ficha.rut],
                  ['Teléfono', ficha.telefono],
                  ['Especialidad', ficha.especialidad],
                  ['Comuna', ficha.comuna],
                  ['Modalidad', ficha.modalidad],
                  ['Descripción', ficha.descripcion],
                ].map(([nombre, valor]) => (
                  <div key={nombre}>
                    <dt>{nombre}</dt>
                    <dd>{valor || 'No informado'}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
          {pestana === 'documentos' && (
            <>
              <h3>Documentos adjuntos</h3>
              <Documentos
                documentos={ficha.documentos || []}
                onError={setError}
              />
              {!ficha.documentos?.length && (
                <p>El profesional todavía no adjunta documentos.</p>
              )}
            </>
          )}
          {pestana === 'historial' && (
            <>
              <h3>Historial de verificación</h3>
              <ul>
                {(ficha.historial || []).map((h, i) => (
                  <li key={i}>
                    {new Date(h.fecha).toLocaleString('es-CL')}: {h.accion}
                    {h.motivo && ` — ${h.motivo}`}
                  </li>
                ))}
              </ul>
            </>
          )}
          {!ficha.verificado && ficha.estado !== 'pendiente' && (
            <p role="status">
              {ficha.estado === 'rechazado'
                ? 'La solicitud está cerrada.'
                : 'No hay una solicitud enviada.'}{' '}
              Espera a que el profesional envíe una nueva solicitud de
              verificación.
            </p>
          )}
          <div className="admin__acciones">
            {confirmar ? (
              <>
                <p>
                  Confirma la decisión «{accion}» para {ficha.nombre} después de
                  revisar su ficha y documentos.
                </p>
                {accion !== 'aprobar' && (
                  <label>
                    Motivo obligatorio
                    <textarea
                      value={motivo}
                      minLength={5}
                      maxLength={500}
                      onChange={(e) => setMotivo(e.target.value)}
                    />
                  </label>
                )}
                <button
                  type="button"
                  className="admin__boton"
                  disabled={
                    guardando ||
                    (accion !== 'aprobar' && motivo.trim().length < 5)
                  }
                  onClick={aprobar}
                >
                  {guardando
                    ? 'Guardando…'
                    : accion === 'aprobar'
                      ? 'Confirmar verificación'
                      : 'Confirmar decisión'}
                </button>
                <button
                  type="button"
                  disabled={guardando}
                  onClick={() => setConfirmar(false)}
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
                {(ficha.verificado
                  ? [['revocar', 'Revocar verificación']]
                  : ficha.estado === 'pendiente'
                    ? [
                        ['aprobar', 'Aprobar verificación'],
                        ['rechazar', 'Rechazar solicitud'],
                      ]
                    : []
                ).map(([valor, nombre]) => (
                  <button
                    type="button"
                    key={valor}
                    className="admin__boton"
                    disabled={ficha.activo === false}
                    onClick={() => {
                      setAccion(valor);
                      setMotivo('');
                      setConfirmar(true);
                    }}
                  >
                    {nombre}
                  </button>
                ))}
              </>
            )}
          </div>
        </article>
      )}
    </section>
  );
}
