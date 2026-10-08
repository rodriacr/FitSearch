import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Alerta from '../../components/Alerta.jsx';
import { obtenerMiFicha } from '../../services/profesional.service.js';
import FichaProfesional from '../FichaProfesional.jsx';

// "Ver mi perfil público": la misma ficha que ven las personas en el buscador, en modo vista previa (DAS, D25).
export default function VistaPublica() {
  const [estado, setEstado] = useState(null);

  useEffect(() => {
    let activo = true;
    obtenerMiFicha()
      .then(({ ficha }) => activo && setEstado({ ficha }))
      .catch((error) => activo && setEstado({ error: error.message }));
    return () => { activo = false; };
  }, []);

  if (!estado) return <p className="texto-secundario" role="status">Cargando tu ficha…</p>;
  if (estado.error) return <Alerta>{estado.error}</Alerta>;
  // Sin ficha todavía no hay nada público que mostrar: se completa primero.
  if (!estado.ficha) return <Navigate to="/profesional/perfil" replace />;
  return <FichaProfesional idProfesional={String(estado.ficha.id)} vistaPrevia />;
}
