import Icono from './Icono.jsx';

// Mensaje amable para una sección sin datos, con la acción que corresponde (crear, buscar, completar).
export default function EstadoVacio({ icono, titulo, children, accion, nivel, compacto = false }) {
  const Titulo = nivel ? `h${nivel}` : 'p';
  return (
    <div className={`estado-vacio${compacto ? ' estado-vacio--compacto' : ''}`}>
      <span className="estado-vacio__icono"><Icono nombre={icono} tamano={compacto ? 22 : 30} /></span>
      <Titulo className="estado-vacio__titulo">{titulo}</Titulo>
      {children && <p className="estado-vacio__texto">{children}</p>}
      {accion}
    </div>
  );
}
