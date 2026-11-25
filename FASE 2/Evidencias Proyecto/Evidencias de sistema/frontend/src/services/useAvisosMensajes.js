import { useCallback, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { useSesion } from '../context/SesionContext.jsx';
import { AvisosMensajesContext } from '../context/avisosMensajesContext.js';
import { crearAlmacen } from './almacenAvisosMensajes.js';
export default function useAvisosMensajes() {
  const compartido = useContext(AvisosMensajesContext);
  const { sesion } = useSesion();
  const { pathname } = useLocation();
  const [local] = useState(() => crearAlmacen(sesion?.usuario.rol === 'administrador' ? '/administrador/alertas' : '/chats/no-leidos'));
  const almacen = compartido ?? local;
  const suscribir = useCallback((fn) => almacen.suscribir(fn), [almacen]);
  const estado = useSyncExternalStore(suscribir, almacen.leer, almacen.leer);
  useEffect(() => { almacen.actualizar(); }, [almacen, pathname]);
  return { ...estado, reintentar: almacen.actualizar };
}
