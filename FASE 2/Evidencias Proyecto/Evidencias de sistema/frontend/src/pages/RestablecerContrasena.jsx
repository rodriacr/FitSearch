import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Alerta from '../components/Alerta.jsx';
import CampoFormulario from '../components/CampoFormulario.jsx';
import Icono from '../components/Icono.jsx';
import PantallaAcceso from '../components/PantallaAcceso.jsx';
import { restablecerPassword } from '../services/auth.service.js';
import { validarRestablecer } from '../services/validaciones.js';

// Pantalla a la que llega el enlace del correo: /restablecer-contrasena?token=... (FS-HU-15, escenarios 2 y 3).
export default function RestablecerContrasena() {
  const [parametros] = useSearchParams();
  const token = parametros.get('token') || '';
  const [datos, setDatos] = useState({ password: '', confirmacion: '' });
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState({ tipo: 'error', texto: token ? '' : 'El enlace no es válido o ya venció. Solicita uno nuevo.' });
  const [listo, setListo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const cambiar = (evento) => setDatos({ ...datos, [evento.target.name]: evento.target.value });

  const enviar = async (evento) => {
    evento.preventDefault();
    setMensaje({ tipo: 'error', texto: '' });
    const erroresCliente = validarRestablecer(datos);
    setErrores(erroresCliente);
    if (Object.keys(erroresCliente).length > 0) return;

    setEnviando(true);
    try {
      const respuesta = await restablecerPassword({ token, password: datos.password });
      setListo(true);
      setMensaje({ tipo: 'exito', texto: respuesta.mensaje });
    } catch (error) {
      setErrores(error.detalles?.password ? { password: error.detalles.password } : {});
      setMensaje({ tipo: 'error', texto: error.detalles?.token || error.message });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <PantallaAcceso>
      <Link to="/iniciar-sesion" className="volver"><Icono nombre="flechaIzquierda" /> Volver al inicio de sesión</Link>
      <div className="acceso__encabezado">
        <h1>Crea una nueva contraseña</h1>
        <p className="texto-secundario">Elige una contraseña de al menos 8 caracteres que no hayas usado antes.</p>
      </div>
      <Alerta tipo={mensaje.tipo}>{mensaje.texto}</Alerta>
      {listo ? (
        <Link to="/iniciar-sesion" className="boton boton--principal">Iniciar sesión <Icono nombre="flecha" /></Link>
      ) : token ? (
        <form onSubmit={enviar} noValidate>
          <CampoFormulario id="password" etiqueta="Nueva contraseña" type="password" autoComplete="new-password" icono="candado"
            etiquetaOculta value={datos.password} onChange={cambiar} error={errores.password} />
          <CampoFormulario id="confirmacion" etiqueta="Confirmar nueva contraseña" type="password" autoComplete="new-password"
            icono="candado" etiquetaOculta value={datos.confirmacion} onChange={cambiar} error={errores.confirmacion} />
          <button type="submit" className="boton boton--principal" disabled={enviando}>
            {enviando ? 'Guardando…' : <>Guardar contraseña <Icono nombre="flecha" /></>}
          </button>
        </form>
      ) : (
        <Link to="/recuperar-contrasena" className="boton boton--principal">Solicitar un enlace nuevo</Link>
      )}
    </PantallaAcceso>
  );
}
