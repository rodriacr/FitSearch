import useAnimacionesScroll from '../services/useAnimacionesScroll.js';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import reglas from '@shared/reglas.json';
import Alerta from '../components/Alerta.jsx';
import BuscadorGeneral from '../components/BuscadorGeneral.jsx';
import EstadoVacio from '../components/EstadoVacio.jsx';
import Icono from '../components/Icono.jsx';
import Especialidades from '../components/inicio/Especialidades.jsx';
import fotoInicio from '../assets/inicio/bienestar-inicio.webp';
import { ACCESOS_RAPIDOS, SECCIONES } from '../components/diseno/secciones.js';
import TarjetaProfesional from '../components/profesionales/TarjetaProfesional.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import { obtenerDia } from '../services/comidas.service.js';
import { formatearNumero, primerNombre } from '../services/formato.js';
import { obtenerPerfil } from '../services/perfil.service.js';
import { buscarProfesionales } from '../services/profesional.service.js';
import { MisCitas } from './Agenda.jsx';
import { ubicacionSiHayPermiso } from '../services/ubicacion.js';
import './Inicio.css';
import './InicioRedisenado.css';

const OBJETIVOS = Object.fromEntries(reglas.perfil.objetivoPrincipal.map(({ valor, etiqueta }) => [valor, etiqueta]));
const Proximamente = () => <span className="etiqueta-proximamente">Próximamente</span>;

