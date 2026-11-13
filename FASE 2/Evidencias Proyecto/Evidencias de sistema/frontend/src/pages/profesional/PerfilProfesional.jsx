import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alerta from '../../components/Alerta.jsx';
import { Calificacion } from '../../components/Calificacion.jsx';
import Icono from '../../components/Icono.jsx';
import FormularioFicha from '../../components/profesional/FormularioFicha.jsx';
import Certificaciones from '../../components/profesional/Certificaciones.jsx';
import Experiencia from '../../components/profesional/Experiencia.jsx';
import { useSesion } from '../../context/SesionContext.jsx';
import { direccionDe, etiquetaModalidad, iniciales } from '../../services/formato.js';
import { obtenerMiFicha, obtenerProfesional } from '../../services/profesional.service.js';
import './PerfilProfesional.css';

const PESTANAS = [
  { clave: 'informacion', nombre: 'Información' },
  { clave: 'certificaciones', nombre: 'Certificaciones' },
];

function CompartirPerfil({ id }) {
  const [copiando, setCopiando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [manual, setManual] = useState(false);
  const enlace = new URL(`/profesionales/${id}`, window.location.origin).href;

  async function copiar() {
    setCopiando(true);
    setCopiado(false);
    setManual(false);
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
    } catch {
      setManual(true);
    } finally {
      setCopiando(false);
    }
  }

  return (
    <footer className="perfil-prof__acciones">
      <div className="perfil-prof__botones">
        <button type="button" className="boton boton--secundario boton--compacto" disabled={copiando} onClick={copiar}>
          <Icono nombre={copiado ? 'check' : 'enlace'} tamano={18} /> {copiado ? 'Enlace copiado' : 'Copiar enlace'}
        </button>
        <Link to="/profesional/perfil/publico" className="boton boton--secundario boton--compacto">
          <Icono nombre="ojo" tamano={18} /> Ver mi perfil público
        </Link>
      </div>
      {copiado && <p className="perfil-prof__copia" role="status">Enlace de tu perfil copiado.</p>}
      {manual && (
        <label className="perfil-prof__enlace-manual">
          No pudimos copiarlo automáticamente. Selecciona y copia este enlace:
          <input readOnly value={enlace} onFocus={(e) => e.target.select()} />
        </label>
      )}
    </footer>
  );
}

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
  const { descripcion, comuna, direccion, modalidad, establecimiento, ubicacionLat, ubicacionLng, nombre } = profesional;
  return (
    <>
      <section className="perfil-prof__bloque" aria-labelledby="titulo-sobre-mi">
        <div className="perfil-prof__titulo-bloque">
          <span className="perfil-prof__icono-bloque"><Icono nombre="usuario" tamano={28} /></span>
          <h2 id="titulo-sobre-mi">Sobre mí</h2>
        </div>
        <p>{descripcion || 'Todavía no agregas una descripción. Cuéntales a las personas cómo es tu atención desde "Editar perfil".'}</p>
      </section>
      <section className="perfil-prof__bloque" aria-labelledby="titulo-atencion">
        <h2 id="titulo-atencion">Atención</h2>
        <div className="perfil-prof__datos">
          <div className="perfil-prof__dato">
            <Icono nombre="pin" tamano={25} />
            <span>
              {direccionDe(profesional) || (establecimiento?.nombre ? `${establecimiento.nombre}, ${comuna}` : comuna || 'Comuna por confirmar')}
              {!direccion && modalidad !== 'online' && <small>Agrega tu dirección de atención desde "Editar perfil".</small>}
            </span>
          </div>
          <div className="perfil-prof__dato"><Icono nombre="grupo" tamano={25} /> Modalidad: {etiquetaModalidad(modalidad)}</div>
        </div>
        {ubicacionLat !== null && ubicacionLat !== undefined && ubicacionLng !== null && ubicacionLng !== undefined && (
          <p className="perfil-prof__mapa">
            <Icono nombre="mira" tamano={18} />
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ubicacionLat},${ubicacionLng}`)}`}
              target="_blank" rel="noopener noreferrer" aria-label={`Ver la ubicación de atención de ${nombre} en Google Maps (nueva pestaña)`}>
              Ver ubicación en Google Maps
            </a>
          </p>
        )}
      </section>
      <section className="perfil-prof__experiencia" aria-labelledby="titulo-experiencia">
        <div className="perfil-prof__titulo-bloque">
          <span className="perfil-prof__icono-bloque"><Icono nombre="maletin" tamano={28} /></span>
          <div><h2 id="titulo-experiencia">Experiencia y formación</h2><p>Comparte tu trayectoria y a quiénes atiendes.</p></div>
        </div>
        <Experiencia />
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
          <div className="perfil-prof__cabecera" aria-hidden="true">
            <Icono nombre={profesional.especialidad === 'Entrenamiento personal' ? 'mancuerna' : profesional.especialidad === 'Nutrición' ? 'comida' : 'medico'} tamano={38} />
          </div>
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
            {activa.clave === 'certificaciones' ? <Certificaciones /> : <Informacion profesional={profesional} />}
          </div>
          <CompartirPerfil id={profesional.id} />
        </section>
      </div>
    </div>
  );
}
