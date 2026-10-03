import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import reglas from '@shared/reglas.json';
import Alerta from '../components/Alerta.jsx';
import EstadoVacio from '../components/EstadoVacio.jsx';
import Icono from '../components/Icono.jsx';
import { ACCESOS_RAPIDOS, SECCIONES } from '../components/diseno/secciones.js';
import TarjetaProfesional from '../components/profesionales/TarjetaProfesional.jsx';
import { formatearNumero } from '../services/formato.js';
import { obtenerPerfil } from '../services/perfil.service.js';
import { buscarProfesionales } from '../services/profesional.service.js';
import { ubicacionSiHayPermiso } from '../services/ubicacion.js';
import './Inicio.css';

const OBJETIVOS = Object.fromEntries(reglas.perfil.objetivoPrincipal.map(({ valor, etiqueta }) => [valor, etiqueta]));
const CATEGORIAS_HERO = [
  { icono: 'profesional', nombre: 'Profesionales', detalle: 'de la salud y deporte' },
  { icono: 'hospital', nombre: 'Centros de salud', detalle: 'y clínicas' },
  { icono: 'mancuerna', nombre: 'Gimnasios', detalle: 'y centros deportivos' },
  { icono: 'pastilla', nombre: 'Farmacias', detalle: 'y más' },
];

const Proximamente = () => <span className="etiqueta-proximamente">Próximamente</span>;

function TarjetaObjetivo({ objetivo }) {
  return (
    <section className="panel-tarjeta" aria-labelledby="titulo-objetivo">
      <h2 id="titulo-objetivo" className="panel-tarjeta__titulo"><span className="panel-tarjeta__icono"><Icono nombre="diana" tamano={20} /></span> Tu objetivo actual</h2>
      {objetivo ? (
        <>
          <p className="objetivo__nombre">{OBJETIVOS[objetivo] || objetivo}</p>
          {/* La barra de avance se calculará con el gestor de alimentación (FS-HU-09 y FS-HU-10). */}
          <div className="barra-progreso barra-progreso--pendiente" aria-hidden="true"><span /></div>
          <p className="objetivo__nota"><Proximamente /> Tu avance se calculará con el registro de tus comidas.</p>
          <Link to="/perfil" className="enlace-panel">Ver detalle de objetivos <Icono nombre="flecha" tamano={16} /></Link>
        </>
      ) : (
        <EstadoVacio compacto icono="diana" titulo="Aún no defines tu objetivo"
          accion={<Link to="/perfil" className="boton boton--secundario boton--compacto">Definir mi objetivo</Link>}>
          Cuéntanos qué quieres lograr para orientarte mejor.
        </EstadoVacio>
      )}
    </section>
  );
}

function TarjetaProgreso({ kcal }) {
  return (
    <section className="panel-tarjeta" aria-labelledby="titulo-progreso">
      <h2 id="titulo-progreso" className="panel-tarjeta__titulo"><span className="panel-tarjeta__icono"><Icono nombre="grafico" tamano={20} /></span> Tu progreso</h2>
      <ul className="progreso">
        <li>
          <span className="progreso__icono progreso__icono--calorias"><Icono nombre="fuego" tamano={22} /></span>
          <div>
            <span className="progreso__nombre">Calorías hoy</span>
            {kcal
              ? <strong className="progreso__valor"><span aria-hidden="true">—</span> <small>/ {formatearNumero(kcal)} kcal</small></strong>
              : <Link to="/perfil" className="progreso__enlace">Completa tus datos para estimar tu meta</Link>}
            <Proximamente />
          </div>
        </li>
        <li>
          <span className="progreso__icono progreso__icono--pasos"><Icono nombre="pasos" tamano={22} /></span>
          <div><span className="progreso__nombre">Pasos hoy</span><Proximamente /></div>
        </li>
        <li>
          <span className="progreso__icono progreso__icono--agua"><Icono nombre="gota" tamano={22} /></span>
          <div><span className="progreso__nombre">Agua hoy</span><Proximamente /></div>
        </li>
      </ul>
      {kcal && <p className="progreso__nota">Tu meta diaria de calorías se estima con tus datos personales. El registro de comidas llegará pronto.</p>}
    </section>
  );
}

