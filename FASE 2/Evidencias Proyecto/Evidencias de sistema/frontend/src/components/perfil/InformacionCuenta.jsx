import { useState } from 'react';
import Alerta from '../Alerta.jsx';
import Icono from '../Icono.jsx';
import BotonGoogle from '../BotonGoogle.jsx';

const CAMPOS = ['nombre', 'correo', 'telefono', 'biografia', 'instagram', 'linkedin', 'sitioWeb'];
// especialidad (solo el profesional, 16-11-2026): { valor, opciones, guardar(nueva) → texto del aviso }. Se elige aquí
// y se guarda con el mismo botón, aunque va en su ficha (la descripción de la ficha se dejó de pedir: la presentación
// ya cumple ese papel).
export default function InformacionCuenta({ estado, profesional = false, especialidad, onGuardado, soloCorreo = false }) {
  if (estado.cargando) return <p role="status">Cargando tus datos de contacto…</p>;
  if (estado.error) return <><Alerta>{estado.error}</Alerta><button type="button" className="boton-texto" onClick={estado.reintentar}>Reintentar datos personales</button></>;
  return <Formulario cuenta={estado.cuenta} guardar={estado.guardar} profesional={profesional} especialidad={especialidad} onGuardado={onGuardado} soloCorreo={soloCorreo} />;
}
function Formulario({ cuenta, guardar, profesional, especialidad, onGuardado, soloCorreo }) {
  const [datos, setDatos] = useState(() => Object.fromEntries(CAMPOS.map((c) => [c, cuenta[c] || ''])));
  const [elegida, setElegida] = useState(especialidad?.valor ?? '');
  // La ficha (y con ella la especialidad guardada) puede llegar después que la cuenta: al cambiar, se toma su valor.
  const valorGuardado = especialidad?.valor ?? '';
  const [ultimoGuardado, setUltimoGuardado] = useState(valorGuardado);
  if (ultimoGuardado !== valorGuardado) {
    setUltimoGuardado(valorGuardado);
    setElegida(valorGuardado);
  }
  const [correoEditable, setCorreoEditable] = useState(false);
  const [password, setPassword] = useState('');
  const [credencial, setCredencial] = useState('');
  const [errores, setErrores] = useState({});
  const [aviso, setAviso] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const cambiar = (e) => { setAviso(null); setDatos({ ...datos, [e.target.name]: e.target.value }); };
  const campo = (name, titulo, props = {}) => <label className="campo" key={name}><span className="campo__etiqueta">{titulo}</span>
    <input className="campo__control" name={name} value={datos[name]} onChange={cambiar} aria-invalid={Boolean(errores[name])} {...props} />
    {errores[name] && <span className="campo__mensaje" role="alert">{errores[name]}</span>}</label>;
  async function enviar(e) {
    e.preventDefault(); setErrores({}); setAviso(null); setOcupado(true);
    let cuentaGuardada = false;
    try {
      const cambios = Object.fromEntries(CAMPOS.filter((c) => datos[c] !== (cuenta[c] || '')).map((c) => [c, datos[c]]));
      const cambiaEspecialidad = Boolean(especialidad) && elegida !== (especialidad.valor ?? '');
      if (!Object.keys(cambios).length && !cambiaEspecialidad) { setAviso({ tipo: 'info', texto: 'No hay cambios pendientes.' }); return; }
      const textos = [];
      if (Object.keys(cambios).length) {
        await guardar({ ...cambios, ...(cambios.correo !== undefined && { password, credencial }) });
        cuentaGuardada = true;
        setPassword(''); setCredencial(''); setCorreoEditable(false);
        textos.push(soloCorreo ? 'Correo actualizado.' : 'Datos personales guardados.');
      }
      if (cambiaEspecialidad) textos.push(await especialidad.guardar(elegida));
      const texto = textos.find((t) => t.includes('para guardar tu especialidad')) || (textos.length > 1 ? 'Cambios guardados.' : textos[0]);
      if (onGuardado) onGuardado(texto);
      else setAviso({ tipo: 'exito', texto });
    } catch (error) {
      setErrores(error.detalles || {});
      setAviso({ tipo: 'error', texto: cuentaGuardada ? `Tus datos personales se guardaron, pero tu especialidad no: ${error.message}` : error.message });
    } finally { setOcupado(false); }
  }
  function cancelar() {
    setDatos(Object.fromEntries(CAMPOS.map((c) => [c, cuenta[c] || '']))); setPassword(''); setCredencial('');
    setElegida(especialidad?.valor ?? ''); setCorreoEditable(false); setErrores({}); setAviso(null);
  }
  return (
    <form className="perfil-editor__formulario" onSubmit={enviar}>
      <Alerta tipo={aviso?.tipo}>{aviso?.texto}</Alerta>
      <fieldset disabled={ocupado} className="perfil-editor__campos">
        <legend className="solo-lector">{soloCorreo ? 'Correo de acceso' : 'Datos personales y de contacto'}</legend>
        {!soloCorreo && <div className="perfil-editor__dos-columnas">
          {campo('nombre', 'Nombre completo', { required: true, maxLength: 100, autoComplete: 'name' })}
          {campo('telefono', 'Teléfono de contacto (opcional)', { type: 'tel', maxLength: 20, autoComplete: 'tel', placeholder: '+56 9 1234 5678' })}
        </div>}
        {especialidad && (
          <div className="campo perfil-editor__especialidad">
            <label htmlFor="especialidad-perfil" className="campo__etiqueta">Especialidad (obligatorio)</label>
            <select id="especialidad-perfil" className="campo__control" name="especialidad" value={elegida} aria-invalid={Boolean(errores.especialidad)}
              aria-describedby="ayuda-especialidad" onChange={(e) => { setAviso(null); setElegida(e.target.value); }}>
              <option value="" disabled>Selecciona tu especialidad</option>
              {especialidad.opciones.map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}
            </select>
            <span id="ayuda-especialidad" className="campo__ayuda">Se muestra en el buscador y en tu perfil público.</span>
            {especialidad.avisoCambio && elegida !== (especialidad.valor ?? '') && (
              <span className="campo__ayuda perfil-editor__aviso-especialidad" role="note">{especialidad.avisoCambio}</span>
            )}
            {errores.especialidad && <span className="campo__mensaje" role="alert">{errores.especialidad}</span>}
          </div>
        )}
        <div className="perfil-editor__correo">
          {campo('correo', 'Correo electrónico', { type: 'email', required: true, readOnly: !correoEditable, maxLength: 150, autoComplete: 'email' })}
          {!correoEditable && <button type="button" className="boton-texto" onClick={() => setCorreoEditable(true)}>Cambiar correo</button>}
        </div>
        {correoEditable && <div className="perfil-editor__confirmacion">
          <p>Para cambiar tu correo, confirma que eres tú. Las otras sesiones se cerrarán al guardar.</p>
          {cuenta.tienePassword && <label className="campo"><span className="campo__etiqueta">Contraseña actual</span><input type="password" className="campo__control" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />{errores.password && <span className="campo__mensaje" role="alert">{errores.password}</span>}</label>}
          {cuenta.tieneGoogle && <BotonGoogle separador={cuenta.tienePassword ? 'o confirma con Google' : 'Confirma tu cuenta de Google'} onCredencial={(token) => { setCredencial(token); setAviso({ tipo: 'info', texto: 'Cuenta de Google seleccionada. Guarda los cambios para confirmar.' }); }} />}
        </div>}
        {/* Para el profesional es su presentación en el perfil público (15-11-2026): quién es, a qué se dedica y qué le gusta. */}
        {!soloCorreo && <><label className="campo"><span className="campo__etiqueta">{profesional ? 'Tu presentación (opcional)' : 'Sobre mí (opcional)'}</span>
          {profesional && <span className="campo__ayuda">Se muestra al inicio de tu perfil público, para que los usuarios te conozcan.</span>}
          <textarea className="campo__control" name="biografia" value={datos.biografia} onChange={cambiar} maxLength={500} rows={profesional ? 5 : 3}
            placeholder={profesional ? 'Ej.: Soy Juan, kinesiólogo deportivo hace 8 años. Me dedico a la recuperación de lesiones y me encanta el trail running.' : 'Cuéntanos un poco sobre ti'} />
          <span className="perfil-editor__contador">{datos.biografia.length} / 500</span></label>
        <details className="perfil-editor__subseccion"><summary><Icono nombre="enlace" tamano={19} /> Redes sociales (opcional)</summary>
          <div className="perfil-editor__redes">
            {campo('instagram', 'Instagram', { type: 'url', maxLength: 200, placeholder: 'https://instagram.com/tu_usuario' })}
            {campo('linkedin', 'LinkedIn', { type: 'url', maxLength: 200, placeholder: 'https://linkedin.com/in/tu_usuario' })}
            {campo('sitioWeb', 'Sitio web', { type: 'url', maxLength: 250, placeholder: 'https://tusitio.cl' })}
          </div>
        </details></>}
        {(!soloCorreo || correoEditable) && <div className="perfil-editor__acciones"><button type="button" className="boton boton--secundario boton--compacto" onClick={cancelar}>Cancelar</button>
          <button type="submit" className="boton boton--principal boton--compacto">{ocupado ? 'Guardando…' : <><Icono nombre="check" tamano={18} /> {soloCorreo ? 'Guardar correo' : 'Guardar datos personales'}</>}</button></div>}
      </fieldset>
    </form>
  );
}
