import { useCallback, useEffect, useRef, useState } from 'react';
import Icono from '../Icono.jsx';
import Alerta from '../Alerta.jsx';
import { iniciales } from '../../services/formato.js';
import ConfirmarFoto from './ConfirmarFoto.jsx';
import { prepararFoto } from './fotoPerfil.js';
import './PerfilEditable.css';

// La foto elegida se muestra primero en un cuadro para aceptarla antes de guardarla.
function FotoPerfil({ nombre, cuenta, guardar }) {
  const input = useRef(null);
  const camara = useRef(null);
  const [preparando, setPreparando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  // Foto ya recortada que espera que la acepte; null si el cuadro está cerrado.
  const [propuesta, setPropuesta] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [errorCuadro, setErrorCuadro] = useState('');
  const ocupado = preparando || guardando;

  // Al cerrar el cuadro, el foco vuelve al botón de la cámara (ya habilitado).
  const habiaPropuesta = useRef(false);
  useEffect(() => {
    if (habiaPropuesta.current && !propuesta) camara.current?.focus();
    habiaPropuesta.current = Boolean(propuesta);
  }, [propuesta]);

  async function elegir(archivo) {
    if (!archivo) return;
    setPreparando(true); setError(''); setMensaje(''); setErrorCuadro('');
    try { setPropuesta(await prepararFoto(archivo)); }
    catch (e) { setError(e.message); }
    finally { setPreparando(false); if (input.current) input.current.value = ''; }
  }
  async function aceptar() {
    setGuardando(true); setErrorCuadro('');
    try { await guardar({ foto: propuesta }); setPropuesta(null); setMensaje('Foto actualizada.'); }
    catch (e) { setErrorCuadro(e.message); }
    finally { setGuardando(false); }
  }
  const cancelar = useCallback(() => { setPropuesta(null); setErrorCuadro(''); }, []);
  async function quitar() {
    setGuardando(true); setError(''); setMensaje('');
    try { await guardar({ foto: null }); setMensaje('Foto eliminada.'); }
    catch (e) { setError(e.message); }
    finally { setGuardando(false); }
  }
  return (
    <div className="perfil-editor__foto-bloque">
      <div className="perfil-editor__foto">
        {cuenta?.foto ? <img src={cuenta.foto} alt={`Foto de ${nombre}`} /> : <span aria-hidden="true">{iniciales(nombre)}</span>}
        <button ref={camara} type="button" className="perfil-editor__camara" aria-label="Cambiar foto de perfil" disabled={ocupado || !cuenta}
          onClick={() => input.current?.click()}><Icono nombre="camara" tamano={20} /></button>
      </div>
      <input ref={input} className="solo-lector" tabIndex={-1} type="file" accept="image/jpeg,image/png,image/webp"
        aria-label="Seleccionar foto de perfil" disabled={ocupado || !cuenta} onChange={(e) => elegir(e.target.files[0])} />
      <p className="perfil-editor__foto-ayuda">
        {preparando ? 'Preparando foto…' : guardando && !propuesta ? 'Guardando…' : 'JPG, PNG o WebP · Máximo 5 MB'}
      </p>
      {cuenta?.foto && <button type="button" className="boton-texto" disabled={ocupado} onClick={quitar}>Quitar foto</button>}
      {mensaje && <Alerta tipo="exito">{mensaje}</Alerta>}
      <Alerta>{error}</Alerta>
      {propuesta && <ConfirmarFoto foto={propuesta} guardando={guardando} error={errorCuadro} onAceptar={aceptar} onCancelar={cancelar} />}
    </div>
  );
}

export default function PerfilEditable({ titulo, subtitulo, nombre, rol, cuentaEstado, identidad, identidadAcciones, resumen, secciones, activa, onCambiar, pie, aviso, acciones, cabeceraAcciones }) {
  const cuenta = cuentaEstado.cuenta;
  const [visitadas, setVisitadas] = useState([activa]);
  if (!visitadas.includes(activa)) setVisitadas([...visitadas, activa]);
  return <div className="perfil-editor">
    <header className="perfil-editor__cabecera">
      <div><h1>{titulo}</h1><p>{subtitulo}</p></div>
      {cabeceraAcciones && <div className="perfil-editor__cabecera-acciones">{cabeceraAcciones}</div>}
    </header>
    {aviso}
    <section className="perfil-editor__identidad" aria-label="Resumen de tu perfil">
      <FotoPerfil nombre={nombre} cuenta={cuenta} guardar={cuentaEstado.guardar} />
      <div className="perfil-editor__persona"><h2>{nombre}</h2><p className="perfil-editor__rol">{rol}</p></div>
      <div className="perfil-editor__meta">{identidad}
        {cuenta?.fechaRegistro && <p className="perfil-editor__antiguedad"><Icono nombre="calendario" tamano={15} /> Miembro desde {new Intl.DateTimeFormat('es-CL', { month: 'short', year: 'numeric' }).format(new Date(cuenta.fechaRegistro))}</p>}
      </div>
      {identidadAcciones && <div className="perfil-editor__identidad-acciones">{identidadAcciones}</div>}
    </section>
    {resumen}
    <nav className="perfil-editor__navegacion" aria-label="Secciones del perfil">
      {secciones.map((s) => <button key={s.id} type="button" aria-current={activa === s.id ? 'page' : undefined}
        aria-controls={`seccion-perfil-${s.id}`} onClick={() => onCambiar(s.id)}>{s.titulo}</button>)}
    </nav>
    <section className="perfil-editor__contenido" aria-label="Edición del perfil">
      {secciones.filter((s) => visitadas.includes(s.id) || activa === s.id).map((s) => <div key={s.id} hidden={activa !== s.id} id={`seccion-perfil-${s.id}`} className="perfil-editor__panel">
        <header><h2>{s.titulo}</h2>{s.ayuda && <p>{s.ayuda}</p>}</header>{s.contenido}
      </div>)}
      {acciones}
    </section>
    {pie && <div className="perfil-editor__pie">{pie}</div>}
  </div>;
}
