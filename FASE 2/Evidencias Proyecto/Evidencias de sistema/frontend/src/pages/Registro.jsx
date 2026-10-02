import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Alerta from '../components/Alerta.jsx';
import BotonGoogle from '../components/BotonGoogle.jsx';
import CampoFormulario from '../components/CampoFormulario.jsx';
import Icono from '../components/Icono.jsx';
import PantallaAcceso from '../components/PantallaAcceso.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import { validarRegistro } from '../services/validaciones.js';

export default function Registro() {
  const { registrar } = useSesion();
  const navegar = useNavigate();
  const [datos, setDatos] = useState({ nombre: '', correo: '', password: '', confirmacion: '' });
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cambiar = (evento) => setDatos({ ...datos, [evento.target.name]: evento.target.value });

  const enviar = async (evento) => {
    evento.preventDefault();
    setMensaje('');
    const erroresCliente = validarRegistro(datos);
    setErrores(erroresCliente);
    if (Object.keys(erroresCliente).length > 0) return;

    setEnviando(true);
    try {
      const { nombre, correo, password } = datos;
      await registrar({ nombre, correo, password });
      navegar('/perfil', { replace: true });
    } catch (error) {
      setErrores(error.detalles || {});
      setMensaje(error.message);
      setEnviando(false);
    }
  };

  return (
    <PantallaAcceso>
      <div className="acceso__encabezado">
        <h1>Tu bienestar comienza <span className="texto-acento">aquí</span></h1>
        <p className="texto-secundario">Regístrate y accede a profesionales, lugares y herramientas para cuidar tu salud y rendimiento.</p>
      </div>
      <Alerta>{mensaje}</Alerta>
      <form onSubmit={enviar} noValidate>
        <CampoFormulario id="nombre" etiqueta="Nombre completo" autoComplete="name" icono="usuario" etiquetaOculta
          value={datos.nombre} onChange={cambiar} error={errores.nombre} />
        <CampoFormulario id="correo" etiqueta="Correo electrónico" type="email" autoComplete="email" icono="correo" etiquetaOculta
          value={datos.correo} onChange={cambiar} error={errores.correo} />
        <div className="fila-doble">
          <CampoFormulario id="password" etiqueta="Contraseña (mínimo 8 caracteres)" placeholder="Contraseña" type="password"
            autoComplete="new-password" icono="candado" etiquetaOculta value={datos.password} onChange={cambiar} error={errores.password} />
          <CampoFormulario id="confirmacion" etiqueta="Confirmar contraseña" placeholder="Confirmar" type="password"
            autoComplete="new-password" icono="candado" etiquetaOculta value={datos.confirmacion} onChange={cambiar} error={errores.confirmacion} />
        </div>

        <button type="submit" className="boton boton--principal" disabled={enviando}>
          {enviando ? 'Creando cuenta…' : <>Registrarse <Icono nombre="flecha" /></>}
        </button>
      </form>
      <BotonGoogle separador="o regístrate con" textoGoogle="signup_with" />
      <p className="pie-acceso">¿Ya tienes una cuenta? <Link to="/iniciar-sesion" className="enlace-acento">Inicia sesión</Link></p>
    </PantallaAcceso>
  );
}
