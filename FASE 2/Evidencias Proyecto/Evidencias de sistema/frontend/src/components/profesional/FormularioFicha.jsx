import { useState } from 'react';
import reglas from '@shared/reglas.json';
import Alerta from '../Alerta.jsx';
import CampoFormulario from '../CampoFormulario.jsx';
import Icono from '../Icono.jsx';
import { guardarMiFicha } from '../../services/profesional.service.js';
import './FormularioFicha.css';

const { especialidades, modalidades, descripcion: { max: MAX_DESCRIPCION }, comuna: { max: MAX_COMUNA } } = reglas.profesionales;

// Los nombres de los campos coinciden con la API, así los errores del servidor caen en su campo.
function validar({ especialidad, comuna, modalidad, ubicacionLat, ubicacionLng }) {
  const errores = {};
  const lat = Number(ubicacionLat);
  const lng = Number(ubicacionLng);
  if (!especialidad) errores.especialidad = 'Selecciona tu especialidad';
  if (!comuna.trim()) errores.comuna = 'Ingresa la comuna donde atiendes';
  if (!modalidad) errores.modalidad = 'Selecciona cómo atiendes';
  if (ubicacionLat === '' || Number.isNaN(lat) || lat < -90 || lat > 90) errores.ubicacionLat = 'La latitud debe estar entre -90 y 90';
  if (ubicacionLng === '' || Number.isNaN(lng) || lng < -180 || lng > 180) errores.ubicacionLng = 'La longitud debe estar entre -180 y 180';
  return errores;
}

const desdeFicha = (ficha) => ({
  especialidad: ficha?.especialidad ?? '',
  descripcion: ficha?.descripcion ?? '',
  comuna: ficha?.comuna ?? '',
  modalidad: ficha?.modalidad ?? '',
  ubicacionLat: ficha ? String(ficha.ubicacionLat) : '',
  ubicacionLng: ficha ? String(ficha.ubicacionLng) : '',
});

// Formulario de la ficha pública del profesional (FS-HU-04), dentro de "Perfil profesional": la primera vez
// (`ficha` en null) y desde "Editar perfil". Sin `onCancelar` no se ofrece volver (la ficha aún no existe).
export default function FormularioFicha({ ficha, onGuardado, onCancelar }) {
  const edicion = Boolean(ficha);
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
        especialidad: datos.especialidad, descripcion: datos.descripcion.trim(), comuna: datos.comuna.trim(),
        modalidad: datos.modalidad, ubicacionLat: Number(datos.ubicacionLat), ubicacionLng: Number(datos.ubicacionLng),
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
        <h1>{edicion ? 'Editar perfil profesional' : 'Configura tu perfil profesional'}</h1>
        <p>Completa estos datos para que los usuarios puedan encontrarte y agendar contigo.</p>
      </header>

      <form className="ficha-prof__tarjeta" onSubmit={guardar} noValidate>
        <Alerta>{mensaje}</Alerta>

        <fieldset className="ficha-prof__seccion">
          <legend><Icono nombre="medico" /> Información básica</legend>

          <CampoFormulario id="especialidad" etiqueta="Especialidad (obligatorio)" value={datos.especialidad}
            onChange={cambiar('especialidad')} error={errores.especialidad}>
            <option value="" disabled>Selecciona tu especialidad</option>
            {especialidades.map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}
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

          <CampoFormulario id="modalidad" etiqueta="Modalidad de atención (obligatorio)" value={datos.modalidad}
            onChange={cambiar('modalidad')} error={errores.modalidad}>
            <option value="" disabled>Selecciona cómo atiendes</option>
            {modalidades.map(({ valor, etiqueta }) => <option key={valor} value={valor}>{etiqueta}</option>)}
          </CampoFormulario>
        </fieldset>

        <fieldset className="ficha-prof__seccion">
          <legend><Icono nombre="pin" /> Ubicación de atención</legend>
          <p className="texto-secundario ficha-prof__intro">Indica tu comuna y las coordenadas de tu lugar de atención para aparecer en el buscador y en el mapa.</p>

          <div className="ficha-prof__ubicacion">
            <div>
              <CampoFormulario id="comuna" etiqueta="Comuna (obligatorio)" maxLength={MAX_COMUNA} autoComplete="address-level2"
                placeholder="Ej.: Providencia" value={datos.comuna} onChange={cambiar('comuna')} error={errores.comuna} />
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
              <Icono nombre="pin" tamano={34} />
              <p>Vista previa del mapa de ubicación</p>
              {hayCoordenadas && <span className="etiqueta-rol">{datos.ubicacionLat}, {datos.ubicacionLng}</span>}
            </div>
          </div>
        </fieldset>

        <div className="ficha-prof__acciones">
          {onCancelar && <button type="button" className="boton-texto" onClick={onCancelar}>Cancelar</button>}
          <button type="submit" className="boton boton--principal boton--compacto" disabled={enviando}>
            {enviando ? 'Guardando…' : <>Guardar perfil <Icono nombre="check" tamano={18} /></>}
          </button>
        </div>
      </form>
    </section>
  );
}
