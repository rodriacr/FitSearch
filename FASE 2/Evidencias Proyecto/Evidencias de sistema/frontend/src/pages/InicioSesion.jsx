import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Alerta from '../components/Alerta.jsx';
import BotonGoogle from '../components/BotonGoogle.jsx';
import CampoFormulario from '../components/CampoFormulario.jsx';
import Icono from '../components/Icono.jsx';
import PantallaAcceso from '../components/PantallaAcceso.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import { validarInicioSesion } from '../services/validaciones.js';

export default function InicioSesion() {
  const { iniciarSesion, aviso, limpiarAviso } = useSesion();
  const navegar = useNavigate();
  const [datos, setDatos] = useState({ correo: '', password: '', recordar: false });
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cambiar = (evento) => {
    const { name, type, checked, value } = evento.target;
    setDatos({ ...datos, [name]: type === 'checkbox' ? checked : value });
  };

  const enviar = async (evento) => {
    evento.preventDefault();
    setMensaje('');
    limpiarAviso();
    const erroresCliente = validarInicioSesion(datos);
    setErrores(erroresCliente);
    if (Object.keys(erroresCliente).length > 0) return;

    setEnviando(true);
    try {
      await iniciarSesion(datos);
      navegar('/perfil', { replace: true });
    } catch (error) {
      setMensaje(error.message);
      setEnviando(false);
    }
  };

  return (
    <PantallaAcceso>
      <div className="acceso__encabezado">
        <h1>¡Bienvenido!</h1>
        <p className="texto-secundario">Inicia sesión para continuar con tu camino hacia una vida más saludable.</p>
      </div>
      {aviso && <Alerta tipo={aviso.tipo}>{aviso.texto}</Alerta>}
      <Alerta>{mensaje}</Alerta>
      <form onSubmit={enviar} noValidate>
        <CampoFormulario id="correo" etiqueta="Correo electrónico" type="email" autoComplete="email" icono="usuario" etiquetaOculta
          value={datos.correo} onChange={cambiar} error={errores.correo} />
        <CampoFormulario id="password" etiqueta="Contraseña" type="password" autoComplete="current-password" icono="candado" etiquetaOculta
          value={datos.password} onChange={cambiar} error={errores.password} />
        <div className="fila-opciones">
          <label className="casilla">
            <input type="checkbox" name="recordar" checked={datos.recordar} onChange={cambiar} />
            Recordarme
          </label>
          <Link to="/recuperar-contrasena" className="enlace-acento">¿Olvidaste tu contraseña?</Link>
        </div>
        <button type="submit" className="boton boton--principal" disabled={enviando}>
          {enviando ? 'Ingresando…' : <>Iniciar sesión <Icono nombre="flecha" /></>}
        </button>
      </form>
      <BotonGoogle recordar={datos.recordar} />
      <p className="pie-acceso">¿No tienes una cuenta? <Link to="/registro" className="enlace-acento">Regístrate aquí</Link></p>
    </PantallaAcceso>
  );
}
