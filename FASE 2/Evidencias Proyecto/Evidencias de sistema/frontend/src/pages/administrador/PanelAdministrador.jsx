import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { Logo } from '../../components/PantallaAcceso.jsx';
import Icono from '../../components/Icono.jsx';
import { useSesion } from '../../context/SesionContext.jsx';
import { solicitar } from '../../services/api.js';
import './PanelAdministrador.css';

const secciones = [
  ['dashboard', 'Dashboard', 'casa'], ['profesionales', 'Profesionales', 'profesional'],
  ['verificaciones', 'Verificaciones', 'escudo'], ['usuarios', 'Usuarios', 'grupo'], ['reportes', 'Reportes', 'grafico'],
];

export function DisenoAdministrador() {
  const { sesion, cerrarSesion } = useSesion();
  const [abierto, setAbierto] = useState(false);
  useEffect(() => {
    if (!abierto) return undefined;
    const cerrar = (e) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('keydown', cerrar);
    return () => document.removeEventListener('keydown', cerrar);
  }, [abierto]);
  return <div className="admin">
    <a className="app__saltar" href="#contenido">Saltar al contenido</a>
    <header className="admin__cabecera"><Link to="/admin/dashboard" aria-label="FitSearch, ir al dashboard"><Logo /></Link>
      <button type="button" aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={abierto} aria-controls="menu-admin" onClick={() => setAbierto(!abierto)}><Icono nombre={abierto ? 'cerrar' : 'menu'} /></button>
    </header>
    {abierto && <button className="admin__fondo" aria-label="Cerrar menú lateral" onClick={() => setAbierto(false)} />}
    <aside id="menu-admin" className={`admin__menu${abierto ? ' admin__menu--abierto' : ''}`}>
      <p className="admin__identidad"><strong>Administrador</strong><span>{sesion.usuario.nombre}</span><small>{sesion.usuario.correo}</small></p>
      <nav aria-label="Menú administrativo">{secciones.map(([ruta, nombre, icono]) => <NavLink key={ruta} to={`/admin/${ruta}`} onClick={() => setAbierto(false)}><Icono nombre={icono} />{nombre}</NavLink>)}</nav>
      <button type="button" className="admin__salir" onClick={cerrarSesion}><Icono nombre="salir" />Cerrar sesión</button>
    </aside>
    <main id="contenido" className="admin__contenido" tabIndex={-1}><Outlet /></main>
  </div>;
}

function useDatos(ruta, revision = 0) {
  const [resultado, setResultado] = useState({ ruta: null, datos: null, error: '' });
  useEffect(() => {
    let vigente = true;
    solicitar(ruta).then((datos) => { if (vigente) setResultado({ ruta, datos, error: '' }); })
      .catch((e) => { if (vigente) setResultado({ ruta, datos: null, error: e.message }); });
    return () => { vigente = false; };
  }, [ruta, revision]);
  return resultado.ruta === ruta ? resultado : { datos: null, error: '' };
}
function EstadoCarga({ datos, error }) {
  if (error) return <p role="alert" className="admin__error">{error}</p>;
  if (!datos) return <p role="status">Cargando información…</p>;
  return null;
}
const numero = (n) => Number(n).toLocaleString('es-CL');

function GraficoRegistros({ datos }) {
  const fechas = [];
  for (let fecha = Date.parse(datos.desde); fecha <= Date.parse(datos.hasta); fecha += 86400000) fechas.push(new Date(fecha).toISOString().slice(0, 10));
  const valores = fechas.map((fecha) => ({
    fecha,
    usuarios: datos.registros.filter((r) => r.fecha === fecha).reduce((suma, r) => suma + r.cantidad, 0),
    profesionales: datos.registros.filter((r) => r.fecha === fecha && r.rol === 'profesional').reduce((suma, r) => suma + r.cantidad, 0),
  }));
  const maximo = Math.max(1, ...valores.map((v) => v.usuarios));
  const puntos = (clave) => valores.map((v, i) => `${45 + i * 600 / Math.max(1, valores.length - 1)},${215 - v[clave] * 180 / maximo}`).join(' ');
  return <div className="admin__grafico">
    <p><span className="admin__leyenda">Todos los registros</span><span className="admin__leyenda admin__leyenda--profesionales">Cuentas profesionales</span></p>
    <svg viewBox="0 0 680 255" role="img" aria-label={`Registros diarios entre ${datos.desde} y ${datos.hasta}. Los valores se detallan en la tabla.`}>
      {[0, .5, 1].map((fraccion) => <g key={fraccion}><line x1="45" x2="645" y1={215 - fraccion * 180} y2={215 - fraccion * 180} stroke="#dceaf0" /><text x="4" y={219 - fraccion * 180}>{Math.round(maximo * fraccion)}</text></g>)}
      <polyline points={puntos('usuarios')} fill="none" stroke="#086b90" strokeWidth="3" />
      <polyline points={puntos('profesionales')} fill="none" stroke="#18a997" strokeWidth="3" strokeDasharray="5 3" />
      <text x="45" y="245">{datos.desde}</text><text x="645" y="245" textAnchor="end">{datos.hasta}</text>
    </svg>
  </div>;
}

