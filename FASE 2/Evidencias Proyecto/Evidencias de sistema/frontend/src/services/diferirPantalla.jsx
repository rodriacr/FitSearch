import { lazy } from 'react';

const cargas = [];
// La misma precarga sirve para navegación anticipada y para montar rutas en pruebas de integración.
export const precargarPantallas = () => Promise.all(cargas.map((cargar) => cargar()));

export default function diferirPantalla(importar) {
  let Componente;
  let pendiente;
  const cargar = () => pendiente ??= importar().then((modulo) => {
    Componente = modulo.default;
    return modulo;
  }).catch((error) => { pendiente = undefined; throw error; });
  cargas.push(cargar);
  const Diferido = lazy(cargar);
  return function Pantalla(props) {
    return Componente ? <Componente {...props} /> : <Diferido {...props} />;
  };
}
