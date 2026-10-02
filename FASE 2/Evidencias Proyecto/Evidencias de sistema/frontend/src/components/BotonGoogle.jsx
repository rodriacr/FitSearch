import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alerta from './Alerta.jsx';
import { LogoGoogle } from './Icono.jsx';
import { useSesion } from '../context/SesionContext.jsx';

// "Continuar con Google" (FS-HU-16; DAS, D15). Usa el botón oficial de Google Identity Services: Google entrega
// un token de identidad firmado que el backend valida en POST /api/auth/google. Sin VITE_GOOGLE_CLIENT_ID
// (por ejemplo, si falta copiar frontend/.env) el botón queda desactivado en vez de fallar.
const URL_SCRIPT = 'https://accounts.google.com/gsi/client';
const MENSAJE_SCRIPT = 'No fue posible cargar el acceso con Google. Revisa tu conexión e intenta nuevamente.';

// El script se agrega una sola vez aunque el botón se monte en varias pantallas.
let cargaScript = null;
function cargarScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!cargaScript) {
    cargaScript = new Promise((resolver, rechazar) => {
      const etiqueta = document.createElement('script');
      etiqueta.src = URL_SCRIPT;
      etiqueta.async = true;
      etiqueta.onload = resolver;
      etiqueta.onerror = () => {
        cargaScript = null; // Permite reintentar si el usuario recupera la conexión.
        rechazar(new Error(MENSAJE_SCRIPT));
      };
      document.head.append(etiqueta);
    });
  }
  return cargaScript;
}

export default function BotonGoogle({
  texto = 'Continuar con Google',
  separador = 'o continúa con',
  // Texto del botón oficial: "continue_with" en el inicio de sesión, "signup_with" en el registro.
  textoGoogle = 'continue_with',
  recordar = false,
}) {
  const clienteId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const { iniciarSesionConGoogle } = useSesion();
  const navegar = useNavigate();
  const contenedor = useRef(null);
  const [error, setError] = useState('');
  const [entrando, setEntrando] = useState(false);

  // Google guarda el callback al inicializarse, así que se llama a través de una referencia que se
  // actualiza tras cada render para que siempre use el valor actual de "recordar" y no el del primero.
  const alRecibirCredencial = useRef(null);
  useEffect(() => {
    alRecibirCredencial.current = async ({ credential }) => {
      setError('');
      setEntrando(true);
      try {
        await iniciarSesionConGoogle({ credencial: credential, recordar });
        navegar('/perfil', { replace: true });
      } catch (fallo) {
        setError(fallo.message);
        setEntrando(false);
      }
    };
  });

  useEffect(() => {
    if (!clienteId) return undefined;
    let cancelado = false;

    cargarScript()
      .then(() => {
        if (cancelado || !contenedor.current) return;
        const identidad = window.google.accounts.id;
        identidad.initialize({
          client_id: clienteId,
          callback: (respuesta) => alRecibirCredencial.current(respuesta),
          ux_mode: 'popup',
        });
        identidad.renderButton(contenedor.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text: textoGoogle,
          logo_alignment: 'center',
          locale: 'es',
          // Google exige un ancho en píxeles y admite hasta 400.
          width: Math.min(contenedor.current.offsetWidth || 320, 400),
        });
      })
      .catch(() => {
        if (!cancelado) setError(MENSAJE_SCRIPT);
      });

    return () => {
      cancelado = true;
    };
  }, [clienteId, textoGoogle]);

  return (
    <>
      <div className="separador"><span>{separador}</span></div>
      {clienteId ? (
        <>
          <div ref={contenedor} className="acceso-google" aria-busy={entrando} />
          {entrando && <p className="acceso-google__estado" role="status">Ingresando con Google…</p>}
          <Alerta>{error}</Alerta>
        </>
      ) : (
        /* El título va en el contenedor porque los navegadores no muestran tooltips sobre botones desactivados */
        <div title="Disponible próximamente">
          <button type="button" className="boton-social" disabled aria-describedby="google-pendiente">
            <LogoGoogle />
            {texto}
          </button>
          <span id="google-pendiente" className="solo-lector">Disponible próximamente</span>
        </div>
      )}
    </>
  );
}
