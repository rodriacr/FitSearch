import { useState } from 'react';
import Alerta from '../Alerta.jsx';
import Icono from '../Icono.jsx';
import { actualizarTipoCuenta } from '../../services/perfil.service.js';
import { OPCIONES_TIPO_CUENTA } from '../../services/validaciones.js';
import { PieAsistente } from './piezas.jsx';

// Paso 1 del asistente (FS-HU-02): tipo de cuenta. Se pregunta aquí y no en el registro para que nadie
// quede con el rol equivocado, sobre todo al entrar con Google (cambio de flujo del 24-09-2026).
export default function PasoTipoCuenta({ rol, onGuardado, onVolver, textoVolver, textoPrincipal }) {
  // La primera vez no viene nada marcado: la elección tiene que ser explícita.
  const [seleccion, setSeleccion] = useState(rol ?? '');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);

  const guardar = async (evento) => {
    evento.preventDefault();
    setMensaje('');
    if (!seleccion) {
      setError('Selecciona el tipo de cuenta');
      return;
    }
    setError('');
    setEnviando(true);
    try {
      onGuardado(await actualizarTipoCuenta({ rol: seleccion }));
    } catch (fallo) {
      setError(fallo.detalles?.rol ?? '');
      setMensaje(fallo.message);
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={guardar} noValidate>
      <Alerta>{mensaje}</Alerta>
      <fieldset className="selector-rol selector-rol--tarjetas" aria-describedby={error ? 'rol-error' : undefined}>
        <legend>¿Cómo vas a usar FitSearch?</legend>
        <div className="selector-rol__opciones">
          {OPCIONES_TIPO_CUENTA.map(({ valor, etiqueta, descripcion, icono }) => (
            <label key={valor} className={`selector-rol__opcion${seleccion === valor ? ' selector-rol__opcion--activa' : ''}`}>
              <input type="radio" name="rol" value={valor} checked={seleccion === valor}
                onChange={() => { setSeleccion(valor); setError(''); }} />
              <Icono nombre={icono} tamano={26} />
              <span className="selector-rol__etiqueta">{etiqueta}</span>
              <span className="selector-rol__descripcion">{descripcion}</span>
            </label>
          ))}
        </div>
        {error && <p id="rol-error" className="campo__mensaje" role="alert">{error}</p>}
      </fieldset>
      <p className="texto-secundario nota-tipo-cuenta">
        <Icono nombre="lapiz" tamano={16} /> Puedes cambiarlo después desde tu perfil.
      </p>
      <PieAsistente onVolver={onVolver} textoVolver={textoVolver} textoPrincipal={textoPrincipal} enviando={enviando} />
    </form>
  );
}
