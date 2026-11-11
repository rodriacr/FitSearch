import { useCallback, useState } from 'react';

// Nombre de cada opción del menú compacto al pasar el mouse o al enfocarla con el teclado. Tiene posición fija para que
// el desplazamiento del menú no la recorte, y es solo visual: el enlace ya lleva su nombre para lectores de pantalla.
// "consulta" es el ancho desde el que el menú se puede compactar (en celular el menú siempre se abre completo).
export default function useEtiquetaFlotante(activo, consulta) {
  const [etiqueta, setEtiqueta] = useState(null);
  const ocultar = useCallback(() => setEtiqueta(null), []);
  const propiedades = (texto) => {
    const mostrar = (evento) => {
      if (!activo || !(window.matchMedia?.(consulta).matches ?? true)) return;
      const caja = evento.currentTarget.getBoundingClientRect();
      setEtiqueta({ texto, top: caja.top + caja.height / 2, left: caja.right + 12 });
    };
    return { onMouseEnter: mostrar, onFocus: mostrar, onMouseLeave: ocultar, onBlur: ocultar };
  };
  const nodo = activo && etiqueta ? (
    <span className="etiqueta-flotante" style={{ top: etiqueta.top, left: etiqueta.left }} aria-hidden="true">{etiqueta.texto}</span>
  ) : null;
  return { nodo, propiedades, ocultar };
}
