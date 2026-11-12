import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alerta from '../../components/Alerta.jsx';
import Icono from '../../components/Icono.jsx';
import { solicitar } from '../../services/api.js';
import './Configuracion.css';

const PREFERENCIAS = [
  {
    clave: 'autoconfirmar', icono: 'check', titulo: 'Confirmar reservas automáticamente',
    texto: 'Las solicitudes nuevas quedan confirmadas al instante, sin que tengas que revisarlas una por una.',
  },
  {
    clave: 'avisosCorreo', icono: 'correo', titulo: 'Avisos por correo',
    texto: 'Te escribimos cuando alguien pide o cancela una hora contigo.',
  },
  {
    clave: 'recordatorios', icono: 'campana', titulo: 'Recordatorio a tus clientes',
    texto: 'Les enviamos un correo 24 horas antes de su cita confirmada para que no la olviden.',
  },
];

// Configuración de la cuenta profesional (FS-HU-29): cada interruptor guarda y aplica su preferencia al cambiarlo.
export default function Configuracion() {
  const [estado, setEstado] = useState({ cargando: true });
  const [guardando, setGuardando] = useState(null);
  const [aviso, setAviso] = useState({ tipo: '', texto: '' });

  useEffect(() => {
    let activo = true;
    solicitar('/profesionales/mi-ficha/configuracion')
      .then(({ configuracion }) => activo && setEstado({ configuracion }))
      .catch((error) => activo && setEstado({ error }));
    return () => { activo = false; };
  }, []);

  async function cambiar(clave, valor) {
    const anterior = estado.configuracion;
    setEstado({ configuracion: { ...anterior, [clave]: valor } });
    setGuardando(clave);
    setAviso({ tipo: '', texto: '' });
    try {
      const { configuracion } = await solicitar('/profesionales/mi-ficha/configuracion', { metodo: 'PUT', cuerpo: { [clave]: valor } });
      setEstado({ configuracion });
      setAviso({ tipo: 'exito', texto: 'Preferencia guardada.' });
    } catch (error) {
      setEstado({ configuracion: anterior });
      setAviso({ tipo: 'error', texto: error.message });
    } finally {
      setGuardando(null);
    }
  }

  return (
    <div className="configuracion">
      <header>
        <h1>Configuración</h1>
        <p className="texto-secundario">Cómo recibes y confirmas las reservas de tu agenda.</p>
      </header>
      {estado.cargando ? <p className="texto-secundario" role="status">Cargando tu configuración…</p> : estado.error ? (
        estado.error.estado === 409 ? (
          <div className="configuracion__aviso">
            <Icono nombre="info" tamano={20} />
            <p>Completa tu ficha profesional para configurar tu agenda. <Link to="/profesional/perfil">Ir a mi perfil</Link></p>
          </div>
        ) : <Alerta>{estado.error.message}</Alerta>
      ) : (
        <>
          <ul className="configuracion__lista">
            {PREFERENCIAS.map(({ clave, icono, titulo, texto }) => (
              <li key={clave} className="preferencia">
                <span className="preferencia__icono" aria-hidden="true"><Icono nombre={icono} tamano={20} /></span>
                <span className="preferencia__texto">
                  <strong id={`preferencia-${clave}`}>{titulo}</strong>
                  <span id={`preferencia-${clave}-ayuda`}>{texto}</span>
                </span>
                <label className="interruptor preferencia__control">
                  <input type="checkbox" role="switch" checked={estado.configuracion[clave]} disabled={guardando === clave}
                    aria-labelledby={`preferencia-${clave}`} aria-describedby={`preferencia-${clave}-ayuda`}
                    onChange={(e) => cambiar(clave, e.target.checked)} />
                  <span className="interruptor__pista" aria-hidden="true" />
                </label>
              </li>
            ))}
          </ul>
          <div aria-live="polite"><Alerta tipo={aviso.tipo || 'exito'}>{aviso.texto}</Alerta></div>
        </>
      )}
    </div>
  );
}
