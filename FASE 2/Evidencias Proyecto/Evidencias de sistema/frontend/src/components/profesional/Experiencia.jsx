import { useEffect, useState } from 'react';
import reglas from '@shared/reglas.json';
import Alerta from '../Alerta.jsx';
import Icono from '../Icono.jsx';
import { solicitar } from '../../services/api.js';
import { precioCLP } from './experiencia.js';
import './Experiencia.css';

const { anios, formacion: reglasFormacion, atiendeA, registroSis, precio } = reglas.experiencia;
const ATIENDE = Object.fromEntries(atiendeA.map(({ valor, etiqueta }) => [valor, etiqueta]));
const ANIO_ACTUAL = new Date().getFullYear();

const vacio = () => ({ titulo: '', institucion: '', anio: '' });
const aFormulario = (e) => ({
  aniosExperiencia: e.aniosExperiencia ?? '',
  formacion: e.formacion.length ? e.formacion.map((f) => ({ ...f, anio: f.anio ?? '' })) : [],
  atiendeA: e.atiendeA,
  registroSis: e.registroSis ?? '',
  precioDesde: e.precioDesde ?? '',
});

// Lo que verán las personas en la ficha pública.
function Resumen({ experiencia, onEditar }) {
  const sinDatos = experiencia.aniosExperiencia === null && !experiencia.formacion.length && !experiencia.atiendeA.length
    && !experiencia.registroSis && experiencia.precioDesde === null;
  if (sinDatos) {
    return (
      <div className="experiencia__vacia">
        <p>Cuenta tus años de experiencia, tu formación y a quién atiendes. Las fichas completas generan más confianza.</p>
        <button type="button" className="boton boton--principal boton--compacto" onClick={onEditar}><Icono nombre="mas" tamano={18} /> Agregar experiencia</button>
      </div>
    );
  }
  return (
    <div className="experiencia">
      <dl className="experiencia__datos">
        <div><dt>Experiencia</dt><dd>{experiencia.aniosExperiencia === null ? 'Sin indicar' : `${experiencia.aniosExperiencia} ${experiencia.aniosExperiencia === 1 ? 'año' : 'años'}`}</dd></div>
        <div><dt>Consulta desde</dt><dd>{experiencia.precioDesde === null ? 'Sin indicar' : precioCLP(experiencia.precioDesde)}</dd></div>
        <div><dt>Registro Superintendencia de Salud</dt><dd>{experiencia.registroSis ? `N.º ${experiencia.registroSis}` : 'Sin indicar'}</dd></div>
        <div><dt>Atiende a</dt><dd>{experiencia.atiendeA.length ? experiencia.atiendeA.map((v) => ATIENDE[v]).join(', ') : 'Sin indicar'}</dd></div>
      </dl>
      {experiencia.formacion.length > 0 && (
        <>
          <h3 className="experiencia__subtitulo">Formación</h3>
          <ul className="formacion">
            {experiencia.formacion.map((f, i) => (
              <li key={`${f.titulo}-${i}`}>
                <Icono nombre="birrete" tamano={20} />
                <span><strong>{f.titulo}</strong><small>{f.institucion}{f.anio ? ` · ${f.anio}` : ''}</small></span>
              </li>
            ))}
          </ul>
        </>
      )}
      <button type="button" className="boton boton--secundario boton--compacto experiencia__editar" onClick={onEditar}><Icono nombre="lapiz" tamano={16} /> Editar experiencia</button>
    </div>
  );
}

