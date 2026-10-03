import { useState } from 'react';
import Alerta from '../components/Alerta.jsx';
import CampoFormulario from '../components/CampoFormulario.jsx';
import Icono from '../components/Icono.jsx';
import { guardarMiFicha } from '../services/profesional.service.js';
import './PerfilProfesional.css';

const ESPECIALIDADES = ['Nutrición', 'Entrenamiento personal', 'Kinesiología', 'Psicología deportiva'];
const MAX_DESCRIPCION = 500;

// Ícono de mapa local: el catálogo de Icono.jsx aún no tiene uno. Si lo agregas ahí, reemplaza este componente.
function IconoMapa({ tamano = 20, className = '' }) {
  return (
    <svg className={`icono ${className}`} width={tamano} height={tamano} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M9 4 3 6.5v13L9 17l6 3 6-2.5v-13L15 7Z" /><path d="M9 4v13M15 7v13" />
    </svg>
  );
}

// Los nombres de los campos coinciden con la API (ubicacionLat/ubicacionLng), así los errores del servidor caen en su campo.
function validar({ especialidad, ubicacionLat, ubicacionLng }) {
  const errores = {};
  const lat = Number(ubicacionLat);
  const lng = Number(ubicacionLng);
  if (!especialidad) errores.especialidad = 'Selecciona tu especialidad';
  if (ubicacionLat === '' || Number.isNaN(lat) || lat < -90 || lat > 90) errores.ubicacionLat = 'La latitud debe estar entre -90 y 90';
  if (ubicacionLng === '' || Number.isNaN(lng) || lng < -180 || lng > 180) errores.ubicacionLng = 'La longitud debe estar entre -180 y 180';
  return errores;
}

const desdeFicha = (ficha) => ({
  especialidad: ficha?.especialidad ?? '',
  descripcion: ficha?.descripcion ?? '',
  ubicacionLat: ficha ? String(ficha.ubicacionLat) : '',
  ubicacionLng: ficha ? String(ficha.ubicacionLng) : '',
});

// Ficha pública del profesional (FS-HU-03). Se muestra justo después de elegir el tipo de cuenta "profesional"
// y desde "Editar" en Mi perfil. `ficha` es null la primera vez.
export default function PerfilProfesional({ ficha, edicion = false, onGuardado, onCancelar }) {
  const [datos, setDatos] = useState(() => desdeFicha(ficha));
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo) => (evento) => {
    setDatos({ ...datos, [campo]: evento.target.value });
    if (errores[campo]) setErrores({ ...errores, [campo]: undefined });
  };

  const guardar = async (evento) => {
    evento.preventDefault();
    setMensaje('');
    const nuevos = validar(datos);
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;
    setEnviando(true);
    try {
      const respuesta = await guardarMiFicha({
        especialidad: datos.especialidad, descripcion: datos.descripcion.trim(),
        ubicacionLat: Number(datos.ubicacionLat), ubicacionLng: Number(datos.ubicacionLng),
      });
      onGuardado(respuesta.ficha);
    } catch (error) {
      setErrores(error.detalles || {});
      setMensaje(error.message);
      setEnviando(false);
    }
  };

  const hayCoordenadas = datos.ubicacionLat !== '' && datos.ubicacionLng !== '' && !errores.ubicacionLat && !errores.ubicacionLng;

  return (
    <section className="ficha-prof">
      <header className="ficha-prof__cabecera">
        <h1>Configura tu perfil profesional</h1>
        <p>Completa estos datos para que los usuarios puedan encontrarte y agendar contigo.</p>
      </header>

      <form className="ficha-prof__tarjeta" onSubmit={guardar} noValidate>
        <Alerta>{mensaje}</Alerta>

        <fieldset className="ficha-prof__seccion">
          <legend><Icono nombre="medico" /> Información básica</legend>

          <CampoFormulario id="especialidad" etiqueta="Especialidad (obligatorio)" value={datos.especialidad}
            onChange={cambiar('especialidad')} error={errores.especialidad}>
            <option value="" disabled>Selecciona tu especialidad</option>
            {ESPECIALIDADES.map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}
          </CampoFormulario>

          <div className={`campo${errores.descripcion ? ' campo--error' : ''}`}>
            <label htmlFor="descripcion" className="campo__etiqueta">Descripción sobre tu atención</label>
            <textarea id="descripcion" name="descripcion" rows={5} maxLength={MAX_DESCRIPCION}
              className="campo__control ficha-prof__texto" value={datos.descripcion} onChange={cambiar('descripcion')}
              placeholder="Cuéntales a los usuarios sobre tu experiencia, tu enfoque y cómo puedes ayudarlos..." />
            {errores.descripcion
              ? <p className="campo__mensaje" role="alert">{errores.descripcion}</p>
              : <p className="campo__ayuda ficha-prof__contador">{datos.descripcion.length}/{MAX_DESCRIPCION}</p>}
          </div>
        </fieldset>

        <fieldset className="ficha-prof__seccion">
          <legend><IconoMapa /> Ubicación de atención</legend>
          <p className="texto-secundario ficha-prof__intro">Ingresa las coordenadas de tu lugar de atención para aparecer en el mapa.</p>

          <div className="ficha-prof__ubicacion">
            <div>
              <CampoFormulario id="ubicacionLat" etiqueta="Latitud" type="number" step="any" inputMode="decimal"
                placeholder="-33.4372" value={datos.ubicacionLat} onChange={cambiar('ubicacionLat')} error={errores.ubicacionLat} />
              <CampoFormulario id="ubicacionLng" etiqueta="Longitud" type="number" step="any" inputMode="decimal"
                placeholder="-70.6506" value={datos.ubicacionLng} onChange={cambiar('ubicacionLng')} error={errores.ubicacionLng} />
              <p className="nota-privacidad nota-privacidad--compacta">
                <Icono nombre="info" tamano={18} />
                Puedes copiar las coordenadas desde Google Maps: haz clic derecho sobre tu dirección y elige la primera opción.
              </p>
            </div>

            <div className="ficha-prof__mapa" role="img" aria-label="Vista previa del mapa de ubicación">
              <IconoMapa tamano={34} />
              <p>Vista previa del mapa de ubicación</p>
              {hayCoordenadas && <span className="etiqueta-rol">{datos.ubicacionLat}, {datos.ubicacionLng}</span>}
            </div>
          </div>
        </fieldset>

        <div className="ficha-prof__acciones">
          <button type="button" className="boton-texto" onClick={onCancelar}>
            {edicion ? 'Cancelar' : 'Volver'}
          </button>
          <button type="submit" className="boton boton--principal boton--compacto" disabled={enviando}>
            {enviando ? 'Guardando…' : <>Guardar perfil <Icono nombre="check" tamano={18} /></>}
          </button>
        </div>
      </form>
    </section>
  );
}
