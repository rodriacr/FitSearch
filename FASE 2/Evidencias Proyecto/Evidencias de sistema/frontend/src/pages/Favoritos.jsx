import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alerta from '../components/Alerta.jsx';
import EstadoVacio from '../components/EstadoVacio.jsx';
import TarjetaProfesional from '../components/profesionales/TarjetaProfesional.jsx';
import { listarFavoritos } from '../services/favorito.service.js';
import './Profesionales.css';

// Profesionales que la persona guardó con el corazón (FS-HU-23).
export default function Favoritos() {
  const [pagina, setPagina] = useState(1);
  const [intento, setIntento] = useState(0);
  const [resultado, setResultado] = useState(null);
  const clave = `${pagina}-${intento}`;
  const cargando = resultado?.clave !== clave;

  useEffect(() => {
    let activo = true;
    listarFavoritos(pagina)
      .then((respuesta) => activo && setResultado({ clave, ...respuesta }))
      .catch((error) => activo && setResultado({ clave, error: error.message }));
    return () => { activo = false; };
  }, [clave, pagina]);

  // Al quitar un favorito desde esta página, la ficha desaparece de la lista.
  const alCambiar = (id) => (esFavorito) => {
    if (esFavorito) return;
    setResultado((actual) => ({
      ...actual, total: actual.total - 1, profesionales: actual.profesionales.filter((profesional) => profesional.id !== id),
    }));
  };

  let contenido;
  if (cargando) {
    contenido = <p className="buscador__estado" role="status">Cargando tus favoritos…</p>;
  } else if (resultado.error) {
    contenido = (
      <div className="buscador__estado">
        <Alerta>{resultado.error}</Alerta>
        <button type="button" className="boton boton--secundario boton--compacto" onClick={() => setIntento(intento + 1)}>Reintentar</button>
      </div>
    );
  } else if (!resultado.profesionales.length) {
    contenido = (
      <EstadoVacio nivel={2} icono="corazon" titulo="Aún no tienes profesionales favoritos"
        accion={<Link to="/profesionales" className="boton boton--principal boton--compacto">Explorar profesionales</Link>}>
        Toca el corazón en la ficha de un profesional para guardarlo aquí.
      </EstadoVacio>
    );
  } else {
    contenido = (
      <>
        <p className="buscador__contador">{resultado.total} {resultado.total === 1 ? 'profesional guardado' : 'profesionales guardados'}</p>
        <div className="buscador__lista">
          {resultado.profesionales.map((profesional) => (
            <TarjetaProfesional key={profesional.id} profesional={profesional} nivelTitulo={2} onCambioFavorito={alCambiar(profesional.id)} />
          ))}
        </div>
        {resultado.totalPaginas > 1 && (
          <nav className="paginacion" aria-label="Páginas de favoritos">
            <button type="button" className="boton boton--secundario boton--compacto" disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}>Anterior</button>
            <span>Página {pagina} de {resultado.totalPaginas}</span>
            <button type="button" className="boton boton--secundario boton--compacto" disabled={!resultado.hayMas} onClick={() => setPagina(pagina + 1)}>Siguiente</button>
          </nav>
        )}
      </>
    );
  }

  return (
    <section className="buscador" aria-labelledby="titulo-favoritos">
      <header className="buscador__cabecera">
        <h1 id="titulo-favoritos">Favoritos</h1>
        <p>Los profesionales que guardaste para volver a encontrarlos fácilmente.</p>
      </header>
      {contenido}
    </section>
  );
}
