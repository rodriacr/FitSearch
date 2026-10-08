import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { actualizarSesionGuardada, guardarSesion, leerSesionGuardada, registrarManejadorSesionExpirada } from '../services/api.js';
import * as authService from '../services/auth.service.js';
import { ELEGIR_PERFIL } from '../services/navegacion.js';
import { olvidarUbicacion } from '../services/ubicacion.js';

const SesionContext = createContext(null);

export function SesionProvider({ children }) {
  const [sesion, setSesion] = useState(leerSesionGuardada);
  // Aviso breve que se muestra tras iniciar o cerrar sesión, o cuando el token expira.
  const [aviso, setAviso] = useState(null);

  const establecer = useCallback((nuevaSesion, recordar = false) => {
    guardarSesion(nuevaSesion, recordar);
    setSesion(nuevaSesion);
  }, []);

  useEffect(() => {
    registrarManejadorSesionExpirada(() => {
      establecer(null);
      olvidarUbicacion();
      setAviso({ tipo: 'info', texto: 'Tu sesión expiró. Inicia sesión nuevamente.' });
    });
  }, [establecer]);

  const limpiarAviso = useCallback(() => setAviso(null), []);

  const valor = useMemo(() => ({
    sesion,
    aviso,
    limpiarAviso,
    registrar: async (datos) => {
      establecer(await authService.registrar(datos));
      // "destino": una cuenta nueva parte eligiendo cómo usar FitSearch (App lo usa al salir de las pantallas de acceso).
      setAviso({ tipo: 'exito', texto: 'Tu cuenta fue creada y la sesión está iniciada.', destino: ELEGIR_PERFIL });
    },
    iniciarSesion: async (datos) => {
      const nuevaSesion = await authService.iniciarSesion(datos);
      establecer(nuevaSesion, Boolean(datos.recordar));
      setAviso({ tipo: 'exito', texto: `Sesión iniciada como ${nuevaSesion.usuario.nombre}.` });
      return nuevaSesion;
    },
    iniciarSesionConGoogle: async ({ credencial, recordar = false }) => {
      const { token, usuario, cuentaNueva } = await authService.iniciarSesionConGoogle({ credencial, recordar });
      establecer({ token, usuario }, recordar);
      setAviso({
        tipo: 'exito',
        ...(cuentaNueva ? { destino: ELEGIR_PERFIL } : {}),
        texto: cuentaNueva
          ? `Tu cuenta fue creada con Google y la sesión está iniciada como ${usuario.nombre}.`
          : `Sesión iniciada como ${usuario.nombre}.`,
      });
      return { cuentaNueva, usuario };
    },
    // Aviso que se muestra en la próxima pantalla con el diseño de la aplicación (por ejemplo, al elegir el perfil).
    mostrarAviso: setAviso,
    // El servidor indica que la cuenta aún no elige su perfil (sesión guardada antes de D25 o desactualizada):
    // se corrige la sesión y RutaProtegida la lleva a "Elegir perfil".
    marcarRolPendiente: () => {
      if (!sesion || sesion.usuario.rolConfirmado === false) return;
      const nuevaSesion = { ...sesion, usuario: { ...sesion.usuario, rolConfirmado: false } };
      actualizarSesionGuardada(nuevaSesion);
      setSesion(nuevaSesion);
    },
    // El rol viaja dentro del token: al elegir el perfil se reemplaza la sesión guardada.
    actualizarSesion: (nuevaSesion) => {
      actualizarSesionGuardada(nuevaSesion);
      setSesion(nuevaSesion);
    },
    cerrarSesion: async () => {
      try {
        await authService.cerrarSesion();
      } catch {
        // El token se descarta igual en el cliente aunque el servidor no responda.
      }
      establecer(null);
      olvidarUbicacion();
      // "cierre" le indica a RutaProtegida que la salida fue voluntaria y debe volver a la portada.
      setAviso({ tipo: 'exito', texto: 'Cerraste sesión correctamente.', origen: 'cierre' });
    },
  }), [sesion, aviso, establecer, limpiarAviso]);

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSesion() {
  const contexto = useContext(SesionContext);
  if (!contexto) throw new Error('useSesion debe usarse dentro de SesionProvider');
  return contexto;
}