export function ResumenAdministrador({ reporte = false }) {
  const [dias, setDias] = useState('30');
  const resultado = useDatos(`/administrador/resumen?dias=${dias}`);
  const { datos } = resultado;
  return <section>
    <h1>{reporte ? 'Reportes' : 'Dashboard'}</h1>
    <p>{reporte ? 'Registros y profesionales de la plataforma.' : 'Resumen de la plataforma y verificaciones pendientes.'}</p>
    <label className="admin__periodo">Período<select value={dias} onChange={(e) => setDias(e.target.value)}>{['7', '30', '90'].map((d) => <option key={d} value={d}>Últimos {d} días</option>)}</select></label>
    <EstadoCarga {...resultado} />
    {datos && <>
      <p className="admin__nota">Registros del {datos.desde} al {datos.hasta} (UTC). Los totales muestran el estado actual.</p>
      <div className="admin__metricas">{[['Usuarios nuevos', datos.nuevosUsuarios], ['Profesionales nuevos', datos.nuevosProfesionales], ['Usuarios totales', datos.usuarios], ['Cuentas profesionales', datos.profesionales], ['Fichas pendientes', datos.pendientes], ['Fichas verificadas', datos.verificados]].map(([nombre, valor]) => <article key={nombre} className="admin__tarjeta"><span>{nombre}</span><strong>{numero(valor)}</strong></article>)}</div>
      {!reporte && <Link className="admin__boton" to="/admin/verificaciones">Revisar profesionales pendientes <Icono nombre="flecha" /></Link>}
      <div className="admin__tarjeta"><h2>Registro de usuarios</h2>
        {datos.registros.length > 0 && <GraficoRegistros datos={datos} />}
        {!datos.registros.length ? <p>No hubo registros en este período.</p> : <div className="admin__tabla"><table><caption>Registros diarios por tipo de cuenta</caption><thead><tr><th>Fecha</th><th>Tipo de cuenta</th><th>Registros</th></tr></thead><tbody>{datos.registros.map((r) => <tr key={`${r.fecha}-${r.rol}`}><td>{r.fecha}</td><td>{r.rol}</td><td>{numero(r.cantidad)}</td></tr>)}</tbody></table></div>}
      </div>
    </>}
  </section>;
}

