import iconoLogo from '../../assets/logo-fitsearch-icono.png';
import Icono from '../Icono.jsx';

const PASOS = [
  { nombre: 'Tipo de cuenta', titulo: 'Tipo de cuenta', subtitulo: 'Cuéntanos cómo vas a usar FitSearch para mostrarte lo que te corresponde.' },
  { nombre: 'Datos personales', titulo: 'Datos personales', subtitulo: 'Cuéntanos un poco sobre ti para personalizar tu experiencia.' },
  { nombre: 'Objetivos y estilo de vida', titulo: 'Objetivos y estilo de vida', subtitulo: 'Cuéntanos qué buscas lograr y cómo es tu rutina diaria.' },
  { nombre: 'Información de salud', titulo: 'Información de salud', subtitulo: 'Esta información nos ayudará a entregarte recomendaciones más seguras y precisas.' },
  { nombre: 'Finalizar', titulo: null, subtitulo: null },
];

// Mensaje y beneficios del panel lateral (degradado de la marca, sin fotografías).
const PANELES = [
  { mensaje: 'Tu cuenta, a tu medida.', beneficios: [
    ['persona', 'Una experiencia según cómo uses FitSearch'], ['maletin', 'Herramientas propias para profesionales'], ['lapiz', 'Puedes cambiarlo cuando quieras'],
  ] },
  { mensaje: 'Tu bienestar comienza con tu perfil.', beneficios: [
    ['estrella', 'Recomendaciones personalizadas'], ['corazon', 'Mejores resultados en tu salud y rendimiento'], ['persona', 'Una experiencia hecha para ti'],
  ] },
  { mensaje: 'Tus objetivos, nuestro enfoque.', beneficios: [
    ['objetivoBajar', 'Orientación según tu objetivo'], ['grafico', 'Seguimiento de tu progreso'], ['medico', 'Profesionales que pueden ayudarte'],
  ] },
  { mensaje: 'Tu salud, en buenas manos.', beneficios: [
    ['candadoCerrado', 'Información confidencial'], ['escudo', 'Solo tú puedes verla'], ['lapiz', 'Puedes editarla cuando quieras'],
  ] },
  { mensaje: '¡Bienvenido a FitSearch!', beneficios: [
    ['corazon', 'Tu salud, deporte y bienestar en un solo lugar'],
  ] },
];

function IndicadorPasos({ actual }) {
  return (
    <ol className="indicador-pasos" aria-label="Pasos para completar tu perfil">
      {PASOS.map((paso, i) => {
        const estado = i < actual ? 'hecho' : i === actual ? 'actual' : 'pendiente';
        return (
          <li key={paso.nombre} className={`indicador-pasos__paso indicador-pasos__paso--${estado}`}
            aria-current={estado === 'actual' ? 'step' : undefined}>
            <span className="indicador-pasos__numero">{estado === 'hecho' ? <Icono nombre="check" tamano={14} /> : i + 1}</span>
            <span className="indicador-pasos__nombre">{paso.nombre}</span>
          </li>
        );
      })}
    </ol>
  );
}

// Contenedor del asistente de 5 pasos del perfil: indicador, título, contenido del paso y panel lateral.
export default function AsistentePerfil({ paso, children, aviso }) {
  const { titulo, subtitulo } = PASOS[paso];
  const panel = PANELES[paso];
  return (
    <section className="asistente">
      <div className="asistente__principal">
        <IndicadorPasos actual={paso} />
        {aviso}
        {titulo && (
          <header className="asistente__encabezado">
            <h1>{titulo}</h1>
            <p className="texto-secundario">{subtitulo}</p>
          </header>
        )}
        {children}
      </div>
      <aside className="asistente__panel" aria-hidden="true">
        <img src={iconoLogo} alt="" className="asistente__panel-icono" />
        <p className="asistente__panel-mensaje">{panel.mensaje}</p>
        <ul className="asistente__beneficios">
          {panel.beneficios.map(([icono, texto]) => (
            <li key={texto}><span className="asistente__beneficio-icono"><Icono nombre={icono} tamano={18} /></span>{texto}</li>
          ))}
        </ul>
      </aside>
      <img src={iconoLogo} alt="" className="asistente__marca-agua" aria-hidden="true" />
      <svg className="acceso__ola" viewBox="0 0 400 90" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 30 C120 95 250 5 400 55 L400 90 L0 90 Z" className="ola--naranja" />
        <path d="M0 55 C140 105 260 30 400 75 L400 90 L0 90 Z" className="ola--azul" />
      </svg>
    </section>
  );
}
