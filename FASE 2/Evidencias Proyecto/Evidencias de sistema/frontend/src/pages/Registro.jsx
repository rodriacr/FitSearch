import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Alerta from '../components/Alerta.jsx';
import BotonGoogle from '../components/BotonGoogle.jsx';
import CampoFormulario from '../components/CampoFormulario.jsx';
import Icono from '../components/Icono.jsx';
import IndicadorContrasena from '../components/IndicadorContrasena.jsx';
import PantallaAcceso from '../components/PantallaAcceso.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import { ELEGIR_PERFIL } from '../services/navegacion.js';
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
      navegar(ELEGIR_PERFIL, { replace: true });
    } catch (error) {
      setErrores(error.detalles || {});
      setMensaje(error.message);
      setEnviando(false);
    }
  };

  return (
    <PantallaAcceso>
      <div className="acceso__encabezado">
        <h1>Crea tu <span className="texto-acento">cuenta</span></h1>
        <p className="texto-secundario">Gratis y en menos de un minuto.</p>
      </div>
      <Alerta>{mensaje}</Alerta>
      <form onSubmit={enviar} noValidate>
        <CampoFormulario id="nombre" etiqueta="Nombre completo" autoComplete="name" icono="usuario" etiquetaOculta
          value={datos.nombre} onChange={cambiar} error={errores.nombre} />
        <CampoFormulario id="correo" etiqueta="Correo electrónico" type="email" autoComplete="email" icono="correo" etiquetaOculta
          value={datos.correo} onChange={cambiar} error={errores.correo} />
        <CampoFormulario id="password" etiqueta="Contraseña (mínimo 8 caracteres)" placeholder="Contraseña" type="password"
          autoComplete="new-password" icono="candado" etiquetaOculta value={datos.password} onChange={cambiar} error={errores.password} />
        {!errores.password && <IndicadorContrasena password={datos.password} />}
        <CampoFormulario id="confirmacion" etiqueta="Confirmar contraseña" placeholder="Confirmar contraseña" type="password"
          autoComplete="new-password" icono="candado" etiquetaOculta value={datos.confirmacion} onChange={cambiar} error={errores.confirmacion} />
        {!errores.confirmacion && datos.confirmacion && datos.confirmacion === datos.password && (
          <p className="coincidencia" role="status"><Icono nombre="check" tamano={16} /> Las contraseñas coinciden</p>
        )}

        <button type="submit" className="boton boton--principal" disabled={enviando}>
          {enviando ? <><span className="boton__carga" aria-hidden="true" /> Creando cuenta…</> : <>Registrarse <Icono nombre="flecha" /></>}
        </button>
      </form>
      <BotonGoogle separador="o regístrate con" textoGoogle="signup_with" />
      <p className="pie-acceso">¿Ya tienes una cuenta? <Link to="/iniciar-sesion" className="enlace-acento">Inicia sesión</Link></p>
    </PantallaAcceso>
  );
}
