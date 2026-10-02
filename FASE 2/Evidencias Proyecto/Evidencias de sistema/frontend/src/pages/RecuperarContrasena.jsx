import { useState } from 'react';
import { Link } from 'react-router-dom';
import Alerta from '../components/Alerta.jsx';
import CampoFormulario from '../components/CampoFormulario.jsx';
import Icono from '../components/Icono.jsx';
import PantallaAcceso from '../components/PantallaAcceso.jsx';
import { solicitarRecuperacion } from '../services/auth.service.js';
import { validarCorreo } from '../services/validaciones.js';

// Solicitud del enlace de recuperación de contraseña (FS-HU-15, escenario 1).
export default function RecuperarContrasena() {
  const [correo, setCorreo] = useState('');
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState({ tipo: 'error', texto: '' });
  const [enviando, setEnviando] = useState(false);

  const enviar = async (evento) => {
    evento.preventDefault();
    setMensaje({ tipo: 'error', texto: '' });
    const erroresCliente = validarCorreo(correo);
    setErrores(erroresCliente);
    if (Object.keys(erroresCliente).length > 0) return;

    setEnviando(true);
    try {
      const respuesta = await solicitarRecuperacion({ correo });
      setMensaje({ tipo: 'exito', texto: respuesta.mensaje });
    } catch (error) {
      setErrores(error.detalles || {});
      setMensaje({ tipo: 'error', texto: error.message });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <PantallaAcceso>
      <Link to="/iniciar-sesion" className="volver"><Icono nombre="flechaIzquierda" /> Volver al inicio de sesión</Link>
      <div className="acceso__encabezado">
        <h1>¿Olvidaste tu contraseña?</h1>
        <p className="texto-secundario">
          No te preocupes, te ayudaremos a recuperarla. Ingresa tu correo electrónico y te enviaremos un enlace para restablecerla.
        </p>
      </div>
      <Alerta tipo={mensaje.tipo}>{mensaje.texto}</Alerta>
      <form onSubmit={enviar} noValidate>
        <CampoFormulario id="correo" etiqueta="Correo electrónico" type="email" autoComplete="email" icono="correo" etiquetaOculta
          value={correo} onChange={(evento) => setCorreo(evento.target.value)} error={errores.correo} />
        <button type="submit" className="boton boton--principal" disabled={enviando}>
          {enviando ? 'Enviando…' : <>Enviar enlace <Icono nombre="flecha" /></>}
        </button>
      </form>
      <p className="pie-acceso">¿Recordaste tu contraseña? <Link to="/iniciar-sesion">Inicia sesión</Link></p>
    </PantallaAcceso>
  );
}
