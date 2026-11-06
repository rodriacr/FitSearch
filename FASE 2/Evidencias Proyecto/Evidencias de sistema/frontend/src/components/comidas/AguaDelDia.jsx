import { useEffect, useState } from 'react';
import { BarraNutriente } from './GraficosComidas.jsx';
import { obtenerAguaDelDia } from '../../services/agua.service.js';

// Agua del día en el Resumen nutricional de Comidas (FS-HU-33), con la misma barra que los macronutrientes. Es el mismo
// registro que «Agua hoy» del Inicio. version cambia cuando la página recarga el día (por ejemplo, al sumar agua desde
// «Registrar comida»), y entonces se vuelve a pedir.
export default function AguaDelDia({ fecha, version = 0 }) {
  const [estado, setEstado] = useState(null);
  const clave = `${fecha}-${version}`;

  useEffect(() => {
    let activo = true;
    obtenerAguaDelDia(fecha)
      .then((dia) => activo && setEstado({ clave, dia }))
      .catch(() => activo && setEstado({ clave, error: true }));
    return () => { activo = false; };
  }, [clave, fecha]);

  // Mientras llega la primera respuesta no se muestra nada; al recargar se deja el valor anterior para que no salte.
  if (!estado) return null;
  if (estado.error) return <p className="texto-secundario agua-del-dia__error">No pudimos cargar el agua de este día.</p>;
  const { totalMl, metaMl } = estado.dia;
  return <BarraNutriente nombre="Agua" consumo={totalMl} objetivo={metaMl} unidad="ml" color="#2aa5c9" />;
}