function TarjetaCitas() {
  return (
    <section className="panel-tarjeta" aria-labelledby="titulo-citas">
      <div className="panel-tarjeta__cabecera">
        <h2 id="titulo-citas" className="panel-tarjeta__titulo"><span className="panel-tarjeta__icono"><Icono nombre="calendario" tamano={20} /></span> Próximas citas</h2>
        <Link to={SECCIONES.citas.ruta} className="enlace-panel">Ver todas</Link>
      </div>
      {/* Las reservas llegan con FS-HU-14: mientras tanto no hay citas que mostrar. */}
      <EstadoVacio compacto icono="calendario" titulo="Aún no tienes citas agendadas"
        accion={<Link to="/profesionales" className="boton boton--secundario boton--compacto">Buscar profesionales</Link>}>
        Cuando reserves una hora con un profesional, la verás aquí.
      </EstadoVacio>
    </section>
  );
}

// Inicio del usuario con sesión, según el mockup (FS-HU-21). Solo usa datos reales de la API:
// lo que aún no existe se muestra como estado vacío o "Próximamente".
export default function Inicio() {
  const navegar = useNavigate();
  const [intento, setIntento] = useState(0);
  const [perfil, setPerfil] = useState(null);
  const [destacados, setDestacados] = useState(null);

  useEffect(() => {
    let activo = true;
    obtenerPerfil()
      .then((datos) => activo && setPerfil({ intento, datos }))
      .catch((error) => activo && setPerfil({ intento, error: error.message }));
    return () => { activo = false; };
  }, [intento]);

  useEffect(() => {
    let activo = true;
    // La distancia solo aparece si la persona ya autorizó su ubicación; el Inicio no la pide.
    ubicacionSiHayPermiso()
      .then((coords) => buscarProfesionales({ orden: 'destacados', limite: 4 }, coords))
      .then((respuesta) => activo && setDestacados({ intento, ...respuesta }))
      .catch((error) => activo && setDestacados({ intento, error: error.message }));
    return () => { activo = false; };
  }, [intento]);

  // El tipo de cuenta define las pantallas: sin confirmarlo, primero se completa ese paso del asistente.
  if (perfil?.datos && !perfil.datos.pasos.tipoCuenta) return <Navigate to="/perfil" replace />;

  const buscar = (evento) => {
    evento.preventDefault();
    const texto = new FormData(evento.currentTarget).get('q').trim();
    navegar(texto ? `/profesionales?q=${encodeURIComponent(texto)}` : '/profesionales');
  };
  const cargandoPerfil = perfil?.intento !== intento;
  const cargandoDestacados = destacados?.intento !== intento;
  const pendientes = perfil?.datos ? Object.values(perfil.datos.pasos).filter((hecho) => !hecho).length : 0;

  return (
    <div className="inicio">
      {pendientes > 0 && (
        <div className="inicio__aviso">
          <Icono nombre="info" tamano={20} />
          <p>Te {pendientes === 1 ? 'falta 1 paso' : `faltan ${pendientes} pasos`} para completar tu perfil y recibir una orientación personalizada.</p>
          <Link to="/perfil" className="boton boton--secundario boton--compacto">Completar mi perfil</Link>
        </div>
      )}

      <section className="inicio__hero" aria-labelledby="titulo-inicio">
        <div className="inicio__hero-texto">
          <h1 id="titulo-inicio">Tu salud y bienestar, en un solo lugar</h1>
          <p>Encuentra profesionales, centros de salud, gimnasios, farmacias y más, cerca de ti.</p>
          <form className="buscador-hero" role="search" onSubmit={buscar}>
            <label htmlFor="busqueda-inicio" className="solo-lector">¿Qué necesitas hoy?</label>
            <Icono nombre="buscar" tamano={20} />
            <input id="busqueda-inicio" name="q" type="search" placeholder="¿Qué necesitas hoy?" maxLength={reglas.profesionales.busqueda.max} autoComplete="off" />
            <button type="submit" aria-label="Buscar profesionales"><Icono nombre="buscar" tamano={20} /></button>
          </form>
        </div>
        <ul className="inicio__categorias" aria-label="Lo que encontrarás en FitSearch">
          {CATEGORIAS_HERO.map(({ icono, nombre, detalle }) => (
            <li key={nombre}><Icono nombre={icono} tamano={26} /><p><strong>{nombre}</strong>{detalle}</p></li>
          ))}
        </ul>
        <svg className="inicio__ola" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 40 C120 75 250 10 400 35 L400 60 L0 60 Z" className="ola--naranja" />
        </svg>
      </section>

      <section className="inicio__accesos" aria-labelledby="titulo-accesos">
        <h2 id="titulo-accesos">Tus accesos rápidos</h2>
        <ul className="accesos-rapidos">
          {ACCESOS_RAPIDOS.map((clave) => {
            const { ruta, nombre, icono, proximamente } = SECCIONES[clave];
            return (
              <li key={clave}>
                <Link to={ruta} className={`acceso-rapido acceso-rapido--${clave}`}>
                  <span className="acceso-rapido__icono"><Icono nombre={icono} tamano={26} /></span>
                  <span className="acceso-rapido__nombre">{nombre}</span>
                  {proximamente ? <Proximamente /> : <Icono nombre="flecha" tamano={16} className="acceso-rapido__flecha" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="inicio__panel">
        {cargandoPerfil ? <p className="panel-tarjeta texto-secundario" role="status">Cargando tu información…</p> : perfil.error ? (
          <div className="panel-tarjeta">
            <Alerta>{perfil.error}</Alerta>
            <button type="button" className="boton boton--secundario boton--compacto" onClick={() => setIntento(intento + 1)}>Reintentar</button>
          </div>
        ) : (
          <>
            <TarjetaObjetivo objetivo={perfil.datos.objetivos.objetivoPrincipal} />
            <TarjetaProgreso kcal={perfil.datos.requerimientoCaloricoKcal} />
          </>
        )}
        <TarjetaCitas />
      </div>

      <section className="inicio__destacados" aria-labelledby="titulo-destacados">
        <div className="inicio__titulo-seccion">
          <h2 id="titulo-destacados">Profesionales destacados</h2>
          <Link to="/profesionales" className="enlace-panel">Ver todos <Icono nombre="flecha" tamano={16} /></Link>
        </div>
        {cargandoDestacados ? <p className="texto-secundario" role="status">Cargando profesionales…</p> : destacados.error ? (
          <div className="panel-tarjeta">
            <Alerta>{destacados.error}</Alerta>
            <button type="button" className="boton boton--secundario boton--compacto" onClick={() => setIntento(intento + 1)}>Reintentar</button>
          </div>
        ) : destacados.profesionales.length ? (
          <div className="inicio__lista-destacados">
            {destacados.profesionales.map((profesional) => (
              <TarjetaProfesional key={profesional.id} profesional={profesional} variante="destacado" desde="/profesionales" />
            ))}
          </div>
        ) : (
          <EstadoVacio icono="profesional" titulo="Aún no hay profesionales destacados"
            accion={<Link to="/profesionales" className="boton boton--secundario boton--compacto">Explorar profesionales</Link>}>
            Cuando se incorporen fichas profesionales, las verás aquí.
          </EstadoVacio>
        )}
      </section>

      <section className="banner-asistente" aria-labelledby="titulo-banner">
        <span className="banner-asistente__icono"><Icono nombre="chispa" tamano={26} /></span>
        <div className="banner-asistente__texto">
          <h2 id="titulo-banner">¿Dudas sobre tu salud o entrenamiento?</h2>
          <p>Pregunta a nuestro asistente IA, te ayudará a encontrar la mejor opción para ti. <Proximamente /></p>
        </div>
        <Link to={SECCIONES.asistente.ruta} className="boton boton--principal boton--compacto">Abrir asistente <Icono nombre="flecha" tamano={18} /></Link>
      </section>
    </div>
  );
}
