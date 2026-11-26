import { Suspense } from 'react';
import diferirPantalla from './services/diferirPantalla.jsx';
import CargaPantalla from './components/CargaPantalla.jsx';
import AvisosGuardado from './components/AvisosGuardado.jsx';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import DisenoAplicacion from './components/diseno/DisenoAplicacion.jsx';
import { SECCIONES, SECCIONES_PROFESIONAL, SECCIONES_PROXIMAMENTE, SECCIONES_PROXIMAMENTE_PROFESIONAL } from './components/diseno/secciones.js';
import RutaProtegida from './components/RutaProtegida.jsx';
import VolverArriba from './components/VolverArriba.jsx';
import { useSesion } from './context/SesionContext.jsx';
const ElegirPerfil = diferirPantalla(() => import('./pages/ElegirPerfil.jsx'));
const Asistente = diferirPantalla(() => import('./pages/Asistente.jsx'));
const Comidas = diferirPantalla(() => import('./pages/Comidas.jsx'));
const Logros = diferirPantalla(() => import('./pages/Logros.jsx'));
const AccesoNoDisponible = diferirPantalla(() => import('./pages/AccesoNoDisponible.jsx'));
const LienzoAdministrador = diferirPantalla(() => import('./pages/administrador/PanelAdministrador.jsx').then((m) => ({ default: m.LienzoAdministrador })));
const ListadoAdministrador = diferirPantalla(() => import('./pages/administrador/PanelAdministrador.jsx').then((m) => ({ default: m.ListadoAdministrador })));
const DetalleVerificacion = diferirPantalla(() => import('./pages/administrador/PanelAdministrador.jsx').then((m) => ({ default: m.DetalleVerificacion })));
const DashboardAdministrador = diferirPantalla(() => import('./pages/administrador/DashboardAdministrador.jsx'));
const ReportesAdministrador = diferirPantalla(() => import('./pages/administrador/ReportesAdministrador.jsx'));
const ContenidoAdministrador = diferirPantalla(() => import('./pages/administrador/ContenidoAdministrador.jsx'));
const Establecimientos = diferirPantalla(() => import('./pages/Establecimientos.jsx'));
const Favoritos = diferirPantalla(() => import('./pages/Favoritos.jsx'));
const ConfiguracionUsuario = diferirPantalla(() => import('./pages/ConfiguracionUsuario.jsx'));
const FichaEstablecimiento = diferirPantalla(() => import('./pages/FichaEstablecimiento.jsx'));
const FichaProfesional = diferirPantalla(() => import('./pages/FichaProfesional.jsx'));
const Inicio = diferirPantalla(() => import('./pages/Inicio.jsx'));
const InicioSesion = diferirPantalla(() => import('./pages/InicioSesion.jsx'));
const Perfil = diferirPantalla(() => import('./pages/Perfil.jsx'));
const Portada = diferirPantalla(() => import('./pages/Portada.jsx'));
const InicioProfesional = diferirPantalla(() => import('./pages/profesional/InicioProfesional.jsx'));
// Mejoras del 09-11-2026: agenda semanal, clientes (FS-HU-27), reportes (FS-HU-28), configuración (FS-HU-29) y mensajes (FS-HU-31).
const AgendaSemanal = diferirPantalla(() => import('./pages/profesional/AgendaSemanal.jsx'));
const Clientes = diferirPantalla(() => import('./pages/profesional/Clientes.jsx'));
const HistorialCliente = diferirPantalla(() => import('./pages/profesional/Clientes.jsx').then((m) => ({ default: m.HistorialCliente })));
const Configuracion = diferirPantalla(() => import('./pages/profesional/Configuracion.jsx'));
const Reportes = diferirPantalla(() => import('./pages/profesional/Reportes.jsx'));
const Mensajes = diferirPantalla(() => import('./pages/Mensajes.jsx'));
const PerfilProfesional = diferirPantalla(() => import('./pages/profesional/PerfilProfesional.jsx'));
const VistaPublica = diferirPantalla(() => import('./pages/profesional/VistaPublica.jsx'));
const Profesionales = diferirPantalla(() => import('./pages/Profesionales.jsx'));
const Proximamente = diferirPantalla(() => import('./pages/Proximamente.jsx'));
const MisCitas = diferirPantalla(() => import('./pages/Agenda.jsx').then((m) => ({ default: m.MisCitas })));
const RecuperarContrasena = diferirPantalla(() => import('./pages/RecuperarContrasena.jsx'));
const Registro = diferirPantalla(() => import('./pages/Registro.jsx'));
const RestablecerContrasena = diferirPantalla(() => import('./pages/RestablecerContrasena.jsx'));
import { CATEGORIAS } from './components/establecimientos/categorias.js';
import { ACCESO_NO_DISPONIBLE, destinoTrasIngreso, ELEGIR_PERFIL } from './services/navegacion.js';

