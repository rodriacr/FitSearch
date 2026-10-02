import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { guardarSesion, leerSesionGuardada, registrarManejadorSesionExpirada } from '../services/api.js';
import * as authService from '../services/auth.service.js';

const SesionContext = createContext(null);

export function SesionProvider({ children }) {
  const [sesion, setSesion] = useState(leerSesionGuardada);
  // Aviso breve que se muestra tras iniciar o cerrar sesión, o cuando el token expira.
  const [aviso, setAviso] = useState(null);

  const establecer = useCallback((nuevaSesion) => {
    guardarSesion(nuevaSesion);
    setSesion(nuevaSesion);
  }, []);

  useEffect(() => {
    registrarManejadorSesionExpirada(() => {
      establecer(null);
      setAviso({ tipo: 'info', texto: 'Tu sesión expiró. Inicia sesión nuevamente.' });
    });
  }, [establecer]);

  const valor = useMemo(() => ({
    sesion,
    aviso,
    limpiarAviso: () => setAviso(null),
    registrar: async (datos) => {
      setAviso(null);
      establecer(await authService.registrar(datos));
    },
    iniciarSesion: async (datos) => {
      const nuevaSesion = await authService.iniciarSesion(datos);
      establecer(nuevaSesion);
      setAviso({ tipo: 'exito', texto: `Sesión iniciada como ${nuevaSesion.usuario.nombre}.` });
    },
    cerrarSesion: async () => {
      try {
        await authService.cerrarSesion();
      } catch {
        // El token se descarta igual en el cliente aunque el servidor no responda.
      }
      establecer(null);
      setAviso({ tipo: 'exito', texto: 'Cerraste sesión correctamente.' });
    },
  }), [sesion, aviso, establecer]);

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSesion() {
  const contexto = useContext(SesionContext);
  if (!contexto) throw new Error('useSesion debe usarse dentro de SesionProvider');
  return contexto;
}
