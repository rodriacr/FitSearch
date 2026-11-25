import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alerta from '../../components/Alerta.jsx';
import NotificacionFlotante from '../../components/NotificacionFlotante.jsx';
import { Calificacion } from '../../components/Calificacion.jsx';
import Icono from '../../components/Icono.jsx';
import FormularioFicha from '../../components/profesional/FormularioFicha.jsx';
import Certificaciones from '../../components/profesional/Certificaciones.jsx';
import Experiencia from '../../components/profesional/Experiencia.jsx';
import PerfilEditable from '../../components/perfil/PerfilEditable.jsx';
import InformacionCuenta from '../../components/perfil/InformacionCuenta.jsx';
import useCuentaPerfil from '../../components/perfil/useCuentaPerfil.js';
import { useSesion } from '../../context/SesionContext.jsx';
import { enMapa } from '../../components/profesionales/ubicacionMapa.js';
import { useEspecialidades } from '../../services/especialidades.js';
import { etiquetaModalidad } from '../../services/formato.js';
import { guardarMiFicha, obtenerMiFicha, obtenerProfesional } from '../../services/profesional.service.js';
import './PerfilProfesional.css';

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
    <div className="perfil-prof__compartir">
      <div className="perfil-prof__botones">
        <button type="button" className="boton boton--secundario boton--compacto" disabled={copiando} onClick={copiar}>
          <Icono nombre={copiado ? 'check' : 'enlace'} tamano={18} /> {copiado ? 'Enlace copiado' : 'Copiar enlace'}
        </button>
      </div>
      {copiado && <p className="perfil-prof__copia" role="status">Enlace de tu perfil copiado.</p>}
      {manual && (
        <label className="perfil-prof__enlace-manual">
          No pudimos copiarlo automáticamente. Selecciona y copia este enlace:
          <input readOnly value={enlace} onFocus={(e) => e.target.select()} />
        </label>
      )}
    </div>
  );
}


