import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import DisenoAplicacion from './components/diseno/DisenoAplicacion.jsx';
import { SECCIONES, SECCIONES_PROFESIONAL, SECCIONES_PROXIMAMENTE, SECCIONES_PROXIMAMENTE_PROFESIONAL } from './components/diseno/secciones.js';
import RutaProtegida from './components/RutaProtegida.jsx';
import { useSesion } from './context/SesionContext.jsx';
import ElegirPerfil from './pages/ElegirPerfil.jsx';
import AccesoNoDisponible from './pages/AccesoNoDisponible.jsx';
import Favoritos from './pages/Favoritos.jsx';
import FichaProfesional from './pages/FichaProfesional.jsx';
import Inicio from './pages/Inicio.jsx';
import InicioSesion from './pages/InicioSesion.jsx';
import Perfil from './pages/Perfil.jsx';
import Portada from './pages/Portada.jsx';
import InicioProfesional from './pages/profesional/InicioProfesional.jsx';
import PerfilProfesional from './pages/profesional/PerfilProfesional.jsx';
import VistaPublica from './pages/profesional/VistaPublica.jsx';
import Profesionales from './pages/Profesionales.jsx';
import Proximamente from './pages/Proximamente.jsx';
import RecuperarContrasena from './pages/RecuperarContrasena.jsx';
import Registro from './pages/Registro.jsx';
import RestablecerContrasena from './pages/RestablecerContrasena.jsx';
import { ACCESO_NO_DISPONIBLE, destinoTrasIngreso, ELEGIR_PERFIL } from './services/navegacion.js';

export default function App() {
  const { sesion, aviso } = useSesion();
  const { state } = useLocation();
  // La portada y las pantallas de acceso son solo para invitados: con sesión, una cuenta recién creada va a
  // "Elegir perfil" y el resto, a la página que había pedido antes de iniciar sesión o al Inicio de su rol
  // (DAS, D20, D22 y D25).
  const soloInvitado = (pagina) => (sesion
    ? <Navigate to={aviso?.destino || destinoTrasIngreso(state, sesion.usuario)} replace /> : pagina);

  return (
    <Routes>
      <Route path="/" element={soloInvitado(<Portada />)} />
      <Route path="/registro" element={soloInvitado(<Registro />)} />
      <Route path="/iniciar-sesion" element={soloInvitado(<InicioSesion />)} />
      <Route path="/recuperar-contrasena" element={soloInvitado(<RecuperarContrasena />)} />
      <Route path="/restablecer-contrasena" element={<RestablecerContrasena />} />
      <Route element={<RutaProtegida />}>
        <Route path={ACCESO_NO_DISPONIBLE} element={<AccesoNoDisponible />} />
        <Route path={ELEGIR_PERFIL} element={<ElegirPerfil />} />
        {/* Espacio del usuario */}
        <Route element={<RutaProtegida rol="usuario" />}>
          <Route element={<DisenoAplicacion />}>
            <Route path="/inicio" element={<Inicio />} />
            <Route path="/profesionales" element={<Profesionales />} />
            <Route path="/profesionales/:id" element={<FichaProfesional />} />
            <Route path="/favoritos" element={<Favoritos />} />
            <Route path="/perfil" element={<div className="contenedor-perfil"><Perfil /></div>} />
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
            <Route path="/profesional/perfil/publico" element={<VistaPublica />} />
            {SECCIONES_PROXIMAMENTE_PROFESIONAL.map((clave) => (
              <Route key={clave} path={SECCIONES_PROFESIONAL[clave].ruta}
                element={<Proximamente key={clave} seccion={clave} espacio="profesional" />} />
            ))}
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
