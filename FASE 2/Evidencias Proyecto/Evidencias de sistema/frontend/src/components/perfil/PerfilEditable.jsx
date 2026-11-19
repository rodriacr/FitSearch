import { useCallback, useEffect, useRef, useState } from 'react';
import Icono from '../Icono.jsx';
import Alerta from '../Alerta.jsx';
import { iniciales } from '../../services/formato.js';
import ConfirmarFoto from './ConfirmarFoto.jsx';
import { prepararFoto } from './fotoPerfil.js';
import './PerfilEditable.css';

// Foto de la cuenta (usuario y profesional). Desde el 15-11-2026 la foto elegida no se guarda de inmediato: primero se
// muestra en un cuadro para aceptarla, y ese cuadro reemplaza al mensaje «Foto actualizada».
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
    try { await guardar({ foto: propuesta }); setPropuesta(null); }
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
      {mensaje && <p role="status" className="perfil-editor__mensaje">{mensaje}</p>}
      <Alerta>{error}</Alerta>
      {propuesta && <ConfirmarFoto foto={propuesta} guardando={guardando} error={errorCuadro} onAceptar={aceptar} onCancelar={cancelar} />}
    </div>
  );
}

export default function PerfilEditable({ titulo, subtitulo, nombre, rol, cuentaEstado, identidad, resumen, secciones, activa, onCambiar, pie, aviso, acciones }) {
  const cuenta = cuentaEstado.cuenta;
  return (
    <div className="perfil-editor">
      <header className="perfil-editor__cabecera">
        <span className="perfil-editor__icono"><Icono nombre="usuario" tamano={30} /></span>
        <div><h1>{titulo}</h1><p>{subtitulo}</p></div>
      </header>
      {aviso}
      <div className="perfil-editor__grilla">
        <aside className="perfil-editor__lateral" aria-label="Resumen y secciones de tu perfil">
          <div className="perfil-editor__identidad">
            <FotoPerfil nombre={nombre} cuenta={cuenta} guardar={cuentaEstado.guardar} />
            <h2>{nombre}</h2><p className="perfil-editor__rol">{rol}</p>
            {identidad}
            {cuenta?.fechaRegistro && <p className="perfil-editor__antiguedad"><Icono nombre="calendario" tamano={15} /> Miembro desde {new Intl.DateTimeFormat('es-CL', { month: 'short', year: 'numeric' }).format(new Date(cuenta.fechaRegistro))}</p>}
          </div>
          {resumen}
          <nav className="perfil-editor__navegacion" aria-label="Secciones del perfil">
            {secciones.map((s) => <button key={s.id} type="button" aria-current={activa === s.id ? 'page' : undefined}
              onClick={() => onCambiar(s.id)}><Icono nombre={s.icono} tamano={21} activo={activa === s.id} />{s.titulo}</button>)}
          </nav>
          {pie}
        </aside>
        <section className="perfil-editor__contenido" aria-label="Edición del perfil">
          {secciones.map((s) => (
            <details key={s.id} className="perfil-editor__seccion" open={activa === s.id}>
              <summary onClick={(e) => { e.preventDefault(); onCambiar(activa === s.id ? '' : s.id); }}>
                <Icono nombre={s.icono} tamano={22} activo={activa === s.id} /><span>{s.titulo}</span><span className="perfil-editor__chevron" aria-hidden="true">⌄</span>
              </summary>
              {activa === s.id && <div className="perfil-editor__panel"><header><h2><Icono nombre={s.icono} tamano={25} />{s.titulo}</h2>{s.ayuda && <p>{s.ayuda}</p>}</header>{s.contenido}</div>}
            </details>
          ))}
          {acciones}
        </section>
      </div>
    </div>
  );
}
