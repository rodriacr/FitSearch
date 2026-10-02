import { Navigate, Route, Routes } from 'react-router-dom';
import Encabezado from './components/Encabezado.jsx';
import RutaProtegida from './components/RutaProtegida.jsx';
import { useSesion } from './context/SesionContext.jsx';
import InicioSesion from './pages/InicioSesion.jsx';
import Inicio from './pages/Inicio.jsx';
import Perfil from './pages/Perfil.jsx';
import RecuperarContrasena from './pages/RecuperarContrasena.jsx';
import Registro from './pages/Registro.jsx';
import RestablecerContrasena from './pages/RestablecerContrasena.jsx';

export default function App() {
  const { sesion } = useSesion();
  // La portada y las pantallas de acceso son solo para invitados: con sesión se va al perfil.
  const soloInvitado = (pagina) => (sesion ? <Navigate to="/perfil" replace /> : pagina);

  return (
    <Routes>
      <Route path="/" element={soloInvitado(<Inicio />)} />
      <Route path="/registro" element={soloInvitado(<Registro />)} />
      <Route path="/iniciar-sesion" element={soloInvitado(<InicioSesion />)} />
      <Route path="/recuperar-contrasena" element={soloInvitado(<RecuperarContrasena />)} />
      <Route path="/restablecer-contrasena" element={<RestablecerContrasena />} />
      <Route element={<RutaProtegida />}>
        <Route path="/perfil" element={<><Encabezado /><main className="contenedor contenedor--ancho"><Perfil /></main></>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
