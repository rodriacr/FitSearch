import { useState } from 'react';
import { Link } from 'react-router-dom';
import Alerta from '../Alerta.jsx';
import Icono from '../Icono.jsx';
import { formatearNumero } from '../../services/formato.js';
import './MejorasAsistente.css';

// Piezas de la mejora del asistente de IA (SC-47): «¿Cómo voy hoy?», la valoración de cada respuesta y el permiso para
// usar el perfil.

const FILAS_DEL_DIA = [
  ['calorias', 'Calorías', 'kcal'], ['proteinasG', 'Proteínas', 'g'], ['carbohidratosG', 'Carbohidratos', 'g'], ['grasasG', 'Grasas', 'g'], ['aguaMl', 'Agua', 'ml'],
];

// Resumen del día tal como estaba al responder: lo que lleva frente al plan y la meta de agua.
export function ResumenDia({ resumen }) {
  return (
    <div className="resumen-ia">
      <p className="resumen-ia__titulo"><Icono nombre="actividad" tamano={18} /> Tu día de hoy</p>
      <dl className="resumen-ia__filas">
        {FILAS_DEL_DIA.map(([clave, nombre, unidad]) => {
          const { consumo, meta } = resumen[clave] ?? {};
          const avance = meta ? Math.min(consumo / meta, 1) : 0;
          return (
            <div key={clave} className="resumen-ia__fila">
              <dt>{nombre}</dt>
              <dd>
                <span className="resumen-ia__cifra">{formatearNumero(consumo ?? 0)}{meta ? ` / ${formatearNumero(meta)}` : ''} {unidad}</span>
                {meta ? (
                  <span className={`resumen-ia__barra${consumo > meta * 1.1 ? ' resumen-ia__barra--pasada' : ''}`} role="img"
                    aria-label={`${Math.round((consumo / meta) * 100)} % de la meta`}><span style={{ width: `${avance * 100}%` }} /></span>
                ) : null}
              </dd>
            </div>
          );
        })}
      </dl>
      <Link to="/comidas" className="boton boton--secundario boton--compacto resumen-ia__boton">Ver mis comidas <Icono nombre="flecha" tamano={16} /></Link>
    </div>
  );
}

// «¿Te sirvió?»: tocar de nuevo la opción elegida quita la valoración. El ícono elegido va relleno en el azul vivo.
export function Valoracion({ valor = null, onValorar }) {
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  async function valorar(nuevo) {
    setOcupado(true);
    setError('');
    try {
      await onValorar(valor === nuevo ? null : nuevo);
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  }
  return (
    <div className="valoracion-ia">
      <span className="valoracion-ia__pregunta">¿Te sirvió?</span>
      {[[1, 'meGusta', 'Me sirvió'], [-1, 'noMeGusta', 'No me sirvió']].map(([clave, icono, texto]) => (
        <button key={clave} type="button" className="valoracion-ia__boton" aria-pressed={valor === clave} disabled={ocupado}
          aria-label={texto} title={texto} onClick={() => valorar(clave)}>
          <Icono nombre={icono} tamano={18} relleno={valor === clave} activo={valor === clave} />
        </button>
      ))}
      {valor !== null && <span className="valoracion-ia__gracias" aria-live="polite">¡Gracias por contarnos!</span>}
      {error && <Alerta>{error}</Alerta>}
    </div>
  );
}

const QUE_SE_USA = 'tu edad, sexo, peso, estatura, actividad física, objetivo, comidas al día, horas de sueño y tu plan de alimentación';

// Antes de usar el perfil, el asistente pide permiso. La información de salud (dato sensible, Ley 21.719) se autoriza
// aparte. Nunca se comparten el nombre, el correo ni el teléfono, y se puede cambiar cuando se quiera.
export function PermisoPerfil({ actual = null, onGuardar, onCerrar }) {
  const [conSalud, setConSalud] = useState(actual === 'perfil_salud');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  async function guardar(permiso) {
    setOcupado(true);
    setError('');
    try {
      await onGuardar(permiso);
    } catch (e) {
      setError(e.message);
      setOcupado(false);
    }
  }
  return (
    <section className="permiso-ia" aria-labelledby="titulo-permiso-ia">
      <p id="titulo-permiso-ia" className="permiso-ia__titulo">
        {actual === null ? 'Antes de empezar: ¿me das permiso para usar los datos de tu perfil?' : '¿Uso los datos de tu perfil?'}
      </p>
      <p>Así mis consejos se ajustan a ti. Usaría {QUE_SE_USA}. Nunca comparto tu nombre, tu correo ni tu teléfono.</p>
      <label className="permiso-ia__salud">
        <input type="checkbox" checked={conSalud} onChange={(e) => setConSalud(e.target.checked)} />
        <span>Incluir también mi información de salud (condiciones, medicamentos y alergias)</span>
      </label>
      <Alerta>{error}</Alerta>
      <div className="permiso-ia__acciones">
        <button type="button" className="boton boton--principal boton--compacto" disabled={ocupado} onClick={() => guardar(conSalud ? 'perfil_salud' : 'perfil')}>
          Sí, usar mi perfil
        </button>
        <button type="button" className="boton boton--secundario boton--compacto" disabled={ocupado} onClick={() => guardar('no')}>
          {actual === null ? 'Ahora no' : 'No usar mi perfil'}
        </button>
        {onCerrar && <button type="button" className="boton-texto" onClick={onCerrar}>Cancelar</button>}
      </div>
      <p className="permiso-ia__nota">Lo que escribes y, si lo autorizas, ese resumen de tu perfil se procesan con un servicio de IA externo. Puedes cambiar esta decisión cuando quieras.</p>
    </section>
  );
}