export default function PerfilProfesional() {
  const { sesion } = useSesion();
  const cuentaEstado = useCuentaPerfil();
  const [estado, setEstado] = useState({ cargando: true });
  const [intento, setIntento] = useState(0);
  const [activa, setActiva] = useState('informacion');
  const [editor, setEditor] = useState(0);
  const [mensaje, cambiarMensaje] = useState(null);
  const setMensaje = (texto) => cambiarMensaje(texto ? { texto, id: Date.now() } : null);
  // Sin ficha, la especialidad elegida en «Información personal» espera aquí hasta guardar el lugar de atención, donde
  // se crea la ficha (la API no guarda una ficha sin su lugar de atención).
  const [especialidadElegida, setEspecialidadElegida] = useState('');
  useEffect(() => {
    let vigente = true;
    obtenerMiFicha().then(async ({ ficha }) => {
      const publica = ficha ? await obtenerProfesional(ficha.id) : null;
      if (!vigente) return;
      setEstado({ ficha, profesional: publica?.profesional });
    }).catch((e) => { if (vigente) setEstado({ error: e.message }); });
    return () => { vigente = false; };
  }, [intento]);
  const p = estado.profesional;
  function alGuardarFicha() {
    setMensaje(!estado.ficha ? 'Ficha profesional guardada.' : 'Lugar de atención guardado.');
    setEspecialidadElegida('');
    setIntento((v) => v + 1);
  }
  const irA = (seccion) => { setActiva(seccion); setMensaje(''); };

  // Especialidad (pedido del PO del 16-11-2026): se elige en «Información personal». Con ficha, se guarda en ella y se
  // reenvía el lugar de atención tal como está guardado; sin ficha, queda elegida hasta crearla en «Lugar de atención».
  // FS-HU-30: las especialidades activas del catálogo; la que ya tenía la ficha se ofrece aunque esté desactivada.
  const catalogo = useEspecialidades();
  const especialidadActual = estado.ficha?.especialidad ?? especialidadElegida;
  async function guardarEspecialidad(nueva) {
    const ficha = estado.ficha;
    if (!ficha) {
      setEspecialidadElegida(nueva);
      return 'Completa "Lugar de atención" para guardar tu especialidad.';
    }
    const online = ficha.modalidad === 'online';
    if (!online && !enMapa(ficha)) {
      throw new Error('Tu lugar de atención no tiene una ubicación válida en el mapa. Revísalo y guárdalo en «Lugar de atención» antes de cambiar tu especialidad.');
    }
    await guardarMiFicha({
      especialidad: nueva, descripcion: ficha.descripcion ?? '', comuna: online ? null : ficha.comuna, direccion: online ? null : ficha.direccion,
      modalidad: ficha.modalidad, ubicacionLat: online ? null : Number(ficha.ubicacionLat), ubicacionLng: online ? null : Number(ficha.ubicacionLng),
    });
    setIntento((v) => v + 1);
    return 'Especialidad guardada.';
  }
  const especialidad = {
    valor: especialidadActual,
    opciones: especialidadActual && !catalogo.includes(especialidadActual) ? [...catalogo, especialidadActual] : catalogo,
    guardar: guardarEspecialidad,
    // Cambiar la especialidad quita la verificación (la API pide documentos de la nueva especialidad).
    avisoCambio: p?.verificado ? 'Si cambias tu especialidad, tu perfil dejará de estar verificado y tendrás que enviar documentos de la nueva especialidad.' : null,
  };
  // Mientras carga la ficha (o si falló), las secciones que dependen de ella lo indican.
  const sinFicha = estado.cargando ? <p role="status">Cargando tu ficha profesional…</p> : estado.error ? <>
    <Alerta>{estado.error}</Alerta><button type="button" className="boton-texto" onClick={() => setIntento((v) => v + 1)}>Reintentar</button>
  </> : null;
  const completaFicha = (texto) => <p className="perfil-prof__aviso"><Icono nombre="info" tamano={20} /> {texto}</p>;
  // Desde el 15-11-2026, el mismo flujo que el perfil del usuario: cada sección por separado y solo una abierta a la
  // vez. El 16-11-2026 la especialidad pasó a «Información personal» (con la presentación, que reemplaza a la
  // descripción de la ficha) y el lugar de atención quedó en su propia sección.
  const secciones = [
    { id: 'informacion', titulo: 'Información personal', icono: 'usuario', ayuda: 'Tus datos de contacto, tu especialidad y tu presentación.', contenido: <>
      {!estado.cargando && !estado.error && !estado.ficha && completaFicha('Elige aquí tu especialidad y completa tu «Lugar de atención» para aparecer en el buscador de FitSearch.')}
      <InformacionCuenta estado={cuentaEstado} profesional onGuardado={setMensaje} especialidad={estado.cargando || estado.error ? undefined : especialidad} />
    </> },
    { id: 'lugar', titulo: 'Lugar de atención', icono: 'pin', ayuda: 'Si atiendes presencial u online y dónde: se muestra en el mapa y en tu perfil público.',
      contenido: sinFicha ?? (
        <FormularioFicha key={editor} ficha={estado.ficha} especialidad={especialidadActual} onGuardado={alGuardarFicha} onIrA={irA}
          onCancelar={estado.ficha ? () => { setEditor((v) => v + 1); setMensaje(''); } : undefined} />
      ) },
    { id: 'experiencia', titulo: 'Experiencia y formación', icono: 'birrete', ayuda: 'Comparte tu trayectoria y a quiénes atiendes.',
      contenido: sinFicha ?? (estado.ficha ? <Experiencia onGuardado={setMensaje} /> : completaFicha('Completa tu ficha profesional para agregar tu experiencia y formación.')) },
    { id: 'certificaciones', titulo: 'Certificaciones', icono: 'escudo', ayuda: 'Tus documentos y el estado de tu verificación.',
      contenido: sinFicha ?? (estado.ficha ? <Certificaciones onGuardado={setMensaje} /> : completaFicha('Completa tu ficha profesional antes de solicitar la verificación.')) },
  ];
  return <>
    {mensaje && <NotificacionFlotante key={mensaje.id} tipo={mensaje.texto.includes('para guardar tu especialidad') ? 'info' : 'exito'}>{mensaje.texto}</NotificacionFlotante>}
    <PerfilEditable titulo="Mi perfil profesional" subtitulo="Tu información, lista para conectar con más personas."
    nombre={cuentaEstado.cuenta?.nombre || p?.nombre || sesion.usuario.nombre} rol={p?.especialidad || 'Profesional'} cuentaEstado={cuentaEstado}
    activa={activa} onCambiar={(s) => { setActiva(s); setMensaje(''); }} secciones={secciones}
    cabeceraAcciones={p && <Link to="/profesional/perfil/publico" className="boton boton--secundario boton--compacto"><Icono nombre="ojo" tamano={18} /> Ver mi perfil público</Link>}
    identidad={p && <>
      <span className={p.verificado ? 'perfil-prof__verificado' : 'perfil-prof__sin-verificar'}>
        <Icono nombre="escudo" tamano={16} />{p.verificado ? 'Verificado' : 'Sin verificar'}
      </span>
      <Calificacion promedio={p.calificacion.promedio} total={p.calificacion.total} />
      <p className="perfil-editor__antiguedad"><Icono nombre={p.modalidad === 'online' ? 'video' : 'pin'} tamano={16} />{p.modalidad === 'online' ? 'Atención online' : p.comuna || 'Comuna por confirmar'}</p>
      <p className="perfil-editor__antiguedad">{etiquetaModalidad(p.modalidad)}</p>
    </>}
    identidadAcciones={p && <CompartirPerfil id={p.id} />} />
  </>;
}
