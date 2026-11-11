import { Link } from 'react-router-dom';
import Alerta from '../../components/Alerta.jsx';
import Icono from '../../components/Icono.jsx';
import { Cifra, ColumnasApiladas } from '../../components/graficos/Graficos.jsx';
import { useSesion } from '../../context/SesionContext.jsx';
import { formatearNumero, iniciales, primerNombre } from '../../services/formato.js';
import { useDatosAdmin } from './useDatosAdmin.js';
import './PanelesAdministrador.css';

// Colores validados con el verificador de paletas (azul, naranjo y verde); el naranjo va con leyenda, ayuda y tabla.
const SERIES_ACTIVIDAD = [
  { clave: 'cuentas', nombre: 'Cuentas nuevas', color: '#1565a0' },
  { clave: 'reservas', nombre: 'Reservas', color: '#e07b2a' },
  { clave: 'resenas', nombre: 'Reseñas', color: '#1f7a52' },
];
const ROLES = { usuario: 'Usuario', profesional: 'Profesional', administrador: 'Administrador' };
const CATEGORIAS = { gimnasio: 'Gimnasios', centro_salud: 'Centros de salud', clinica: 'Clínicas', consulta: 'Consultas' };
const fechaLarga = new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const diaCorto = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const comoFecha = (dia) => new Date(`${dia}T00:00:00Z`);
const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);
const hace = (iso, hoy) => {
  const dias = Math.round((comoFecha(hoy) - comoFecha(new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Santiago' }))) / 86400000);
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  return `Hace ${dias} días`;
};
const esperaDe = (dias) => (dias === null ? 'Sin fecha de solicitud' : dias === 0 ? 'Llegó hoy' : `Espera hace ${dias} ${dias === 1 ? 'día' : 'días'}`);

// Dashboard del administrador (11-11-2026): operativo, para revisar en un vistazo lo que necesita atención hoy. Los
// análisis por período están en Reportes; aquí no se repiten.
export default function DashboardAdministrador() {
  const { sesion } = useSesion();
  const { datos, error, reintentar } = useDatosAdmin('/administrador/dashboard');

  return (
    <div className="admin-pantalla">
      <header className="admin-pantalla__cabecera">
        <div>
          <h1>Hola, {primerNombre(sesion.usuario.nombre)}</h1>
          <p>{datos ? `${capitalizar(fechaLarga.format(comoFecha(datos.hoy)))}. Esto es lo que necesita tu atención.` : 'Lo que necesita tu atención hoy.'}</p>
        </div>
      </header>

      {error ? (
        <div className="admin-pantalla__estado">
          <Alerta>{error}</Alerta>
          <button type="button" className="boton boton--secundario boton--compacto" onClick={reintentar}>Reintentar</button>
        </div>
      ) : !datos ? (
        <p className="texto-secundario" role="status">Cargando el dashboard…</p>
      ) : (
        <div className="admin-dashboard">
          <section className="admin-panel admin-dashboard__cola" aria-labelledby="titulo-cola">
            <div className="admin-panel__cabecera">
              <h2 id="titulo-cola">Verificaciones por revisar</h2>
              {datos.cola.total > 0 && <Link to="/admin/verificaciones" className="enlace-panel">Ver toda la cola <Icono nombre="flecha" tamano={16} /></Link>}
            </div>
            {datos.cola.total === 0 ? (
              <div className="admin-vacio">
                <Icono nombre="check" tamano={22} />
                <p><strong>No hay verificaciones pendientes</strong>Cuando un profesional envíe su solicitud con documentos, aparecerá aquí.</p>
              </div>
            ) : (
              <>
                <p className="admin-cola__resumen">
                  <strong className="cifra">{datos.cola.total}</strong> {datos.cola.total === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'}
                  {datos.cola.masAntiguaDias !== null && ` · la más antigua espera hace ${datos.cola.masAntiguaDias} ${datos.cola.masAntiguaDias === 1 ? 'día' : 'días'}`}
                </p>
                <ul className="admin-cola">
                  {datos.cola.primeras.map((ficha) => (
                    <li key={ficha.id}>
                      <Link to={`/admin/verificaciones/${ficha.id}`} className="admin-cola__fila" aria-label={`Revisar a ${ficha.nombre}`}>
                        <span className="avatar" aria-hidden="true">{iniciales(ficha.nombre)}</span>
                        <span className="admin-cola__datos">
                          <strong>{ficha.nombre}</strong>
                          <small>{[ficha.especialidad, ficha.comuna].filter(Boolean).join(' · ')}</small>
                        </span>
                        <span className={`admin-espera${ficha.diasEsperando >= 3 ? ' admin-espera--atrasada' : ''}`}>{esperaDe(ficha.diasEsperando)}</span>
                        <span className="admin-cola__documentos">{ficha.documentos} {ficha.documentos === 1 ? 'documento' : 'documentos'}</span>
                        <Icono nombre="flecha" tamano={18} className="admin-cola__ir" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="admin-panel admin-dashboard__plataforma" aria-labelledby="titulo-plataforma">
            <h2 id="titulo-plataforma">Estado de la plataforma</h2>
            <dl className="admin-estado">
              <div><dt>Usuarios activos</dt><dd className="cifra">{formatearNumero(datos.plataforma.usuariosActivos)}</dd></div>
              <div><dt>Profesionales verificados</dt><dd className="cifra">{datos.plataforma.verificados} de {datos.plataforma.profesionales}</dd></div>
              <div><dt>Cuentas desactivadas</dt><dd className="cifra">{formatearNumero(datos.plataforma.usuariosInactivos)}</dd></div>
              {Object.entries(datos.plataforma.establecimientos).map(([categoria, total]) => (
                <div key={categoria}><dt>{CATEGORIAS[categoria] ?? capitalizar(categoria.replace('_', ' '))}</dt><dd className="cifra">{formatearNumero(total)}</dd></div>
              ))}
            </dl>
            {datos.plataforma.profesionales > 0 && (
              <div className="admin-medidor" role="img" aria-label={`${Math.round((datos.plataforma.verificados / datos.plataforma.profesionales) * 100)} % de los profesionales está verificado`}>
                <span style={{ width: `${(datos.plataforma.verificados / datos.plataforma.profesionales) * 100}%` }} />
              </div>
            )}
          </section>

          <dl className="cifras admin-dashboard__cifras" aria-label="Últimos 7 días">
            <Cifra etiqueta="Cuentas nuevas" valor={formatearNumero(datos.cifras.cuentas.actual)} delta={datos.cifras.cuentas.actual - datos.cifras.cuentas.anterior}
              comparacion="vs. los 7 días anteriores" igual="Igual que los 7 días anteriores" />
            <Cifra etiqueta="Reservas" valor={formatearNumero(datos.cifras.reservas.actual)} delta={datos.cifras.reservas.actual - datos.cifras.reservas.anterior}
              comparacion="vs. los 7 días anteriores" igual="Igual que los 7 días anteriores" />
            <Cifra etiqueta="Reseñas" valor={formatearNumero(datos.cifras.resenas.actual)} delta={datos.cifras.resenas.actual - datos.cifras.resenas.anterior}
              comparacion="vs. los 7 días anteriores" igual="Igual que los 7 días anteriores" />
            <Cifra etiqueta="Preguntas al asistente" valor={formatearNumero(datos.cifras.preguntas.actual)} delta={datos.cifras.preguntas.actual - datos.cifras.preguntas.anterior}
              comparacion="vs. los 7 días anteriores" igual="Igual que los 7 días anteriores" />
          </dl>

          <section className="admin-panel admin-dashboard__actividad" aria-labelledby="titulo-actividad">
            <div className="admin-panel__cabecera">
              <h2 id="titulo-actividad">Actividad de los últimos 14 días</h2>
              <Link to="/admin/reportes" className="enlace-panel">Ver reportes <Icono nombre="flecha" tamano={16} /></Link>
            </div>
            <ColumnasApiladas
              grupos={datos.actividad.map((dia) => ({ ...dia, clave: dia.fecha, actual: dia.fecha === datos.hoy }))} series={SERIES_ACTIVIDAD}
              unidad={['movimiento', 'movimientos']} etiqueta={(dia) => diaCorto.format(comoFecha(dia.fecha)).replace('.', '')}
              titulo={(dia) => capitalizar(fechaLarga.format(comoFecha(dia.fecha)))}
              tituloTabla="Cuentas nuevas, reservas y reseñas por día" filaTabla={{ encabezado: 'Día', texto: (dia) => capitalizar(fechaLarga.format(comoFecha(dia.fecha))) }}
            />
          </section>

          <section className="admin-panel admin-dashboard__cuentas" aria-labelledby="titulo-cuentas">
            <div className="admin-panel__cabecera">
              <h2 id="titulo-cuentas">Últimas cuentas</h2>
              <Link to="/admin/usuarios" className="enlace-panel">Ver usuarios <Icono nombre="flecha" tamano={16} /></Link>
            </div>
            {datos.ultimasCuentas.length === 0 ? <p className="texto-secundario">Todavía no hay cuentas registradas.</p> : (
              <ul className="admin-cuentas">
                {datos.ultimasCuentas.map((cuenta) => (
                  <li key={cuenta.id}>
                    <span className="avatar" aria-hidden="true">{iniciales(cuenta.nombre)}</span>
                    <span className="admin-cuentas__datos">
                      <strong>{cuenta.nombre}</strong>
                      <small>{ROLES[cuenta.rol] ?? cuenta.rol}{cuenta.activo ? '' : ' · desactivada'}</small>
                    </span>
                    <time dateTime={cuenta.fechaRegistro}>{hace(cuenta.fechaRegistro, datos.hoy)}</time>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
