import Icono from '../Icono.jsx';
import { etiquetaAtiende, precioCLP, URL_SUPERSALUD } from '../profesional/experiencia.js';

// Experiencia y formación en la ficha pública (FS-HU-29), con el registro en la Superintendencia de Salud y el precio
// referencial. Si el profesional no completó nada, la sección no aparece.
export default function ExperienciaPublica({ profesional }) {
  const { aniosExperiencia, formacion = [], atiendeA = [], registroSis, precioDesde } = profesional;
  if (aniosExperiencia == null && !formacion.length && !atiendeA.length && !registroSis && precioDesde == null) return null;
  return (
    <section className="ficha__seccion experiencia-publica" aria-labelledby="titulo-experiencia">
      <h2 id="titulo-experiencia">Experiencia y formación</h2>
      <dl className="experiencia-publica__datos">
        {aniosExperiencia != null && (
          <div><dt>Experiencia</dt><dd>{aniosExperiencia === 0 ? 'Menos de un año' : `${aniosExperiencia} ${aniosExperiencia === 1 ? 'año' : 'años'}`}</dd></div>
        )}
        {precioDesde != null && (
          <div><dt>Consulta desde</dt><dd>{precioCLP(precioDesde)}<small>Valor referencial: se paga directamente al profesional.</small></dd></div>
        )}
        {atiendeA.length > 0 && <div><dt>Atiende a</dt><dd>{atiendeA.map(etiquetaAtiende).join(', ')}</dd></div>}
        {registroSis && (
          <div>
            <dt>Superintendencia de Salud</dt>
            <dd>
              Registro N.º {registroSis}
              <a href={URL_SUPERSALUD} target="_blank" rel="noopener noreferrer" className="experiencia-publica__verificar">
                Comprobar en el registro <Icono nombre="flecha" tamano={14} /><span className="solo-lector"> (se abre en una pestaña nueva)</span>
              </a>
            </dd>
          </div>
        )}
      </dl>
      {formacion.length > 0 && (
        <ul className="formacion experiencia-publica__formacion">
          {formacion.map((f, i) => (
            <li key={`${f.titulo}-${i}`}>
              <Icono nombre="birrete" tamano={20} />
              <span><strong>{f.titulo}</strong><small>{f.institucion}{f.anio ? ` · ${f.anio}` : ''}</small></span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