function Formulario({ inicial, onGuardado, onCancelar }) {
  const [campos, setCampos] = useState(aFormulario(inicial));
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const cambiarEstudio = (indice, cambio) => setCampos({ ...campos, formacion: campos.formacion.map((f, i) => (i === indice ? { ...f, ...cambio } : f)) });
  const error = (clave) => errores[clave] && <p className="campo__mensaje" role="alert">{errores[clave]}</p>;

  async function guardar(evento) {
    evento.preventDefault();
    setOcupado(true);
    setErrores({});
    setMensaje('');
    try {
      const cuerpo = {
        ...campos,
        aniosExperiencia: campos.aniosExperiencia === '' ? null : Number(campos.aniosExperiencia),
        precioDesde: campos.precioDesde === '' ? null : Number(campos.precioDesde),
        formacion: campos.formacion.filter((f) => f.titulo.trim() || f.institucion.trim()).map((f) => ({ ...f, anio: f.anio === '' ? null : Number(f.anio) })),
      };
      const { experiencia } = await solicitar('/profesionales/mi-ficha/experiencia', { metodo: 'PUT', cuerpo });
      onGuardado(experiencia);
    } catch (e) {
      setErrores(e.detalles || {});
      setMensaje(e.message);
      setOcupado(false);
    }
  }

  return (
    <form className="experiencia-formulario" onSubmit={guardar} noValidate>
      <Alerta>{mensaje}</Alerta>
      <div className="experiencia-formulario__fila">
        <label className={`campo${errores.aniosExperiencia ? ' campo--error' : ''}`}>
          <span className="campo__etiqueta">Años de experiencia</span>
          <input className="campo__control" type="number" inputMode="numeric" min={anios.min} max={anios.max} value={campos.aniosExperiencia}
            onChange={(e) => setCampos({ ...campos, aniosExperiencia: e.target.value })} />
          {error('aniosExperiencia')}
        </label>
        <label className={`campo${errores.precioDesde ? ' campo--error' : ''}`}>
          <span className="campo__etiqueta">Consulta desde (CLP)</span>
          <span className="campo__caja experiencia-formulario__precio">
            <span aria-hidden="true">$</span>
            <input className="campo__control" type="number" inputMode="numeric" min={precio.min} max={precio.max} step="500" value={campos.precioDesde}
              aria-describedby="ayuda-precio" onChange={(e) => setCampos({ ...campos, precioDesde: e.target.value })} />
          </span>
          <span id="ayuda-precio" className="campo__ayuda">Valor referencial: FitSearch no cobra ni procesa pagos.</span>
          {error('precioDesde')}
        </label>
      </div>
      <label className={`campo${errores.registroSis ? ' campo--error' : ''}`}>
        <span className="campo__etiqueta">N.º de registro en la Superintendencia de Salud (opcional)</span>
        <input className="campo__control" inputMode="numeric" maxLength={registroSis.max + 4} value={campos.registroSis} placeholder="Ej. 93952"
          aria-describedby="ayuda-sis" onChange={(e) => setCampos({ ...campos, registroSis: e.target.value })} />
        <span id="ayuda-sis" className="campo__ayuda">Si eres profesional de la salud, aparece en tu ficha con un enlace para comprobarlo.</span>
        {error('registroSis')}
      </label>
      <fieldset className="experiencia-formulario__grupo">
        <legend className="campo__etiqueta">Atiendo a</legend>
        <div className="opciones-atiende">
          {atiendeA.map(({ valor, etiqueta }) => (
            <label key={valor} className="opcion-atiende">
              <input type="checkbox" checked={campos.atiendeA.includes(valor)}
                onChange={(e) => setCampos({ ...campos, atiendeA: e.target.checked ? [...campos.atiendeA, valor] : campos.atiendeA.filter((v) => v !== valor) })} />
              <span>{etiqueta}</span>
            </label>
          ))}
        </div>
        {error('atiendeA')}
      </fieldset>
      <fieldset className="experiencia-formulario__grupo">
        <legend className="campo__etiqueta">Formación</legend>
        {campos.formacion.map((f, i) => (
          <div key={i} className="estudio">
            <label className={`campo${errores[`formacion.${i}.titulo`] ? ' campo--error' : ''}`}>
              <span className="campo__etiqueta">Título o estudio</span>
              <input className="campo__control" maxLength={reglasFormacion.titulo.max} value={f.titulo} placeholder="Ej. Nutricionista"
                onChange={(e) => cambiarEstudio(i, { titulo: e.target.value })} />
              {error(`formacion.${i}.titulo`)}
            </label>
            <label className={`campo${errores[`formacion.${i}.institucion`] ? ' campo--error' : ''}`}>
              <span className="campo__etiqueta">Institución</span>
              <input className="campo__control" maxLength={reglasFormacion.institucion.max} value={f.institucion} placeholder="Ej. Universidad de Chile"
                onChange={(e) => cambiarEstudio(i, { institucion: e.target.value })} />
              {error(`formacion.${i}.institucion`)}
            </label>
            <label className={`campo estudio__anio${errores[`formacion.${i}.anio`] ? ' campo--error' : ''}`}>
              <span className="campo__etiqueta">Año</span>
              <input className="campo__control" type="number" inputMode="numeric" min={reglasFormacion.anioMin} max={ANIO_ACTUAL} value={f.anio}
                onChange={(e) => cambiarEstudio(i, { anio: e.target.value })} />
              {error(`formacion.${i}.anio`)}
            </label>
            <button type="button" className="boton-icono estudio__quitar" aria-label={`Quitar el estudio ${i + 1}`}
              onClick={() => setCampos({ ...campos, formacion: campos.formacion.filter((_, j) => j !== i) })}>
              <Icono nombre="basura" tamano={18} />
            </button>
          </div>
        ))}
        {error('formacion')}
        {campos.formacion.length < reglasFormacion.max && (
          <button type="button" className="boton-texto" onClick={() => setCampos({ ...campos, formacion: [...campos.formacion, vacio()] })}>
            <Icono nombre="mas" tamano={16} /> Agregar estudio
          </button>
        )}
      </fieldset>
      <div className="experiencia-formulario__acciones">
        <button className="boton boton--principal boton--compacto" disabled={ocupado}>{ocupado ? 'Guardando…' : 'Guardar experiencia'}</button>
        <button type="button" className="boton boton--secundario boton--compacto" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  );
}

// Pestaña «Experiencia» del perfil profesional (FS-HU-29).
export default function Experiencia() {
  const [estado, setEstado] = useState({ cargando: true });
  const [editando, setEditando] = useState(false);
  const [aviso, setAviso] = useState('');
  useEffect(() => {
    let activo = true;
    solicitar('/profesionales/mi-ficha/experiencia')
      .then(({ experiencia }) => activo && setEstado({ experiencia }))
      .catch((error) => activo && setEstado({ error: error.message }));
    return () => { activo = false; };
  }, []);
  if (estado.cargando) return <p className="texto-secundario" role="status">Cargando tu experiencia…</p>;
  if (estado.error) return <Alerta>{estado.error}</Alerta>;
  return (
    <>
      <Alerta tipo="exito">{aviso}</Alerta>
      {editando
        ? <Formulario inicial={estado.experiencia} onCancelar={() => setEditando(false)}
          onGuardado={(experiencia) => { setEstado({ experiencia }); setEditando(false); setAviso('Tu experiencia se guardó y ya se ve en tu ficha pública.'); }} />
        : <Resumen experiencia={estado.experiencia} onEditar={() => { setAviso(''); setEditando(true); }} />}
    </>
  );
}
