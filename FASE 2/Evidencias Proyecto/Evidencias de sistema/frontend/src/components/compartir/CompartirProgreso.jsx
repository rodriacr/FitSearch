import { useEffect, useState } from 'react';
import Alerta from '../Alerta.jsx';
import Dialogo from '../Dialogo.jsx';
import Icono from '../Icono.jsx';
import { dejarDeCompartir, guardarCompartir, listarCompartidos, nombresDe } from '../../services/compartir.js';
import './Compartir.css';

const fechaHora = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/Santiago' });
const ACCIONES = { otorgo: 'empezaste a compartir', cambio: 'cambiaste lo que compartes', revoco: 'dejaste de compartir', consulto: 'miró tu progreso' };

// Diálogo para elegir qué ve un profesional (SC-45). La salud es un dato sensible: se marca aparte y con su aviso.
export function DialogoCompartir({ profesional, categorias, alGuardado, alCerrar }) {
  const [permisos, setPermisos] = useState(profesional.permisos);
  const [estado, setEstado] = useState({ ocupado: false, error: '' });
  const comparte = Object.values(profesional.permisos).some(Boolean);
  const alguna = Object.values(permisos).some(Boolean);

  async function ejecutar(llamada, texto) {
    setEstado({ ocupado: true, error: '' });
    try {
      alGuardado(await llamada(), texto);
    } catch (error) {
      setEstado({ ocupado: false, error: error.message });
    }
  }

  return (
    <Dialogo titulo={`Compartir tu progreso con ${profesional.nombre}`} ocupado={estado.ocupado} onCerrar={alCerrar} ancho="normal"
      descripcion={`Elige qué puede ver. ${profesional.nombre} solo mira: no puede cambiar tus datos. Puedes cambiarlo o dejar de compartir cuando quieras.`}>
      <ul className="compartir__categorias">
        {categorias.map((c) => (
          <li key={c.clave} className={c.sensible ? 'compartir__categoria--sensible' : undefined}>
            <label>
              <input type="checkbox" checked={permisos[c.clave]} onChange={(e) => setPermisos((p) => ({ ...p, [c.clave]: e.target.checked }))} />
              <span>
                <strong>{c.titulo}</strong>
                <small>{c.incluye}</small>
                {c.sensible && permisos[c.clave] && (
                  <small className="compartir__aviso" role="note">Es información sensible: al marcarla autorizas a {profesional.nombre} a verla.</small>
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <p className="compartir__registro-nota"><Icono nombre="escudo" tamano={16} /> Cada consulta a tu progreso queda anotada en el registro de accesos de Configuración › Privacidad y datos.</p>
      <Alerta>{estado.error}</Alerta>
      <div className="dialogo__acciones">
        {comparte && (
          <button type="button" className="boton boton--secundario compartir__quitar" disabled={estado.ocupado}
            onClick={() => ejecutar(() => dejarDeCompartir(profesional.id), `Dejaste de compartir tu progreso con ${profesional.nombre}.`)}>
            Dejar de compartir
          </button>
        )}
        <button type="button" className="boton boton--principal" disabled={estado.ocupado || (!alguna && !comparte)}
          onClick={() => ejecutar(() => guardarCompartir(profesional.id, permisos), alguna ? `${profesional.nombre} ahora ve: ${nombresDe(permisos).join(', ')}.` : `Dejaste de compartir tu progreso con ${profesional.nombre}.`)}>
          {estado.ocupado ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </Dialogo>
  );
}

// Botón del chat (lado de la persona): muestra qué comparte con ese profesional y abre el diálogo.
export function BotonCompartir({ profesionalId, alCambiar }) {
  const [datos, setDatos] = useState(null);
  const [abierto, setAbierto] = useState(false);
  useEffect(() => {
    let activo = true;
    listarCompartidos().then((d) => activo && setDatos(d)).catch(() => activo && setDatos(null));
    return () => { activo = false; };
  }, [profesionalId]);
  const profesional = datos?.profesionales.find((p) => p.id === profesionalId);
  if (!profesional) return null;
  const comparte = nombresDe(profesional.permisos);
  return (
    <>
      <button type="button" className={`boton-icono compartir__boton${comparte.length ? ' compartir__boton--activo' : ''}`}
        aria-label={comparte.length ? `Compartes tu progreso: ${comparte.join(', ')}. Cambiar` : 'Compartir mi progreso'}
        title={comparte.length ? `Compartes: ${comparte.join(', ')}` : 'Compartir mi progreso'} onClick={() => setAbierto(true)}>
        <Icono nombre="grafico" tamano={20} />
      </button>
      {abierto && (
        <DialogoCompartir profesional={profesional} categorias={datos.categorias} alCerrar={() => setAbierto(false)}
          alGuardado={(nuevo, texto) => { setDatos(nuevo); setAbierto(false); alCambiar?.(texto); }} />
      )}
    </>
  );
}

// Profesionales con acceso y registro de accesos, dentro de «Privacidad y datos».
export function AccesosCompartidos() {
  const [datos, setDatos] = useState(null);
  const [intento, setIntento] = useState(0);
  const [editando, setEditando] = useState(null);
  const [mensaje, setMensaje] = useState('');
  useEffect(() => {
    let activo = true;
    listarCompartidos().then((d) => activo && setDatos(d)).catch(() => activo && setDatos({ error: true }));
    return () => { activo = false; };
  }, [intento]);
  if (!datos) return <p className="texto-secundario" role="status">Cargando con quién compartes tu progreso…</p>;
  if (datos.error) return <div>
    <Alerta>No pudimos cargar los permisos de acceso a tu progreso.</Alerta>
    <button type="button" className="boton-texto" onClick={() => { setDatos(null); setIntento((n) => n + 1); }}>Reintentar permisos</button>
  </div>;
  const conAcceso = datos.profesionales.filter((p) => Object.values(p.permisos).some(Boolean));
  return (
    <section className="privacidad__bloque compartir__accesos" aria-labelledby="titulo-accesos">
      <span className="privacidad__icono" aria-hidden="true"><Icono nombre="grupo" tamano={20} /></span>
      <div className="privacidad__texto">
        <h3 id="titulo-accesos">Profesionales con acceso a tu progreso</h3>
        {conAcceso.length === 0 ? (
          <p>No compartes tu progreso con nadie. Puedes hacerlo desde el chat con un profesional con el que tengas una cita.</p>
        ) : (
          <ul className="compartir__lista">
            {conAcceso.map((p) => (
              <li key={p.id}>
                <span className="compartir__quien">
                  <span><strong>{p.nombre}</strong>{p.especialidad ? ` · ${p.especialidad}` : ''}</span>
                  <small>Ve: {nombresDe(p.permisos).join(', ')}</small>
                </span>
                <button type="button" className="boton-texto" onClick={() => { setMensaje(''); setEditando(p); }}>Cambiar</button>
              </li>
            ))}
          </ul>
        )}
        {mensaje && <p className="privacidad__listo" role="status"><Icono nombre="check" tamano={16} /> {mensaje}</p>}
        {datos.registro.length > 0 && (
          <details className="compartir__historial">
            <summary>Registro de accesos ({datos.registro.length})</summary>
            <ul>
              {datos.registro.map((r) => (
                <li key={r.id}>
                  <time dateTime={r.fecha}>{fechaHora.format(new Date(r.fecha))}</time>
                  <span>{r.accion === 'consulto' ? `${r.profesional} ${ACCIONES.consulto}` : `${ACCIONES[r.accion][0].toUpperCase()}${ACCIONES[r.accion].slice(1)} con ${r.profesional}`}
                    {r.categorias.length > 0 && <small> ({nombresDe(Object.fromEntries(r.categorias.map((c) => [c, true]))).join(', ')})</small>}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
      {editando && (
        <DialogoCompartir profesional={editando} categorias={datos.categorias} alCerrar={() => setEditando(null)}
          alGuardado={(nuevo, texto) => { setDatos(nuevo); setEditando(null); setMensaje(texto); }} />
      )}
    </section>
  );
}
