import { useRef, useState } from 'react';
import reglas from '@shared/reglas.json';
import Alerta from '../Alerta.jsx';
import CampoFormulario from '../CampoFormulario.jsx';
import Icono from '../Icono.jsx';
import MapaUbicacion from './MapaUbicacion.jsx';
import { enMapa } from '../profesionales/ubicacionMapa.js';
import { guardarMiFicha, ubicarDireccion } from '../../services/profesional.service.js';
import './FormularioFicha.css';

const {
  especialidades, modalidades, descripcion: { max: MAX_DESCRIPCION }, comuna: { max: MAX_COMUNA }, direccion: { max: MAX_DIRECCION },
} = reglas.profesionales;

// Los nombres de los campos coinciden con la API, así los errores del servidor caen en su campo. SC-24: la dirección es
// obligatoria si atiende presencial o de ambas formas. SC-28: las coordenadas ya no se escriben, salen de la comuna y
// la dirección (ver ubicar).
function validar({ especialidad, comuna, direccion, modalidad }) {
  const errores = {};
  if (!especialidad) errores.especialidad = 'Selecciona tu especialidad';
  if (!comuna.trim()) errores.comuna = 'Ingresa la comuna donde atiendes';
  if (!modalidad) errores.modalidad = 'Selecciona cómo atiendes';
  if (modalidad !== 'online' && !direccion.trim()) errores.direccion = 'Ingresa la dirección donde atiendes';
  return errores;
}

const desdeFicha = (ficha) => ({
  especialidad: ficha?.especialidad ?? '',
  descripcion: ficha?.descripcion ?? '',
  comuna: ficha?.comuna ?? '',
  direccion: ficha?.direccion ?? '',
  modalidad: ficha?.modalidad ?? '',
});

// La comuna y la dirección que produjeron una ubicación: si cambian, hay que buscarla de nuevo.
const consultaDe = ({ comuna, direccion }) => `${comuna.trim()}|${direccion.trim()}`.toLocaleLowerCase('es');
// La ubicación guardada se reutiliza mientras no cambie la dirección. Una fuera de Chile (fichas anteriores a la SC-24)
// no se muestra: se busca de nuevo con la dirección.
function ubicacionGuardada(ficha) {
  if (!ficha || !enMapa(ficha)) return null;
  return {
    lat: Number(ficha.ubicacionLat), lng: Number(ficha.ubicacionLng), precision: 'guardada', origen: 'guardada',
    consulta: consultaDe(desdeFicha(ficha)),
  };
}
// La ficha guarda 7 decimales (DECIMAL(10,7)); al mover el marcador MapLibre entrega más.
const redondear = (valor) => Math.round(valor * 1e7) / 1e7;

// Qué encontró el buscador de direcciones, dicho para el profesional (sin coordenadas).
function explicarUbicacion(ubicacion, modalidad) {
  switch (ubicacion.origen === 'manual' ? 'manual' : ubicacion.precision) {
    case 'guardada': return 'Esta es la ubicación guardada en tu ficha. Si cambias tu comuna o tu dirección, la buscamos de nuevo.';
    case 'manual': return 'Ajustaste el marcador: guardaremos ese punto como tu lugar de atención.';
    case 'exacta': return `Encontramos ${ubicacion.encontrada}.`;
    case 'calle': return `Encontramos la calle (${ubicacion.encontrada}), pero no el número: mueve el marcador hasta tu lugar de atención.`;
    default:
      if (ubicacion.conDireccion) {
        return `No encontramos esa dirección en ${ubicacion.encontrada}: el marcador quedó en el centro de la comuna. Revisa la dirección o mueve el marcador hasta tu lugar de atención.`;
      }
      return modalidad === 'online'
        ? `Atiendes solo online: el marcador queda en el centro de ${ubicacion.encontrada}.`
        : `Mostramos ${ubicacion.encontrada}. Escribe tu dirección para ubicar tu lugar de atención.`;
  }
}

