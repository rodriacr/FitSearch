import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import Alerta from '../Alerta.jsx';
import Icono from '../Icono.jsx';
import { TEMAS } from '../diseno/temas.js';
import InformacionCuenta from '../perfil/InformacionCuenta.jsx';
import useCuentaPerfil from '../perfil/useCuentaPerfil.js';
import { solicitar } from '../../services/api.js';
import { solicitarRecuperacion } from '../../services/auth.service.js';
import PrivacidadDatos from './PrivacidadDatos.jsx';
import '../Interruptor.css';
import '../perfil/PerfilEditable.css';
import './Ajustes.css';

export function TarjetaAjustes({ id, titulo, icono, ancha = false, children }) {
  return <section className={`panel-tarjeta ajustes__tarjeta${ancha ? ' ajustes__tarjeta--ancha' : ''}`} aria-labelledby={id}>
    <h2 id={id} className="panel-tarjeta__titulo"><Icono nombre={icono} tamano={21} /> {titulo}</h2>
    {children}
  </section>;
}

function MetodosDeAcceso({ cuenta }) {
  const [estado, setEstado] = useState({});
  const metodos = [cuenta.tienePassword && 'Correo y contraseña', cuenta.tieneGoogle && 'Google'].filter(Boolean);
  async function enviarEnlace() {
    setEstado({ enviando: true });
    try {
      const respuesta = await solicitarRecuperacion({ correo: cuenta.correo });
      setEstado({ mensaje: respuesta.mensaje || 'Revisa tu correo para restablecer la contraseña.' });
    } catch (error) {
      setEstado({ error: error.message });
    }
  }
  return <div className="ajustes__acceso">
    <div><h3>Métodos de inicio de sesión</h3><p>{metodos.join(' · ') || 'Sin métodos asociados'}</p></div>
    {cuenta.tienePassword && <button type="button" className="boton boton--secundario boton--compacto" onClick={enviarEnlace} disabled={estado.enviando || Boolean(estado.mensaje)}>
      {estado.enviando ? 'Solicitando enlace…' : estado.mensaje ? 'Enlace solicitado' : 'Solicitar enlace para cambiar contraseña'}
    </button>}
    <Alerta>{estado.error}</Alerta>
    <Alerta tipo="exito" flotante={false}>{estado.mensaje}</Alerta>
  </div>;
}

function Apariencia() {
  const { preferenciaTema, cambiarTema } = useOutletContext();
  return <TarjetaAjustes id="ajustes-apariencia" titulo="Apariencia" icono="sol">
    <fieldset className="ajustes__temas" aria-describedby="ajustes-tema-ayuda">
      <legend className="solo-lector">Tema de la aplicación</legend>
      {TEMAS.map(({ valor, nombre, icono }) => (
        <label key={valor}>
          <input type="radio" name="tema-configuracion" value={valor} checked={preferenciaTema === valor} onChange={() => cambiarTema(valor)} />
          <Icono nombre={icono} tamano={20} /><span>{nombre}</span>
        </label>
      ))}
    </fieldset>
    <p id="ajustes-tema-ayuda" className="ajustes__nota">Sistema sigue la apariencia de este dispositivo.</p>
  </TarjetaAjustes>;
}

export function PreferenciasCuenta({ ruta, preferencias, rutaFicha }) {
  const [estado, setEstado] = useState({ cargando: true });
  const [intento, setIntento] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    let activo = true;
    solicitar(ruta)
      .then(({ configuracion }) => { if (activo) setEstado({ configuracion }); })
      .catch((error) => { if (activo) setEstado({ error }); });
    return () => { activo = false; };
  }, [intento, ruta]);

  async function guardar(clave, valor) {
    if (guardando) return;
    setGuardando(true);
    setAviso(null);
    try {
      const { configuracion } = await solicitar(ruta, { metodo: 'PUT', cuerpo: { [clave]: valor } });
      setEstado({ configuracion });
      setAviso({ tipo: 'exito', texto: 'Preferencia guardada.' });
    } catch (error) {
      setAviso({ tipo: 'error', texto: error.message });
    } finally {
      setGuardando(false);
    }
  }
  if (estado.cargando) return <p className="ajustes__nota" role="status">Cargando tus preferencias…</p>;
  if (estado.error?.estado === 409 && rutaFicha) return <p className="ajustes__nota">
    Completa tu ficha profesional para configurar tu agenda. <Link to={rutaFicha}>Ir a mi perfil</Link>
  </p>;
  if (estado.error) return <>
    <Alerta>{estado.error.message}</Alerta>
    <button type="button" className="boton-texto" onClick={() => { setEstado({ cargando: true }); setIntento((n) => n + 1); }}>Reintentar preferencias</button>
  </>;
  return <>
    <ul className="ajustes__preferencias">
      {preferencias.map(({ clave, icono, titulo, descripcion }) => (
        <li key={clave}>
          <span className="panel-tarjeta__icono"><Icono nombre={icono} tamano={19} /></span>
          <div><strong id={`aviso-${clave}`}>{titulo}</strong><p id={`descripcion-${clave}`}>{descripcion}</p></div>
          <label className="interruptor">
            <input type="checkbox" role="switch" checked={estado.configuracion[clave]} disabled={guardando}
              onChange={(e) => guardar(clave, e.target.checked)} aria-labelledby={`aviso-${clave}`} aria-describedby={`descripcion-${clave}`} />
            <span className="interruptor__pista" aria-hidden="true" />
          </label>
        </li>
      ))}
    </ul>
    {guardando && <p className="ajustes__nota" role="status">Guardando preferencia…</p>}
    <Alerta tipo={aviso?.tipo} flotante={false}>{aviso?.texto}</Alerta>
  </>;
}

export default function Ajustes({ rol = 'usuario', children }) {
  const cuentaEstado = useCuentaPerfil();
  return <div className="ajustes">
    <h1>Configuración</h1>
    <TarjetaAjustes id="ajustes-cuenta" titulo="Cuenta y seguridad" icono="escudo">
      <InformacionCuenta estado={cuentaEstado} soloCorreo />
      {cuentaEstado.cuenta && <MetodosDeAcceso key={cuentaEstado.cuenta.correo} cuenta={cuentaEstado.cuenta} />}
    </TarjetaAjustes>
    <Apariencia />
    {children}
    <TarjetaAjustes id="ajustes-privacidad" titulo="Privacidad y datos" icono="candadoCerrado" ancha>
      <PrivacidadDatos cuenta={cuentaEstado.cuenta} rol={rol} />
    </TarjetaAjustes>
  </div>;
}
