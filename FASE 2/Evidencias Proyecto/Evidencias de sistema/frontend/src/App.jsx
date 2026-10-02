import { Navigate, Route, Routes } from 'react-router-dom';
import Encabezado from './components/Encabezado.jsx';
import RutaProtegida from './components/RutaProtegida.jsx';
import { useSesion } from './context/SesionContext.jsx';
import InicioSesion from './pages/InicioSesion.jsx';
import Perfil from './pages/Perfil.jsx';
import Registro from './pages/Registro.jsx';

export default function App() {
  const { sesion } = useSesion();

  return (
    <>
      <Encabezado />
      <main className="contenedor">
        <Routes>
          <Route path="/" element={<Navigate to={sesion ? '/perfil' : '/iniciar-sesion'} replace />} />
          <Route path="/registro" element={sesion ? <Navigate to="/perfil" replace /> : <Registro />} />
          <Route path="/iniciar-sesion" element={sesion ? <Navigate to="/perfil" replace /> : <InicioSesion />} />
          <Route element={<RutaProtegida />}>
            <Route path="/perfil" element={<Perfil />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