// Formulario de la ficha pública del profesional (FS-HU-04), dentro de "Perfil profesional": la primera vez
// (`ficha` en null) y desde "Editar perfil". Sin `onCancelar` no se ofrece volver (la ficha aún no existe).
export default function FormularioFicha({ ficha, onGuardado, onCancelar }) {
  const edicion = Boolean(ficha);
  const [datos, setDatos] = useState(() => desdeFicha(ficha));
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [ubicacion, setUbicacion] = useState(() => ubicacionGuardada(ficha));
  const [buscando, setBuscando] = useState(false);
  const [errorUbicacion, setErrorUbicacion] = useState('');
  // La última ubicación y la búsqueda en curso, para leerlas sin esperar a que React vuelva a dibujar
  // (al guardar justo después de escribir la dirección, la búsqueda que empezó al salir del campo se reutiliza).
  const ubicacionActual = useRef(ubicacion);
  const enCurso = useRef(null);

  const fijarUbicacion = (nueva) => {
    ubicacionActual.current = nueva;
    setUbicacion(nueva);
  };

  const cambiar = (campo) => (evento) => {
    setDatos({ ...datos, [campo]: evento.target.value });
    if (errores[campo]) setErrores({ ...errores, [campo]: undefined });
  };

  // SC-28: busca las coordenadas de la comuna y la dirección escritas (DAS, D36) y devuelve la ubicación, o null si no
  // se pudo. Si ya se buscaron, o el profesional ya ajustó el marcador para esa misma dirección, no se busca de nuevo.
  function ubicar() {
    const comuna = datos.comuna.trim();
    const direccion = datos.direccion.trim();
    if (!comuna) return Promise.resolve(null);
    const consulta = consultaDe(datos);
    if (ubicacionActual.current?.consulta === consulta) return Promise.resolve(ubicacionActual.current);
    if (enCurso.current?.consulta === consulta) return enCurso.current.promesa;

    setBuscando(true);
    setErrorUbicacion('');
    // Solo la búsqueda más reciente cambia el mapa: una anterior que responde tarde se descarta.
    const esLaVigente = () => enCurso.current?.consulta === consulta;
    const promesa = ubicarDireccion({ comuna, direccion })
      .then((encontrada) => {
        const nueva = { ...encontrada, origen: 'busqueda', consulta, conDireccion: Boolean(direccion) };
        if (esLaVigente()) fijarUbicacion(nueva);
        return nueva;
      })
      .catch((error) => {
        if (esLaVigente()) {
          if (error.detalles?.comuna) setErrores((previos) => ({ ...previos, comuna: error.detalles.comuna }));
          else setErrorUbicacion(error.message);
        }
        return null;
      })
      .finally(() => {
        if (esLaVigente()) {
          enCurso.current = null;
          setBuscando(false);
        }
      });
    enCurso.current = { consulta, promesa };
    return promesa;
  }

  const mover = ({ lat, lng }) => {
    fijarUbicacion({ ...ubicacionActual.current, lat: redondear(lat), lng: redondear(lng), origen: 'manual' });
    setErrores((previos) => ({ ...previos, ubicacionLat: undefined, ubicacionLng: undefined }));
  };

  const guardar = async (evento) => {
    evento.preventDefault();
    setMensaje('');
    const nuevos = validar(datos);
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;
    setEnviando(true);
    const lugar = await ubicar();
    if (!lugar) {
      setMensaje('No pudimos ubicar tu lugar de atención en el mapa. Revisa tu comuna y tu dirección, o intenta de nuevo.');
      setEnviando(false);
      return;
    }
    try {
      const respuesta = await guardarMiFicha({
        especialidad: datos.especialidad, descripcion: datos.descripcion.trim(), comuna: datos.comuna.trim(),
        direccion: datos.direccion.trim(), modalidad: datos.modalidad, ubicacionLat: lugar.lat, ubicacionLng: lugar.lng,
      });
      onGuardado(respuesta.ficha);
    } catch (error) {
      setErrores(error.detalles || {});
      setMensaje(error.message);
      setEnviando(false);
    }
  };

  const errorDelMapa = errorUbicacion || errores.ubicacionLat || errores.ubicacionLng;

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
          <p className="texto-secundario ficha-prof__intro">Indica tu comuna y tu dirección: te ubicamos en el mapa para que los usuarios te encuentren en el buscador.</p>

          <div className="ficha-prof__ubicacion">
            <div>
              <CampoFormulario id="comuna" etiqueta="Comuna (obligatorio)" maxLength={MAX_COMUNA} autoComplete="address-level2"
                placeholder="Ej.: Providencia" value={datos.comuna} onChange={cambiar('comuna')} onBlur={ubicar} error={errores.comuna} />
              <CampoFormulario id="direccion" maxLength={MAX_DIRECCION} autoComplete="street-address"
                etiqueta={`Dirección de atención (${datos.modalidad === 'online' ? 'opcional si atiendes solo online' : 'obligatorio'})`}
                placeholder="Ej.: Av. Providencia 1234, oficina 501" value={datos.direccion} onChange={cambiar('direccion')}
                onBlur={ubicar} error={errores.direccion}
                ayuda="Calle y número. Se muestra en tu ficha y te ubicamos en el mapa para que sepan dónde atiendes." />
            </div>

            <div className="ficha-prof__mapa-columna">
              {ubicacion
                ? <MapaUbicacion ubicacion={ubicacion} onMover={mover} />
                : (
                  <div className="ficha-prof__mapa">
                    <Icono nombre="pin" tamano={34} />
                    <p>{buscando ? 'Buscando tu dirección…' : 'Escribe tu comuna y tu dirección para ver tu lugar de atención en el mapa.'}</p>
                    {!buscando && datos.comuna.trim() && (
                      <button type="button" className="boton-texto" onClick={ubicar}>Ver en el mapa</button>
                    )}
                  </div>
                )}
              {errorDelMapa ? (
                <p className="ficha-prof__estado-mapa ficha-prof__estado-mapa--error" role="alert">
                  {errorDelMapa}{' '}
                  {errorUbicacion && <button type="button" className="boton-texto" onClick={ubicar}>Buscar de nuevo</button>}
                </p>
              ) : (
                <p className="ficha-prof__estado-mapa" role="status">
                  {buscando && ubicacion && 'Buscando tu dirección…'}
                  {!buscando && ubicacion && explicarUbicacion(ubicacion, datos.modalidad)}
                </p>
              )}
              {ubicacion && (
                <p className="campo__ayuda ficha-prof__pista-mapa">
                  ¿No quedó justo en tu lugar de atención? Arrastra el marcador o haz clic en el mapa.
                </p>
              )}
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
