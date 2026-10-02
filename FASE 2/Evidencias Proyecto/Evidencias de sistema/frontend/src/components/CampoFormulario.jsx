import { useState } from 'react';
import Icono from './Icono.jsx';

// Campo con etiqueta accesible. En las pantallas de acceso la etiqueta queda oculta a la vista (se muestra como
// texto de ayuda dentro del campo) pero sigue disponible para lectores de pantalla.
export default function CampoFormulario({ id, etiqueta, error, ayuda, children, icono, etiquetaOculta = false, ...propsEntrada }) {
  const [visible, setVisible] = useState(false);
  const idError = `${id}-error`;
  const idAyuda = `${id}-ayuda`;
  const esPassword = propsEntrada.type === 'password';
  const propsControl = {
    id,
    name: id,
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? idError : (ayuda ? idAyuda : undefined),
    className: 'campo__control',
    ...(etiquetaOculta && !children ? { placeholder: etiqueta } : {}),
    ...propsEntrada,
    ...(esPassword ? { type: visible ? 'text' : 'password' } : {}),
  };

  const clases = ['campo', error && 'campo--error', icono && 'campo--icono', esPassword && 'campo--password'].filter(Boolean).join(' ');

  return (
    <div className={clases}>
      <label htmlFor={id} className={etiquetaOculta ? 'solo-lector' : 'campo__etiqueta'}>{etiqueta}</label>
      <div className="campo__caja">
        {icono && <Icono nombre={icono} className="campo__icono" />}
        {children ? <select {...propsControl}>{children}</select> : <input {...propsControl} />}
        {esPassword && (
          <button type="button" className="campo__ojo" onClick={() => setVisible(!visible)}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible}>
            <Icono nombre={visible ? 'ojoTachado' : 'ojo'} />
          </button>
        )}
      </div>
      {error
        ? <p id={idError} className="campo__mensaje" role="alert">{error}</p>
        : ayuda && <p id={idAyuda} className="campo__ayuda">{ayuda}</p>}
    </div>
  );
}
