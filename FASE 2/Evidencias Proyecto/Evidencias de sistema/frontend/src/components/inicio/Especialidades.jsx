import { Link } from 'react-router-dom';
import Icono from '../Icono.jsx';
import nutricion from '../../assets/inicio/nutricion.webp';
import kinesiologia from '../../assets/inicio/kinesiologia.webp';
import entrenamiento from '../../assets/inicio/bienestar-parque.webp';
import './Especialidades.css';

const ESPECIALIDADES = [
  { nombre: 'Nutrición', imagen: nutricion, descripcion: 'Mejora tu alimentación con apoyo profesional.' },
  { nombre: 'Kinesiología', imagen: kinesiologia, descripcion: 'Encuentra apoyo para tu movimiento y recuperación.' },
  { nombre: 'Entrenamiento personal', imagen: entrenamiento, descripcion: 'Avanza a tu ritmo y con acompañamiento.' },
];

// Fotografías ilustrativas de las especialidades; las fichas y reseñas reales siguen en el directorio.
export default function Especialidades({ variante = 'publica' }) {
  return (
    <div className={`especialidades especialidades--${variante}`}>
      {ESPECIALIDADES.map(({ nombre, imagen, descripcion }, indice) => (
        <Link data-revelar data-revelar-retardo={indice * 90} key={nombre} to={`/profesionales?${new URLSearchParams({ especialidad: nombre })}`}
          className="especialidad" aria-label={`Explorar ${nombre}`}>
          <img className="especialidad__foto" src={imagen} alt="" width={640} height={720} loading="lazy" decoding="async" />
          <div className="especialidad__contenido">
            <h3>{nombre}</h3><p>{descripcion}</p>
            <span className="especialidad__enlace">Explorar <Icono nombre="flecha" tamano={18} /></span>
          </div>
        </Link>
      ))}
    </div>
  );
}
