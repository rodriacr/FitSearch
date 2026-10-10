import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alerta from '../../components/Alerta.jsx';
import { Calificacion } from '../../components/Calificacion.jsx';
import Icono from '../../components/Icono.jsx';
import FormularioFicha from '../../components/profesional/FormularioFicha.jsx';
import { useSesion } from '../../context/SesionContext.jsx';
import { etiquetaModalidad, iniciales } from '../../services/formato.js';
import { obtenerMiFicha, obtenerProfesional } from '../../services/profesional.service.js';
import './PerfilProfesional.css';

const PESTANAS = [
  { clave: 'informacion', nombre: 'Información' },
  { clave: 'horarios', nombre: 'Horarios', proximamente: 'Publicarás tus horarios disponibles desde la Agenda, y aquí verás un resumen de tu semana.' },
  { clave: 'experiencia', nombre: 'Experiencia', proximamente: 'Pronto podrás contar tus años de experiencia y tu formación.' },
  { clave: 'certificaciones', nombre: 'Certificaciones', proximamente: 'Pronto podrás agregar tus certificaciones para que el equipo de FitSearch verifique tu ficha.' },
];

function Pestanas({ activa, onCambiar }) {
  const alTeclear = (evento, indice) => {
    const destinos = {
      ArrowRight: (indice + 1) % PESTANAS.length,
      ArrowLeft: (indice + PESTANAS.length - 1) % PESTANAS.length,
      Home: 0,
      End: PESTANAS.length - 1,
    };
    const destino = destinos[evento.key];
    if (destino === undefined) return;
    evento.preventDefault();
    onCambiar(PESTANAS[destino].clave);
    evento.currentTarget.parentElement.querySelectorAll('[role="tab"]')[destino].focus();
  };

  return (
    <div className="perfil-prof__pestanas" role="tablist" aria-label="Secciones de tu perfil profesional">
      {PESTANAS.map(({ clave, nombre }, indice) => (
        <button key={clave} type="button" role="tab" id={`pestana-${clave}`} aria-controls={`panel-${clave}`}
          aria-selected={activa === clave} tabIndex={activa === clave ? 0 : -1}
          className={`perfil-prof__pestana${activa === clave ? ' perfil-prof__pestana--activa' : ''}`}
          onClick={() => onCambiar(clave)} onKeyDown={(evento) => alTeclear(evento, indice)}>
          {nombre}
        </button>
      ))}
    </div>
  );
}

function Informacion({ profesional }) {
  const { descripcion, comuna, modalidad, establecimiento, ubicacionLat, ubicacionLng, nombre } = profesional;
  return (
    <>
      <section className="perfil-prof__bloque" aria-labelledby="titulo-sobre-mi">
        <h3 id="titulo-sobre-mi">Sobre mí</h3>
        <p>{descripcion || 'Todavía no agregas una descripción. Cuéntales a las personas cómo es tu atención desde "Editar perfil".'}</p>
      </section>
      <section className="perfil-prof__bloque" aria-labelledby="titulo-atencion">
        <h3 id="titulo-atencion">Atención</h3>
        <ul className="perfil-prof__datos">
          <li><Icono nombre="pin" tamano={18} /> {establecimiento?.nombre ? `${establecimiento.nombre}, ${comuna}` : comuna || 'Comuna por confirmar'}</li>
          <li><Icono nombre="persona" tamano={18} /> Modalidad: {etiquetaModalidad(modalidad)}</li>
          <li>
            <Icono nombre="mira" tamano={18} />
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ubicacionLat},${ubicacionLng}`)}`}
              target="_blank" rel="noopener noreferrer" aria-label={`Ver la ubicación de atención de ${nombre} en Google Maps (nueva pestaña)`}>
              Ver ubicación en Google Maps
            </a>
          </li>
        </ul>
      </section>
    </>
  );
}