export default function App() {
  const { sesion, aviso } = useSesion();
  const { state, pathname } = useLocation();
  // La portada y las pantallas de acceso son solo para invitados: con sesión, una cuenta recién creada va a
  // "Elegir perfil" y el resto, a la página que había pedido antes de iniciar sesión o al Inicio de su rol
  // (DAS, D20, D22 y D25).
  const soloInvitado = (pagina) => (sesion
    ? <Navigate to={aviso?.destino || destinoTrasIngreso(state, sesion.usuario)} replace /> : pagina);

  return (
    <>
      <VolverArriba />
      <AvisosGuardado />
      <CargaPantalla><Suspense fallback={<p className="pagina-cargando" role="status">Cargando pantalla…</p>}><Routes>
        <Route path="/" element={soloInvitado(<Portada />)} />
        <Route path="/registro" element={soloInvitado(<Registro />)} />
        <Route path="/iniciar-sesion" element={soloInvitado(<InicioSesion />)} />
        <Route path="/recuperar-contrasena" element={soloInvitado(<RecuperarContrasena />)} />
        <Route path="/restablecer-contrasena" element={<RestablecerContrasena />} />
        <Route element={<RutaProtegida />}>
          <Route path={ACCESO_NO_DISPONIBLE} element={<AccesoNoDisponible />} />
          <Route path={ELEGIR_PERFIL} element={<ElegirPerfil />} />
          <Route element={<RutaProtegida rol="administrador" />}>
            {/* El administrador usa el mismo encabezado y menú que los otros espacios (11-11-2026). */}
            <Route path="/admin" element={<DisenoAplicacion espacio="administrador" />}>
             <Route element={<LienzoAdministrador />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DashboardAdministrador />} />
              <Route path="profesionales" element={<ListadoAdministrador key="profesionales" tipo="profesionales" />} />
              <Route path="verificaciones" element={<ListadoAdministrador key="verificaciones" tipo="verificaciones" />} />
              <Route path="verificaciones/:id" element={<DetalleVerificacion key={pathname} />} />
              <Route path="usuarios" element={<ListadoAdministrador key="usuarios" tipo="usuarios" />} />
              <Route path="reportes" element={<ReportesAdministrador />} />
              <Route path="contenido" element={<ContenidoAdministrador />} />
             </Route>
            </Route>
          </Route>
          {/* Espacio del usuario */}
          <Route element={<RutaProtegida rol="usuario" />}>
            <Route element={<DisenoAplicacion />}>
              <Route path="/inicio" element={<Inicio />} />
              <Route path="/profesionales" element={<Profesionales />} />
              <Route path="/profesionales/:id" element={<FichaProfesional />} />
              <Route path="/favoritos" element={<Favoritos />} />
              <Route path={SECCIONES.configuracion.ruta} element={<ConfiguracionUsuario />} />
              {/* Centros de salud y gimnasios (FS-HU-25): la misma lista y ficha para cada categoría. */}
              {Object.entries(CATEGORIAS).flatMap(([categoria, { ruta }]) => [
                <Route key={ruta} path={ruta} element={<Establecimientos key={categoria} categoria={categoria} />} />,
                <Route key={`${ruta}/:id`} path={`${ruta}/:id`} element={<FichaEstablecimiento key={categoria} categoria={categoria} />} />,
              ])}
              <Route path="/citas" element={<MisCitas />} />
              <Route path="/mensajes/:id?" element={<Mensajes />} />
              <Route path="/asistente/:id?" element={<Asistente />} />
              <Route path="/comidas" element={<Comidas />} />
              <Route path="/logros" element={<Logros />} />
              <Route path="/perfil" element={<Perfil />} />
              {SECCIONES_PROXIMAMENTE.map((clave) => (
                <Route key={clave} path={SECCIONES[clave].ruta} element={<Proximamente key={clave} seccion={clave} />} />
              ))}
            </Route>
          </Route>
          {/* Espacio del profesional */}
          <Route element={<RutaProtegida rol="profesional" />}>
            <Route element={<DisenoAplicacion espacio="profesional" />}>
              <Route path="/profesional" element={<Navigate to={SECCIONES_PROFESIONAL.inicio.ruta} replace />} />
              <Route path={SECCIONES_PROFESIONAL.inicio.ruta} element={<InicioProfesional />} />
              <Route path={SECCIONES_PROFESIONAL.perfil.ruta} element={<PerfilProfesional />} />
              <Route path="/profesional/agenda" element={<AgendaSemanal />} />
              <Route path="/profesional/perfil/publico" element={<VistaPublica />} />
              <Route path={SECCIONES_PROFESIONAL.clientes.ruta} element={<Clientes />} />
              <Route path={`${SECCIONES_PROFESIONAL.clientes.ruta}/:id`} element={<HistorialCliente />} />
              <Route path={SECCIONES_PROFESIONAL.reportes.ruta} element={<Reportes />} />
              <Route path="/profesional/configuracion" element={<Configuracion />} />
              <Route path="/profesional/mensajes/:id?" element={<Mensajes />} />
              {SECCIONES_PROXIMAMENTE_PROFESIONAL.map((clave) => (
                <Route key={clave} path={SECCIONES_PROFESIONAL[clave].ruta}
                  element={<Proximamente key={clave} seccion={clave} espacio="profesional" />} />
              ))}
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes></Suspense></CargaPantalla>
    </>
  );
}
