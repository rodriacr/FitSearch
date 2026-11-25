import { useState } from 'react';
import { useSesion } from './SesionContext.jsx';
import { AvisosMensajesContext } from './avisosMensajesContext.js';
import { crearAlmacen } from '../services/almacenAvisosMensajes.js';
function AvisosPorSesion({ ruta, children }) {
  const [almacen] = useState(() => crearAlmacen(ruta));
  return <AvisosMensajesContext.Provider value={almacen}>{children}</AvisosMensajesContext.Provider>;
}
export default function AvisosMensajesProvider({ children }) {
  const { sesion } = useSesion();
  const ruta = sesion?.usuario.rol === 'administrador' ? '/administrador/alertas' : '/chats/no-leidos';
  return <AvisosPorSesion key={sesion?.token ?? 'sin-sesion'} ruta={ruta}>{children}</AvisosPorSesion>;
}
