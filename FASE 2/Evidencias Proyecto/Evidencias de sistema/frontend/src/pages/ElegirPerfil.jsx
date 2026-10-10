import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import fotoProfesional from '../assets/perfil-profesional.webp';
import fotoUsuario from '../assets/perfil-usuario.webp';
import Alerta from '../components/Alerta.jsx';
import Icono from '../components/Icono.jsx';
import { Logo } from '../components/PantallaAcceso.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import { inicioDe } from '../services/navegacion.js';
import { actualizarTipoCuenta } from '../services/perfil.service.js';
import './ElegirPerfil.css';

const PERFILES = [
  {
    rol: 'usuario', titulo: 'Usuario', foto: fotoUsuario, icono: 'usuario', boton: 'Continuar como usuario',
    resumen: 'Busca, encuentra y gestiona tu salud y bienestar.',
    beneficios: [
      ['pin', 'Encuentra profesionales, centros de salud, gimnasios y más cerca de ti.'],
      ['comida', 'Registra tu alimentación y sigue tu progreso.'],
      ['chispa', 'Accede a la IA para resolver tus dudas y recibir recomendaciones.'],
      ['calendario', 'Lleva tus citas y tu historial en un solo lugar.'],
    ],
  },
  {
    rol: 'profesional', titulo: 'Profesional', foto: fotoProfesional, icono: 'maletin', boton: 'Continuar como profesional',
    resumen: 'Gestiona tu consulta y haz crecer tu práctica.',
    beneficios: [
      ['calendario', 'Administra tu agenda y disponibilidad.'],
      ['grupo', 'Gestiona a tus clientes y sus citas.'],
      ['grafico', 'Accede a herramientas para mejorar la atención y el seguimiento.'],
      ['medico', 'Forma parte de una comunidad de profesionales de la salud y el deporte.'],
    ],
  },
];

const PASOS = ['Tu cuenta', 'Selecciona tu perfil', '¡Listo!'];

function IndicadorRegistro() {
  return (
    <ol className="elegir__pasos" aria-label="Pasos para crear tu cuenta">
      {PASOS.map((nombre, i) => (
        <li key={nombre} className={`elegir__paso${i === 0 ? ' elegir__paso--hecho' : i === 1 ? ' elegir__paso--actual' : ''}`}
          aria-current={i === 1 ? 'step' : undefined}>
          <span className="elegir__paso-numero">{i === 0 ? <Icono nombre="check" tamano={14} /> : i + 1}</span>
          <span className="elegir__paso-nombre">{nombre}</span>
        </li>
      ))}
    </ol>
  );
}

// "¿Cómo quieres usar FitSearch?" (DAS, D25): después de crear la cuenta, la persona elige una sola vez si es usuario
// o profesional. Está fuera del asistente de perfil: el usuario sigue con sus datos y el profesional entra a su Inicio.
export default function ElegirPerfil() {
  const { sesion, aviso: avisoSesion, limpiarAviso, actualizarSesion, mostrarAviso, cerrarSesion } = useSesion();
  const navegar = useNavigate();
  // El aviso de cuenta creada se muestra una vez, aquí.
  const [aviso] = useState(avisoSesion);
  const [enviando, setEnviando] = useState('');
  const [mensaje, setMensaje] = useState('');

  // Solo se descarta el aviso que había al llegar: el de "¡Listo!" que se crea al elegir debe llegar a la próxima pantalla.
  useEffect(() => {
    if (aviso) limpiarAviso();
  }, [aviso, limpiarAviso]);

  if (sesion.usuario.rolConfirmado === true && !enviando) return <Navigate to={inicioDe(sesion.usuario)} replace />;

  const elegir = async (rol) => {
    setMensaje('');
    setEnviando(rol);
    try {
      const { token, usuario } = await actualizarTipoCuenta({ rol });
      if (rol === 'profesional') {
        mostrarAviso({ tipo: 'exito', texto: '¡Listo! Tu cuenta profesional está creada. Completa tu ficha para aparecer en el buscador.' });
      }
      actualizarSesion({ token, usuario });
      // El usuario sigue con su asistente de perfil; el profesional queda listo y entra a su Inicio.
      navegar(rol === 'profesional' ? inicioDe(usuario) : '/perfil', { replace: true });
    } catch (error) {
      if (error.estado === 409) {
        // Otra pestaña pudo confirmar un rol distinto al del JWT guardado.
        await cerrarSesion();
        mostrarAviso({ tipo: 'info', texto: 'Tu perfil ya fue elegido. Inicia sesión nuevamente para continuar.' });
        navegar('/iniciar-sesion', { replace: true });
        return;
      }
      setMensaje(error.message);
      setEnviando('');
    }
  };

  return (
    <div className="elegir">
      <header className="elegir__cabecera">
        <Logo className="elegir__logo" />
        <IndicadorRegistro />
        <button type="button" className="boton boton--secundario elegir__salir" onClick={cerrarSesion}>Cerrar sesión</button>
      </header>

      <main className="elegir__contenido">
        <p className="elegir__etapa">Paso 2 de 3</p>
        <h1>¿Cómo quieres usar <span className="elegir__marca">Fit<span>Search</span></span>?</h1>
        <p className="elegir__introduccion">
          Selecciona el perfil que mejor se adapte a tus necesidades.
          <br />Esta elección define tu espacio en FitSearch; si más adelante necesitas cambiarla, el administrador puede hacerlo.
        </p>
        {aviso && <Alerta tipo={aviso.tipo}>{aviso.texto}</Alerta>}
        <Alerta>{mensaje}</Alerta>

        <div className="elegir__opciones">
          {PERFILES.map(({ rol, titulo, foto, icono, boton, resumen, beneficios }) => (
            <article key={rol} className={`elegir__tarjeta elegir__tarjeta--${rol}`} aria-labelledby={`perfil-${rol}`}>
              <div className="elegir__foto">
                <img src={foto} alt="" />
                <span className="elegir__insignia"><Icono nombre={icono} tamano={30} /></span>
              </div>
              <div className="elegir__cuerpo">
                <h2 id={`perfil-${rol}`}>{titulo}</h2>
                <p className="elegir__resumen">{resumen}</p>
                <ul className="elegir__beneficios">
                  {beneficios.map(([iconoBeneficio, texto]) => (
                    <li key={texto}><span className="elegir__beneficio-icono"><Icono nombre={iconoBeneficio} tamano={20} /></span>{texto}</li>
                  ))}
                </ul>
                <button type="button" className="elegir__boton" disabled={Boolean(enviando)} onClick={() => elegir(rol)}>
                  {enviando === rol ? 'Guardando…' : <>{boton} <Icono nombre="flecha" tamano={18} /></>}
                </button>
              </div>
            </article>
          ))}
        </div>

        <p className="elegir__seguridad"><Icono nombre="candadoCerrado" tamano={18} /> Tu información está segura con nosotros.</p>
      </main>
    </div>
  );
}
