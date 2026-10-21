import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import reglas from '@shared/reglas.json';
import Icono from './Icono.jsx';
import { SECCIONES } from './diseno/secciones.js';
import { obtenerFiltros } from '../services/profesional.service.js';
import { sugerencias as calcularSugerencias } from '../services/buscadorGeneral.js';

const DETALLE = { especialidad: 'Especialidad', busqueda: 'Profesionales' };

// "¿Qué necesitas hoy?" del Inicio (FS-HU-21, SC-23): mientras se escribe ofrece ir a una sección, ver una especialidad
// o buscar el texto en profesionales (patrón combobox con lista de sugerencias). Enter abre la sugerencia marcada (la
// primera, salvo que se cambie con las flechas); Escape cierra la lista. La lista aparece sin animación porque se
// usa a menudo y debe responder al instante.
export default function BuscadorGeneral() {
  const navegar = useNavigate();
  const [texto, setTexto] = useState('');
  const [abierta, setAbierta] = useState(false);
  const [activa, setActiva] = useState(0);
  const [especialidades, setEspecialidades] = useState(null);
  const pedidas = useRef(false);
  const lista = calcularSugerencias(texto, { secciones: SECCIONES, especialidades: especialidades || [] });
  const visible = abierta && lista.length > 0;
  const marcada = Math.min(activa, lista.length - 1);

  // El catálogo de especialidades se pide una sola vez, cuando la persona empieza a usar el buscador.
  const cargarEspecialidades = () => {
    if (pedidas.current) return;
    pedidas.current = true;
    obtenerFiltros().then((datos) => setEspecialidades(datos.especialidades || [])).catch(() => setEspecialidades([]));
  };
  const ir = (sugerencia) => {
    setAbierta(false);
    navegar(sugerencia ? sugerencia.ruta : '/profesionales');
  };
  const alEnviar = (evento) => {
    evento.preventDefault();
    ir(lista[marcada]);
  };
  const alTeclear = (evento) => {
    if (evento.key === 'Escape') {
      setAbierta(false);
      return;
    }
    if (!['ArrowDown', 'ArrowUp'].includes(evento.key) || !lista.length) return;
    evento.preventDefault();
    if (!visible) {
      setAbierta(true);
      return;
    }
    const paso = evento.key === 'ArrowDown' ? 1 : -1;
    setActiva((marcada + paso + lista.length) % lista.length);
  };

  return (
    <form className="buscador-hero buscador-general" role="search" onSubmit={alEnviar}>
      <label htmlFor="busqueda-inicio" className="solo-lector">¿Qué necesitas hoy?</label>
      <Icono nombre="buscar" tamano={20} />
      <input id="busqueda-inicio" name="q" type="text" placeholder="¿Qué necesitas hoy?" maxLength={reglas.profesionales.busqueda.max}
        autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={visible} aria-controls="sugerencias-inicio"
        aria-activedescendant={visible ? `sugerencia-${lista[marcada].id}` : undefined}
        value={texto} onFocus={cargarEspecialidades} onKeyDown={alTeclear} onBlur={() => setAbierta(false)}
        onChange={(evento) => {
          cargarEspecialidades();
          setTexto(evento.target.value);
          setActiva(0);
          setAbierta(true);
        }} />
      <button type="submit" aria-label="Buscar"><Icono nombre="buscar" tamano={20} /></button>
      <ul id="sugerencias-inicio" className="buscador-general__lista" role="listbox" aria-label="Sugerencias" hidden={!visible}>
        {visible && lista.map((sugerencia, i) => (
          <li key={sugerencia.id} id={`sugerencia-${sugerencia.id}`} role="option" aria-selected={i === marcada}
            className={`buscador-general__opcion${i === marcada ? ' buscador-general__opcion--marcada' : ''}`}
            // mousedown en vez de click: el campo no pierde el foco antes de elegir.
            onMouseDown={(evento) => { evento.preventDefault(); ir(sugerencia); }} onMouseEnter={() => setActiva(i)}>
            <span className="buscador-general__icono"><Icono nombre={sugerencia.icono} tamano={18} /></span>
            <span className="buscador-general__titulo">{sugerencia.titulo}</span>
            {sugerencia.proximamente
              ? <span className="etiqueta-proximamente">Próximamente</span>
              : <span className="buscador-general__detalle">{DETALLE[sugerencia.tipo] || 'Ir a la sección'}</span>}
          </li>
        ))}
      </ul>
    </form>
  );
}
