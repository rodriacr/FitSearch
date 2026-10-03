import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import DisenoAplicacion from './components/diseno/DisenoAplicacion.jsx';
import { SECCIONES, SECCIONES_PROXIMAMENTE } from './components/diseno/secciones.js';
import RutaProtegida from './components/RutaProtegida.jsx';
import { useSesion } from './context/SesionContext.jsx';
import Favoritos from './pages/Favoritos.jsx';
import FichaProfesional from './pages/FichaProfesional.jsx';
import Inicio from './pages/Inicio.jsx';
import InicioSesion from './pages/InicioSesion.jsx';
import Perfil from './pages/Perfil.jsx';
import Portada from './pages/Portada.jsx';
import Profesionales from './pages/Profesionales.jsx';
import Proximamente from './pages/Proximamente.jsx';
import RecuperarContrasena from './pages/RecuperarContrasena.jsx';
import Registro from './pages/Registro.jsx';
import RestablecerContrasena from './pages/RestablecerContrasena.jsx';
import { destinoTrasIngreso } from './services/navegacion.js';

export default function App() {
  const { sesion, aviso } = useSesion();
  const { state } = useLocation();
  // La portada y las pantallas de acceso son solo para invitados: con sesión, una cuenta recién creada va al
  // asistente de perfil y el resto, a la página que había pedido antes de iniciar sesión o al Inicio (DAS, D20 y D22).
  const soloInvitado = (pagina) => (sesion ? <Navigate to={aviso?.destino || destinoTrasIngreso(state)} replace /> : pagina);

  return (
    <Routes>
      <Route path="/" element={soloInvitado(<Portada />)} />
      <Route path="/registro" element={soloInvitado(<Registro />)} />
      <Route path="/iniciar-sesion" element={soloInvitado(<InicioSesion />)} />
      <Route path="/recuperar-contrasena" element={soloInvitado(<RecuperarContrasena />)} />
      <Route path="/restablecer-contrasena" element={<RestablecerContrasena />} />
      <Route element={<RutaProtegida />}>
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
