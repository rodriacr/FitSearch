import Icono from '../Icono.jsx';
import './CintaMovimiento.css';

// Cinta en movimiento entre el buscador y las especialidades: dos filas que corren en sentidos opuestos, como en un
// motion graphic. Repite lo que la portada ya dice, así que es decorativa y el lector de pantalla la omite.
const FILAS = [
  ['Kinesiología', 'Nutrición', 'Entrenamiento personal', 'Medicina deportiva', 'Psicología deportiva'],
  ['Reserva sin llamadas', 'Fichas verificadas', 'Asistente de IA', 'Calorías y macros del día', 'Profesionales cerca de ti'],
];

export default function CintaMovimiento() {
  return (
    <div className="cinta" aria-hidden="true">
      {FILAS.map((palabras, fila) => (
        <div key={palabras[0]} className={`cinta__fila cinta__fila--${fila === 0 ? 'principal' : 'secundaria'}`}>
          {/* Dos copias seguidas: al llegar a la mitad, la segunda ocupa el lugar exacto de la primera y el ciclo no salta. */}
          {[0, 1].map((copia) => (
            <ul key={copia} className="cinta__grupo">
              {palabras.map((palabra) => (
                <li key={palabra}>{palabra}<Icono nombre="chispa" tamano={fila === 0 ? 30 : 18} /></li>
              ))}
            </ul>
          ))}
        </div>
      ))}
    </div>
  );
}
