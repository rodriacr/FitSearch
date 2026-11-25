import { useEffect, useRef, useState } from 'react';
import Icono from '../Icono.jsx';
import { obtenerClima } from '../../services/clima.service.js';

const ICONOS = { despejado: 'sol', parcial: 'nubeSol', nublado: 'nube', niebla: 'niebla', llovizna: 'lluvia', lluvia: 'lluvia', nieve: 'nieve', tormenta: 'tormenta' };

export default function ClimaActual() {
  const [intento, setIntento] = useState(0);
  const [estado, setEstado] = useState({ intento: -1 });
  const ultimaConsulta = useRef(0);
  const permitirActualizar = useRef(true);
  useEffect(() => {
    let activo = true;
    ultimaConsulta.current = Date.now();
    obtenerClima().then((datos) => {
      if (activo) { permitirActualizar.current = true; setEstado({ intento, datos }); }
    }).catch((error) => {
      if (activo) { permitirActualizar.current = error.motivo !== 'denegada'; setEstado({ intento, error }); }
    });
    return () => { activo = false; };
  }, [intento]);
  useEffect(() => {
    const revisar = () => {
      if (permitirActualizar.current && document.visibilityState !== 'hidden' && Date.now() - ultimaConsulta.current >= 5 * 60000) setIntento((n) => n + 1);
    };
    const reloj = setInterval(revisar, 5 * 60000);
    window.addEventListener('focus', revisar);
    document.addEventListener('visibilitychange', revisar);
    return () => { clearInterval(reloj); window.removeEventListener('focus', revisar); document.removeEventListener('visibilitychange', revisar); };
  }, []);
  const cargando = estado.intento !== intento;
  const datos = !cargando && estado.datos;
  const icono = datos && !datos.esDeDia && datos.estado === 'despejado' ? 'luna' : datos && !datos.esDeDia && datos.estado === 'parcial' ? 'nube' : ICONOS[datos?.estado] ?? 'nube';
  if (!datos) return <div className="clima clima--sin-datos" role="group" aria-label="Clima de tu ubicación actual">
    <Icono nombre="pin" tamano={26} />
    <div><p className="clima__lugar">Clima donde estás</p>{cargando ? <p className="clima__ayuda" role="status">Buscando tu ubicación…</p> : <p className="clima__ayuda" role="status">{estado.error.message}</p>}</div>
    {!cargando && <button type="button" className="clima__actualizar" onClick={() => setIntento((n) => n + 1)}>Reintentar ubicación</button>}
  </div>;
  return <div className={`clima clima--${datos.esDeDia ? 'dia' : 'noche'}`} role="group" aria-label={`Clima en ${datos.lugar}: ${datos.temperatura} grados, ${datos.descripcion}`}>
    <Icono nombre={icono} tamano={30} className="clima__icono" />
    <div><p className="clima__lugar">{datos.lugar}</p><p className="clima__temperatura">{datos.temperatura}°C</p><p className="clima__descripcion">{datos.descripcion}</p></div>
    <p className="clima__origen">Ubicación actual aproximada</p>
    <div className="clima__pie"><a className="clima__fuente" href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Datos: Open-Meteo</a><button type="button" className="clima__actualizar" aria-label="Actualizar clima de mi ubicación" onClick={() => setIntento((n) => n + 1)}>Actualizar</button></div>
  </div>;
}
