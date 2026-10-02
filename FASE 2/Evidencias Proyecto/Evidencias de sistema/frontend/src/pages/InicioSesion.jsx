import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Alerta from '../components/Alerta.jsx';
import CampoFormulario from '../components/CampoFormulario.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import { validarInicioSesion } from '../services/validaciones.js';

export default function InicioSesion() {
  const { iniciarSesion, aviso, limpiarAviso } = useSesion();
  const navegar = useNavigate();
  const [datos, setDatos] = useState({ correo: '', password: '' });
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cambiar = (evento) => setDatos({ ...datos, [evento.target.name]: evento.target.value });

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
    <section className="tarjeta">
      <h1>Inicia sesión</h1>
      {aviso && <Alerta tipo={aviso.tipo}>{aviso.texto}</Alerta>}
      <Alerta>{mensaje}</Alerta>
      <form onSubmit={enviar} noValidate>
        <CampoFormulario id="correo" etiqueta="Correo electrónico" type="email" autoComplete="email"
          value={datos.correo} onChange={cambiar} error={errores.correo} />
        <CampoFormulario id="password" etiqueta="Contraseña" type="password" autoComplete="current-password"
          value={datos.password} onChange={cambiar} error={errores.password} />
        <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Ingresando…' : 'Iniciar sesión'}</button>
      </form>
      <p className="texto-secundario">¿No tienes cuenta? <Link to="/registro">Regístrate</Link></p>
    </section>
  );
}
