import { Link } from 'react-router-dom';
import Icono from '../Icono.jsx';
import fotoProfesional from '../../assets/perfil-profesional.webp';
import './ParaProfesionales.css';

// Sección de la portada para los profesionales: lo que ya pueden hacer en FitSearch (ficha verificada, FS-HU-04 y
// FS-HU-12; agenda y reservas, FS-HU-13 y FS-HU-14; búsqueda y recomendación, FS-HU-06 y FS-HU-08) y un ejemplo de
// su espacio. El registro es el mismo: después de crear la cuenta se elige «Continuar como profesional» (D25).
const BENEFICIOS = [
  { icono: 'escudo', titulo: 'Ficha verificada', texto: 'Sube tu identificación y tu título. Cuando el administrador los aprueba, tu ficha muestra la insignia «Verificado».' },
  { icono: 'calendario', titulo: 'Agenda y reservas en línea', texto: 'Publica tus horarios en un calendario, recibe solicitudes con un mensaje y confírmalas o cancélalas.' },
  { icono: 'pin', titulo: 'Visible donde te buscan', texto: 'Apareces en la lista y el mapa por especialidad, comuna y modalidad, y el asistente recomienda tu especialidad cuando corresponde.' },
];

export default function ParaProfesionales() {
  return (
    <section id="para-profesionales" className="para-profesionales" aria-labelledby="titulo-profesionales">
      <div className="portada__ancho para-profesionales__contenido">
        <div data-revelar className="para-profesionales__texto">
          <h2 id="titulo-profesionales">¿Eres profesional?<br /><span>Llega a quienes te están buscando.</span></h2>
          <p className="para-profesionales__bajada">
            Kinesiología, nutrición, entrenamiento personal, medicina y psicología deportiva: crea tu ficha y FitSearch la
            muestra a las personas que buscan tu especialidad cerca de ellas.
          </p>
          <ul className="para-profesionales__beneficios">
            {BENEFICIOS.map(({ icono, titulo, texto }) => (
              <li key={titulo}>
                <span className="para-profesionales__icono"><Icono nombre={icono} tamano={22} /></span>
                <div><h3>{titulo}</h3><p>{texto}</p></div>
              </li>
            ))}
          </ul>
          <div className="para-profesionales__acciones">
            <Link to="/registro" className="boton boton--principal">Únete como profesional <Icono nombre="flecha" tamano={18} /></Link>
            <p>Al crear tu cuenta, elige «Continuar como profesional».</p>
          </div>
        </div>

        {/* Al aparecer, el ejemplo se cuenta solo: llega la solicitud, se confirma y el bloque queda reservado. */}
        <figure data-escena className="panel-ejemplo" aria-label="Ejemplo del espacio de un profesional en FitSearch">
          <figcaption>Tu espacio profesional <span className="panel-ejemplo__etiqueta">Ejemplo</span></figcaption>
          <div className="panel-ejemplo__ficha">
            <img src={fotoProfesional} alt="" width={64} height={64} loading="lazy" decoding="async" />
            <div>
              <strong>Matías Rojas</strong>
              <span>Medicina deportiva · Ñuñoa · Presencial y online</span>
              <span className="panel-ejemplo__calificacion"><Icono nombre="estrella" tamano={15} /> 4,9 · 27 reseñas</span>
            </div>
            <span className="panel-ejemplo__verificado"><Icono nombre="escudo" tamano={15} /> Verificado</span>
          </div>
          <div className="panel-ejemplo__agenda">
            <p>Jueves 12 de noviembre</p>
            <ul>
              <li className="panel-ejemplo__bloque panel-ejemplo__bloque--reservado"><time>09:00</time> Reservada · Martín S.</li>
              <li className="panel-ejemplo__bloque"><time>10:00</time> Libre</li>
              <li className="panel-ejemplo__bloque panel-ejemplo__bloque--pendiente"><time>18:00</time>
                <span className="panel-ejemplo__estado"><span>Solicitud de Camila R.</span><span aria-hidden="true">Reservada · Camila R.</span></span></li>
            </ul>
          </div>
          <div className="panel-ejemplo__solicitud">
            <p><strong>Camila R.</strong> quiere reservar el jueves a las 18:00</p>
            <blockquote>«Me molesta el hombro cuando nado y quiero saber qué ejercicios puedo hacer.»</blockquote>
            <div className="panel-ejemplo__acciones" aria-hidden="true"><span>Confirmar</span><span>Cancelar</span>
              <span className="panel-ejemplo__confirmada"><Icono nombre="check" tamano={16} /> Reserva confirmada</span></div>
          </div>
        </figure>
      </div>
    </section>
  );
}
