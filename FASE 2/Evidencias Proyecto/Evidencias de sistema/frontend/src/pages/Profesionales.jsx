import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Alerta from '../components/Alerta.jsx';
import Icono from '../components/Icono.jsx';
import { listarProfesionales, obtenerEspecialidades } from '../services/profesional.service.js';
import './Profesionales.css';

export default function Profesionales() {
  const [parametros, setParametros] = useSearchParams();
  const especialidad = parametros.get('especialidad') || '';
  const pagina = parametros.get('pagina') || '1';
  const [intento, setIntento] = useState(0);
  const zona = parametros.get('comuna') || '';
  const clave = JSON.stringify([especialidad, pagina, intento, zona]);
  const [resultado, setResultado] = useState(null);
  const cargando = resultado?.clave !== clave;

  useEffect(() => {
    let activo = true;
    Promise.all([listarProfesionales({ especialidad, comuna: zona, pagina }), obtenerEspecialidades()])
      .then(([listado, catalogo]) => activo && setResultado({ clave, ...listado, ...catalogo }))
      .catch((error) => activo && setResultado({ clave, error: error.message }));
    return () => { activo = false; };
  }, [clave, especialidad, pagina, zona]);

  const filtrar = (evento) => {
    evento.preventDefault();
    const valor = new FormData(evento.currentTarget).get('especialidad').trim();
    const comuna = new FormData(evento.currentTarget).get('zona').trim();
    setParametros({ ...(valor ? { especialidad: valor } : {}), ...(comuna ? { comuna } : {}) });
  };
  const cambiarPagina = (numero) => setParametros({ ...(especialidad ? { especialidad } : {}), ...(zona ? { comuna: zona } : {}), pagina: String(numero) });

  return (
    <section className="directorio">
      <Link className="directorio__volver" to="/perfil">← Volver a mi perfil</Link>
      <header className="directorio__cabecera">
        <span className="directorio__antetitulo">Profesionales de FitSearch</span>
        <h1>Encuentra apoyo para tu bienestar</h1>
        <p>Explora profesionales de salud y deporte. Conoce su especialidad y dónde atienden.</p>
      <div className="directorio__ventajas"><span><Icono nombre="buscar" tamano={17} /> Busca por especialidad</span><span><Icono nombre="maletin" tamano={17} /> Conoce sus servicios</span><span><Icono nombre="flecha" tamano={17} /> Encuentra dónde atienden</span></div>
      </header>
      <form className="directorio__filtro" onSubmit={filtrar} key={JSON.stringify([especialidad, zona])}>
        <div className="campo">
          <label className="campo__etiqueta" htmlFor="especialidad">Especialidad</label>
          <input className="campo__control" id="especialidad" name="especialidad" type="search" list="especialidades"
            maxLength="100" defaultValue={especialidad} placeholder="Todas las especialidades" autoComplete="off" />
          <datalist id="especialidades">{resultado?.especialidades?.map((valor) => <option key={valor} value={valor} />)}</datalist>
        </div>
        <div className="campo"><label className="campo__etiqueta" htmlFor="zona">Comuna o ciudad</label><input className="campo__control" id="zona" name="zona" maxLength="150" defaultValue={zona} placeholder="Ej.: Melipilla, Chile" /></div>
        <button type="submit" className="boton boton--principal boton--compacto">Buscar profesionales</button>
        {(especialidad || zona) && <button type="button" className="boton-texto" onClick={() => setParametros({})}>Limpiar filtro</button>}
      </form>
      <p className="texto-secundario">Busca profesionales registrados en FitSearch por especialidad y comuna.</p>
      {resultado?.especialidades?.length > 0 && <nav className="directorio__categorias" aria-label="Explorar especialidades">
        <span>Explora:</span>
        <button type="button" aria-pressed={!especialidad} onClick={() => setParametros(zona ? { comuna: zona } : {})}>Todas</button>
        {resultado.especialidades.map((nombre) => <button key={nombre} type="button" aria-pressed={nombre === especialidad}
          onClick={() => setParametros({ especialidad: nombre, ...(zona ? { comuna: zona } : {}) })}>{nombre}</button>)}
      </nav>}
      <div className="directorio__resultados">
      <div aria-live="polite" aria-busy={cargando}>
        <h2 className="directorio__titulo-lista">Resultados de la búsqueda</h2>
        {cargando ? <p className="directorio__estado" role="status">Cargando profesionales…</p> : resultado.error ? (
          <div className="directorio__estado"><Alerta>{resultado.error}</Alerta>
            <button className="boton boton--secundario boton--compacto" onClick={() => setIntento(intento + 1)}>Reintentar</button>
          </div>
        ) : !resultado.profesionales.length ? (
          <div className="directorio__estado">
            <h2>{(especialidad || zona) ? 'No hay profesionales para estos filtros' : 'Aún no hay profesionales para mostrar'}</h2>
            <p>{(especialidad || zona) ? 'Prueba otra especialidad o comuna, o limpia los filtros para ver todos los resultados.' : 'Cuando se incorporen fichas profesionales, aparecerán aquí.'}</p>
            {(especialidad || zona || pagina !== '1') && <button className="boton boton--secundario boton--compacto" onClick={() => setParametros({})}>Ver todos los profesionales</button>}
          </div>
        ) : (
          <>
            <p className="texto-secundario">{resultado.profesionales.length} {resultado.profesionales.length === 1 ? 'profesional en esta página' : 'profesionales en esta página'}{especialidad ? ` · ${especialidad}` : ''}</p>
            <div className="directorio__lista">
              {resultado.profesionales.map((profesional) => (
                <article className="directorio__tarjeta" key={profesional.id}>
                  <div className="directorio__origen"><span>Registrado en FitSearch</span><Icono nombre="maletin" tamano={16} /></div>
                  <div className="directorio__identidad">
                    <span className="directorio__avatar" aria-hidden="true">{profesional.nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('')}</span>
                    <div><h2>{profesional.nombre}</h2><span className="directorio__especialidad">{profesional.especialidad}</span></div>
                  </div>
                  <div className="directorio__servicios"><h3>Sobre su atención</h3><p className="directorio__descripcion">{profesional.descripcion || 'Este profesional todavía no ha añadido una descripción de sus servicios.'}</p></div>
                  <div className="directorio__ubicacion">
                    <span className="directorio__dato">LUGAR DE ATENCIÓN</span>
                    <strong>{profesional.establecimiento?.nombre || 'Ubicación de atención'}</strong>
                    <p>{profesional.establecimiento?.direccion || `Coordenadas: ${profesional.ubicacionLat}, ${profesional.ubicacionLng}`}</p>
                  </div>
                  <a className="directorio__mapa" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${profesional.ubicacionLat},${profesional.ubicacionLng}`)}`}
                    target="_blank" rel="noopener noreferrer" aria-label={`Ver ubicación de ${profesional.nombre} en Google Maps (nueva pestaña)`}>
                    Ver ubicación <Icono nombre="flecha" tamano={18} />
                  </a>
                </article>
              ))}
            </div>
            <nav className="directorio__paginacion" aria-label="Páginas de profesionales">
              <button className="boton boton--secundario boton--compacto" disabled={resultado.pagina === 1} onClick={() => cambiarPagina(resultado.pagina - 1)}>Anterior</button>
              <span>Página {resultado.pagina}</span>
              <button className="boton boton--secundario boton--compacto" disabled={!resultado.hayMas} onClick={() => cambiarPagina(resultado.pagina + 1)}>Siguiente</button>
            </nav>
          </>
        )}
      </div>
      <div className="directorio__lateral">
        <section className="directorio__ayuda"><span className="directorio__antetitulo">Antes de elegir</span><h2>Encuentra una atención que se ajuste a ti</h2>
          <ul><li><strong>Revisa la especialidad.</strong> Busca un área relacionada con lo que necesitas.</li><li><strong>Comprueba la ubicación.</strong> Revisa la dirección y cómo llegar antes de trasladarte.</li><li><strong>Confirma los detalles.</strong> Consulta directamente al profesional por horarios, valores y servicios.</li></ul>
        </section></div>
      </div>
    </section>
  );
}