function TarjetaObjetivo({ objetivo }) {
  return (
    <section className="panel-tarjeta" aria-labelledby="titulo-objetivo">
      <h2 id="titulo-objetivo" className="panel-tarjeta__titulo"><span className="panel-tarjeta__icono"><Icono nombre="diana" tamano={20} /></span> Tu objetivo actual</h2>
      {objetivo ? (
        <>
          <p className="objetivo__nombre">{OBJETIVOS[objetivo] || objetivo}</p>
          <p className="objetivo__nota">Sigue tus calorías y macronutrientes de cada día en <Link to="/comidas">Comidas</Link>.</p>
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

// consumidas: calorías registradas hoy en Comidas (FS-HU-10), o null si aún no se cargan o no se pudieron cargar.
function TarjetaProgreso({ kcal, consumidas }) {
  return (
    <section className="panel-tarjeta" aria-labelledby="titulo-progreso">
      <h2 id="titulo-progreso" className="panel-tarjeta__titulo"><span className="panel-tarjeta__icono"><Icono nombre="grafico" tamano={20} /></span> Tu progreso</h2>
      <ul className="progreso">
        <li>
          <span className="progreso__icono progreso__icono--calorias"><Icono nombre="fuego" tamano={22} /></span>
          <div>
            <span className="progreso__nombre">Calorías hoy</span>
            <strong className="progreso__valor">
              {consumidas === null ? <span aria-hidden="true">—</span> : formatearNumero(consumidas)}
              {kcal ? <small> / {formatearNumero(kcal)} kcal</small> : <small> kcal</small>}
            </strong>
            {!kcal && <Link to="/perfil" className="progreso__enlace">Completa tus datos para estimar tu meta</Link>}
            <Link to="/comidas" className="progreso__enlace">Registrar comida</Link>
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
      {kcal && <p className="progreso__nota">Tu meta diaria de calorías se estima con tus datos personales; las calorías de hoy salen de lo que registras en Comidas.</p>}
    </section>
  );
}

function TarjetaCitas() {
  return (
    <div className="panel-tarjeta inicio__citas"><MisCitas compacto /></div>
  );
}

// Inicio del usuario con sesión, según el mockup (FS-HU-21). Solo usa datos reales de la API:
// lo que aún no existe se muestra como estado vacío o "Próximamente".
export default function Inicio() {
  const animaciones = useAnimacionesScroll();
  const { sesion, marcarRolPendiente } = useSesion();
  const [intento, setIntento] = useState(0);
  const [perfil, setPerfil] = useState(null);
  const [destacados, setDestacados] = useState(null);
  const [caloriasHoy, setCaloriasHoy] = useState(null);

  useEffect(() => {
    let activo = true;
    // Si las comidas no cargan, la tarjeta muestra «—» y el resto del Inicio sigue igual.
    obtenerDia()
      .then(({ consumo }) => activo && setCaloriasHoy(consumo.calorias))
      .catch(() => activo && setCaloriasHoy(null));
    return () => { activo = false; };
  }, [intento]);

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

  // El tipo de cuenta define las pantallas: sin elegirlo, RutaProtegida lleva a "Elegir perfil" (DAS, D25).
  const rolPendiente = perfil?.datos?.pasos.tipoCuenta === false;
  useEffect(() => {
    if (rolPendiente) marcarRolPendiente();
  }, [rolPendiente, marcarRolPendiente]);
  if (rolPendiente) return null;

  const cargandoPerfil = perfil?.intento !== intento;
  const cargandoDestacados = destacados?.intento !== intento;
  // Pasos pendientes del asistente del usuario (el tipo de cuenta no es parte de él).
  const pendientes = perfil?.datos
    ? [perfil.datos.pasos.datosPersonales, perfil.datos.pasos.objetivos, perfil.datos.pasos.salud].filter((hecho) => !hecho).length : 0;

  return (
    <div className="inicio" ref={animaciones}>
      <div data-revelar className="inicio__saludo"><h1>Hola, {primerNombre(sesion.usuario.nombre)}.<br />¿Cómo quieres cuidarte hoy?</h1><p>Encuentra profesionales de la salud y el deporte, y da el siguiente paso hacia tu bienestar.</p></div>
      {pendientes > 0 && (
        <div className="inicio__aviso">
          <Icono nombre="info" tamano={20} />
          <p>Te {pendientes === 1 ? 'falta 1 paso' : `faltan ${pendientes} pasos`} para completar tu perfil y recibir una orientación personalizada.</p>
          <Link to="/perfil" className="boton boton--secundario boton--compacto">Completar mi perfil</Link>
        </div>
      )}

      <section className="inicio__hero" aria-labelledby="titulo-inicio">
        <img data-paralaje className="inicio__foto" src={fotoInicio} alt="" width={1280} height={853} fetchPriority="high" />
        <div data-revelar className="inicio__hero-texto">
          <h2 id="titulo-inicio">Tu próximo paso<br /><span>empieza aquí.</span></h2>
          <p>Conecta con profesionales y encuentra el apoyo que necesitas para una vida más saludable.</p>
          <BuscadorGeneral />
        </div>
      </section>

      <section data-revelar className="inicio__accesos" aria-labelledby="titulo-accesos">
        <h2 id="titulo-accesos">Tus accesos rápidos</h2>
        <ul className="accesos-rapidos">
          {['profesionales', 'citas', 'asistente', 'comidas', ...ACCESOS_RAPIDOS.filter((clave) => SECCIONES[clave].proximamente)].map((clave) => {
            const { ruta, nombre, icono, proximamente } = SECCIONES[clave];
            return (
              <li key={clave}>
                <Link to={ruta} className={`acceso-rapido acceso-rapido--${clave}${proximamente ? ' acceso-rapido--proximamente' : ''}`}>
                  <span className="acceso-rapido__icono"><Icono nombre={icono} tamano={26} /></span>
                  <span className="acceso-rapido__nombre">{nombre}</span>
                  {proximamente ? <Proximamente /> : <Icono nombre="flecha" tamano={16} className="acceso-rapido__flecha" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="inicio__especialidades" aria-labelledby="titulo-especialidades-inicio">
        <div className="inicio__titulo-seccion"><h2 id="titulo-especialidades-inicio">Encuentra a tu profesional</h2><Link to="/profesionales" className="enlace-panel">Todas las especialidades <Icono nombre="flecha" tamano={16} /></Link></div>
        <p className="inicio__bajada">Explora las principales áreas y elige el apoyo para ti.</p>
        <Especialidades variante="inicio" />
      </section>

      <div data-revelar className="inicio__panel">
        {cargandoPerfil ? <p className="panel-tarjeta texto-secundario" role="status">Cargando tu información…</p> : perfil.error ? (
          <div className="panel-tarjeta">
            <Alerta>{perfil.error}</Alerta>
            <button type="button" className="boton boton--secundario boton--compacto" onClick={() => setIntento(intento + 1)}>Reintentar</button>
          </div>
        ) : (
          <>
            <TarjetaObjetivo objetivo={perfil.datos.objetivos.objetivoPrincipal} />
            <TarjetaProgreso kcal={perfil.datos.requerimientoCaloricoKcal} consumidas={caloriasHoy} />
          </>
        )}
        <TarjetaCitas />
      </div>

      <section data-revelar className="inicio__destacados" aria-labelledby="titulo-destacados">
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

      <section data-revelar className="banner-asistente" aria-labelledby="titulo-banner">
        <span className="banner-asistente__icono"><Icono nombre="chispa" tamano={26} /></span>
        <div className="banner-asistente__texto">
          <h2 id="titulo-banner">Tu asistente IA, para seguir avanzando.</h2>
          <p>Conversa sobre tus objetivos, revisa tu historial y retoma tus consultas cuando lo necesites.</p>
        </div>
        <Link to={SECCIONES.asistente.ruta} className="boton boton--principal boton--compacto">Abrir asistente <Icono nombre="flecha" tamano={18} /></Link>
      </section>
    </div>
  );
}
