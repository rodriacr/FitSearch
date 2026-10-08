import { Link } from 'react-router-dom';
import Icono from '../components/Icono.jsx';
import { ESPACIOS } from '../components/diseno/secciones.js';

// Secciones del menú que todavía no están construidas: se explica qué traerán, sin simular datos.
export default function Proximamente({ seccion, espacio = 'usuario' }) {
  const { secciones } = ESPACIOS[espacio];
  const { nombre, icono, descripcion } = secciones[seccion];
  return (
    <section className="proximamente" aria-labelledby="titulo-proximamente">
      <span className="proximamente__icono"><Icono nombre={icono} tamano={40} /></span>
      <span className="etiqueta-proximamente">Próximamente</span>
      <h1 id="titulo-proximamente">{nombre}</h1>
      <p>{descripcion}</p>
      <div className="proximamente__acciones">
        {espacio === 'profesional' ? (
          <>
            <Link to={secciones.perfil.ruta} className="boton boton--principal boton--compacto">Ver mi perfil profesional <Icono nombre="flecha" tamano={18} /></Link>
            <Link to={secciones.inicio.ruta} className="boton boton--secundario boton--compacto">Volver al inicio</Link>
          </>
        ) : (
          <>
            <Link to="/profesionales" className="boton boton--principal boton--compacto">Buscar profesionales <Icono nombre="flecha" tamano={18} /></Link>
            <Link to="/inicio" className="boton boton--secundario boton--compacto">Volver al inicio</Link>
          </>
        )}
      </div>
    </section>
  );
}
