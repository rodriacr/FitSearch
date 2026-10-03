import { Link } from 'react-router-dom';
import Icono from '../components/Icono.jsx';
import { SECCIONES } from '../components/diseno/secciones.js';

// Secciones del menú que todavía no están construidas: se explica qué traerán, sin simular datos.
export default function Proximamente({ seccion }) {
  const { nombre, icono, descripcion } = SECCIONES[seccion];
  return (
    <section className="proximamente" aria-labelledby="titulo-proximamente">
      <span className="proximamente__icono"><Icono nombre={icono} tamano={40} /></span>
      <span className="etiqueta-proximamente">Próximamente</span>
      <h1 id="titulo-proximamente">{nombre}</h1>
      <p>{descripcion}</p>
      <div className="proximamente__acciones">
        <Link to="/profesionales" className="boton boton--principal boton--compacto">Buscar profesionales <Icono nombre="flecha" tamano={18} /></Link>
        <Link to="/inicio" className="boton boton--secundario boton--compacto">Volver al inicio</Link>
      </div>
    </section>
  );
}
