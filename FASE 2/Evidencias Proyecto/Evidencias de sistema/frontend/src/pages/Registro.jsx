import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Alerta from '../components/Alerta.jsx';
import CampoFormulario from '../components/CampoFormulario.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import { validarRegistro } from '../services/validaciones.js';

export default function Registro() {
  const { registrar } = useSesion();
  const navegar = useNavigate();
  const [datos, setDatos] = useState({ nombre: '', correo: '', password: '' });
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
      await registrar(datos);
      navegar('/perfil', { replace: true, state: { bienvenida: true } });
    } catch (error) {
      setErrores(error.detalles || {});
      setMensaje(error.message);
      setEnviando(false);
    }
  };

  return (
    <section className="tarjeta">
      <h1>Crea tu cuenta</h1>
      <p className="texto-secundario">Encuentra profesionales de salud, deporte y bienestar cerca de ti.</p>
      <Alerta>{mensaje}</Alerta>
      <form onSubmit={enviar} noValidate>
        <CampoFormulario id="nombre" etiqueta="Nombre completo" autoComplete="name"
          value={datos.nombre} onChange={cambiar} error={errores.nombre} />
        <CampoFormulario id="correo" etiqueta="Correo electrónico" type="email" autoComplete="email"
          value={datos.correo} onChange={cambiar} error={errores.correo} />
        <CampoFormulario id="password" etiqueta="Contraseña (mínimo 8 caracteres)" type="password" autoComplete="new-password"
          value={datos.password} onChange={cambiar} error={errores.password} />
        <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Creando cuenta…' : 'Registrarme'}</button>
      </form>
      <p className="texto-secundario">¿Ya tienes cuenta? <Link to="/iniciar-sesion">Inicia sesión</Link></p>
    </section>
  );
}