// "Perfil profesional" (mockup del PO del 04-10-2026): resumen de la ficha pública, con "Editar perfil" y la vista previa.
// Mientras la ficha no existe, se muestra directamente el formulario (FS-HU-04).
export default function PerfilProfesional() {
  const { sesion } = useSesion();
  const [estado, setEstado] = useState({ cargando: true });
  const [intento, setIntento] = useState(0);
  const [editando, setEditando] = useState(false);
  const [pestana, setPestana] = useState('informacion');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    let activo = true;
    obtenerMiFicha()
      .then(async ({ ficha }) => {
        // Con ficha se lee también la ficha pública: así se muestran la calificación y la verificación reales.
        const publica = ficha ? await obtenerProfesional(ficha.id) : null;
        if (activo) setEstado({ ficha, publica });
      })
      .catch((error) => activo && setEstado({ error: error.message }));
    return () => { activo = false; };
  }, [intento]);

  if (estado.cargando) return <p className="texto-secundario" role="status">Cargando tu perfil profesional…</p>;
  if (estado.error) {
    return (
      <div className="buscador__estado">
        <Alerta>{estado.error}</Alerta>
        <button type="button" className="boton boton--secundario boton--compacto" onClick={() => { setEstado({ cargando: true }); setIntento(intento + 1); }}>Reintentar</button>
      </div>
    );
  }

  const alGuardar = () => {
    setEditando(false);
    setMensaje('Tu ficha profesional se guardó correctamente.');
    setEstado({ cargando: true });
    setIntento(intento + 1);
  };

  if (!estado.ficha || editando) {
    return (
      <div className="perfil-prof">
        {!estado.ficha && (
          <p className="perfil-prof__aviso"><Icono nombre="info" tamano={20} /> Completa tu ficha para aparecer en el buscador de FitSearch.</p>
        )}
        <FormularioFicha ficha={estado.ficha} onGuardado={alGuardar} onCancelar={estado.ficha ? () => setEditando(false) : undefined} />
      </div>
    );
  }

  const { profesional } = estado.publica;
  const activa = PESTANAS.find(({ clave }) => clave === pestana);

  return (
    <div className="perfil-prof">
      <Alerta tipo="exito">{mensaje}</Alerta>
      <div className="perfil-prof__grilla">
        <aside className="perfil-prof__tarjeta perfil-prof__identidad" aria-label="Tu ficha">
          <span className="perfil-prof__avatar" aria-hidden="true">{iniciales(sesion.usuario.nombre)}</span>
          <h1>{profesional.nombre}</h1>
          <p className="perfil-prof__especialidad">{profesional.especialidad}</p>
          {profesional.verificado
            ? <span className="perfil-prof__verificado"><Icono nombre="escudo" tamano={16} /> Verificado</span>
            : <span className="perfil-prof__sin-verificar" title="El equipo de FitSearch verifica las fichas profesionales.">Sin verificar</span>}
          <Calificacion promedio={profesional.calificacion.promedio} total={profesional.calificacion.total} />
          <p className="perfil-prof__lugar"><Icono nombre="pin" tamano={16} /> {profesional.comuna || 'Comuna por confirmar'}</p>
          <button type="button" className="boton boton--secundario boton--compacto" onClick={() => { setMensaje(''); setEditando(true); }}>
            <Icono nombre="lapiz" tamano={16} /> Editar perfil
          </button>
          <div className="perfil-prof__especialidades">
            <h2>Mi especialidad</h2>
            <ul>
              <li>{profesional.especialidad}</li>
              <li>{etiquetaModalidad(profesional.modalidad)}</li>
            </ul>
          </div>
        </aside>

        <section className="perfil-prof__tarjeta perfil-prof__detalle" aria-label="Detalle de tu perfil">
          <Pestanas activa={pestana} onCambiar={setPestana} />
          <div id={`panel-${activa.clave}`} role="tabpanel" aria-labelledby={`pestana-${activa.clave}`} className="perfil-prof__panel">
            {activa.proximamente ? (
              <div className="perfil-prof__proximamente">
                <span className="etiqueta-proximamente">Próximamente</span>
                <p>{activa.proximamente}</p>
              </div>
            ) : <Informacion profesional={profesional} />}
          </div>
          <Link to="/profesional/perfil/publico" className="boton boton--secundario boton--compacto perfil-prof__publico">
            <Icono nombre="ojo" tamano={18} /> Ver mi perfil público
          </Link>
        </section>
      </div>
    </div>
  );
}