export function ListadoAdministrador({ tipo }) {
  const usuarios = tipo === 'usuarios';
  const verificaciones = tipo === 'verificaciones';
  const [filtro, setFiltro] = useState(verificaciones ? 'pendientes' : '');
  const [busqueda, setBusqueda] = useState('');
  const [q, setQ] = useState('');
  const [pagina, setPagina] = useState(1);
  const parametros = new URLSearchParams({ q, pagina: String(pagina), [usuarios ? 'rol' : 'estado']: filtro });
  const resultado = useDatos(`/administrador/${usuarios ? 'usuarios' : 'profesionales'}?${parametros}`);
  const { datos } = resultado;
  const opciones = usuarios ? [['', 'Todos'], ['usuario', 'Usuarios'], ['profesional', 'Profesionales'], ['administrador', 'Administradores']] : [['', 'Todos'], ['pendientes', 'Pendientes'], ['verificados', 'Verificados']];
  return <section>
    <h1>{usuarios ? 'Usuarios' : verificaciones ? 'Verificaciones' : 'Profesionales'}</h1>
    <p>{usuarios ? 'Consulta las cuentas registradas en FitSearch.' : 'Revisa las fichas profesionales y su verificación.'}</p>
    <div className="admin__filtros" aria-label="Filtrar resultados">{opciones.map(([valor, nombre]) => <button type="button" key={valor} aria-pressed={filtro === valor} onClick={() => { setFiltro(valor); setPagina(1); }}>{nombre}</button>)}</div>
    <form className="admin__busqueda" onSubmit={(e) => { e.preventDefault(); setQ(busqueda.trim()); setPagina(1); }}>
      <label htmlFor="busqueda-admin">{usuarios ? 'Buscar por nombre o correo' : 'Buscar por nombre, especialidad o comuna'}</label>
      <div><input id="busqueda-admin" value={busqueda} maxLength={100} onChange={(e) => setBusqueda(e.target.value)} /><button type="submit"><Icono nombre="buscar" />Buscar</button></div>
    </form>
    <EstadoCarga {...resultado} />
    {datos && <>
      <p role="status">{numero(datos.total)} resultados</p>
      {!datos.resultados.length && <p className="admin__tarjeta">No hay resultados para estos filtros.</p>}
      <ul className="admin__lista">{datos.resultados.map((fila) => <li key={fila.id} className="admin__tarjeta admin__fila">
        <span className="admin__avatar" aria-hidden="true">{fila.nombre.slice(0, 1)}</span>
        <div><h2>{fila.nombre}</h2><p>{usuarios ? fila.correo : fila.especialidad}</p><small>{usuarios ? fila.rol : fila.comuna || 'Sin comuna'}</small></div>
        {!usuarios && <><span className={`admin__estado${fila.verificado ? ' admin__estado--verificado' : ''}`}><Icono nombre="escudo" />{fila.verificado ? 'Verificado' : 'Pendiente'}</span><Link className="admin__boton" aria-label={`Revisar a ${fila.nombre}`} to={`/admin/verificaciones/${fila.id}`}>Revisar</Link></>}
      </li>)}</ul>
      {datos.totalPaginas > 1 && <nav className="admin__paginacion" aria-label="Páginas de resultados"><button type="button" disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}>Anterior</button><span>Página {pagina} de {datos.totalPaginas}</span><button type="button" disabled={pagina >= datos.totalPaginas} onClick={() => setPagina(pagina + 1)}>Siguiente</button></nav>}
    </>}
  </section>;
}

export function DetalleVerificacion() {
  const { id } = useParams();
  const [revision, setRevision] = useState(0);
  const [confirmar, setConfirmar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');
  const resultado = useDatos(`/administrador/profesionales/${id}`, revision);
  const ficha = resultado.datos?.profesional;
  async function aprobar() {
    setGuardando(true); setError('');
    try {
      await solicitar(`/profesionales/${id}/verificar`, { metodo: 'PATCH' });
      setAviso('El perfil fue verificado correctamente.'); setConfirmar(false); setRevision((r) => r + 1);
    } catch (e) { setError(e.message); }
    finally { setGuardando(false); }
  }
  return <section>
    <Link to="/admin/verificaciones" className="admin__volver"><Icono nombre="flechaIzquierda" />Volver a verificaciones</Link>
    <h1>Detalle de verificación</h1>
    <EstadoCarga {...resultado} />
    {aviso && <p role="status" className="admin__exito">{aviso}</p>}
    {error && <p role="alert" className="admin__error">{error}</p>}
    {ficha && <article className="admin__tarjeta">
      <h2>{ficha.nombre}</h2><p className={`admin__estado${ficha.verificado ? ' admin__estado--verificado' : ''}`}><Icono nombre="escudo" />{ficha.verificado ? 'Verificado' : 'Pendiente de revisión'}</p>
      <h3>Información del profesional</h3>
      <dl className="admin__datos">{[['Correo', ficha.correo], ['Especialidad', ficha.especialidad], ['Comuna', ficha.comuna], ['Modalidad', ficha.modalidad], ['Descripción', ficha.descripcion]].map(([nombre, valor]) => <div key={nombre}><dt>{nombre}</dt><dd>{valor || 'No informado'}</dd></div>)}</dl>
      {!ficha.verificado && <div className="admin__acciones">
        {confirmar ? <><p>¿Confirmas que revisaste la ficha de {ficha.nombre} y deseas verificar este perfil?</p><button type="button" className="admin__boton" disabled={guardando} onClick={aprobar}>{guardando ? 'Verificando…' : 'Confirmar verificación'}</button><button type="button" disabled={guardando} onClick={() => setConfirmar(false)}>Cancelar</button></> : <button type="button" className="admin__boton" onClick={() => setConfirmar(true)}>Aprobar verificación</button>}
      </div>}
    </article>}
  </section>;
}
